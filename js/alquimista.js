// ============================================================
// alquimista.js — lista las almas conectadas del personaje y deja
// desconectarlas pagando (disconnect-soul.ts valida y cobra). Cada
// carta muestra lo que el alma le pasa al jugador: stats personales
// (sin los de equipo, igual que get-character-state), habilidades y
// pasivas.
// ============================================================
import { requireSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";
import { getBank } from "./citybank.js";
import { disconnectSoul, SOUL_DISCONNECT_PRICE } from "./souls.js";
import { PLAYER_CONFIG } from "./player.js";
import { ICON_COINS } from "./icons.js";
import { ABILITIES } from "./abilities.js";
import { PASSIVES } from "./passives.js";

requireSession();

// Mismo criterio que get-character-state: estos stats no pasan con el alma.
const EQUIPMENT_STATS = ["Arma Melee", "Arma Distancia", "Foco Magico", "Armadura"];

let souls = [];        // soul_type del personaje (de get-character-state)
let creatures = {};    // key → { label, icon, stats, abilities, passives }
let level = 1;
let goldBalance = 0;
let busy = false;      // evita dos desconexiones a la vez

function updateGoldLabel() {
    document.getElementById("goldLabel").innerHTML = `Oro: ${goldBalance} ${ICON_COINS}`;
}

async function getCreatures(keys) {
    if (!keys.length) return {};
    const list = keys.map(encodeURIComponent).join(",");
    const res = await supabaseFetch(
        `/rest/v1/creature_types?key=in.(${list})&select=key,label,icon,stats,abilities,passives`
    );
    const rows = await res.json();
    const byKey = {};
    for (const row of rows || []) byKey[row.key] = row;
    return byKey;
}

// Stats personales del alma, de mayor a menor.
function personalStats(creature) {
    return Object.entries(creature?.stats || {})
        .filter(([k]) => !EQUIPMENT_STATS.includes(k))
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
}

function abilityNames(creature) {
    return (creature?.abilities || []).map(k => ABILITIES[k]?.name || k);
}

function passiveNames(creature) {
    return (creature?.passives || []).map(k => PASSIVES[k]?.name || k);
}

function renderSlots() {
    document.getElementById("alquimistaSlots").textContent =
        `Almas conectadas: ${souls.length} de ${level}. El alquimista cobra ${SOUL_DISCONNECT_PRICE} de oro por separar un alma; la ranura queda libre para otra.`;
}

async function handleDisconnect(soulType, btn) {
    if (busy) return;
    const creature = creatures[soulType];
    const name = creature?.label || soulType;
    const lose = [];
    const stats = personalStats(creature);
    if (stats.length) lose.push(`${stats.reduce((s, [, v]) => s + v, 0)} puntos de stats`);
    const abs = abilityNames(creature);
    if (abs.length) lose.push(`${abs.length > 1 ? "las habilidades" : "la habilidad"} ${abs.join(", ")}`);
    const pas = passiveNames(creature);
    if (pas.length) lose.push(`${pas.length > 1 ? "las pasivas" : "la pasiva"} ${pas.join(", ")}`);

    const ok = confirm(
        `¿Desconectar el alma de ${name} por ${SOUL_DISCONNECT_PRICE} de oro?` +
        (lose.length ? `\n\nVas a perder ${lose.join(", ")}.` : "") +
        `\n\nEl alma se pierde para siempre.`
    );
    if (!ok) return;

    busy = true;
    btn.disabled = true;
    btn.textContent = "Desconectando…";
    let result;
    try {
        result = await disconnectSoul(soulType);
    } catch {
        result = { error: "No se pudo contactar al alquimista. Probá de nuevo." };
    }
    busy = false;

    if (result.error) {
        alert(result.error);
        if (typeof result.gold === "number") goldBalance = result.gold;
        render();
        return;
    }

    goldBalance = result.gold;
    souls = souls.filter(s => s !== soulType);
    updateGoldLabel();
    render();
}

function render() {
    renderSlots();
    const list = document.getElementById("alquimistaSouls");
    list.innerHTML = "";

    if (souls.length === 0) {
        const empty = document.createElement("div");
        empty.className = "armeria-empty";
        empty.textContent = "No tenés almas conectadas. Se consiguen al vencer criaturas en el laberinto.";
        list.appendChild(empty);
        return;
    }

    const canAfford = goldBalance >= SOUL_DISCONNECT_PRICE;

    souls.forEach(soulType => {
        const creature = creatures[soulType];
        const stats = personalStats(creature);
        const total = stats.reduce((s, [, v]) => s + v, 0);
        const abs = abilityNames(creature);
        const pas = passiveNames(creature);

        const card = document.createElement("div");
        card.className = "armeria-item-card alquimista-soul-card";

        const header = document.createElement("div");
        header.className = "armeria-item-header";
        header.innerHTML = `
            <span class="armeria-item-name">${creature?.icon ? `<img class="alquimista-soul-icon" src="${creature.icon}" alt="">` : ""}${creature?.label || soulType}</span>
            <span class="armeria-item-price">${SOUL_DISCONNECT_PRICE} ${ICON_COINS}</span>
        `;
        card.appendChild(header);

        // Stats: una fila por stat (nombre a la izquierda, valor a la derecha).
        const statsEl = document.createElement("div");
        statsEl.className = "alquimista-stat-list";
        if (stats.length) {
            stats.forEach(([k, v]) => {
                const row = document.createElement("div");
                row.className = "alquimista-stat-row";
                const name = document.createElement("span");
                name.className = "alquimista-stat-name";
                name.textContent = k;
                const value = document.createElement("span");
                value.className = "alquimista-stat-value";
                value.textContent = `+${v}`;
                row.append(name, value);
                statsEl.appendChild(row);
            });
        } else {
            const none = document.createElement("div");
            none.className = "alquimista-stat-row";
            none.textContent = "No da stats.";
            statsEl.appendChild(none);
        }
        card.appendChild(statsEl);

        if (stats.length) {
            const totalEl = document.createElement("div");
            totalEl.className = "alquimista-soul-total";
            totalEl.textContent = `Total: +${total} en ${stats.length} stats`;
            card.appendChild(totalEl);
        }

        // Habilidades y pasivas: un bloque por tipo, una línea por cada una.
        const addGrantGroup = (title, names, extraClass) => {
            if (!names.length) return;
            const group = document.createElement("div");
            group.className = "alquimista-grant-group";
            const heading = document.createElement("div");
            heading.className = "alquimista-grant-title";
            heading.textContent = title;
            group.appendChild(heading);
            names.forEach(n => {
                const item = document.createElement("div");
                item.className = `alquimista-grant ${extraClass}`;
                item.textContent = n;
                group.appendChild(item);
            });
            card.appendChild(group);
        };
        addGrantGroup(abs.length > 1 ? "Habilidades" : "Habilidad", abs, "alquimista-grant--ability");
        addGrantGroup(pas.length > 1 ? "Pasivas" : "Pasiva", pas, "alquimista-grant--passive");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "armeria-item-btn alquimista-disconnect-btn";
        btn.textContent = "Desconectar";
        btn.disabled = !canAfford || busy;
        if (!canAfford) btn.title = `Necesitás ${SOUL_DISCONNECT_PRICE} de oro`;
        btn.addEventListener("click", () => handleDisconnect(soulType, btn));
        card.appendChild(btn);

        list.appendChild(card);
    });

    if (!canAfford) {
        const note = document.createElement("div");
        note.className = "alquimista-note";
        note.textContent = `Te faltan ${SOUL_DISCONNECT_PRICE - goldBalance} de oro para desconectar un alma.`;
        list.appendChild(note);
    }
}

async function init() {
    if (!PLAYER_CONFIG) return; // sesión inválida/personaje muerto — player.js ya redirigió
    level = PLAYER_CONFIG.level ?? 1;
    souls = [...(PLAYER_CONFIG.souls || [])];
    const [bank, creaturesRes] = await Promise.all([getBank(), getCreatures(souls)]);
    goldBalance = bank.gold;
    creatures = creaturesRes;
    updateGoldLabel();
    render();
}

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();
