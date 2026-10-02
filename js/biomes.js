// ============================================================
// biomes.js — biomas del tablero de combate.
// Config (qué obstáculos y decoración tiene cada bioma), arte en SVG
// y la asignación familia → bioma. Todo es visual: nada acá cambia
// reglas, movimiento ni alcance.
//
// Para sumar un bioma: una entrada en BIOMES, sus estilos
// .biome-<key> en battle.css y la familia en FAMILY_BIOME.
// Para sumar un asset: dibujarlo en OBSTACLE_ART o DECOR_ART y
// nombrarlo en `obstacles` o `groundDecor` del bioma que lo use.
// ============================================================

// `obstacles`: casillas bloqueadas; se sortea uno por casilla (repetir
// un nombre = más probable).
// `groundDecor`: casillas libres; se prueba en orden y gana la primera
// que salga, el resto queda limpio. Conviene poner lo más raro primero.
export const BIOMES = {
    forest: {
        name: "Bosque",
        obstacles: ["tree", "tree", "tree", "bush", "bush", "rock", "fallenLog", "stump"],
        groundDecor: [
            { art: "puddle", chance: 0.03 },
            { art: "mushrooms", chance: 0.04 },
            { art: "flowers", chance: 0.05 },
            { art: "leaves", chance: 0.06 },
            { art: "tuft", chance: 0.2 }
        ]
    },
    cemetery: {
        name: "Cementerio",
        obstacles: ["tombstone", "tombstone", "tombstone", "deadTree", "deadTree", "brokenFence", "brokenFence", "crypt"],
        groundDecor: [
            { art: "candles", chance: 0.03 },
            { art: "skull", chance: 0.03 },
            { art: "bones", chance: 0.05 },
            { art: "fog", chance: 0.12 }
        ]
    },
    swamp: {
        name: "Pantano",
        obstacles: ["swampTree", "swampTree", "swampTree", "deepWater", "deepWater", "rottenLog", "rottenLog", "mossTotem"],
        groundDecor: [
            { art: "lilyPad", chance: 0.04 },
            { art: "fireflies", chance: 0.04 },
            { art: "bubbles", chance: 0.05 },
            { art: "mud", chance: 0.12 }
        ]
    },
    camp: {
        name: "Campamento",
        obstacles: ["crates", "crates", "barrel", "barrel", "tent", "cart", "campfire"],
        groundDecor: [
            { art: "bottle", chance: 0.03 },
            { art: "embers", chance: 0.03 },
            { art: "sack", chance: 0.04 },
            { art: "footprints", chance: 0.12 }
        ]
    },
    desert: {
        name: "Desierto",
        obstacles: ["cactus", "cactus", "cactus", "rockPile", "rockPile", "duneMound", "duneMound", "brokenColumn"],
        groundDecor: [
            { art: "scarab", chance: 0.02 },
            { art: "oxSkull", chance: 0.03 },
            { art: "pebbles", chance: 0.06 },
            { art: "ripples", chance: 0.16 }
        ]
    },
};

// Familia → bioma. Una familia que no figure acá usa DEFAULT_BIOME.
// Para volver a probar todo en bosque, alcanza con comentar estas líneas.
export const FAMILY_BIOME = {
    hauntedForest: "forest",
    skeleton: "cemetery",
    jungleTribe: "swamp",
    bandidos: "camp",
    desert: "desert",
};
export const DEFAULT_BIOME = "forest";

// ---------- Arte (SVG inline, viewBox 92×92 = una casilla) ----------
const svg = inner => `<svg class="cell-art" viewBox="0 0 92 92" aria-hidden="true">${inner}</svg>`;

