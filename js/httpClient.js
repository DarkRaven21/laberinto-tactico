// ============================================================
// httpClient.js — único punto de entrada para pegarle a Supabase
// (tablas REST o Edge Functions). Reemplaza los `fetch(...)` sueltos
// que había repetidos en enemies.js, login.js, player.js y
// progress.js, cada uno reescribiendo los mismos headers.
//
// Ganancia real de centralizarlo acá: el spinner de loading.js se
// prende/apaga solo, alrededor de CUALQUIER llamada que pase por
// supabaseFetch — no hay que acordarse de prenderlo a mano en cada
// función que hace red. Cualquier fetch NUEVO a Supabase que se
// agregue a futuro usando este helper ya viene con el spinner gratis.
//
// No parsea la respuesta ni valida `res.ok`: devuelve el Response tal
// cual, exactamente como devolvía `fetch` antes — así ningún call site
// tuvo que cambiar su manejo de errores (`data.error`, `res.ok`, etc.),
// solo de dónde sacan el Response.
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseConfig.js";
import { withLoading } from "./loading.js";

const BASE_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
};

// `path` puede ser una URL completa o una ruta relativa a
// SUPABASE_URL (ej. "/rest/v1/creature_types?select=*",
// "/functions/v1/login-character").
export function supabaseFetch(path, options = {}) {
    const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
    const headers = {
        ...BASE_HEADERS,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
    };
    return withLoading(() => fetch(url, { ...options, headers }));
}
