// ============================================================
// lifestyle.js — elección de "estilo de vida" (comida + dormir).
// Se paga con oro del banco (ver citybank.js) y dura toda la próxima
// pasada por el laberinto: el servidor la aplica como ±10% sobre dos
// grupos fijos de stats (ver get-character-state.ts y
// progress-action.ts) y se limpia sola en el 'reset' de
// progress-action cuando se sale del laberinto. Se lee directo de la
// tabla, mismo criterio que getEquipment() en equipment.js.
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

export const FOOD_OPTIONS = [
    { key: "mendigar", label: "Mendigar", price: 0 },
    { key: "sustento_basico", label: "Sustento básico", price: 5 },
    { key: "comer_bien", label: "Comer bien", price: 15 }
];

export const SLEEP_OPTIONS = [
    { key: "calle", label: "En las calles", price: 0 },
    { key: "posada", label: "En una posada", price: 5 },
    { key: "habitacion", label: "En una habitación", price: 15 }
];

export async function getLifestyle() {
    const session = getSession();
    const res = await supabaseFetch(
        `/rest/v1/character_lifestyle?character_id=eq.${session.id}&select=food_choice,sleep_choice`
    );
    const rows = await res.json();
    return rows[0] || { food_choice: null, sleep_choice: null };
}

export async function setLifestyle(foodChoice, sleepChoice) {
    const session = getSession();
    const res = await supabaseFetch("/functions/v1/set-lifestyle", {
        method: "POST",
        body: JSON.stringify({
            character_id: session.id,
            session_token: session.session_token,
            food_choice: foodChoice,
            sleep_choice: sleepChoice
        })
    });
    return res.json();
}
