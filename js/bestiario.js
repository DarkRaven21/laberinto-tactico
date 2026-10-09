// ============================================================
// bestiario.js — Bestiario de la ciudad (bestiario.html).
// Todas las criaturas del laberinto, por nivel → bioma → familia,
// más una sección aparte para las grietas.
//   · No matada: silueta (filtro CSS sobre la imagen) y "???".
//   · Matada: nombre, imagen, vida, PA, PM, habilidades y pasivas.
// Las hidden muestran "Aparece desde la sala 8" en ese nivel.
// Si una criatura aparece en varios niveles, su carta se repite en cada uno.
//
// Datos: creature_types (caché de enemies.js) y killed_types de
// progress-action (persistente por personaje). Sin SQL propio.
// Los textos de habilidades y pasivas salen de ability-text.js.
// ============================================================
import { requireSession } from "./session.js";
import { ENEMY_TYPES } from "./enemies.js";
import { ABILITIES } from "./abilities.js";
import { PASSIVES } from "./passives.js";
import { getProgress } from "./progress.js";
import { BIOMES, FAMILY_BIOME, DEFAULT_BIOME } from "./biomes.js";
import { abilityNumbers, effectLines, metaChips, passiveLines } from "./ability-text.js";

requireSession();

const HIDDEN_ROOM = 8;

// Nombre que se muestra de cada familia. Una familia que no figure acá
// muestra su clave separada en palabras ("darkForest" → "Dark Forest").
const FAMILY_NAMES = {
    goblin: "Goblins",
    skeleton: "Esqueletos",
    hauntedForest: "Bosque Embrujado",
    jungleTribe: "Tribu de la Jungla",
    desert: "Criaturas del Desierto",
    dwarvenLaboratory: "Laboratorio Enano",
    seaNier: "Pueblo Nier",
    darkForest: "Bosque Oscuro",
    cave: "Criaturas de la Cueva",
    ice: "Criaturas del Hielo",
    gnoll: "Gnolls",
    orc: "Orcos",
    mind: "Mentes",
    grok: "Groks",
};

// Grietas. La tabla rifts no se lee desde el cliente, así que acá va a
// mano qué criaturas son propias de cada grieta (las que no aparecen en
// ningún nivel: level_visibility vacío). Para una grieta nueva, sumar
// una entrada. Si una criatura sin nivel no figura en ninguna, aparece
// igual en "Otras grietas", así no se pierde.
const RIFTS = [
    { name: "Guarida del Rey Goblin", level: 1, creatures: ["goblinGuardian", "goblinKing"] },
];

// Familias que no van en el bestiario. Los bandidos son otros jugadores:
// no dan XP, así que nunca entran en killed_types y quedarían siempre
// como silueta.
const EXCLUDED_FAMILIES = new Set(["bandidos"]);

let killed = new Set();

// ---------- Utilidades ----------
function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

// Los jsonb llegan como objeto, pero por las dudas aceptamos texto.
function asJson(v, fallback) {
    if (v == null) return fallback;
    if (typeof v === "string") {
        try { return JSON.parse(v); } catch { return fallback; }
    }
    return v;
}

function familyName(fam) {
    if (FAMILY_NAMES[fam]) return FAMILY_NAMES[fam];
    if (!fam) return "Otras";
    const words = fam.replace(/([a-z])([A-Z])/g, "$1 $2");
    return words[0].toUpperCase() + words.slice(1);
}

function biomeOf(family) {
    const key = FAMILY_BIOME[family];
    return BIOMES[key] ? key : DEFAULT_BIOME;
}

const BIOME_ORDER = Object.keys(BIOMES);
const biomeRank = key => {
    const i = BIOME_ORDER.indexOf(key);
    return i === -1 ? BIOME_ORDER.length : i;
};

const labelOf = key => ENEMY_TYPES[key]?.label || key;

