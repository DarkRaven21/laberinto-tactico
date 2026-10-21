import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseConfig.js";
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

async function callProgressAction(action, extra = {}) {
    const session = getSession();
    const res = await supabaseFetch("/functions/v1/progress-action", {
        method: "POST",
        body: JSON.stringify({
            character_id: session.id,
            session_token: session.session_token,
            action,
            ...extra
        })
    });
    return res.json();
}

// Trae la corrida actual (sala, horas, hp, oro). Si el personaje
// nunca tuvo una fila de progreso (primera vez que entra al
// laberinto), el servidor la crea sola con los valores iniciales.
//
// También trae heal_per_hour (mergeado acá como `healPerHour`): el
// server ya lo calcula para su propia cuenta interna, así que viaja
// gratis. laberinto.js lo cachea para poder estimar HP/horas de forma
// optimista en el cliente sin pegarle al server por cada "Descansar".
export async function getProgress() {
    const { progress, heal_per_hour, max_hp, killed_types, rift, available_rift, companion, raze_max_level, error } = await callProgressAction("get");
    if (error) throw new Error(error);
    // killedTypes: tipos de criatura que ya te dieron XP (ver
    // character_killed_types). El laberinto lo usa para que las tarjetas
    // muestren XP solo de lo que todavía no mataste.
    // rift: grieta en curso (sala, enemigos, si es el jefe…) o null.
    // availableRift: grieta que puede aparecer en esta corrida o null.
    return {
        ...progress,
        healPerHour: heal_per_hour,
        maxHp: max_hp,
        killedTypes: killed_types || [],
        rift: rift || null,
        availableRift: available_rift || null,
        // Compañero contratado en la Taberna (o null): nombre, nivel, ícono,
        // estilo, stats, habilidades, pasivas, hp, max_hp, heal_per_hour.
        // hp 0 = murió en esta corrida.
        companion: companion || null,
        // Hasta qué nivel del laberinto se puede arrasar (0 = ninguno).
        razeMaxLevel: raze_max_level || 0
    };
}

// Arrasar un camino: ganarlo sin pelear (oro, sin XP ni alma), pasa 1
// hora y avanza a la sala siguiente. El servidor valida todo.
export async function raze(enemyKeys) {
    const { progress, gold_gained, heal_per_hour, max_hp, companion, error } = await callProgressAction("raze", { enemies: enemyKeys });
    if (error) throw new Error(error);
    return {
        progress: { ...progress, healPerHour: heal_per_hour, maxHp: max_hp, companion: companion || null },
        goldGained: gold_gained
    };
}

// Hace avanzar el reloj `hours` horas, curando de a una hora por vez
// según la Regeneración real del personaje (calculada server-side).
// Esta es la versión "de verdad" — laberinto.js la llama poco (solo
// en los checkpoints), no en cada click de "Descansar".
export async function rest(hours) {
    const { progress, heal_per_hour, max_hp, companion, error } = await callProgressAction("rest", { hours });
    if (error) throw new Error(error);
    return { ...progress, healPerHour: heal_per_hour, maxHp: max_hp, companion: companion || null };
}

// Versión "dispará y olvidate" de rest(), pensada para el evento
// pagehide: si el jugador cierra la pestaña con horas acumuladas sin
// sincronizar, esto intenta persistirlas igual. No podemos esperar
// la respuesta (el navegador ya está descartando la página), así que
// no hay forma de confirmar que llegó — es sólo un intento best-effort,
// no una garantía.
// Nota: a propósito NO usa supabaseFetch. Se dispara en pagehide, con
// la página ya desapareciendo — no tiene sentido prender un spinner
// que nadie va a ver, y queremos el keepalive:true lo más "crudo"
// posible para no depender de nada del ciclo de vida del módulo.
export function restBeacon(hours) {
    const session = getSession();
    if (!session || hours <= 0) return;
    try {
        fetch(`${SUPABASE_URL}/functions/v1/progress-action`, {
            method: "POST",
            keepalive: true,
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                character_id: session.id,
                session_token: session.session_token,
                action: "rest",
                hours
            })
        });
    } catch {
        // best-effort nomás, ver comentario arriba
    }
}

