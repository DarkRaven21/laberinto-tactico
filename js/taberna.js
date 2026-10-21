// ============================================================
// taberna.js — Taberna (taberna.html): contratar un compañero para la
// próxima corrida del laberinto, y el interruptor "Disponible como
// compañero". Todo lo decide tavern-action (edge function): este archivo
// solo muestra y manda.
// ============================================================
import { requireSession, getSession, clearSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";
import { ABILITIES } from "./abilities.js";
import { PASSIVES } from "./passives.js";
import { ICON_COINS } from "./icons.js";

requireSession();

// Estilos de juego. El combate los traduce a la IA (COMPANION_AI_STYLE en battle.js).
const STYLES = [
    { key: "agresivo", name: "Agresivo", desc: "Va al frente y pega con todo al rival más cercano." },
    { key: "asesino", name: "Asesino", desc: "Va por el rival con menos vida para rematarlo." },
    { key: "guardian", name: "Guardián", desc: "Se queda cerca tuyo, ataca a los que te pegan, te pone escudos y se defiende antes." },
    { key: "tirador", name: "Tirador", desc: "Pelea a distancia y se aleja cuando no puede atacar." },
    { key: "medico", name: "Médico", desc: "Primero te cura, escuda o potencia; ataca si no hace falta." }
];

let data = null; // respuesta de 'list'

// ---------- Servidor ----------
async function tavern(action, extra = {}) {
    const session = getSession();
    const res = await supabaseFetch("/functions/v1/tavern-action", {
        method: "POST",
        body: JSON.stringify({ character_id: session.id, session_token: session.session_token, action, ...extra })
    });
    const json = await res.json();
    if (json.dead || res.status === 401) {
        clearSession();
        window.location.href = "index.html";
        throw new Error(json.error || "Sesión inválida");
    }
    if (json.error) throw new Error(json.error);
    return json;
}

// ---------- Utilidades ----------
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

function setStatus(text, warn = false) {
    const s = document.getElementById("tabernaStatus");
    s.textContent = text || "";
    s.classList.toggle("taberna-status--warn", warn);
}

function renderGold() {
    document.getElementById("goldLabel").innerHTML = `Oro: ${data?.gold ?? 0} ${ICON_COINS}`;
}

// Qué estilos tienen sentido para un explorador, según sus habilidades.
function stylesFor(abilities) {
    const abs = abilities.map(k => ABILITIES[k]).filter(Boolean);
    const attacks = abs.filter(ab => ab.targetType === "enemy" || ab.targetType === "area");
    const ranged = attacks.some(ab => ab.range >= 2);
    const support = abs.some(ab => ab.healStats
        || (ab.shieldStats && (ab.targetType === "ally" || ab.shieldsAllies))
        || (ab.targetType === "ally" && (ab.buffStats || ab.buffType)));
    return {
        agresivo: attacks.length > 0,
        asesino: attacks.length > 0,
        guardian: attacks.length > 0,
        tirador: ranged,
        medico: support
    };
}

function chips(keys, catalog, cls) {
    const box = el("div", "taberna-chips");
    keys.forEach(k => box.appendChild(el("span", cls, catalog[k]?.name || k)));
    return box;
}

function portrait(src, alt) {
    const img = el("img", "taberna-portrait");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    return img;
}

// ---------- Interruptor ----------
function renderSwitch() {
    const sw = document.getElementById("hireableSwitch");
    const on = data?.hireable !== false;
    sw.setAttribute("aria-checked", String(on));
    sw.querySelector(".taberna-switch-label").textContent = on ? "Prendido" : "Apagado";
}

async function toggleHireable() {
    const sw = document.getElementById("hireableSwitch");
    sw.disabled = true;
    try {
        const res = await tavern("set-hireable", { value: !(data?.hireable !== false) });
        data.hireable = res.hireable;
        renderSwitch();
    } catch (err) {
        alert(err.message || "No se pudo cambiar.");
    } finally {
        sw.disabled = false;
    }
}

// ---------- Compañero contratado ----------
function renderCurrent() {
    const box = document.getElementById("currentCompanion");
    box.innerHTML = "";
    const c = data?.companion;
    if (!c) return;
    const s = c.snapshot || {};
    const style = STYLES.find(x => x.key === c.style);
    const card = el("div", "taberna-card taberna-current taberna-offer");
    const head = el("div", "taberna-offer-head");
    head.appendChild(portrait(s.icon, s.name || ""));
    const info = el("div");
    info.appendChild(el("div", "taberna-label", "Tu compañero en esta corrida"));
    info.appendChild(el("div", "taberna-name", s.name || "?"));
    const hp = c.hp > 0 ? `${c.hp}/${s.max_hp} de vida` : "Caído";
    info.appendChild(el("div", "taberna-meta", `Nivel ${s.level} · ${style?.name || c.style} · ${hp}`));
    head.appendChild(info);
    card.appendChild(head);
    box.appendChild(card);
}

// ---------- Lista ----------
function renderOffers() {
    const list = document.getElementById("offersList");
    list.innerHTML = "";
    const offers = data?.offers || [];

    if (data?.companion) {
        setStatus("Ya contrataste a tu compañero. La lista se renueva cuando vuelvas del laberinto.");
    } else if (data?.run_in_progress) {
        setStatus("Ya empezaste una corrida: solo se puede contratar antes de entrar al laberinto.", true);
    } else if (!offers.length) {
        setStatus("Hoy no hay exploradores disponibles para tu nivel. Volvé después de tu próxima corrida.");
    } else {
        setStatus("");
    }

    offers.forEach(o => list.appendChild(offerCard(o)));
}

function offerCard(o) {
    const card = el("div", "taberna-card taberna-offer" + (o.available ? "" : " taberna-offer--off"));

    const head = el("div", "taberna-offer-head");
    head.appendChild(portrait(o.icon, o.name));
    const info = el("div");
    info.appendChild(el("div", "taberna-name", o.name));
    info.appendChild(el("div", "taberna-meta", `Nivel ${o.level} · ${o.max_hp} de vida`));
    head.appendChild(info);
    const price = el("div", "taberna-price");
    price.innerHTML = `${o.price} ${ICON_COINS}`;
    head.appendChild(price);
    card.appendChild(head);

    const abs = (o.abilities || []).filter(k => ABILITIES[k]);
    if (abs.length) {
        const sec = el("div");
        sec.appendChild(el("div", "taberna-section-title", "Habilidades"));
        sec.appendChild(chips(abs, ABILITIES, "taberna-chip"));
        card.appendChild(sec);
    }
    const pas = (o.passives || []).filter(k => PASSIVES[k]);
    if (pas.length) {
        const sec = el("div");
        sec.appendChild(el("div", "taberna-section-title", "Pasivas"));
        sec.appendChild(chips(pas, PASSIVES, "taberna-chip taberna-chip--passive"));
        card.appendChild(sec);
    }

    // Si ya contrataste, la tarjeta queda solo para mirar.
    if (data.companion) return card;

    // Estilo de juego
    const allowed = stylesFor(abs);
    const sec = el("div");
    sec.appendChild(el("div", "taberna-section-title", "Estilo de juego"));
    const group = el("div", "taberna-styles");
    group.setAttribute("role", "radiogroup");
    const desc = el("div", "taberna-style-desc");
    const firstOk = STYLES.find(s => allowed[s.key]);
    STYLES.forEach(s => {
        const label = el("label", "taberna-style");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `style-${o.id}`;
        input.value = s.key;
        input.disabled = !allowed[s.key];
        if (s === firstOk) input.checked = true;
        input.addEventListener("change", () => { desc.textContent = s.desc; });
        label.appendChild(input);
        label.appendChild(el("span", null, s.name));
        if (!allowed[s.key]) label.title = "No tiene habilidades para este estilo";
        group.appendChild(label);
    });
    desc.textContent = firstOk?.desc || "";
    sec.appendChild(group);
    sec.appendChild(desc);
    card.appendChild(sec);

    // Contratar
    let reason = "";
    if (!o.available) reason = "Ya no está disponible.";
    else if (data.run_in_progress) reason = "Ya empezaste la corrida.";
    else if (!firstOk) reason = "No tiene habilidades para pelear.";
    else if ((data.gold ?? 0) < o.price) reason = `Te faltan ${o.price - (data.gold ?? 0)} de oro.`;

    const footer = el("div", "taberna-offer-footer");
    if (reason) footer.appendChild(el("div", "taberna-reason", reason));
    const btn = el("button", "ciudad-event-buy-btn", "Contratar");
    btn.type = "button";
    btn.disabled = !!reason;
    btn.addEventListener("click", () => {
        const style = group.querySelector("input:checked")?.value;
        if (style) hire(o, style, btn);
    });
    footer.appendChild(btn);
    card.appendChild(footer);
    return card;
}

async function hire(o, style, btn) {
    const styleName = STYLES.find(s => s.key === style)?.name || style;
    const ok = confirm(`¿Contratar a ${o.name} (${styleName}) por ${o.price} de oro? Te acompaña durante tu próxima corrida.`);
    if (!ok) return;
    btn.disabled = true;
    try {
        const res = await tavern("hire", { companion_id: o.id, style });
        data.companion = res.companion;
        data.gold = res.gold;
        renderGold();
        renderCurrent();
        renderOffers();
    } catch (err) {
        alert(err.message || "No se pudo contratar.");
        btn.disabled = false;
    }
}

// ---------- Arranque ----------
async function init() {
    try {
        data = await tavern("list");
    } catch (err) {
        console.error("[taberna]", err);
        setStatus("No se pudo cargar la Taberna. Probá de nuevo en un rato.", true);
        return;
    }
    renderGold();
    renderSwitch();
    renderCurrent();
    renderOffers();
}

document.getElementById("hireableSwitch").addEventListener("click", toggleHireable);
document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();
