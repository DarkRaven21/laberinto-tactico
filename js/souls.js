// ============================================================
// souls.js — conexión con la edge function connect-soul: intenta
// guardar el alma de una criatura para el personaje. El server valida
// si hay ranuras libres según el nivel (ver connect-soul) — acá no se
// duplica esa lógica, solo se llama y se deja que el caller decida
// qué hacer con el resultado (battle.js: si falla, no bloquea nada).
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

export async function connectSoul(soulType) {
    const session = getSession();
    const res = await supabaseFetch("/functions/v1/connect-soul", {
        method: "POST",
        body: JSON.stringify({
            character_id: session.id,
            session_token: session.session_token,
            soul_type: soulType
        })
    });
    return res.json();
}

// Chequeo de solo lectura, para usar ANTES de ofrecer conectar un
// alma — connect-soul.ts rechaza si count(character_souls) >= level
// (1 ranura por nivel). En vez de volver a pedirle el estado al
// server acá (get-character-state ya se llamó una vez al cargar la
// página, ver player.js: PLAYER_CONFIG.level / .souls), esto solo
// repite la misma comparación con esos datos ya en memoria. Si algún
// día cambia el criterio de ranuras en connect-soul.ts, hay que
// actualizar esto también — es la única duplicación real entre los
// dos archivos.
export function hasSoulSlot(level, soulsCount) {
    return soulsCount < level;
}
