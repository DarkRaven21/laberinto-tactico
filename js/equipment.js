// ============================================================
// equipment.js — catálogo de items (público, se cachea en
// sessionStorage igual que creature_types/character_classes) +
// lectura del equipo actual del personaje + wrappers de
// item-connect / item-replace / item-sell.
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

// v4: la caché guarda { at, data } y vence a los 15 minutos (igual que
// enemies.js), así los ítems nuevos aparecen solos sin cambiar la key.
// Cambiar la key solo hace falta si cambia el formato de lo guardado.
const ITEMS_CACHE_KEY = "cache:items:v4";
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getItems() {
    const cached = sessionStorage.getItem(ITEMS_CACHE_KEY);
    if (cached) {
        try {
            const { at, data } = JSON.parse(cached);
            if (Array.isArray(data) && Date.now() - at < CACHE_TTL_MS) {
                return data;
            }
        } catch {
            // cache corrupta, seguimos y la pedimos de nuevo
        }
    }
    const res = await supabaseFetch("/rest/v1/items?select=*");
    const items = await res.json();
    try {
        sessionStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify({ at: Date.now(), data: items }));
    } catch {
        // sin espacio o storage bloqueado: seguimos sin caché
    }
    return items;
}

// ¿El item está a la venta para este nivel? min_level <= nivel y
// (max_level null o >= nivel). Misma regla que validan item-connect e
// item-replace del lado del servidor — esto solo decide qué se muestra.
export function isItemForLevel(item, level) {
    const min = item.min_level ?? 1;
    const max = item.max_level ?? null;
    return level >= min && (max === null || level <= max);
}

// ¿Se puede comprar a este nivel? Cualquier ítem de tu nivel o menor
// (min_level <= nivel): max_level ya no frena la compra, solo ordena la
// Armería en pestañas. Misma regla que validan item-connect e item-replace.
export function canBuyAtLevel(item, level) {
    return level >= (item.min_level ?? 1);
}

// ¿Es un ítem especial? (necesita un objeto de familia para crearse).
export function isSpecialItem(item) {
    return !!item.requires_material;
}

// ¿El item es NUEVO para este nivel? (aparece justo en este nivel). En
// nivel 1 no se marca nada: ahí todo es nuevo y sería ruido. Los
// especiales no cuentan: dependen de tener el objeto, no del nivel.
export function isItemNewForLevel(item, level) {
    return level > 1 && !isSpecialItem(item) && (item.min_level ?? 1) === level;
}

// ---------- Objetos de familia (Especiales) ----------
// Catálogo: qué familias dejan objeto y cómo se llama. Cambia muy poco:
// se pide una vez por página.
export async function getMaterialCatalog() {
    const res = await supabaseFetch("/rest/v1/materials?select=family,label");
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
}

// Objetos que tiene el personaje como { family: cantidad } (solo los > 0).
export async function getMaterials() {
    const session = getSession();
    const res = await supabaseFetch(
        `/rest/v1/character_materials?character_id=eq.${session.id}&amount=gt.0&select=family,amount`
    );
    const rows = await res.json();
    const byFamily = {};
    if (Array.isArray(rows)) for (const r of rows) byFamily[r.family] = r.amount;
    return byFamily;
}

// ---------- Aviso de novedades en la armería ----------
// Guarda, por personaje y en este navegador, el último nivel en el que
// entró a la armería. La ciudad muestra un "!" en el botón Armería si
// hay ítems nuevos para el nivel actual y todavía no la visitó en ese nivel.
function armeriaSeenKey(characterId) {
    return `combate:armeriaSeenLevel:${characterId}`;
}

export function hasUnseenArmeriaNews(items, level, characterId) {
    if (!items.some(it => isItemNewForLevel(it, level))) return false;
    let seen = 0;
    try {
        seen = Number(localStorage.getItem(armeriaSeenKey(characterId))) || 0;
    } catch {
        // sin storage: se muestra el aviso
    }
    return seen < level;
}

export function markArmeriaSeen(level, characterId) {
    try {
        localStorage.setItem(armeriaSeenKey(characterId), String(level));
    } catch {
        // sin storage: el aviso vuelve a aparecer, no pasa nada grave
    }
}

// Nivel actual del personaje. No se cachea: cambia al subir de nivel.
// Sale de get-character-state, que ya lo devuelve.
export async function getCharacterLevel() {
    const state = await callEquip("get-character-state", {});
    return state.level ?? 1;
}

// Equipo actual del personaje como { slot: item_key }. A diferencia
// del catálogo, esto NO se cachea: cambia cada vez que se compra,
// reemplaza o vende algo, así que siempre conviene el dato fresco.
export async function getEquipment() {
    const session = getSession();
    const res = await supabaseFetch(
        `/rest/v1/character_equipment?character_id=eq.${session.id}&select=slot,item_key`
    );
    const rows = await res.json();
    const bySlot = {};
    for (const row of rows) bySlot[row.slot] = row.item_key;
    return bySlot;
}

async function callEquip(action, body) {
    const session = getSession();
    const res = await supabaseFetch(`/functions/v1/${action}`, {
        method: "POST",
        body: JSON.stringify({
            character_id: session.id,
            session_token: session.session_token,
            ...body
        })
    });
    return res.json();
}

// Usar cuando el slot está vacío (ver getEquipment). Si el slot ya
// tiene algo puesto, esto devuelve {error: "..."} — para pisarlo hay
// que usar replaceItem.
export function connectItem(itemKey) {
    return callEquip("item-connect", { item_key: itemKey });
}

// Usar cuando el slot ya tiene un item puesto y se quiere cambiar por
// otro. Siempre pisa lo que había.
export function replaceItem(itemKey) {
    return callEquip("item-replace", { item_key: itemKey });
}

// Vende lo que esté equipado en `slot` (price - maintenance_price,
// piso 0 — ver item-sell.ts) y libera el slot. Se usa desde el popup
// de estilo de vida para bajar el mantenimiento mensual antes de
// confirmar, cuando no alcanza el oro.
export function sellItem(slot) {
    return callEquip("item-sell", { slot });
}
