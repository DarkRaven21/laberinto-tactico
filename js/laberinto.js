import { ENEMY_TYPES } from "./enemies.js";
import { generateEncounter } from "./encounter.js";
import { getProgress, rest as restProgress, resetProgress, restBeacon, advanceLevel } from "./progress.js";
import { requireSession } from "./session.js";
import { getBank } from "./citybank.js";
import { ICON_COINS, ICON_HOURGLASS } from "./icons.js";

requireSession();

const MIN_PATHS = 1;
const MAX_PATHS = 5;
// Mínimo de caminos en las salas de arranque. Solo en los niveles
// listados; las salas que no figuran usan MIN_PATHS. La cantidad se
// sigue sorteando uniforme entre ese mínimo y MAX_PATHS.
// Mismo criterio que EARLY_ROOM_OVERRIDES en encounter.js: que un
// personaje nuevo tenga para elegir en las primeras salas.
const EARLY_ROOM_MIN_PATHS = {
    1: { 1: 3, 2: 2, 3: 2 },
};

const STORAGE_KEY = "combate:forcedEncounter";
const COMBAT_PAGE = "combate_tactico.html";

// A partir de esta sala empieza a poder aparecer la Puerta al
// siguiente nivel. Probabilidad: 0% antes, y desde PUERTA_START_ROOM
// se duplica sala a sala hasta tocar el techo PUERTA_MAX_CHANCE
// (sala 6=5%, 7=10%, 8=20%, 9 en adelante=40% fijo).
const PUERTA_START_ROOM = 6;
const PUERTA_BASE_CHANCE = 0.05;
const PUERTA_MAX_CHANCE = 0.40;

// paths: array de objetos { type: "encounter", enemies: [...] } o
// { type: "puerta" } (a lo sumo uno por visita a un nivel).
let paths = [];
let currentProgress = null;

// Oro del banco (ciudad). Se lee una vez al entrar: mientras estás en el
// laberinto no cambia. El oro que se muestra es banco + lo ganado en esta
// pasada (progress.gold).
let bankGold = 0;

// Tipos de criatura que ya te dieron XP (character_killed_types, viene
// con getProgress). Se lee una vez al entrar: las muertes nuevas pasan en
// la página de combate y al volver se vuelve a pedir.
let killedTypes = new Set();

// Misma cuenta que finish-combat en progress-action.ts:
// - XP: una sola vez por TIPO y solo si nunca lo mataste; bandidos nunca dan.
// - Oro: por cada criatura, ceil(xp × 1.5); bandidos ceil(xp × 3).
function encounterRewards(encounter) {
    let xp = 0;
    let gold = 0;
    const counted = new Set();
    for (const key of encounter) {
        const cfg = ENEMY_TYPES[key] || {};
        const isBandit = cfg.family === "bandidos";
        gold += Math.ceil((cfg.xp || 0) * (isBandit ? 3 : 1.5));
        if (!isBandit && !killedTypes.has(key) && !counted.has(key)) {
            counted.add(key);
            xp += cfg.xp || 0;
        }
    }
    return { xp, gold };
}

// Horas de "Descansar" ya aplicadas de forma optimista en el cliente
// pero todavía no confirmadas con progress-action. Se van sumando en
// cada click sin llamar al server (ver rest()) y se mandan de una
// sola vez en flushRest(), que solo se llama en los checkpoints
// reales: al elegir un camino (chooseTrail), al cruzar la Puerta
// (choosePuerta) o cuando las horas locales llegan a 0. Así se pasa
// de "1 request por click" a "1 request por decisión real".
let pendingHours = 0;

// Réplica exacta de applyHours() en progress-action (mismo bucle,
// misma fórmula). Como healPerHour no cambia entre clicks dentro de
// una misma visita al laberinto, el resultado acá coincide con lo
// que el server calcularía — flushRest() es una confirmación, no
// debería nunca "corregir" lo que ya se ve en pantalla.
function applyHoursLocal(hp, hoursRemaining, n, healPerHour, maxHp) {
    for (let i = 0; i < n; i++) {
        hp = Math.min(maxHp, hp + healPerHour);
        hoursRemaining = Math.max(0, hoursRemaining - 1);
    }
    return { hp, hoursRemaining };
}

function pathCountFor(room, level) {
    const min = EARLY_ROOM_MIN_PATHS[level]?.[room] ?? MIN_PATHS;
    return min + Math.floor(Math.random() * (MAX_PATHS - min + 1));
}

