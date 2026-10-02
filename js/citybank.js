// ============================================================
// citybank.js — banco PERMANENTE del jugador (character_bank en la
// BD). Ya NO vive en localStorage: el oro y la XP los escriben las
// edge functions (item-connect, item-replace, set-lifestyle,
// progress-action) — este módulo solo lee el saldo actual.
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

export async function getBank() {
    const session = getSession();
    const res = await supabaseFetch(
        `/rest/v1/character_bank?character_id=eq.${session.id}&select=gold,xp,laberinto_entries,tax_pending,active_events,used_events`
    );
    const rows = await res.json();
    return rows[0] || { gold: 0, xp: 0, laberinto_entries: 0, tax_pending: false, active_events: [], used_events: [] };
}