// Obstáculos: centrados en la casilla.
const OBSTACLE_ART = {
    // Bosque
    tree: svg(`<ellipse cx="52" cy="58" rx="38" ry="30" fill="rgba(0,0,0,0.38)"/><circle cx="46" cy="45" r="34" fill="#2d5429"/><circle cx="31" cy="38" r="19" fill="#386a33"/><circle cx="59" cy="34" r="20" fill="#3e7437"/><circle cx="50" cy="59" r="19" fill="#33622f"/><circle cx="37" cy="29" r="9" fill="#5a9447" opacity="0.7"/><circle cx="61" cy="26" r="7" fill="#6ba653" opacity="0.55"/><circle cx="28" cy="50" r="5" fill="#4d8540" opacity="0.6"/>`),
    bush: svg(`<ellipse cx="50" cy="58" rx="26" ry="16" fill="rgba(0,0,0,0.35)"/><circle cx="36" cy="50" r="14" fill="#3d6b34"/><circle cx="57" cy="49" r="13" fill="#467a3a"/><circle cx="46" cy="37" r="13" fill="#4f8641"/><circle cx="42" cy="33" r="5" fill="#6ea95a" opacity="0.6"/><circle cx="38" cy="47" r="2.6" fill="#c24a3a"/><circle cx="55" cy="42" r="2.6" fill="#c24a3a"/><circle cx="50" cy="54" r="2.6" fill="#c24a3a"/>`),
    rock: svg(`<ellipse cx="50" cy="64" rx="32" ry="14" fill="rgba(0,0,0,0.4)"/><path d="M18 60 L26 36 L44 26 L64 30 L76 48 L72 64 L48 70 L28 68 Z" fill="#5f6660"/><path d="M44 26 L64 30 L76 48 L58 46 Z" fill="#7a827a"/><path d="M26 36 L44 26 L58 46 L40 50 Z" fill="#6d746d"/><path d="M40 50 L58 46 L72 64 L48 70 Z" fill="#4e544f"/><circle cx="32" cy="58" r="4" fill="#4f6b45" opacity="0.85"/><circle cx="38" cy="62" r="3" fill="#5b7a4f" opacity="0.8"/>`),
    fallenLog: svg(`<ellipse cx="48" cy="60" rx="38" ry="12" fill="rgba(0,0,0,0.38)"/><g transform="rotate(-18 46 50)"><rect x="12" y="40" width="66" height="18" rx="9" fill="#6b4a2e"/><rect x="16" y="41" width="58" height="5" rx="2.5" fill="#86603e"/><ellipse cx="74" cy="49" rx="6" ry="9" fill="#b08559"/><ellipse cx="74" cy="49" rx="3" ry="5" fill="none" stroke="#6b4a2e" stroke-width="1.2"/><circle cx="30" cy="42" r="4.5" fill="#4f7a3f"/><circle cx="38" cy="41" r="3" fill="#5b8a48"/></g>`),
    stump: svg(`<ellipse cx="48" cy="58" rx="26" ry="14" fill="rgba(0,0,0,0.38)"/><circle cx="46" cy="46" r="20" fill="#5e4128"/><circle cx="46" cy="46" r="17" fill="#a57c52"/><circle cx="46" cy="46" r="12" fill="none" stroke="#7a5634" stroke-width="1.3"/><circle cx="46" cy="46" r="7" fill="none" stroke="#7a5634" stroke-width="1.3"/><circle cx="46" cy="46" r="2" fill="#7a5634"/><ellipse cx="68" cy="62" rx="7" ry="5" fill="#c24a3a"/><circle cx="66" cy="61" r="1.3" fill="#f3ead8"/><circle cx="70" cy="63" r="1.1" fill="#f3ead8"/><ellipse cx="26" cy="64" rx="5" ry="3.5" fill="#c24a3a"/><circle cx="25" cy="63" r="1" fill="#f3ead8"/>`),

    // Cementerio
    tombstone: svg(`<ellipse cx="50" cy="72" rx="24" ry="8" fill="rgba(0,0,0,0.4)"/><path d="M30 72V36a16 16 0 0 1 32 0v36z" fill="#6d6a74"/><path d="M54 72V36a16 16 0 0 0-8-13.8V72z" fill="#5b5862"/><path d="M46 34v18M39 41h14" stroke="#45424c" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="64" r="4" fill="#4f6b45" opacity="0.8"/>`),
    deadTree: svg(`<ellipse cx="48" cy="76" rx="18" ry="6" fill="rgba(0,0,0,0.4)"/><path d="M46 76V44M46 56l-14-12M46 50l12-14M58 36l6-8M32 44l-6-6M46 44l-4-16M46 62l10-6" stroke="#5a4a3e" stroke-width="4" stroke-linecap="round" fill="none"/>`),
    crypt: svg(`<ellipse cx="46" cy="74" rx="30" ry="6" fill="rgba(0,0,0,0.4)"/><rect x="22" y="36" width="48" height="38" fill="#6d6a74"/><path d="M18 38 L46 18 L74 38 Z" fill="#5b5862"/><rect x="38" y="50" width="16" height="24" rx="8" fill="#26242b"/><path d="M22 44h48" stroke="#5b5862" stroke-width="2"/><circle cx="46" cy="30" r="3" fill="#45424c"/>`),
    brokenFence: svg(`<path d="M16 40h60M16 60h60" stroke="#3b3a42" stroke-width="3"/><path d="M22 70V30M34 70V28M46 70V34M58 70V30M70 70V32" stroke="#4a4852" stroke-width="3.5" stroke-linecap="round"/><path d="M22 30l-3 5h6zM34 28l-3 5h6zM58 30l-3 5h6zM70 32l-3 5h6z" fill="#4a4852"/><path d="M46 34 q6 -4 10 -12" stroke="#4a4852" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),

    // Pantano
    swampTree: svg(`<ellipse cx="52" cy="58" rx="38" ry="30" fill="rgba(0,0,0,0.4)"/><circle cx="46" cy="45" r="34" fill="#2c4432"/><circle cx="31" cy="39" r="19" fill="#35503a"/><circle cx="59" cy="35" r="20" fill="#3a5840"/><circle cx="50" cy="59" r="19" fill="#304a36"/><circle cx="38" cy="30" r="8" fill="#56744c" opacity="0.6"/><path d="M20 50v10M27 62v9M40 74v8M60 72v8M70 58v9M74 44v8" stroke="#7e9a62" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`),
    deepWater: svg(`<ellipse cx="46" cy="48" rx="38" ry="30" fill="#1d4247"/><ellipse cx="46" cy="48" rx="38" ry="30" fill="none" stroke="#2b5a5e" stroke-width="3"/><ellipse cx="40" cy="44" rx="14" ry="8" fill="none" stroke="#4b8a8e" stroke-width="1.5" opacity="0.7"/><ellipse cx="58" cy="56" rx="8" ry="4" fill="none" stroke="#4b8a8e" stroke-width="1.5" opacity="0.5"/>`),
    rottenLog: svg(`<ellipse cx="48" cy="60" rx="38" ry="12" fill="rgba(0,0,0,0.38)"/><g transform="rotate(14 46 50)"><rect x="12" y="40" width="66" height="18" rx="9" fill="#4e4a30"/><ellipse cx="74" cy="49" rx="6" ry="9" fill="#6e6a44"/><circle cx="26" cy="42" r="6" fill="#5b7a3a"/><circle cx="36" cy="44" r="4.5" fill="#6a8a44"/><circle cx="56" cy="41" r="5" fill="#5b7a3a"/></g>`),
    mossTotem: svg(`<ellipse cx="46" cy="72" rx="22" ry="6" fill="rgba(0,0,0,0.35)"/><path d="M34 72V40q0-12 12-12t12 12v32z" fill="#3e4a3a"/><path d="M34 44q12 6 24 0" stroke="#5b7a3a" stroke-width="5" fill="none"/><path d="M40 30q-2 -8 -8 -10M52 30q2 -8 8 -10" stroke="#5b7a3a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="42" cy="56" r="2" fill="#9fd93c"/>`),

    // Campamento
    tent: svg(`<ellipse cx="50" cy="72" rx="34" ry="7" fill="rgba(0,0,0,0.4)"/><path d="M14 72 L46 20 L78 72 Z" fill="#8a6a4a"/><path d="M46 20 L78 72 L58 72 Z" fill="#6e5238"/><path d="M46 44 L38 72 L54 72 Z" fill="#2a2018"/><path d="M46 20 L46 12" stroke="#5a4530" stroke-width="3" stroke-linecap="round"/>`),
    barrel: svg(`<ellipse cx="50" cy="54" rx="22" ry="16" fill="rgba(0,0,0,0.4)"/><circle cx="46" cy="46" r="19" fill="#4b3421"/><circle cx="46" cy="46" r="16" fill="#8c6440"/><circle cx="46" cy="46" r="12" fill="none" stroke="#4b3421" stroke-width="2.5"/><path d="M34 46h24M46 34v24" stroke="#6e4e30" stroke-width="1.2" opacity="0.6"/>`),
    crates: svg(`<ellipse cx="48" cy="72" rx="32" ry="6" fill="rgba(0,0,0,0.4)"/><rect x="18" y="42" width="30" height="30" fill="#9a7448"/><path d="M18 42l30 30M48 42l-30 30" stroke="#6e5230" stroke-width="3"/><rect x="18" y="42" width="30" height="30" fill="none" stroke="#6e5230" stroke-width="3"/><rect x="46" y="30" width="28" height="28" fill="#a67e50"/><rect x="46" y="30" width="28" height="28" fill="none" stroke="#6e5230" stroke-width="3"/><path d="M46 44h28" stroke="#6e5230" stroke-width="3"/>`),
    campfire: svg(`<circle cx="46" cy="50" r="24" fill="#ffb347" opacity="0.12"/><circle cx="28" cy="52" r="6" fill="#6b6660"/><circle cx="64" cy="52" r="6" fill="#6b6660"/><circle cx="46" cy="68" r="6" fill="#5e5a55"/><circle cx="34" cy="64" r="5.5" fill="#75706a"/><circle cx="58" cy="64" r="5.5" fill="#6b6660"/><path d="M34 58l24-8M34 50l24 8" stroke="#5a3d24" stroke-width="5" stroke-linecap="round"/><path d="M46 56 q-10 -10 -2 -24 q2 8 6 6 q4 -8 2 -14 q10 12 2 32z" fill="#f08a2c"/><path d="M46 56 q-5 -6 -1 -14 q2 5 4 4 q3 -4 1 -8 q5 8 -4 18z" fill="#ffd66e"/>`),
    cart: svg(`<ellipse cx="48" cy="70" rx="36" ry="7" fill="rgba(0,0,0,0.4)"/><rect x="14" y="34" width="60" height="26" rx="3" fill="#8a6a4a"/><path d="M14 44h60M14 52h60" stroke="#6e5238" stroke-width="2"/><path d="M74 48h12" stroke="#5a4530" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="62" r="9" fill="#4b3421"/><circle cx="26" cy="62" r="3" fill="#8c6440"/><circle cx="62" cy="62" r="9" fill="#4b3421"/><circle cx="62" cy="62" r="3" fill="#8c6440"/>`),

    // Desierto
    cactus: svg(`<ellipse cx="50" cy="76" rx="22" ry="6" fill="rgba(0,0,0,0.35)"/><rect x="40" y="20" width="14" height="56" rx="7" fill="#4f7d3c"/><rect x="26" y="34" width="10" height="24" rx="5" fill="#4f7d3c"/><rect x="30" y="50" width="12" height="8" rx="4" fill="#4f7d3c"/><rect x="58" y="28" width="10" height="22" rx="5" fill="#4f7d3c"/><rect x="52" y="42" width="12" height="8" rx="4" fill="#4f7d3c"/><path d="M47 25v46M31 39v15M63 33v13" stroke="#6fa356" stroke-width="2" stroke-linecap="round"/><path d="M43 30h-3M54 44h3M43 58h-3M54 64h3" stroke="#d9e6b8" stroke-width="1.2" stroke-linecap="round"/><circle cx="47" cy="19" r="3.2" fill="#e98bb0"/><circle cx="47" cy="19" r="1.2" fill="#f7d36a"/>`),
    rockPile: svg(`<ellipse cx="48" cy="70" rx="34" ry="9" fill="rgba(0,0,0,0.38)"/><path d="M14 70 L22 46 L40 37 L56 47 L60 70 Z" fill="#7a5f42"/><path d="M40 37 L56 47 L60 70 L47 70 Z" fill="#5c4630"/><path d="M50 70 L58 52 L72 47 L82 70 Z" fill="#8a6c4c"/><path d="M72 47 L82 70 L72 70 Z" fill="#6a5238"/><path d="M24 49 L38 42 M60 55 L70 51" stroke="#a88a64" stroke-width="2" stroke-linecap="round"/>`),
    duneMound: svg(`<ellipse cx="46" cy="68" rx="38" ry="10" fill="rgba(0,0,0,0.28)"/><path d="M6 66 Q28 28 50 38 Q70 46 86 66 Z" fill="#b8925a"/><path d="M50 38 Q70 46 86 66 L62 66 Q58 50 50 38 Z" fill="#94723f"/><path d="M18 58 q14 -10 28 -8 M24 64 q14 -8 30 -6" stroke="#d6b77c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
    brokenColumn: svg(`<ellipse cx="48" cy="75" rx="30" ry="6" fill="rgba(0,0,0,0.38)"/><rect x="26" y="66" width="40" height="8" rx="1" fill="#a99c7f"/><rect x="32" y="32" width="28" height="34" fill="#d2c4a0"/><path d="M38 34v32M46 34v32M54 34v32" stroke="#b3a582" stroke-width="2"/><path d="M32 32 L38 25 L44 31 L50 22 L56 29 L60 26 L60 32 Z" fill="#d2c4a0"/><g transform="rotate(-15 72 66)"><rect x="64" y="61" width="18" height="10" rx="2" fill="#c3b591"/><path d="M69 61v10M75 61v10" stroke="#a99c7f" stroke-width="1.5"/></g>`),
};

// Decoración de suelo: dibujada centrada en x=46 y corrida al azar
// hacia los costados (ver cellArtFor) para que no queden todas iguales.
const DECOR_ART = {
    // Bosque
    tuft: `<path d="M46 70 l-4 -10 M46 70 l1 -12 M46 70 l5 -9" stroke="#6f9a4f" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.7"/>`,
    puddle: `<ellipse cx="46" cy="60" rx="22" ry="11" fill="#1f3a3c" opacity="0.85"/><ellipse cx="46" cy="60" rx="22" ry="11" fill="none" stroke="#2e5557" stroke-width="2"/><ellipse cx="41" cy="58" rx="8" ry="3" fill="none" stroke="#5a9a9c" stroke-width="1.2" opacity="0.6"/>`,
    flowers: `<path d="M30 62 q4 -6 8 -2 M56 66 q-5 -5 -9 -1" stroke="#5b8a48" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="30" cy="58" r="4" fill="#e8d36a"/><circle cx="30" cy="58" r="1.5" fill="#b0892a"/><circle cx="40" cy="64" r="3.5" fill="#f1efe6"/><circle cx="40" cy="64" r="1.3" fill="#e8d36a"/><circle cx="56" cy="62" r="4" fill="#b98cff"/><circle cx="56" cy="62" r="1.5" fill="#f3e6ff"/><circle cx="62" cy="68" r="3" fill="#e8d36a"/>`,
    mushrooms: `<rect x="36" y="58" width="4" height="9" rx="2" fill="#e7e0cf"/><ellipse cx="38" cy="58" rx="8" ry="5" fill="#b3503f"/><circle cx="35" cy="57" r="1.3" fill="#f3ead8"/><circle cx="40" cy="56" r="1.1" fill="#f3ead8"/><rect x="51" y="63" width="3" height="7" rx="1.5" fill="#e7e0cf"/><ellipse cx="52.5" cy="63" rx="6" ry="4" fill="#b3503f"/><circle cx="51" cy="62" r="1" fill="#f3ead8"/>`,
    leaves: `<ellipse cx="34" cy="56" rx="7" ry="3.5" transform="rotate(-30 34 56)" fill="#b8742f"/><ellipse cx="54" cy="64" rx="7" ry="3.5" transform="rotate(20 54 64)" fill="#9a5a2a"/><ellipse cx="46" cy="50" rx="6" ry="3" transform="rotate(60 46 50)" fill="#c9923e"/><ellipse cx="62" cy="52" rx="5" ry="2.5" transform="rotate(-10 62 52)" fill="#8a4f24"/>`,

    // Cementerio
    fog: `<ellipse cx="40" cy="62" rx="26" ry="7" fill="#c9c6d6" opacity="0.14"/><ellipse cx="56" cy="54" rx="22" ry="6" fill="#c9c6d6" opacity="0.12"/><ellipse cx="46" cy="70" rx="30" ry="6" fill="#c9c6d6" opacity="0.1"/>`,
    bones: `<path d="M32 54 L58 68 M34 68 L56 54" stroke="#d9d2c0" stroke-width="4" stroke-linecap="round"/><circle cx="31" cy="52" r="3" fill="#d9d2c0"/><circle cx="30" cy="56" r="3" fill="#d9d2c0"/><circle cx="59" cy="70" r="3" fill="#d9d2c0"/><circle cx="60" cy="66" r="3" fill="#d9d2c0"/><circle cx="33" cy="70" r="3" fill="#d9d2c0"/><circle cx="57" cy="52" r="3" fill="#d9d2c0"/>`,
    candles: `<circle cx="40" cy="52" r="10" fill="#ffcf6a" opacity="0.15"/><circle cx="54" cy="58" r="9" fill="#ffcf6a" opacity="0.13"/><rect x="37" y="54" width="6" height="14" rx="1.5" fill="#e8e0c8"/><ellipse cx="40" cy="50" rx="2.2" ry="4" fill="#ffcf6a"/><rect x="51" y="60" width="6" height="10" rx="1.5" fill="#e8e0c8"/><ellipse cx="54" cy="56" rx="2" ry="3.6" fill="#ffcf6a"/>`,
    skull: `<circle cx="46" cy="56" r="11" fill="#d9d2c0"/><rect x="40" y="63" width="12" height="7" rx="2" fill="#d9d2c0"/><circle cx="42" cy="56" r="3" fill="#2b2932"/><circle cx="50" cy="56" r="3" fill="#2b2932"/><path d="M44 66v3M48 66v3" stroke="#2b2932" stroke-width="1.2"/>`,

    // Pantano
    mud: `<path d="M26 60 q6 -10 20 -8 q16 -2 20 8 q-4 10 -20 8 q-16 2 -20 -8z" fill="#3b3325" opacity="0.9"/><ellipse cx="42" cy="58" rx="6" ry="2" fill="#4c4230"/>`,
    lilyPad: `<ellipse cx="46" cy="60" rx="24" ry="12" fill="#1f3a3c"/><path d="M46 60 L58 55 A13 8 0 1 0 58 65 Z" fill="#4f8a3a"/><circle cx="40" cy="58" r="3.5" fill="#e59ab6"/><circle cx="40" cy="58" r="1.4" fill="#f5e27a"/>`,
    bubbles: `<ellipse cx="46" cy="60" rx="20" ry="10" fill="#1f3a3c" opacity="0.8"/><circle cx="40" cy="58" r="3" fill="none" stroke="#5a9a9c" stroke-width="1.3"/><circle cx="50" cy="61" r="2" fill="none" stroke="#5a9a9c" stroke-width="1.2"/><circle cx="54" cy="56" r="1.5" fill="none" stroke="#5a9a9c" stroke-width="1"/>`,
    fireflies: `<circle cx="32" cy="40" r="6" fill="#d8f07a" opacity="0.18"/><circle cx="32" cy="40" r="2" fill="#e8ff9a"/><circle cx="58" cy="32" r="5" fill="#d8f07a" opacity="0.16"/><circle cx="58" cy="32" r="1.8" fill="#e8ff9a"/><circle cx="50" cy="56" r="5" fill="#d8f07a" opacity="0.14"/><circle cx="50" cy="56" r="1.6" fill="#e8ff9a"/>`,

    // Campamento
    footprints: `<ellipse cx="34" cy="68" rx="4" ry="6" fill="#33281f"/><ellipse cx="44" cy="58" rx="4" ry="6" fill="#33281f"/><ellipse cx="52" cy="48" rx="4" ry="6" fill="#33281f"/><ellipse cx="62" cy="38" rx="4" ry="6" fill="#33281f"/>`,
    bottle: `<ellipse cx="46" cy="66" rx="18" ry="4" fill="rgba(0,0,0,0.3)"/><g transform="rotate(-25 46 60)"><rect x="30" y="54" width="24" height="11" rx="5" fill="#3f6a3a"/><rect x="52" y="57" width="10" height="5" rx="2" fill="#3f6a3a"/><rect x="33" y="56" width="12" height="3" rx="1.5" fill="#7fb06f" opacity="0.6"/></g>`,
    embers: `<ellipse cx="46" cy="60" rx="18" ry="11" fill="#3a3632"/><ellipse cx="46" cy="60" rx="12" ry="7" fill="#4a4540"/><circle cx="42" cy="60" r="2" fill="#e8743a"/><circle cx="50" cy="58" r="1.6" fill="#f08a2c"/><path d="M40 56l10 6" stroke="#2a2522" stroke-width="3" stroke-linecap="round"/>`,
    // Desierto
    ripples: `<path d="M24 58 q10 -5 20 0 t20 0 M30 68 q10 -5 20 0 t16 0" stroke="#d6b77c" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.75"/>`,
    pebbles: `<ellipse cx="38" cy="62" rx="4" ry="3" fill="#6a5238"/><ellipse cx="50" cy="66" rx="3" ry="2.2" fill="#5c4630"/><ellipse cx="56" cy="58" rx="2.5" ry="2" fill="#7a5f42"/><ellipse cx="44" cy="70" rx="2" ry="1.6" fill="#6a5238"/>`,
    oxSkull: `<ellipse cx="46" cy="70" rx="14" ry="3" fill="rgba(0,0,0,0.25)"/><path d="M38 54 q-12 -2 -15 -12 q9 6 17 4z M54 54 q12 -2 15 -12 q-9 6 -17 4z" fill="#e6dcc4"/><path d="M38 51 h16 l-2 17 q-6 4 -12 0z" fill="#e6dcc4"/><circle cx="42" cy="57" r="2.2" fill="#5c4630"/><circle cx="50" cy="57" r="2.2" fill="#5c4630"/><path d="M44 64h4" stroke="#b3a582" stroke-width="1.2"/>`,
    scarab: `<ellipse cx="46" cy="62" rx="6" ry="8" fill="#2f4a5a"/><path d="M46 54v16" stroke="#6f9ab0" stroke-width="1"/><circle cx="46" cy="53" r="3" fill="#24394a"/><path d="M40 58l-5 -3M40 63l-6 0M40 67l-5 3M52 58l5 -3M52 63l6 0M52 67l5 3" stroke="#24394a" stroke-width="1.4" stroke-linecap="round"/><path d="M43 57 q3 2 6 0" stroke="#8ec3d6" stroke-width="1" fill="none" opacity="0.7"/>`,
    sack: `<ellipse cx="48" cy="72" rx="16" ry="4" fill="rgba(0,0,0,0.35)"/><path d="M34 70 q-4 -18 8 -24 h8 q12 6 8 24z" fill="#9a8660"/><path d="M42 46 q4 -4 8 0" stroke="#6e5a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 60 q8 3 16 0" stroke="#7e6c4a" stroke-width="1.5" fill="none"/>`,
};

// Cuánto se puede correr la decoración hacia los costados (px).
const DECOR_MAX_SHIFT = 14;

// Bioma del combate: el de la familia más repetida en el encuentro.
export function pickBiome(enemies) {
    const counts = {};
    enemies.forEach(e => { counts[e.cls] = (counts[e.cls] || 0) + 1; });
    const topFamily = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const key = FAMILY_BIOME[topFamily];
    return BIOMES[key] ? key : DEFAULT_BIOME;
}

// Decoración fija por casilla, sorteada UNA vez al armar el combate
// (renderBoard redibuja todo el tablero seguido; si se sorteara ahí,
// los obstáculos cambiarían en cada render).
export function decorateCells(cells, biomeKey) {
    const biome = BIOMES[biomeKey];
    cells.forEach(c => {
        c.tone = Math.floor(Math.random() * 3);
        if (!c.active) {
            c.obstacle = biome.obstacles[Math.floor(Math.random() * biome.obstacles.length)];
        } else {
            const decor = (biome.groundDecor || []).find(d => Math.random() < d.chance);
            if (decor) {
                c.decor = decor.art;
                c.decorShift = Math.round((Math.random() * 2 - 1) * DECOR_MAX_SHIFT);
            }
        }
    });
}

// HTML del arte de una casilla ya decorada (obstáculo o decoración de
// suelo), o "" si no lleva nada. Lo usa renderBoard en battle.js.
export function cellArtFor(cell) {
    if (!cell.active && cell.obstacle && OBSTACLE_ART[cell.obstacle]) return OBSTACLE_ART[cell.obstacle];
    if (cell.active && cell.decor && DECOR_ART[cell.decor]) {
        return svg(`<g transform="translate(${cell.decorShift || 0} 0)">${DECOR_ART[cell.decor]}</g>`);
    }
    return "";
}
