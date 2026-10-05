// ============================================================
// admin.js — tabla de habilidades × stats (admin.html).
// Filas: habilidades. Columnas: stats. Fila de arriba: valores que se
// cargan a mano. Columna "Daño / efecto": lo que haría cada habilidad
// con esos valores, con las mismas fórmulas que battle.js.
// Solo lee abilities.js: no toca la base ni el combate.
// ============================================================
import { ABILITIES } from "./abilities.js";

const STORAGE_KEY = "admin:statValues";
const EQUIP_STATS = ["Arma Melee", "Arma Distancia", "Foco Magico", "Armadura"];

// Listas de stats que puede declarar una habilidad, con su marca.
// "debuff" son los stats que baja al blanco: se marcan, pero no entran
// en ninguna cuenta.
const KINDS = [
    { field: "damageStats", kind: "damage", mark: "●" },
    { field: "reductionStats", kind: "reduction", mark: "◆" },
    { field: "healStats", kind: "heal", mark: "✚" },
    { field: "buffStats", kind: "buff", mark: "▲" },
    { field: "dodgeStats", kind: "dodge", mark: "%" },
    { field: "debuffStats", kind: "debuff", mark: "↓" }
];

// Lista de stats de una habilidad para un tipo. debuffStats también
// incluye los de debuffPercent (Ceguera), que van dentro de un objeto.
function statsOf(ab, field) {
    if (field === "debuffStats") return [...(ab.debuffStats || []), ...(ab.debuffPercent?.stats || [])];
    return ab[field] || [];
}

// ---------- Columnas: todos los stats que usa alguna habilidad ----------
function collectStats() {
    const set = new Set();
    Object.values(ABILITIES).forEach(ab => {
        KINDS.forEach(k => statsOf(ab, k.field).forEach(st => set.add(st)));
    });
    const equip = EQUIP_STATS.filter(st => set.has(st));
    const rest = [...set].filter(st => !EQUIP_STATS.includes(st)).sort((a, b) => a.localeCompare(b, "es"));
    return [...equip, ...rest];
}

const STATS = collectStats();
let values = loadValues();

function loadValues() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveValues() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
        // sin storage: los valores duran hasta recargar
    }
}

// ---------- Fórmulas (copiadas de battle.js) ----------
const val = st => Number(values[st]) || 0;

// floor(suma / cantidad), igual que averageStats.
function avg(list) {
    if (!list || list.length === 0) return 0;
    return Math.floor(list.reduce((acc, st) => acc + val(st), 0) / list.length);
}

function hasAnyValue(list) {
    return (list || []).some(st => values[st] !== undefined && values[st] !== "");
}

// Texto del resultado de una habilidad, o null si no hay valores cargados
// en ninguno de los stats que usa.
function resultFor(ab) {
    const used = [ab.damageStats, ab.reductionStats, ab.healStats, ab.buffStats, ab.dodgeStats];
    if (!used.some(hasAnyValue)) return null;

    const parts = [];
    if (ab.damageStats) {
        const mult = ab.damageMultiplier ?? 1;
        const dmg = Math.max(1, Math.floor(avg(ab.damageStats) * mult));
        let text = `Daño ${dmg}`;
        if (ab.critChance) text += ` (crít. ${Math.ceil(dmg * (ab.critMultiplier ?? 1.5))})`;
        parts.push(text);
    }
    if (ab.reductionStats) {
        const mult = ab.reductionMultiplier ?? 1;
        parts.push(`Reduce ${Math.max(ab.reductionMin || 0, Math.floor(avg(ab.reductionStats) * mult))}`);
    }
    if (ab.healStats) {
        const mult = ab.healMultiplier ?? 1;
        parts.push(`Cura ${Math.floor(avg(ab.healStats) * mult)}`);
    }
    if (ab.buffStats) {
        if (ab.buffType === "AP") {
            const mult = ab.buffMultiplier ?? 1;
            parts.push(`+${Math.max(1, Math.floor(avg(ab.buffStats) * mult))} PA`);
        } else {
            parts.push(`+${avg(ab.buffStats)} daño`);
        }
    }
    if (ab.dodgeStats) {
        const sum = ab.dodgeStats.reduce((acc, st) => acc + val(st), 0);
        const chance = Math.min(85, Math.floor(25 + 30.83 * Math.log(1 + sum / 60)));
        parts.push(`Esquiva ${chance}%`);
    }
    return parts.join(" · ");
}

