// ============================================================
// habilidades.js — control personal de habilidades (habilidades.html).
// Lista todas las habilidades del personaje (clase + almas + equipo,
// tal como las arma get-character-state), con los atributos que usan
// y el resultado con los stats actuales. Cada una se puede desactivar:
// las desactivadas no aparecen en la mano del combate (ver
// ability-prefs.js y renderHand en battle.js).
// Los números y textos salen de ability-text.js.
// ============================================================
import { requireSession, getSession } from "./session.js";
import { PLAYER_CONFIG } from "./player.js";
import { ABILITIES } from "./abilities.js";
import { getHiddenAbilities, setHiddenAbilities } from "./ability-prefs.js";
import { abilityNumbers, effectLines, metaChips, usedStats } from "./ability-text.js";

requireSession();

const EQUIP_STATS = ["Arma Melee", "Arma Distancia", "Foco Magico", "Armadura"];

let abilities = [];   // claves, en el mismo orden que la mano del combate
let stats = {};       // stats totales del personaje (con equipo y estilo de vida)
let hidden = new Set();
let characterId = null;

const val = st => Number(stats[st]) || 0;

// ---------- Render ----------
function activeCount() {
    return abilities.filter(k => !hidden.has(k)).length;
}

function renderSummary() {
    document.getElementById("habilidadesSummary").textContent =
        `Activas: ${activeCount()} de ${abilities.length}. Las desactivadas no aparecen en el combate; las seguís teniendo y podés volver a activarlas cuando quieras. Se guarda en este dispositivo.`;
}

function toggle(key) {
    if (hidden.has(key)) {
        hidden.delete(key);
    } else {
        if (activeCount() <= 1) return; // siempre queda al menos una
        hidden.add(key);
    }
    setHiddenAbilities(characterId, hidden);
    render();
}

function render() {
    renderSummary();
    const list = document.getElementById("habilidadesList");
    list.innerHTML = "";

    if (!abilities.length) {
        const empty = document.createElement("div");
        empty.className = "armeria-empty";
        empty.textContent = "Tu personaje no tiene habilidades.";
        list.appendChild(empty);
        return;
    }

    const onlyOneActive = activeCount() <= 1;

    abilities.forEach(key => {
        const ab = ABILITIES[key];
        if (!ab) return;
        const isHidden = hidden.has(key);

        const card = document.createElement("div");
        card.className = "armeria-item-card hab-card" + (isHidden ? " hab-card--off" : "");

        // Nombre + interruptor
        const header = document.createElement("div");
        header.className = "hab-header";
        const name = document.createElement("span");
        name.className = "armeria-item-name";
        name.textContent = ab.name || key;

        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "hab-switch";
        sw.setAttribute("role", "switch");
        sw.setAttribute("aria-checked", String(!isHidden));
        sw.setAttribute("aria-label", `${ab.name || key}: ${isHidden ? "desactivada" : "activa"}`);
        sw.innerHTML = `<span class="hab-switch-track"><span class="hab-switch-thumb"></span></span><span class="hab-switch-label">${isHidden ? "Desactivada" : "Activa"}</span>`;
        if (!isHidden && onlyOneActive) {
            sw.disabled = true;
            sw.title = "Tenés que dejar al menos una habilidad activa";
        }
        sw.addEventListener("click", () => toggle(key));
        header.append(name, sw);
        card.appendChild(header);

        // Costo, cooldown y alcance
        const meta = document.createElement("div");
        meta.className = "hab-meta";
        metaChips(ab).forEach(t => {
            const chip = document.createElement("span");
            chip.className = "hab-chip";
            chip.textContent = t;
            meta.appendChild(chip);
        });
        card.appendChild(meta);

        // Resultado con tus stats
        const parts = effectLines(ab, abilityNumbers(ab, val));
        if (parts.length) {
            const result = document.createElement("div");
            result.className = "hab-result";
            parts.forEach(t => {
                const line = document.createElement("div");
                line.textContent = t;
                result.appendChild(line);
            });
            card.appendChild(result);
        }

        // Atributos que usa, con tu valor
        const used = usedStats(ab);
        const statsEl = document.createElement("div");
        statsEl.className = "alquimista-stat-list";
        if (used.length) {
            const title = document.createElement("div");
            title.className = "alquimista-grant-title";
            title.textContent = "Usa";
            statsEl.appendChild(title);
            used.forEach(st => {
                const row = document.createElement("div");
                row.className = "alquimista-stat-row" + (EQUIP_STATS.includes(st) ? " hab-stat--equip" : "");
                const n = document.createElement("span");
                n.className = "alquimista-stat-name";
                n.textContent = st;
                const v = document.createElement("span");
                v.className = "alquimista-stat-value";
                v.textContent = String(val(st));
                row.append(n, v);
                statsEl.appendChild(row);
            });
        } else {
            const none = document.createElement("div");
            none.className = "alquimista-stat-row";
            none.textContent = "No depende de tus atributos.";
            statsEl.appendChild(none);
        }
        card.appendChild(statsEl);

        list.appendChild(card);
    });
}

function init() {
    if (!PLAYER_CONFIG) return; // sesión inválida/personaje muerto — player.js ya redirigió
    characterId = getSession()?.id;
    abilities = (PLAYER_CONFIG.abilities || []).filter(k => ABILITIES[k]);
    stats = PLAYER_CONFIG.stats || {};
    hidden = getHiddenAbilities(characterId);
    render();
}

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();