// ============================================================
// encounter.js — generador de encuentros aleatorios.
// Vive en su propio archivo (y no dentro de battle.js) para que
// laberinto.js lo pueda importar sin arrastrar el arranque
// automático de una partida ni los listeners del tablero, que
// battle.js tiene a nivel de módulo (newGame() al final, clicks
// sobre #board, #endTurnBtn, etc. — cosas que no existen en la
// página del laberinto).
// Único lugar de verdad: tanto el combate como el preview del
// laberinto arman los encuentros con esta misma función.
// ============================================================
import { ENEMY_TYPES } from "./enemies.js";

// El presupuesto de XP y la cantidad de criaturas escalan con el
// nivel de laberinto — cada nivel tiene su propio elenco, más caro
// en XP que el anterior (ver level_visibility en creature_types), así
// que un pool fijo se quedaba corto apenas se pasaba de nivel 1.
// A nivel 1 esto da exactamente los valores de siempre (min 2, max 7,
// 3 criaturas) — no cambia nada de lo ya calibrado, solo escala hacia
// arriba en los niveles siguientes.
const XP_POOL_MIN_PER_LEVEL = 2;
const XP_POOL_MAX_PER_LEVEL = 7;
const MAX_CREATURES_BASE = 2; // + laberinto_level

const MIX_CHANCE = 0.20;          // probabilidad de mezclar 2 familias
const MAX_FAMILIES_WHEN_MIXED = 2;

// A partir de esta sala, las criaturas marcadas "hidden" PARA EL NIVEL
// ACTUAL entran al pool de candidatos. La visibilidad ya no es una
// propiedad fija de la criatura — depende del nivel de laberinto
// (level_visibility en creature_types): la misma criatura puede ser
// "hidden" en un nivel y nativa ("normal") en otro, o directamente no
// existir en un nivel dado (sin entrada).
const HIDDEN_UNLOCK_ROOM = 8;

// Sala mínima por FAMILIA: antes de esta sala, ninguna criatura de la
// familia entra al pool, sea "normal" o "hidden". Aplica en todos los
// niveles de laberinto. Las familias que no figuran acá no tienen
// restricción. Se combina con HIDDEN_UNLOCK_ROOM: una criatura hidden
// de una familia listada acá necesita cumplir las dos condiciones.
// OJO: la clave tiene que coincidir exacto con ENEMY_TYPES[key].family.
const FAMILY_MIN_ROOM = {
  bandidos: 5,
};

// Salas de arranque más suaves. Solo en los niveles listados; pisa el
// techo de XP y la cantidad máxima de criaturas de las primeras salas.
// Pensado para que un personaje nuevo no arranque contra un grupo
// grande antes de tener almas/equipo. Las salas que no figuran usan
// los valores normales del nivel. El piso del pool (xpPoolMin) no se
// toca: si xpMax queda por debajo, manda xpMax.
const EARLY_ROOM_OVERRIDES = {
  1: {
    1: { xpMax: 3, maxCreatures: 1 },
    2: { xpMax: 4, maxCreatures: 2 },
    3: { xpMax: 5, maxCreatures: 2 },
  },
};

// `level`: nivel de laberinto actual (character_progress.laberinto_level).
export function generateEncounter(room = 1, level = 1) {
  const eligibleKeys = Object.keys(ENEMY_TYPES).filter(key => {
    const visibility = ENEMY_TYPES[key].levelVisibility?.[level];
    if (!visibility) return false;              // no existe en este nivel
    const familyMinRoom = FAMILY_MIN_ROOM[ENEMY_TYPES[key].family] ?? 1;
    if (room < familyMinRoom) return false;      // familia todavía bloqueada
    if (visibility === "hidden") return room >= HIDDEN_UNLOCK_ROOM;
    return true;                                  // "normal"
  });

  const early = EARLY_ROOM_OVERRIDES[level]?.[room];
  const xpPoolMax = early?.xpMax ?? XP_POOL_MAX_PER_LEVEL * level;
  const xpPoolMin = Math.min(XP_POOL_MIN_PER_LEVEL * level, xpPoolMax);
  const maxCreatures = early?.maxCreatures ?? MAX_CREATURES_BASE + level;

  const pool = xpPoolMin + Math.floor(Math.random() * (xpPoolMax - xpPoolMin + 1));

  const allFamilies = [...new Set(eligibleKeys.map(key => ENEMY_TYPES[key].family))];
  const mixed = Math.random() < MIX_CHANCE;
  const numFamilies = mixed ? Math.min(MAX_FAMILIES_WHEN_MIXED, allFamilies.length) : 1;

  const remainingFamilies = allFamilies.slice();
  const chosenFamilies = [];
  for (let i = 0; i < numFamilies && remainingFamilies.length; i++) {
    const idx = Math.floor(Math.random() * remainingFamilies.length);
    chosenFamilies.push(remainingFamilies.splice(idx, 1)[0]);
  }

  const candidateKeys = eligibleKeys.filter(key => chosenFamilies.includes(ENEMY_TYPES[key].family));

  const chosen = [];
  let remainingXp = pool;
  while (chosen.length < maxCreatures) {
    const affordable = candidateKeys.filter(key => ENEMY_TYPES[key].xp <= remainingXp);
    if (affordable.length === 0) break;
    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    chosen.push(pick);
    remainingXp -= ENEMY_TYPES[pick].xp;
  }

  // Salvavidas: si el pool era tan chico que no entró NADA, forzamos
  // la criatura más barata de esas familias para no arrancar un
  // combate vacío.
  if (chosen.length === 0 && candidateKeys.length) {
    const cheapest = candidateKeys.reduce((a, b) => ENEMY_TYPES[a].xp <= ENEMY_TYPES[b].xp ? a : b);
    chosen.push(cheapest);
  }

  return chosen;
}