// Se llama al ganar un combate: manda qué criaturas murieron (el
// servidor calcula el oro real a partir de eso, no confía en un
// número que mande el cliente) y el HP final reportado por el motor
// de combate. Devuelve el progreso actualizado + cuánto oro y XP se
// ganó (xpGained: XP permanente, solo cuenta la primera vez que se
// mata cada tipo de criatura — ver progress-action.ts).
// companionHp: vida con la que terminó el compañero (0 si murió). Si no
// hay compañero, no se manda y el servidor no toca nada.
// hp 0 del jugador = cayó pero el compañero ganó: sigue con 1 de vida.
export async function finishCombat(defeatedKeys, hp, companionHp = null) {
    const extra = { defeated: defeatedKeys, hp };
    if (companionHp != null) extra.companion_hp = companionHp;
    const { progress, gold_gained, xp_gained, heal_per_hour, level, leveled_up, max_hp, companion, error } = await callProgressAction("finish-combat", extra);
    if (error) throw new Error(error);
    return {
        progress: { ...progress, healPerHour: heal_per_hour, maxHp: max_hp, companion: companion || null },
        goldGained: gold_gained,
        xpGained: xp_gained,
        level,
        leveledUp: leveled_up
    };
}

// Dentro de una grieta avanza de sala de la grieta; después del jefe la
// cierra y devuelve la sala y las horas del laberinto (riftClosed: true).
export async function advanceRoom() {
    const { progress, rift_closed, error } = await callProgressAction("advance-room");
    if (error) throw new Error(error);
    return { ...progress, riftClosed: !!rift_closed };
}

// Entrar a la grieta ofrecida en el laberinto. El servidor valida nivel,
// sala mínima, alma requerida y que sea la primera de la corrida.
export async function enterRift(riftKey) {
    const { progress, rift, error } = await callProgressAction("enter-rift", { rift_key: riftKey });
    if (error) throw new Error(error);
    return { progress, rift };
}

export async function advanceLevel() {
    const { progress, heal_per_hour, max_hp, companion, error } = await callProgressAction("advance-level");
    if (error) throw new Error(error);
    return { ...progress, healPerHour: heal_per_hour, maxHp: max_hp, companion: companion || null };
}

// outcome: "exit" (salida normal del laberinto) | "defeat" (derrota
// en combate). El server usa esto para decidir cuánto del oro de la
// corrida actual transfiere al banco permanente (completo vs. mitad)
// antes de resetear character_progress — ver progress-action.ts.
export async function resetProgress(outcome = "exit") {
    const { progress, error } = await callProgressAction("reset", { outcome });
    if (error) throw new Error(error);
    return progress;
}

// ¿El personaje tiene una corrida del laberinto en curso? Lo usa la
// ciudad para mandarte directo al laberinto si saliste a mitad de una
// corrida (por ejemplo, cerraste el navegador en la sala 8 y volviste a
// entrar desde otro dispositivo: el login te deja en la ciudad).
// Una corrida está en curso si la fila de progreso NO está como la deja
// 'reset' (sala 1, nivel 1, 24 horas, 0 de oro). Entrar al laberinto y
// volver sin pelear deja todo igual, así que ahí no se redirige: no hay
// nada que retomar. Ante cualquier error devuelve false (te quedás en la
// ciudad, que es lo que pasaba antes).
const FRESH_HOURS = 24; // MAX_HOURS de progress-action.ts

export async function isLaberintoInProgress() {
    try {
        const p = await getProgress();
        return (p.room || 1) > 1
            || (p.laberinto_level || 1) > 1
            || (p.hours_remaining ?? FRESH_HOURS) < FRESH_HOURS
            || (p.gold || 0) > 0;
    } catch {
        return false;
    }
}
