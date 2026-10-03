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