// Primero las normales, la hidden al final; dentro de cada grupo, por nombre.
function sortCreatures(list) {
    return list.sort((a, b) =>
        (Number(a.hidden) - Number(b.hidden)) ||
        labelOf(a.key).localeCompare(labelOf(b.key), "es")
    );
}

// ---------- Índice: nivel → bioma → familia → criaturas ----------
function buildIndex() {
    const byLevel = new Map();
    const noLevel = [];

    for (const [key, c] of Object.entries(ENEMY_TYPES)) {
        if (EXCLUDED_FAMILIES.has(c.family)) continue;
        const vis = asJson(c.levelVisibility, {}) || {};
        const levels = Object.entries(vis)
            .filter(([lvl, v]) => v && Number.isFinite(Number(lvl)))
            .map(([lvl, v]) => ({ level: Number(lvl), hidden: v === "hidden" }));

        if (!levels.length) {
            noLevel.push(key);
            continue;
        }

        const biome = biomeOf(c.family);
        const fam = c.family || "";
        for (const { level, hidden } of levels) {
            if (!byLevel.has(level)) byLevel.set(level, new Map());
            const biomes = byLevel.get(level);
            if (!biomes.has(biome)) biomes.set(biome, new Map());
            const fams = biomes.get(biome);
            if (!fams.has(fam)) fams.set(fam, []);
            fams.get(fam).push({ key, hidden });
        }
    }
    return { byLevel, noLevel };
}

// ---------- Carta ----------
function portrait(c, known) {
    if (c.icon) {
        const img = el("img", "bst-portrait" + (known ? "" : " bst-portrait--unknown"));
        img.src = c.icon;
        img.alt = known ? c.label : "Criatura desconocida";
        img.loading = "lazy";
        img.decoding = "async";
        return img;
    }
    return el("div", "bst-portrait bst-portrait--empty", "?");
}

function chipRow(texts) {
    const row = el("div", "hab-meta");
    texts.forEach(t => row.appendChild(el("span", "hab-chip", t)));
    return row;
}

function abilityBlock(ab, getStat) {
    const block = el("div", "bst-ability");
    block.appendChild(el("div", "bst-ability-name", ab.name));
    block.appendChild(chipRow(metaChips(ab)));

    const opts = {};
    if (ab.summon) {
        const s = ENEMY_TYPES[ab.summon];
        if (s) {
            opts.summonLabel = s.label;
            opts.summonHp = s.hp;
        }
    }
    const lines = effectLines(ab, abilityNumbers(ab, getStat), opts);
    if (lines.length) {
        const result = el("div", "hab-result");
        lines.forEach(t => result.appendChild(el("div", null, t)));
        block.appendChild(result);
    }
    return block;
}

function passiveBlock(pas, key, getStat) {
    const block = el("div", "bst-passive");
    block.appendChild(el("div", "bst-ability-name", pas?.name || key));
    const lines = passiveLines(pas, getStat);
    if (lines.length) {
        const box = el("div", "bst-passive-lines");
        lines.forEach(t => box.appendChild(el("div", null, t)));
        block.appendChild(box);
    }
    return block;
}

function renderCard(key, { hidden = false } = {}) {
    const c = ENEMY_TYPES[key];
    const known = killed.has(key);

    const card = el("div", "armeria-item-card bst-card" + (known ? "" : " bst-card--unknown"));

    const head = el("div", "bst-head");
    head.appendChild(portrait(c, known));
    const info = el("div", "bst-info");
    info.appendChild(el("span", "armeria-item-name", known ? c.label : "???"));
    if (known) info.appendChild(chipRow([`${c.hp} de vida`, `${c.ap} PA`, `${c.move} PM`]));
    if (hidden) info.appendChild(el("div", "bst-hidden-note", `Aparece desde la sala ${HIDDEN_ROOM}`));
    head.appendChild(info);
    card.appendChild(head);

    if (!known) return card;

    const stats = asJson(c.stats, {}) || {};
    const getStat = st => Number(stats[st]) || 0;

    const abilities = (asJson(c.abilities, []) || []).filter(k => ABILITIES[k]);
    if (abilities.length) {
        const sec = el("div", "bst-section");
        sec.appendChild(el("div", "bst-section-title", "Habilidades"));
        abilities.forEach(k => sec.appendChild(abilityBlock(ABILITIES[k], getStat)));
        card.appendChild(sec);
    }

    const passives = asJson(c.passives, []) || [];
    if (passives.length) {
        const sec = el("div", "bst-section");
        sec.appendChild(el("div", "bst-section-title", "Pasivas"));
        passives.forEach(k => sec.appendChild(passiveBlock(PASSIVES[k], k, getStat)));
        card.appendChild(sec);
    }

    return card;
}

