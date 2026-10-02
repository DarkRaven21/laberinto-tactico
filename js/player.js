import { requireSession, clearSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

const HP = 20;
const MOVE = 3;
const AP = 3;

async function fetchPlayerConfig() {
    const session = requireSession();
    if (!session) return null; // requireSession ya redirige a login.php

    const res = await supabaseFetch("/functions/v1/get-character-state", {
        method: "POST",
        body: JSON.stringify({ character_id: session.id, session_token: session.session_token })
    });
    const data = await res.json();

    if (data.error) {
        // Sesión inválida/vencida del lado del servidor: limpiamos y
        // mandamos a loguear de nuevo en vez de dejar el juego roto.
        clearSession();
        window.location.href = "index.html";
        return null;
    }

    return {
        hp: HP,
        move: MOVE,
        ap: AP,
        icon: 'images/'+data.class_image_url,
        abilities: data.abilities,
        // Pasivas heredadas de las almas conectadas (ver
        // get-character-state.ts) — freshUnit() en battle.js ya sabe
        // leer cfg.passives de forma genérica, esto solo faltaba
        // viajar hasta acá.
        passives: data.passives,
        stats: data.stats,
        // No se usan para armar la unidad de combate — viajan acá
        // porque battle.js los necesita para el chequeo de ranuras de
        // alma (ver souls.js: hasSoulSlot) y esta llamada a
        // get-character-state ya los trae; pedirlos de nuevo ahí sería
        // repetir la misma consulta pesada por gusto.
        level: data.level,
        souls: data.souls,
        // Idem — ciudad.js lo usa para la tarjeta de personaje.
        name: data.name
    };
}

export const PLAYER_CONFIG = await fetchPlayerConfig();
