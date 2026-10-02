// ============================================================
// events.js — catálogo de eventos de ciudad (city_events en la BD) y
// la compra en sí. Mismo criterio que enemies.js: se lee la tabla
// directo por REST (solo lectura, no hay validación que hacer acá) y
// se cachea en sessionStorage — el catálogo no cambia en el medio de
// una sesión de juego.
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

const CACHE_KEY = "cache:cityEvents";

async function fetchCityEvents() {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            // cache corrupta, seguimos y la pedimos de nuevo
        }
    }

    const res = await supabaseFetch("/rest/v1/city_events?select=*");

    if (!res.ok) {
        throw new Error(`No se pudo cargar city_events (status ${res.status})`);
    }

    const rows = await res.json();
    const result = {};

    for (const row of rows) {
        result[row.key] = {
            label: row.label,
            base_price: row.base_price,
            stats: row.stats
        };
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    return result;
}

export const CITY_EVENTS = await fetchCityEvents();

export async function buyEvent(eventKey) {
    const session = getSession();
    const res = await supabaseFetch("/functions/v1/buy-event", {
        method: "POST",
        body: JSON.stringify({
            character_id: session.id,
            session_token: session.session_token,
            event_key: eventKey
        })
    });
    return res.json();
}
