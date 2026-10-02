import { supabaseFetch } from "./httpClient.js";

export const ALL_POSSIBLE_STATS = [
  "Acrobacias", "Atletismo", "Capacidad pulmonar", "Fortaleza", "Fuerza",
  "Movilidad", "Reflejos", "Regeneración", "Resistencia", "Resistencia Mágica",
  "Sensibilidad al dolor", "Velocidad",
  "Agudeza mental", "Concentración", "Conocimiento", "Creatividad", "Ingenio",
  "Inteligencia", "Percepción", "Perspicacia", "Sabiduría",
  "Carisma", "Confianza", "Inspiracion", "Liderazgo", "Persuasión",
  "Agresividad", "Autocontrol", "Disciplina", "Impulsividad", "Paciencia",
  "Terquedad", "Determinación", "Entereza", "Espiritu", "Impetu",
  "Resiliencia", "Voluntad",
  "Afinidad mágica", "Iniciativa", "Instinto", "Mentalidad táctica",
  "Prudencia", "Suerte", "Arma Melee", "Arma Distancia", "Foco Magico", "Armadura"
];

// Caché de creature_types en sessionStorage (por pestaña).
// - v3: invalida la caché vieja de las pestañas que ya estaban abiertas.
//   Si algún día cambia el formato de `result`, subir este número.
// - CACHE_TTL_MS: aunque la pestaña siga abierta, pasado este tiempo se
//   vuelve a pedir la tabla. Así una familia o criatura nueva cargada en
//   la base aparece sola, sin tener que cerrar la pestaña ni tocar código.
const CACHE_KEY = "cache:creatureTypes:v3";
const OLD_CACHE_KEYS = ["cache:creatureTypes", "cache:creatureTypes:v1", "cache:creatureTypes:v2"];
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

async function fetchCreatureTypes() {
  OLD_CACHE_KEYS.forEach(k => sessionStorage.removeItem(k));

  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { at, data } = JSON.parse(cached);
      if (data && typeof at === "number" && Date.now() - at < CACHE_TTL_MS) {
        return data;
      }
    } catch {
      // cache corrupta, seguimos y la pedimos de nuevo
    }
  }

  const res = await supabaseFetch("/rest/v1/creature_types?select=*");

  if (!res.ok) {
    throw new Error(`No se pudo cargar creature_types (status ${res.status})`);
  }

  const rows = await res.json();
  const result = {};

  for (const row of rows) {
    result[row.key] = {
      label: row.label,
      hp: row.hp,
      move: row.move,
      ap: row.ap,
      abilities: row.abilities,
      icon: row.icon,
      family: row.family,
      xp: row.xp,
      levelVisibility: row.level_visibility,   // ← antes: hidden: row.hidden
      passives: row.passives,
      stats: row.stats,
      ...(row.ai_style ? { aiStyle: row.ai_style } : {})
    };
  }

  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: result }));
  return result;
}

export const ENEMY_TYPES = await fetchCreatureTypes();