function cardGrid(entries) {
    const grid = el("div", "armeria-item-list bst-grid");
    entries.forEach(({ key, hidden }) => grid.appendChild(renderCard(key, { hidden })));
    return grid;
}

// ---------- Secciones ----------
function renderLevel(level, biomes) {
    const section = el("section", "bst-level");
    section.appendChild(el("h2", "bst-level-title", `Nivel ${level}`));

    [...biomes.keys()]
        .sort((a, b) => biomeRank(a) - biomeRank(b))
        .forEach(biomeKey => {
            const biomeEl = el("div", "bst-biome");
            biomeEl.appendChild(el("h3", "bst-biome-title", BIOMES[biomeKey]?.name || biomeKey));

            const fams = biomes.get(biomeKey);
            [...fams.keys()]
                .sort((a, b) => familyName(a).localeCompare(familyName(b), "es"))
                .forEach(fam => {
                    const famEl = el("div", "bst-family");
                    famEl.appendChild(el("h4", "bst-family-title", familyName(fam)));
                    famEl.appendChild(cardGrid(sortCreatures(fams.get(fam))));
                    biomeEl.appendChild(famEl);
                });

            section.appendChild(biomeEl);
        });

    return section;
}

function renderRifts(noLevel) {
    const listed = new Set(RIFTS.flatMap(r => r.creatures));
    const groups = RIFTS
        .map(r => ({
            name: r.name,
            sub: r.level ? `Nivel ${r.level}` : null,
            keys: r.creatures.filter(k => ENEMY_TYPES[k])
        }))
        .filter(g => g.keys.length);

    const others = noLevel.filter(k => !listed.has(k));
    if (others.length) groups.push({ name: "Otras grietas", sub: null, keys: others });
    if (!groups.length) return null;

    const section = el("section", "bst-level bst-level--rifts");
    section.appendChild(el("h2", "bst-level-title", "Grietas"));

    groups.forEach(g => {
        const riftEl = el("div", "bst-biome");
        const title = el("h3", "bst-biome-title", g.name);
        if (g.sub) title.appendChild(el("span", "bst-biome-sub", ` · ${g.sub}`));
        riftEl.appendChild(title);
        riftEl.appendChild(cardGrid(sortCreatures(g.keys.map(key => ({ key, hidden: false })))));
        section.appendChild(riftEl);
    });

    return section;
}

function render() {
    const list = document.getElementById("bestiarioList");
    list.innerHTML = "";

    const { byLevel, noLevel } = buildIndex();
    [...byLevel.keys()]
        .sort((a, b) => a - b)
        .forEach(level => list.appendChild(renderLevel(level, byLevel.get(level))));

    const rifts = renderRifts(noLevel);
    if (rifts) list.appendChild(rifts);
}

// ---------- Arranque ----------
async function init() {
    const summary = document.getElementById("bestiarioSummary");
    try {
        const progress = await getProgress();
        killed = new Set(progress.killedTypes || []);
    } catch (e) {
        console.error("[bestiario]", e);
        summary.textContent = "No se pudo cargar tu progreso. Probá de nuevo en un rato.";
        return;
    }
    summary.textContent = "Las criaturas del laberinto, por nivel, bioma y familia. Las que todavía no mataste aparecen en sombras.";
    render();
}

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();
