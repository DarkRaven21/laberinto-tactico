// ============================================================
// ability-prefs.js — habilidades que el jugador desactivó en la
// página Habilidades (habilidades.html). Solo es una preferencia de
// pantalla: battle.js no las muestra en la mano, pero el personaje las
// sigue teniendo.
//
// Se guarda en localStorage, por personaje y por navegador (a
// propósito: en el celular se pueden ocultar más que en la PC).
// Se guarda la lista de DESACTIVADAS, así una habilidad nueva (alma o
// ítem recién conseguido) aparece activa sola.
// ============================================================

function storageKey(characterId) {
    return `combate:hiddenAbilities:${characterId}`;
}

export function getHiddenAbilities(characterId) {
    try {
        const list = JSON.parse(localStorage.getItem(storageKey(characterId)));
        return new Set(Array.isArray(list) ? list : []);
    } catch {
        return new Set();
    }
}

export function setHiddenAbilities(characterId, hiddenSet) {
    try {
        localStorage.setItem(storageKey(characterId), JSON.stringify([...hiddenSet]));
    } catch {
        // sin storage: la preferencia dura hasta recargar
    }
}

// Habilidades a mostrar en combate. Si por algún motivo quedaran todas
// ocultas (por ejemplo, se perdió la única activa al desconectar un
// alma), se muestran todas: nunca se entra a pelear sin cartas.
export function visibleAbilities(abilities, hiddenSet) {
    const visible = abilities.filter(key => !hiddenSet.has(key));
    return visible.length ? visible : abilities.slice();
}