// Multiplicadores para mostrar debajo del nombre.
function multText(ab) {
    const m = [];
    if (ab.damageStats) m.push(`×${ab.damageMultiplier ?? 1}`);
    if (ab.reductionStats && ab.reductionMultiplier != null) m.push(`red. ×${ab.reductionMultiplier}`);
    if (ab.healStats && ab.healMultiplier != null) m.push(`cura ×${ab.healMultiplier}`);
    if (ab.buffStats && ab.buffMultiplier != null) m.push(`buff ×${ab.buffMultiplier}`);
    return m.join(" · ");
}

// ---------- Armado de la tabla ----------
const table = document.getElementById("statsTable");
const filterInput = document.getElementById("filterInput");
const onlyFilled = document.getElementById("onlyFilled");
const rowRefs = []; // { key, ab, tr, resultCell, markCells: [{ st, td }] }

function build() {
    const thead = document.createElement("thead");

    const namesRow = document.createElement("tr");
    namesRow.className = "names";
    namesRow.innerHTML = `<th class="sticky-1">Habilidad</th><th class="sticky-2">Daño / efecto</th>` +
        STATS.map(st => `<th class="stat-name${EQUIP_STATS.includes(st) ? " equip" : ""}"><span>${st}</span></th>`).join("");
    thead.appendChild(namesRow);

    const valuesRow = document.createElement("tr");
    valuesRow.className = "values";
    valuesRow.innerHTML = `<th class="sticky-1">Valores</th><th class="sticky-2"></th>`;
    STATS.forEach(st => {
        const th = document.createElement("th");
        const input = document.createElement("input");
        input.type = "number";
        input.className = "stat-input";
        input.placeholder = " ";
        input.title = st;
        input.inputMode = "numeric";
        if (values[st] !== undefined) input.value = values[st];
        input.addEventListener("input", () => {
            if (input.value === "") delete values[st];
            else values[st] = input.value;
            saveValues();
            refresh();
        });
        th.appendChild(input);
        valuesRow.appendChild(th);
    });
    thead.appendChild(valuesRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    Object.entries(ABILITIES)
        .sort(([, a], [, b]) => (a.name || "").localeCompare(b.name || "", "es"))
        .forEach(([key, ab]) => {
            const tr = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.className = "sticky-1";
            const mult = multText(ab);
            nameCell.innerHTML = `${ab.name || key}<small>${key}${mult ? " · " + mult : ""}</small>`;
            tr.appendChild(nameCell);

            const resultCell = document.createElement("td");
            resultCell.className = "sticky-2 result";
            tr.appendChild(resultCell);

            const markCells = [];
            STATS.forEach(st => {
                const td = document.createElement("td");
                const kind = KINDS.find(k => statsOf(ab, k.field).includes(st));
                if (kind) {
                    td.className = `mark ${kind.kind}`;
                    td.textContent = kind.mark;
                    td.title = `${ab.name || key} · ${st}`;
                    markCells.push({ st, td });
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
            rowRefs.push({ key, ab, tr, resultCell, markCells });
        });
    table.appendChild(tbody);
}

function refresh() {
    const query = filterInput.value.trim().toLowerCase();
    rowRefs.forEach(({ key, ab, tr, resultCell, markCells }) => {
        const result = resultFor(ab);
        resultCell.textContent = result ?? "—";
        resultCell.classList.toggle("empty", result === null);
        markCells.forEach(({ st, td }) => td.classList.toggle("filled", values[st] !== undefined));

        const matchesText = !query || (ab.name || "").toLowerCase().includes(query) || key.toLowerCase().includes(query);
        const matchesFilled = !onlyFilled.checked || result !== null;
        tr.classList.toggle("hidden", !(matchesText && matchesFilled));
    });
}

document.getElementById("clearBtn").addEventListener("click", () => {
    values = {};
    saveValues();
    table.querySelectorAll("input.stat-input").forEach(i => { i.value = ""; });
    refresh();
});
filterInput.addEventListener("input", refresh);
onlyFilled.addEventListener("change", refresh);

build();
refresh();
