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
            { art: "desertPebbles", chance: 0.06 },
            { art: "ripples", chance: 0.16 }
        ]
    },
    dwarvenLab: {
        name: "Laboratorio Enano",
        obstacles: ["boulder", "boulder", "boulder", "rubble", "rubble", "rubble", "stalagmite", "stalagmite", "crystalRock"],
        groundDecor: [
            { art: "runeGlow", chance: 0.03 },
            { art: "bolts", chance: 0.06 },
            { art: "oilPuddle", chance: 0.06 },
            { art: "dirt", chance: 0.16 }
        ]
    },
    // El agua es un obstáculo más (casilla bloqueada pintada de mar), así
    // que no todas las bloqueadas son rocas.
    beach: {
        name: "Playa",
        obstacles: ["water", "water", "water", "seaRock", "seaRock", "mossyRock", "mossyRock", "rockSpire", "tidePool"],
        groundDecor: [
            { art: "shell", chance: 0.02 },
            { art: "seaweed", chance: 0.05 },
            { art: "beachPuddle", chance: 0.05 },
            { art: "pebbles", chance: 0.06 },
            { art: "foam", chance: 0.06 },
            { art: "wetSand", chance: 0.14 }
        ]
    },
    // Cueva (familia cave). Piedra fría y húmeda, hongos que brillan.
    cave: {
        name: "Cueva",
        obstacles: ["caveBoulder", "caveBoulder", "caveBoulder", "caveStalagmites", "caveStalagmites", "caveColumn", "caveColumn", "glowShroomRock", "cavePool"],
        groundDecor: [
            { art: "glowMoss", chance: 0.03 },
            { art: "bones", chance: 0.03 },
            { art: "clawMarks", chance: 0.04 },
            { art: "dripPuddle", chance: 0.06 },
            { art: "caveGravel", chance: 0.16 }
        ]
    },
    // Hielo (familia ice). Las casillas bloqueadas son nieve; el lago
    // congelado es un obstáculo más (pinta la casilla entera, como el
    // agua de la playa).
    ice: {
        name: "Hielo",
        obstacles: ["snowPine", "snowPine", "snowPine", "frozenRock", "frozenRock", "iceSpire", "iceSpire", "frozenPond"],
        groundDecor: [
            { art: "iceShards", chance: 0.03 },
            { art: "pawPrints", chance: 0.04 },
            { art: "frozenPuddle", chance: 0.05 },
            { art: "sparkle", chance: 0.06 },
            { art: "snowDrift", chance: 0.16 }
        ]
    },
    // Montaña (familia mind). Roca alta y fría, pinos de altura, grietas
    // al vacío (pintan la casilla entera, como el agua) y cristales
    // violetas que laten con la energía de las mentes.
    mountain: {
        name: "Montaña",
        obstacles: ["mountainBoulder", "mountainBoulder", "mountainBoulder", "crag", "crag", "alpinePine", "alpinePine", "mindCrystal", "chasm"],
        groundDecor: [
            { art: "crystalShard", chance: 0.03 },
            { art: "edelweiss", chance: 0.04 },
            { art: "rockCrack", chance: 0.05 },
            { art: "alpineGrass", chance: 0.07 },
            { art: "pebbles", chance: 0.16 }
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
    dwarvenLaboratory: "dwarvenLab",
    seaNier: "beach",
    cave: "cave",
    ice: "ice",
    mind: "mountain",
    grok: "swamp",
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

    // Laboratorio Enano
    boulder: svg(`<ellipse cx="50" cy="70" rx="34" ry="10" fill="rgba(0,0,0,0.4)"/><path d="M16 66 Q14 44 30 32 Q46 22 62 30 Q78 38 76 58 Q74 70 56 72 L30 72 Q18 72 16 66Z" fill="#6a6560"/><path d="M62 30 Q78 38 76 58 Q74 70 56 72 Q66 56 62 30Z" fill="#544f4a"/><path d="M28 40 Q38 32 50 34" stroke="#8a847d" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 52 l8 6 l6 -3" stroke="#4a4540" stroke-width="1.6" fill="none"/>`),
    rubble: svg(`<ellipse cx="48" cy="72" rx="34" ry="8" fill="rgba(0,0,0,0.38)"/><path d="M16 70 L22 54 L36 50 L42 62 L40 70Z" fill="#6a6560"/><path d="M36 70 L42 46 L58 40 L66 52 L62 70Z" fill="#76706a"/><path d="M58 40 L66 52 L62 70 L54 70Z" fill="#5c5752"/><path d="M60 70 L66 58 L78 58 L82 70Z" fill="#625d58"/><path d="M42 46 L58 40" stroke="#948d85" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="75" r="3" fill="#6a6560"/>`),
    stalagmite: svg(`<ellipse cx="48" cy="76" rx="26" ry="6" fill="rgba(0,0,0,0.4)"/><path d="M28 76 L40 22 L50 76Z" fill="#6e665c"/><path d="M40 22 L50 76 L43 76Z" fill="#574f46"/><path d="M46 76 L58 40 L68 76Z" fill="#7a7266"/><path d="M58 40 L68 76 L62 76Z" fill="#5f574d"/><path d="M38 40 l-2 14 M56 54 l-1 10" stroke="#948a7c" stroke-width="1.5" stroke-linecap="round"/>`),
    crystalRock: svg(`<circle cx="50" cy="40" r="20" fill="#5fd3e6" opacity="0.1"/><ellipse cx="48" cy="72" rx="30" ry="8" fill="rgba(0,0,0,0.4)"/><path d="M20 70 L26 52 L44 46 L60 50 L72 70Z" fill="#5f5a55"/><path d="M60 50 L72 70 L56 70Z" fill="#4c4844"/><path d="M40 52 L44 28 L50 50Z" fill="#7ee3f2"/><path d="M44 28 L50 50 L46 52Z" fill="#46b8cc"/><path d="M50 50 L58 34 L60 52Z" fill="#7ee3f2"/><path d="M58 34 L60 52 L56 52Z" fill="#46b8cc"/><path d="M32 54 L30 42 L38 52Z" fill="#9aeaf6"/>`),

    // Playa
    water: svg(`<rect x="0" y="0" width="92" height="92" rx="3" fill="#2c6577"/><ellipse cx="36" cy="30" rx="36" ry="26" fill="#3a7d8f" opacity="0.7"/><path d="M12 34 q6 -4 12 0 t12 0" stroke="#8fd3e0" stroke-width="1.6" fill="none" opacity="0.5" stroke-linecap="round"/><path d="M42 62 q6 -4 12 0 t12 0 t12 0" stroke="#8fd3e0" stroke-width="1.6" fill="none" opacity="0.4" stroke-linecap="round"/>`),
    seaRock: svg(`<ellipse cx="48" cy="72" rx="32" ry="8" fill="rgba(0,0,0,0.28)"/><path d="M18 70 Q16 50 30 40 Q42 30 58 34 Q76 40 76 60 Q76 70 64 72 Z" fill="#5b6266"/><path d="M58 34 Q76 40 76 60 Q76 70 64 72 Q70 54 58 34Z" fill="#484e52"/><path d="M28 46 Q38 38 50 39" stroke="#9aa4aa" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M20 66 Q46 74 74 64" stroke="#2f3538" stroke-width="2" fill="none" opacity="0.5"/>`),
    mossyRock: svg(`<ellipse cx="48" cy="72" rx="32" ry="8" fill="rgba(0,0,0,0.28)"/><path d="M18 70 Q16 50 30 40 Q42 30 58 34 Q76 40 76 60 Q76 70 64 72 Z" fill="#5f666a"/><path d="M58 34 Q76 40 76 60 Q76 70 64 72 Q70 54 58 34Z" fill="#4a5054"/><path d="M26 46 Q42 33 62 38" stroke="#5f8f45" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M30 46 q4 10 0 18 M40 41 q5 12 1 22 M55 39 q-3 10 2 20" stroke="#4f7a3a" stroke-width="3" fill="none" stroke-linecap="round"/>`),
    tidePool: svg(`<ellipse cx="46" cy="60" rx="31" ry="19" fill="#6b7175"/><ellipse cx="46" cy="60" rx="25" ry="14" fill="#2f7f93"/><ellipse cx="40" cy="56" rx="10" ry="3" fill="#8fd3e0" opacity="0.5"/><ellipse cx="52" cy="64" rx="6" ry="1.6" fill="#8fd3e0" opacity="0.35"/><circle cx="18" cy="60" r="6" fill="#5b6266"/><circle cx="74" cy="58" r="7" fill="#5b6266"/><circle cx="44" cy="42" r="5" fill="#5b6266"/><circle cx="60" cy="78" r="4" fill="#5b6266"/>`),
    rockSpire: svg(`<ellipse cx="48" cy="76" rx="26" ry="6" fill="rgba(0,0,0,0.28)"/><path d="M30 76 L34 46 L44 26 L56 32 L62 52 L66 76Z" fill="#5f666a"/><path d="M56 32 L62 52 L66 76 L54 76 Z" fill="#4a5054"/><path d="M38 50 l10 4 M42 62 l12 2" stroke="#3a4044" stroke-width="2"/><path d="M40 34 l6 -4" stroke="#9aa4aa" stroke-width="2.5" stroke-linecap="round"/><path d="M28 72 q20 7 40 0" stroke="#f2f8f6" stroke-width="2.5" fill="none" opacity="0.65" stroke-linecap="round"/>`),

    // Cueva
    caveBoulder: svg(`<ellipse cx="50" cy="70" rx="34" ry="10" fill="rgba(0,0,0,0.45)"/><path d="M14 66 Q12 42 30 31 Q46 22 64 29 Q80 37 78 58 Q76 71 56 73 L30 73 Q16 73 14 66Z" fill="#4e555c"/><path d="M64 29 Q80 37 78 58 Q76 71 56 73 Q68 55 64 29Z" fill="#3c4247"/><path d="M26 40 Q38 31 52 33" stroke="#6f777e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36 50 l9 7 l7 -4 l6 6" stroke="#2f3438" stroke-width="1.6" fill="none"/><ellipse cx="34" cy="38" rx="5" ry="2" fill="#a9c4cf" opacity="0.35"/>`),
    caveStalagmites: svg(`<ellipse cx="48" cy="76" rx="28" ry="6" fill="rgba(0,0,0,0.45)"/><path d="M24 76 L36 26 L48 76Z" fill="#59616a"/><path d="M36 26 L48 76 L41 76Z" fill="#434951"/><path d="M44 76 L56 44 L66 76Z" fill="#636b73"/><path d="M56 44 L66 76 L60 76Z" fill="#4a5058"/><path d="M62 76 L70 58 L76 76Z" fill="#555d65"/><circle cx="36" cy="27" r="1.6" fill="#b8d6e0" opacity="0.8"/><circle cx="56" cy="45" r="1.4" fill="#b8d6e0" opacity="0.7"/><path d="M34 42 l-2 14 M54 56 l-1 9" stroke="#7a838b" stroke-width="1.4" stroke-linecap="round"/>`),
    caveColumn: svg(`<ellipse cx="46" cy="80" rx="22" ry="5" fill="rgba(0,0,0,0.45)"/><path d="M30 0 L62 0 L55 22 Q50 36 50 46 Q51 60 60 80 L32 80 Q41 60 42 46 Q42 36 37 22 Z" fill="#555c63"/><path d="M62 0 L55 22 Q50 36 50 46 Q51 60 60 80 L52 80 Q46 60 46 46 Q46 34 50 20 Z" fill="#40464c"/><path d="M41 8 Q44 18 42 28 M44 56 Q46 66 44 74" stroke="#737b82" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M38 44 h16" stroke="#3a4045" stroke-width="1.4"/>`),
    glowShroomRock: svg(`<circle cx="46" cy="50" r="28" fill="#6fe0c8" opacity="0.10"/><ellipse cx="48" cy="72" rx="30" ry="8" fill="rgba(0,0,0,0.45)"/><path d="M20 70 L26 50 L44 43 L62 48 L72 70Z" fill="#474e55"/><path d="M62 48 L72 70 L56 70Z" fill="#363c41"/><rect x="33" y="44" width="3" height="10" rx="1.5" fill="#cfe9e1"/><ellipse cx="34.5" cy="44" rx="7" ry="4" fill="#6fe0c8"/><rect x="47" y="38" width="3.5" height="13" rx="1.7" fill="#cfe9e1"/><ellipse cx="48.7" cy="38" rx="9" ry="5" fill="#8af0d8"/><rect x="58" y="47" width="2.5" height="8" rx="1.2" fill="#cfe9e1"/><ellipse cx="59" cy="47" rx="5.5" ry="3.2" fill="#6fe0c8"/><circle cx="46" cy="37" r="1.2" fill="#e8fff8"/><circle cx="51" cy="37.5" r="1" fill="#e8fff8"/>`),
    cavePool: svg(`<ellipse cx="46" cy="50" rx="38" ry="29" fill="#2a2f34"/><ellipse cx="46" cy="50" rx="33" ry="24" fill="#132a33"/><ellipse cx="38" cy="44" rx="13" ry="6" fill="none" stroke="#3f7686" stroke-width="1.4" opacity="0.7"/><ellipse cx="57" cy="57" rx="7" ry="3" fill="none" stroke="#3f7686" stroke-width="1.3" opacity="0.5"/><ellipse cx="34" cy="40" rx="5" ry="1.6" fill="#8fd3e0" opacity="0.35"/><path d="M14 52 L18 40 L22 52Z M70 46 L74 36 L77 47Z" fill="#4e555c"/>`),

    // Hielo
    snowPine: svg(`<ellipse cx="50" cy="78" rx="26" ry="6" fill="rgba(40,70,90,0.28)"/><rect x="42" y="66" width="8" height="12" fill="#5a4636"/><path d="M46 8 L66 36 L26 36Z" fill="#2f5a4a"/><path d="M46 22 L72 54 L20 54Z" fill="#2a5242"/><path d="M46 38 L76 70 L16 70Z" fill="#26493c"/><path d="M46 8 L54 19 Q46 23 38 19Z" fill="#f4f8fb"/><path d="M34 33 Q46 38 58 33 L62 36 L30 36Z" fill="#f4f8fb"/><path d="M28 50 Q46 57 64 50 L70 54 L22 54Z" fill="#eef4f8"/><path d="M22 66 Q46 74 70 66 L76 70 L16 70Z" fill="#eef4f8"/><circle cx="36" cy="45" r="1.6" fill="#f4f8fb"/><circle cx="58" cy="61" r="1.8" fill="#f4f8fb"/>`),
    frozenRock: svg(`<ellipse cx="50" cy="70" rx="34" ry="9" fill="rgba(40,70,90,0.28)"/><path d="M16 66 Q14 44 30 33 Q46 24 62 31 Q78 39 76 58 Q74 70 56 72 L30 72 Q18 72 16 66Z" fill="#6f7c86"/><path d="M62 31 Q78 39 76 58 Q74 70 56 72 Q66 56 62 31Z" fill="#5a6670"/><path d="M18 52 Q16 40 30 33 Q46 24 62 31 Q74 37 76 48 Q66 42 58 46 Q50 40 42 45 Q32 40 18 52Z" fill="#f2f7fa"/><path d="M30 34 Q44 27 56 30" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M40 58 l8 5 l6 -3" stroke="#4c5761" stroke-width="1.5" fill="none"/>`),
    iceSpire: svg(`<circle cx="46" cy="46" r="30" fill="#bfeaff" opacity="0.18"/><ellipse cx="48" cy="76" rx="26" ry="6" fill="rgba(40,70,90,0.28)"/><path d="M30 76 L38 30 L48 76Z" fill="#8fd0ea"/><path d="M38 30 L48 76 L42 76Z" fill="#5fb3d6"/><path d="M42 76 L52 14 L62 76Z" fill="#a9dcef"/><path d="M52 14 L62 76 L55 76Z" fill="#74bfe0"/><path d="M58 76 L66 46 L72 76Z" fill="#8fd0ea"/><path d="M66 46 L72 76 L68 76Z" fill="#5fb3d6"/><path d="M50 24 L48 52 M37 40 l-2 14" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`),
    frozenPond: svg(`<rect x="0" y="0" width="92" height="92" rx="3" fill="#9cc9dc"/><ellipse cx="34" cy="30" rx="34" ry="24" fill="#b6dceb" opacity="0.8"/><path d="M10 70 L32 52 L44 60 L66 40 M44 60 L52 82 M32 52 L28 34" stroke="#eaf6fb" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.9"/><path d="M60 18 l10 6 M68 64 l12 4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`),
    // Montaña
    mountainBoulder: svg(`<ellipse cx="48" cy="74" rx="34" ry="8" fill="rgba(0,0,0,0.4)"/><path d="M12 70 Q10 46 26 34 Q40 24 58 28 Q76 33 80 52 Q82 70 62 73 L28 74 Q14 74 12 70Z" fill="#7b766e"/><path d="M58 28 Q76 33 80 52 Q82 70 62 73 Q72 54 58 28Z" fill="#625d56"/><path d="M22 46 Q34 34 50 34" stroke="#9a948a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M34 56 l8 6 l9 -5 l7 7" stroke="#4e4a44" stroke-width="1.6" fill="none"/><ellipse cx="30" cy="66" rx="9" ry="3" fill="#5f7a4a" opacity="0.7"/>`),
    crag: svg(`<ellipse cx="46" cy="80" rx="30" ry="6" fill="rgba(0,0,0,0.4)"/><path d="M16 80 L30 40 L38 50 L48 10 L58 38 L66 30 L78 80Z" fill="#75706a"/><path d="M48 10 L58 38 L66 30 L78 80 L56 80 L52 44Z" fill="#5a5650"/><path d="M48 10 L42 26 L46 24 L50 30 L54 22Z" fill="#eef3f6"/><path d="M30 40 L27 50 L32 47 L36 52Z" fill="#e3eaee"/><path d="M40 58 l-3 14 M60 52 l3 16" stroke="#8b867e" stroke-width="1.6" stroke-linecap="round"/>`),
    alpinePine: svg(`<ellipse cx="48" cy="80" rx="22" ry="5" fill="rgba(0,0,0,0.4)"/><rect x="44" y="66" width="8" height="14" fill="#4f3b2c"/><path d="M48 6 L64 32 L32 32Z" fill="#2c4a3a"/><path d="M48 20 L70 50 L26 50Z" fill="#284536"/><path d="M48 36 L74 70 L22 70Z" fill="#233e30"/><path d="M48 6 L64 32 L56 32Z M48 20 L70 50 L60 50Z M48 36 L74 70 L62 70Z" fill="#1a3226"/>`),
    mindCrystal: svg(`<circle cx="46" cy="48" r="32" fill="#c27ae0" opacity="0.14"/><ellipse cx="48" cy="76" rx="30" ry="7" fill="rgba(0,0,0,0.4)"/><path d="M18 76 Q20 62 34 60 L62 60 Q76 62 78 76Z" fill="#6c6760"/><path d="M34 66 L40 26 L48 66Z" fill="#b57ad6"/><path d="M40 26 L48 66 L43 66Z" fill="#8a4fb0"/><path d="M44 66 L54 14 L64 66Z" fill="#c995ea"/><path d="M54 14 L64 66 L57 66Z" fill="#9a5cc2"/><path d="M60 66 L68 42 L74 66Z" fill="#b57ad6"/><path d="M68 42 L74 66 L70 66Z" fill="#8a4fb0"/><path d="M52 24 L50 50 M39 36 l-1 14" stroke="#f3dcff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>`),
    chasm: svg(`<rect x="0" y="0" width="92" height="92" rx="3" fill="#2a2724"/><path d="M0 0 H92 V14 Q70 22 46 16 Q22 10 0 18Z" fill="#5c574f"/><path d="M0 92 H92 V80 Q66 72 44 78 Q20 84 0 76Z" fill="#504b44"/><ellipse cx="46" cy="48" rx="40" ry="24" fill="#141210"/><ellipse cx="46" cy="50" rx="24" ry="12" fill="#0a0908"/><path d="M8 20 L14 30 M80 18 L76 30 M16 78 L22 70" stroke="#6f6a62" stroke-width="2" stroke-linecap="round"/>`),
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
    desertPebbles: `<ellipse cx="38" cy="62" rx="4" ry="3" fill="#6a5238"/><ellipse cx="50" cy="66" rx="3" ry="2.2" fill="#5c4630"/><ellipse cx="56" cy="58" rx="2.5" ry="2" fill="#7a5f42"/><ellipse cx="44" cy="70" rx="2" ry="1.6" fill="#6a5238"/>`,
    oxSkull: `<ellipse cx="46" cy="70" rx="14" ry="3" fill="rgba(0,0,0,0.25)"/><path d="M38 54 q-12 -2 -15 -12 q9 6 17 4z M54 54 q12 -2 15 -12 q-9 6 -17 4z" fill="#e6dcc4"/><path d="M38 51 h16 l-2 17 q-6 4 -12 0z" fill="#e6dcc4"/><circle cx="42" cy="57" r="2.2" fill="#5c4630"/><circle cx="50" cy="57" r="2.2" fill="#5c4630"/><path d="M44 64h4" stroke="#b3a582" stroke-width="1.2"/>`,
    scarab: `<ellipse cx="46" cy="62" rx="6" ry="8" fill="#2f4a5a"/><path d="M46 54v16" stroke="#6f9ab0" stroke-width="1"/><circle cx="46" cy="53" r="3" fill="#24394a"/><path d="M40 58l-5 -3M40 63l-6 0M40 67l-5 3M52 58l5 -3M52 63l6 0M52 67l5 3" stroke="#24394a" stroke-width="1.4" stroke-linecap="round"/><path d="M43 57 q3 2 6 0" stroke="#8ec3d6" stroke-width="1" fill="none" opacity="0.7"/>`,
    sack: `<ellipse cx="48" cy="72" rx="16" ry="4" fill="rgba(0,0,0,0.35)"/><path d="M34 70 q-4 -18 8 -24 h8 q12 6 8 24z" fill="#9a8660"/><path d="M42 46 q4 -4 8 0" stroke="#6e5a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M40 60 q8 3 16 0" stroke="#7e6c4a" stroke-width="1.5" fill="none"/>`,
    // Laboratorio Enano
    dirt: `<ellipse cx="44" cy="62" rx="17" ry="6" fill="#33281e" opacity="0.75"/><circle cx="37" cy="60" r="3" fill="#4a3b2c"/><circle cx="49" cy="63" r="2.4" fill="#4a3b2c"/><circle cx="56" cy="58" r="1.8" fill="#5a4833"/><circle cx="31" cy="64" r="1.5" fill="#5a4833"/>`,
    oilPuddle: `<path d="M28 62 q4 -8 18 -7 q14 -1 18 6 q-2 9 -18 8 q-16 1 -18 -7z" fill="#121110" opacity="0.85"/><ellipse cx="42" cy="59" rx="7" ry="2" fill="#5a4a7a" opacity="0.45"/><ellipse cx="51" cy="63" rx="5" ry="1.5" fill="#3f6a6a" opacity="0.45"/>`,
    bolts: `<polygon points="45,60 42.5,64.3 37.5,64.3 35,60 37.5,55.7 42.5,55.7" fill="#8a918a"/><circle cx="40" cy="60" r="1.8" fill="#2e3034"/><polygon points="55,52 53.5,54.6 50.5,54.6 49,52 50.5,49.4 53.5,49.4" fill="#7a828a"/><circle cx="52" cy="52" r="1.1" fill="#2e3034"/><g transform="rotate(-30 56 66)"><rect x="50" y="64.5" width="13" height="3" fill="#7a828a"/><rect x="48" y="63" width="4" height="6" rx="1" fill="#8a918a"/></g>`,
    runeGlow: `<circle cx="46" cy="60" r="15" fill="#5fd3e6" opacity="0.08"/><circle cx="46" cy="60" r="10" fill="none" stroke="#5fd3e6" stroke-width="1.4" opacity="0.7"/><path d="M46 52 v16 M40 56 l12 8 M52 56 l-12 8" stroke="#7ee3f2" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>`,
    // Playa
    foam: `<path d="M22 60 q6 -4 12 0 t12 0 t12 0 t12 0" stroke="#f7fbfa" stroke-width="2" fill="none" opacity="0.75" stroke-linecap="round"/><path d="M30 66 q6 -3 12 0 t12 0 t12 0" stroke="#f7fbfa" stroke-width="1.5" fill="none" opacity="0.5" stroke-linecap="round"/>`,
    beachPuddle: `<ellipse cx="46" cy="62" rx="17" ry="6.5" fill="#5aa3b3" opacity="0.6"/><ellipse cx="41" cy="60" rx="6" ry="1.6" fill="#d6f1f5" opacity="0.7"/>`,
    seaweed: `<path d="M28 64 q8 -6 16 0 q8 6 16 0" stroke="#3f6b33" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 66 q4 -8 10 -6 M52 62 q3 6 9 5" stroke="#557f3f" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    pebbles: `<ellipse cx="38" cy="62" rx="4.5" ry="3.2" fill="#8d8a84"/><ellipse cx="48" cy="57" rx="3" ry="2.2" fill="#a29e96"/><ellipse cx="55" cy="64" rx="3.8" ry="2.6" fill="#77746e"/><ellipse cx="44" cy="67" rx="2.2" ry="1.6" fill="#9a968e"/>`,
    wetSand: `<ellipse cx="46" cy="62" rx="22" ry="9" fill="#a8946c" opacity="0.38"/><ellipse cx="52" cy="66" rx="10" ry="3" fill="#a8946c" opacity="0.3"/>`,
    shell: `<path d="M39 65 q7 -14 14 0 z" fill="#ecdccb"/><path d="M46 53 v12 M42.5 56 l1.8 9 M49.5 56 l-1.8 9" stroke="#c4a88f" stroke-width="1"/><rect x="43" y="64.5" width="6" height="2.5" rx="1" fill="#d9c3ad"/>`,
    // Cueva (los huesos reusan "bones" del cementerio)
    caveGravel: `<ellipse cx="38" cy="62" rx="4" ry="3" fill="#2b3035"/><ellipse cx="50" cy="66" rx="3" ry="2.2" fill="#262a2e"/><ellipse cx="56" cy="58" rx="2.5" ry="2" fill="#30353a"/><ellipse cx="44" cy="70" rx="2" ry="1.6" fill="#2b3035"/>`,
    dripPuddle: `<ellipse cx="46" cy="62" rx="16" ry="6" fill="#18303a" opacity="0.85"/><ellipse cx="46" cy="62" rx="7" ry="2.6" fill="none" stroke="#4f8a9a" stroke-width="1.1" opacity="0.7"/><ellipse cx="41" cy="60" rx="4" ry="1.2" fill="#9fd3df" opacity="0.4"/>`,
    glowMoss: `<circle cx="46" cy="60" r="14" fill="#6fe0c8" opacity="0.10"/><circle cx="40" cy="60" r="2.4" fill="#8af0d8"/><circle cx="47" cy="56" r="1.8" fill="#6fe0c8"/><circle cx="52" cy="62" r="2.2" fill="#8af0d8"/><circle cx="45" cy="64" r="1.5" fill="#6fe0c8"/>`,
    clawMarks: `<path d="M34 52 L44 70 M41 50 L51 68 M48 48 L58 66" stroke="#1f2327" stroke-width="2.6" stroke-linecap="round"/><path d="M35 51 L45 69 M42 49 L52 67 M49 47 L59 65" stroke="#5c646b" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>`,
    // Hielo
    snowDrift: `<path d="M24 66 q10 -12 24 -9 q14 -4 22 9 z" fill="#ffffff" opacity="0.85"/><path d="M30 64 q8 -6 18 -5" stroke="#c9d9e3" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    iceShards: `<path d="M36 66 L39 52 L42 66Z" fill="#8fd0ea"/><path d="M46 68 L50 56 L53 68Z" fill="#a9dcef"/><path d="M55 64 L57 57 L59 64Z" fill="#74bfe0"/><path d="M39 54 v8" stroke="#ffffff" stroke-width="0.9" opacity="0.8"/>`,
    pawPrints: `<g fill="#9fb4c3"><ellipse cx="36" cy="66" rx="4.2" ry="5"/><circle cx="32.5" cy="59.5" r="1.5"/><circle cx="36" cy="58.5" r="1.5"/><circle cx="39.5" cy="59.5" r="1.5"/><ellipse cx="54" cy="56" rx="4.2" ry="5"/><circle cx="50.5" cy="49.5" r="1.5"/><circle cx="54" cy="48.5" r="1.5"/><circle cx="57.5" cy="49.5" r="1.5"/></g>`,
    frozenPuddle: `<ellipse cx="46" cy="62" rx="17" ry="6.5" fill="#a9d6e8" opacity="0.75"/><path d="M36 62 l6 -2 l5 3 l7 -3" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.8"/><ellipse cx="40" cy="60" rx="5" ry="1.3" fill="#ffffff" opacity="0.7"/>`,
    sparkle: `<path d="M38 56 v8 M34 60 h8 M54 64 v6 M51 67 h6 M50 50 v4 M48 52 h4" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/><circle cx="38" cy="60" r="3" fill="#ffffff" opacity="0.35"/>`,
    // Montaña
    pebbles: `<ellipse cx="38" cy="62" rx="4" ry="3" fill="#5c574f"/><ellipse cx="50" cy="66" rx="3" ry="2.2" fill="#69645b"/><ellipse cx="56" cy="58" rx="2.5" ry="2" fill="#545049"/><ellipse cx="44" cy="70" rx="2" ry="1.6" fill="#625d55"/>`,
    alpineGrass: `<path d="M38 70 Q40 58 42 70 M44 70 Q46 54 48 70 M50 70 Q53 60 55 70" stroke="#6f8a52" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    edelweiss: `<g fill="#f2f2ea"><circle cx="40" cy="60" r="2.4"/><circle cx="44" cy="60" r="2.4"/><circle cx="42" cy="56.6" r="2.4"/><circle cx="42" cy="63.4" r="2.4"/></g><circle cx="42" cy="60" r="1.5" fill="#d9c766"/><g fill="#eeeee4"><circle cx="54" cy="66" r="2"/><circle cx="57.4" cy="66" r="2"/><circle cx="55.7" cy="63.2" r="2"/></g><circle cx="55.7" cy="65.2" r="1.2" fill="#d9c766"/><path d="M42 66 v6 M56 69 v4" stroke="#6f8a52" stroke-width="1.4"/>`,
    rockCrack: `<path d="M30 56 l8 4 l4 -3 l7 6 l6 -2 l8 5" stroke="#4a4640" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M45 57 l2 -6" stroke="#4a4640" stroke-width="1.3" stroke-linecap="round"/>`,
    crystalShard: `<circle cx="46" cy="62" r="11" fill="#c27ae0" opacity="0.18"/><path d="M40 70 L44 54 L48 70Z" fill="#b57ad6"/><path d="M44 54 L48 70 L46 70Z" fill="#8a4fb0"/><path d="M48 70 L52 60 L55 70Z" fill="#c995ea"/><path d="M44 58 v6" stroke="#f3dcff" stroke-width="0.9" opacity="0.9"/>`,
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