function puertaChanceForRoom(room) {
    if (room < PUERTA_START_ROOM) return 0;
    const doublings = room - PUERTA_START_ROOM;
    return Math.min(PUERTA_MAX_CHANCE, PUERTA_BASE_CHANCE * Math.pow(2, doublings));
}

// Arma `count` encuentros normales para la sala/nivel dados, y con la
// probabilidad que le toque a esa sala, reemplaza UNO al azar por la
// Puerta al siguiente nivel (un solo tiro por visita, no uno por
// camino). `level` viaja hasta generateEncounter para que filtre el
// pool de criaturas según level_visibility (ver encounter.js).
function buildPaths(count, room, level) {
    const built = Array.from({ length: count }, () => ({
        type: "encounter",
        enemies: generateEncounter(room, level)
    }));
    if (Math.random() < puertaChanceForRoom(room)) {
        const idx = Math.floor(Math.random() * built.length);
        built[idx] = { type: "puerta" };
    }
    return built;
}

function updateRoomLabel(room) {
    const el = document.getElementById("roomLabel");
    if (el) el.textContent = `Sala ${room}`;
}

function updateHoursLabel(hours) {
    const el = document.getElementById("hoursLabel");
    if (el) el.innerHTML = `${ICON_HOURGLASS} ${hours}h restantes`;
}

function updatePlayerStats(progress) {
    const maxHp = progress.maxHp;
    const hpBar = document.getElementById("playerHpBar");
    const hpText = document.getElementById("playerHpText");
    if (hpBar) hpBar.style.width = (progress.hp / maxHp * 100) + "%";
    if (hpText) hpText.textContent = `${progress.hp}/${maxHp}`;
    const goldText = document.getElementById("playerGoldText");
    if (goldText) goldText.innerHTML = `${bankGold + (progress.gold || 0)} ${ICON_COINS}`;
}

async function rollNewLaberinto() {
    const [progress, bank] = await Promise.all([getProgress(), getBank()]);
    currentProgress = progress;
    killedTypes = new Set(progress.killedTypes || []);
    bankGold = bank?.gold ?? 0;
    updateRoomLabel(currentProgress.room);
    updateHoursLabel(currentProgress.hours_remaining);
    updatePlayerStats(currentProgress);
    if (currentProgress.hours_remaining <= 0) {
        showLaberintoClosed();
        return;
    }
    const count = pathCountFor(currentProgress.room, currentProgress.laberinto_level);
    paths = buildPaths(count, currentProgress.room, currentProgress.laberinto_level);
    render();
}

function showLaberintoClosed() {
    document.getElementById("pathsList").innerHTML = "";
    document.querySelectorAll("#restBtn, #restBtnCard").forEach(b => { b.disabled = true; });
    document.getElementById("laberintoClosedOverlay").classList.add("show");
}

const REST_HOURS = 2;

// "Descansar": ya NO llama al server. Actualiza HP/horas de forma
// optimista con applyHoursLocal (misma fórmula que el server) y
// re-tira los encuentros (y la Puerta si corresponde), la cantidad de
// caminos que había se mantiene igual (decidido así explícitamente,
// no es que se olvidó rerollear la cantidad).
//
// Si las horas locales llegan a 0, ahí sí es un checkpoint real:
// confirmamos con flushRest() antes de mostrar el cierre, por si algo
// se desincronizó (ver flushRest).
async function rest() {
    pendingHours += REST_HOURS;
    const { hp, hoursRemaining } = applyHoursLocal(
        currentProgress.hp,
        currentProgress.hours_remaining,
        REST_HOURS,
        currentProgress.healPerHour,
        currentProgress.maxHp
    );
    currentProgress.hp = hp;
    currentProgress.hours_remaining = hoursRemaining;
    updateHoursLabel(hoursRemaining);
    updatePlayerStats(currentProgress);

    if (hoursRemaining <= 0) {
        await flushRest();
        // Confirmamos con lo que diga el server, no con lo local: si
        // por lo que sea no coinciden, esto evita cerrar el laberinto
        // de más (o de menos).
        if (currentProgress.hours_remaining <= 0) {
            showLaberintoClosed();
        } else {
            paths = buildPaths(paths.length, currentProgress.room, currentProgress.laberinto_level);
            render();
        }
        return;
    }

    paths = buildPaths(paths.length, currentProgress.room, currentProgress.laberinto_level);
    render();
}

// Único punto que efectivamente llama a progress-action para "rest".
// Manda todas las horas acumuladas en un solo request y reemplaza
// currentProgress por la respuesta autoritativa del server (que ya
// trae healPerHour actualizado, ver progress.js).
async function flushRest() {
    if (pendingHours === 0) return;
    const hours = pendingHours;
    pendingHours = 0;
    currentProgress = await restProgress(hours);
    updateHoursLabel(currentProgress.hours_remaining);
    updatePlayerStats(currentProgress);
}

// Antes de entrar a combate hay que confirmar las horas pendientes
// con el server: finish-combat usa `hours_remaining` de la fila real
// para calcular la curación post-combate, así que si quedan horas
// locales sin sincronizar, el server curaría de más (con datos
// viejos). Este es uno de los checkpoints reales, junto con cruzar
// la Puerta y el cierre del laberinto.
async function chooseTrail(encounter) {
    await flushRest();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(encounter));
    window.location.href = COMBAT_PAGE;
}

// Cruzar la Puerta: sube de nivel (room vuelve a 1, horas vuelven a
// 24 — cada nivel tiene su propio pool de 24h; HP y oro NO se tocan,
// eso lo decide progress-action del lado server). Sincronizamos las
// horas pendientes ANTES de pedir el avance, mismo motivo que
// chooseTrail: evitar perder descanso local que todavía no llegó al
// server.
async function choosePuerta() {
    const ok = confirm("¿Cruzar la Puerta al siguiente nivel? Tus horas se reinician a 24.");
    if (!ok) return;

    await flushRest();
    currentProgress = await advanceLevel();
    updateRoomLabel(currentProgress.room);
    updateHoursLabel(currentProgress.hours_remaining);
    updatePlayerStats(currentProgress);

    const count = pathCountFor(currentProgress.room, currentProgress.laberinto_level);
    paths = buildPaths(count, currentProgress.room, currentProgress.laberinto_level);
    render();
}

function render() {
    const container = document.getElementById("pathsList");
    container.innerHTML = "";
    container.dataset.count = paths.length; // el CSS usa esto para elegir el layout (1 a 5)
    paths.forEach((path, i) => {
        const card = document.createElement("button");
        card.type = "button";

        if (path.type === "puerta") {
            card.className = "path-card path-card-puerta";
            card.innerHTML = `
                <div class="path-header">
                    <span class="path-name">Puerta al Nivel ${(currentProgress.laberinto_level || 1) + 1}</span>
                </div>
                <div class="path-enemies"><span class="puerta-hint">???</span></div>
            `;
            card.addEventListener("click", choosePuerta);
            container.appendChild(card);
            return;
        }

        card.className = "path-card";
        const encounter = path.enemies;
        const enemiesHtml = encounter.map(key => {
            const cfg = ENEMY_TYPES[key];
            return `
                <div class="enemy-chip enemy-${cfg.family}">
                    <img class="enemy-chip-icon" src="${cfg.icon}" alt="${cfg.label}">
                    <span class="enemy-chip-label">${cfg.label}</span>
                </div>`;
        }).join("");

        // XP solo de lo que todavía te da XP; oro siempre.
        const { xp, gold } = encounterRewards(encounter);
        const rewardText = xp > 0 ? `XP ${xp} · Oro ${gold}` : `Oro ${gold}`;
        // Nombres en una línea: solo se ve en el celular, donde los chips
        // muestran únicamente el ícono (ver laberinto2.css).
        const namesLine = encounter.map(key => ENEMY_TYPES[key].label).join(" · ");

        card.innerHTML = `
            <div class="path-header">
                <span class="path-name">Camino ${i + 1}</span>
                <span class="path-xp">${rewardText}</span>
            </div>
            <div class="path-enemies">${enemiesHtml}</div>
            <div class="path-names">${namesLine}</div>
        `;
        card.addEventListener("click", () => chooseTrail(encounter));
        container.appendChild(card);
    });
}

// Dos botones de Descansar: el de abajo (computadora) y el de la tarjeta
// del jugador (celular). Cada CSS muestra solo uno.
document.querySelectorAll("#restBtn, #restBtnCard").forEach(b => b.addEventListener("click", rest));
document.getElementById("closedContinueBtn").addEventListener("click", async () => {
    await resetProgress("exit");
    window.location.href = "ciudad.html";
});

// Best-effort: si el jugador cierra la pestaña (o navega afuera del
// sitio) con horas de descanso sin sincronizar, tratamos de mandarlas
// igual. No hay forma de esperar una respuesta ni de confirmar que
// llegó — puede fallar y no hay retry. El caso raro que queda sin
// cubrir: cierre por crash del navegador, donde ni pagehide dispara.
window.addEventListener("pagehide", () => {
    if (pendingHours > 0) restBeacon(pendingHours);
});

rollNewLaberinto();