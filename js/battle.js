import { ENEMY_TYPES } from "./enemies.js";
import { ABILITIES } from "./abilities.js";
import { PASSIVES } from "./passives.js";
import { generateEncounter } from "./encounter.js";
import { getProgress, finishCombat, advanceRoom, resetProgress } from "./progress.js";
import { connectSoul, hasSoulSlot } from "./souls.js";
import { PLAYER_CONFIG } from "./player.js";
import { requireSession, clearSession, getSession } from "./session.js";
import { getHiddenAbilities, visibleAbilities } from "./ability-prefs.js";
import { BIOMES, pickBiome, decorateCells, cellArtFor } from "./biomes.js";
import { setupFx, animateHit, animateHeal, animateAttackImpact, animateAreaImpact, fxAura } from "./fx.js";

requireSession();

// ---------- Configuración ----------
const SIZE = 8;
const MIN_ACTIVE = 50;
const MAX_ACTIVE = 64;

// Chance, al GANAR un combate, de que caiga el alma de una de las
// criaturas que estuvieron presentes (ver checkGameOver). No depende
// de cuántas criaturas mueran ni de nada más — un solo tiro por
// combate ganado.
const SOUL_DROP_CHANCE = 0.05;

// Tiempos de las animaciones (ms) — todo el ritmo del combate se ajusta desde acá
const STEP_DELAY = 110;      // pausa entre cada casilla al caminar
const LUNGE_DELAY = 120;     // duración del "empujón" del atacante hacia el blanco
const HIT_DELAY = 400;       // cuánto dura el glow + número flotante
const CARD_CAST_DELAY = 220; // duración de la animación de la carta
const UNIT_TURN_GAP = 300;   // pausa entre el turno de una unidad enemiga y la siguiente

const CRITICAL_HP_RATIO = 0.35;    // se defiende/esquiva ANTES de evaluar si atacar
const LOW_HP_FALLBACK_RATIO = 0.5;
const CRITICAL_HP_RATIO_BY_STYLE = { defensive: 1.0 };

// Aplica el bioma al tablero (clase CSS y subtítulo). La config y el
// arte de cada bioma viven en biomes.js.
function applyBiome(biomeKey) {
    const wrap = boardEl.parentElement;
    Object.keys(BIOMES).forEach(k => wrap.classList.remove(`biome-${k}`));
    wrap.classList.add(`biome-${biomeKey}`);
    const subtitle = document.querySelector(".subtitle");
    if (subtitle && currentProgress) subtitle.textContent = `Sala ${currentProgress.room} · ${BIOMES[biomeKey].name}`;
}

// ABILITIES vive en abilities.js (lo comparte con la página admin).

// PASSIVES vive en passives.js (lo comparten armería y alquimista).

// ---------- Estado ----------
let state = null;
let currentProgress = null;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function freshUnit(cfg) {
    // Validación temprana con mensaje útil: en vez de un TypeError
    // genérico en 'cooldown' que no dice ni la criatura ni la ability
    // que falta, esto tira un error que sí lo dice — con 30+ criaturas
    // en el catálogo, adivinar cuál está mal a partir del stack trace
    // solo no escala. Mismo criterio para passives (ver 'inPain').
    for (const key of cfg.abilities) {
        if (!ABILITIES[key]) {
            throw new Error(`Ability "${key}" de "${cfg.label || cfg.icon || "?"}" no existe en ABILITIES (battle.js). ¿Typo en creature_types.abilities, o falta definirla?`);
        }
    }
    for (const key of cfg.passives || []) {
        if (!PASSIVES[key]) {
            throw new Error(`Passive "${key}" de "${cfg.label || cfg.icon || "?"}" no existe en PASSIVES (battle.js). ¿Typo en creature_types.passives, o falta definirla?`);
        }
    }

    const cooldowns = {};
    cfg.abilities.forEach(key => { if (ABILITIES[key].cooldown) cooldowns[key] = 0; });
    return {
        pos: -1, hp: cfg.hp, maxHp: cfg.hp,
        move: cfg.move, maxMove: cfg.move,
        ap: cfg.ap, maxAp: cfg.ap,
        icon: cfg.icon,
        abilities: cfg.abilities.slice(),
        aiStyle: cfg.aiStyle || null,
        stats: cfg.stats || {},
        // Reducciones de stat por maldiciones (ej: Curse). Va aparte de
        // `stats` a propósito: `stats` es la misma referencia que
        // PLAYER_CONFIG / el caché de criaturas, y mutarla contaminaría
        // los combates siguientes. Un unit nuevo por combate = se limpia solo.
        statDebuffs: {},
        // Subidas de stat que duran todo el combate (ej: Corte Furioso,
        // onHitSelfStatGain). Mismo criterio que statDebuffs, al revés.
        statBuffs: {},
        // Debuff porcentual temporal (ej: Ceguera): { stats: { stat: pct }, turnsLeft }.
        percentDebuffs: null,
        passives: cfg.passives || [],       // NUEVO
        passivesActive: {}, 
        apDrainPending: 0,      // NUEVO
        apBonusPending: 0,      // PA extra que llegan al arrancar su próximo turno (ej: Empower)
        moveDrainPending: 0,    // NUEVO
        moveBonusPending: 0,    // PM extra que llegan al arrancar su próximo turno (ej: Magic Shield)
        tempStatBoosts: null,   // { stat: +x } solo durante el turno actual (ej: Arcane Focus)
        defendActive: false,
        defendReduction: 0,
        defendMagicResistant: false,
        defendRetaliateMultiplier: 0,
        commandActive: false,
        commandBonus: 0,
        dodgeActive: false,
        dodgeChance: 0,
        cooldowns
    };
}

function attackAbilitiesOf(u) {
    // "enemy" = ataque a un blanco puntual. "area" = ataque a una
    // casilla de impacto que puede afectar a varias unidades (incluido
    // el propio lanzador). Ambas cuentan como "esta unidad puede atacar".
    return u.abilities.filter(key => {
        const t = ABILITIES[key].targetType;
        return t === "enemy" || t === "area";
    });
}

function trapAbilitiesOf(u) {
    return u.abilities.filter(key => ABILITIES[key].targetType === "trap");
}

function healAbilitiesOf(u) {
    return u.abilities.filter(key => ABILITIES[key].targetType === "ally" && ABILITIES[key].healStats);
}

// Habilidades de apoyo sobre un aliado que NO curan (ej: Empower).
function allyBuffAbilitiesOf(u) {
    return u.abilities.filter(key => {
        const ab = ABILITIES[key];
        return ab.targetType === "ally" && ab.buffType;
    });
}

// Unidades "del mismo bando" que `u`, vivas, sin contarse a sí misma.
// El jugador da [] (todavía es una unidad única, sin aliados) — no
// está hardcodeado "los enemigos son aliados entre sí" en ningún otro
// lado, cualquier IA que necesite este concepto pasa por acá.
// ---------- Bandos ----------
// Bando "player": el jugador y lo que él invoca (state.allies).
// Bando "enemy": las criaturas del encuentro y lo que ellas invocan.
// Sin invocados, alliesOf/opponentsOf dan exactamente lo mismo que antes.
function sideOf(u) {
    return (u === state.player || u.side === "player") ? "player" : "enemy";
}

function unitsOfSide(side) {
    return side === "player" ? [state.player, ...state.allies] : state.enemies;
}

function alliesOf(u) {
    return unitsOfSide(sideOf(u)).filter(x => x !== u && x.hp > 0);
}

function opponentsOf(u) {
    return unitsOfSide(sideOf(u) === "player" ? "enemy" : "player").filter(x => x.hp > 0);
}

// Nombre para el registro ("el jugador" o la etiqueta de la unidad), con
// la contracción que corresponda: "hacia el jugador", "al jugador", "del jugador".
function nameOf(u) {
    return u === state.player ? "el jugador" : u.label;
}
function toNameOf(u) {
    return u === state.player ? "al jugador" : `a ${u.label}`;
}
function fromNameOf(u) {
    return u === state.player ? "del jugador" : `de ${u.label}`;
}

// Blanco de la IA: el rival vivo más cercano (caminando, sin contar
// unidades en el medio). Empate: prefiere al jugador. Sin invocados, el
// único rival de una criatura es el jugador, así que no cambia nada.
function pickTarget(u) {
    const opps = opponentsOf(u);
    if (!opps.length) return null;
    const field = bfsDistances(u.pos, new Set());
    let best = null, bestD = Infinity;
    for (const o of opps) {
        const d = isFinite(field[o.pos]) ? field[o.pos] : 1000 + manhattan(u.pos, o.pos);
        if (d < bestD || (d === bestD && o === state.player)) { best = o; bestD = d; }
    }
    return best;
}

// ---------- Invocaciones ----------
// Una habilidad con `summon: "<key de creature_types>"` crea esa criatura
// en una casilla libre pegada a quien la usa, del mismo bando. Actúa en
// la misma ronda (los del jugador juegan después de su turno; los de las
// criaturas, en la fase enemiga, que los recorre al final de la lista).
// Los invocados no dan oro, XP ni alma.
function summonAbilitiesOf(u) {
    return u.abilities.filter(key => ABILITIES[key].summon);
}

// Casilla donde aparecería el invocado, o -1 si no hay lugar. Prefiere
// casillas sin trampas y, entre ellas, la más cercana al rival más cercano.
function summonCellFor(caster) {
    const occupied = new Set(allUnits().filter(x => x.hp > 0).map(x => x.pos));
    const free = neighbors4(caster.pos).filter(n => state.cells[n].active && !occupied.has(n));
    if (!free.length) return -1;
    const noTrap = free.filter(n => !state.traps.some(t => t.pos === n));
    const pool = noTrap.length ? noTrap : free;
    const target = pickTarget(caster);
    if (target) pool.sort((a, b) => manhattan(a, target.pos) - manhattan(b, target.pos));
    return pool[0];
}

function canSummonNow(u, key) {
    const ab = ABILITIES[key];
    if (!ENEMY_TYPES[ab.summon]) return false;
    if (u.ap < ab.apCost) return false;
    if (ab.cooldown && u.cooldowns[key] > 0) return false;
    return summonCellFor(u) !== -1;
}

function spawnSummon(caster, type, pos) {
    const cfg = ENEMY_TYPES[type];
    const unit = freshUnit(cfg);
    const side = sideOf(caster);
    state.summonCount = (state.summonCount || 0) + 1;
    unit.type = type;
    unit.id = `${type}_s${state.summonCount}`;
    unit.label = side === "player" ? `${cfg.label} (aliado)` : cfg.label;
    unit.icon = cfg.icon;
    unit.cls = cfg.family;
    unit.xp = 0;
    unit.summoned = true;
    unit.side = side;
    unit.pos = pos;
    if (side === "player") state.allies.push(unit);
    else state.enemies.push(unit);
    return unit;
}

// Blancos válidos de una habilidad targetType "ally": los aliados vivos
// MÁS la propia unidad (autotarget). alliesOf sigue sin incluir a `u`
// porque otras cosas (medic, Command) dependen de eso.
function selfAndAlliesOf(u) {
    return [u, ...alliesOf(u)];
}

function nearestInjuredAlly(u) {
    const candidates = alliesOf(u).filter(a => a.hp < a.maxHp);
    if (!candidates.length) return null;
    return candidates.reduce((best, cur) => manhattan(u.pos, cur.pos) < manhattan(u.pos, best.pos) ? cur : best);
}


// Primera habilidad autobuff defensiva (Defender, Evasión, o cualquier
// futura con reductionStats/dodgeStats) que la unidad pueda pagar y no
// esté en cooldown. Reemplaza el u.abilities.includes("defender")
// hardcodeado que había antes — la IA ya no necesita saber el nombre
// de la habilidad, solo que "reduce daño o esquiva".
function defensiveFallbackAbilityOf(u) {
    return u.abilities.find(key => {
        const ab = ABILITIES[key];
        if (!ab.reductionStats && !ab.dodgeStats) return false;
        if (u.ap < ab.apCost) return false;
        if (ab.cooldown && u.cooldowns[key] > 0) return false;
        return true;
    });
}

function buffFallbackAbilityOf(u) {
    return u.abilities.find(key => {
        const ab = ABILITIES[key];
        // buffStats: Command. alliesNextTurnGrant: Inspirar (+PM a los aliados).
        if (!ab.buffStats && !ab.alliesNextTurnGrant && !ab.apGrantAll) return false;
        if (ab.needsTarget) return false; // Empower & co. tienen blanco: no son autobuffs tipo Command
        if ((ab.alliesNextTurnGrant || ab.apGrantAll) && alliesOf(u).length === 0) return false; // sin aliados vivos no aporta
        if (u.ap < ab.apCost) return false;
        if (ab.cooldown && u.cooldowns[key] > 0) return false;
        return true;
    });
}

function desiredRangeOf(u) {
  const availableAttacks = attackAbilitiesOf(u).filter(key => !(ABILITIES[key].cooldown && u.cooldowns[key] > 0));
  const attackRanges = availableAttacks.map(key => ABILITIES[key].range);
  if (attackRanges.length) return Math.max(...attackRanges);
  const trapRanges = trapAbilitiesOf(u).map(key => ABILITIES[key].range);
  return trapRanges.length ? Math.max(...trapRanges) : 1;
}

function allUnits() { return [state.player, ...state.allies, ...state.enemies]; }
function livingEnemies() { return state.enemies.filter(e => e.hp > 0); }
function unitAt(pos, exclude) {
    for (const u of allUnits()) {
        if (u === exclude) continue;
        if (u.hp <= 0) continue;
        if (u.pos === pos) return u;
    }
    return null;
}

function connectedComponents(cells) {
    const seen = new Array(SIZE * SIZE).fill(false);
    const comps = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (!cells[i].active || seen[i]) continue;
        const comp = [];
        const queue = [i];
        seen[i] = true;
        while (queue.length) {
            const cur = queue.shift();
            comp.push(cur);
            for (const n of neighbors4(cur)) {
                if (cells[n].active && !seen[n]) { seen[n] = true; queue.push(n); }
            }
        }
        comps.push(comp);
    }
    return comps;
}

async function newGame() {
    currentProgress = await getProgress();

    const activeCount = MIN_ACTIVE + Math.floor(Math.random() * (MAX_ACTIVE - MIN_ACTIVE + 1));
    const indices = Array.from({ length: SIZE * SIZE }, (_, i) => i);
    shuffle(indices);
    const activeSet = new Set(indices.slice(0, activeCount));
    const cells = Array.from({ length: SIZE * SIZE }, (_, i) => ({ active: activeSet.has(i) }));

    const comps = connectedComponents(cells);
    const playZone = comps.reduce((a, b) => b.length > a.length ? b : a, []);

    state = {
        cells,
        player: freshUnit(PLAYER_CONFIG),
        allies: [],       // invocados del jugador (ver spawnSummon)
        summonCount: 0,
        enemies: [],
        turn: "player",
        selection: null,
        busy: false,
        gameOver: false,
        traps: [],
        log: []
    };

    state.player.hp = currentProgress.hp;
    state.player.maxHp = currentProgress.maxHp;

    const pIdx = playZone[Math.floor(Math.random() * playZone.length)];
    state.player.pos = pIdx;
    const used = new Set([pIdx]);

    const encounter = readForcedEncounter() || generateEncounter(currentProgress.room, currentProgress.laberinto_level);
    state.enemies = encounter.map((type, i) => {
        const cfg = ENEMY_TYPES[type];
        const unit = freshUnit(cfg);
        unit.type = type;
        unit.id = `${type}_${i + 1}`;
        unit.label = cfg.label;
        unit.icon = cfg.icon;
        unit.cls = cfg.family;
        unit.xp = cfg.xp;

        let pos = -1, tries = 0;
        while (tries < 400) {
            tries++;
            const cand = playZone[Math.floor(Math.random() * playZone.length)];
            if (used.has(cand)) continue;
            if (manhattan(cand, pIdx) < 3) continue;
            pos = cand;
            break;
        }
        if (pos === -1) {
            const free = playZone.filter(c => !used.has(c));
            pos = free.length ? free[Math.floor(Math.random() * free.length)] : pIdx;
        }
        used.add(pos);
        unit.pos = pos;
        return unit;
    });

    state.biome = pickBiome(state.enemies);
    decorateCells(cells, state.biome);
    applyBiome(state.biome);

    const finalActiveCount = cells.filter(c => c.active).length;
    const extra = playZone.length < finalActiveCount ? ` (zona jugable: ${playZone.length}, hay bolsones aislados)` : "";
    addLog(`Combate iniciado. Tablero con ${finalActiveCount} casillas activas${extra}.`, "turn");
    const roster = state.enemies.map(e => e.label).join(" y ");
    addLog(`Enfrentás a: ${roster}.`, "turn");
    addLog("Turno del jugador.", "turn");

    render();
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// Lee el encuentro que haya dejado laberinto.js en sessionStorage. Se
// consume: se borra al leerlo, para que un F5 en combate_tactico no
// vuelva a forzar el mismo encuentro. Si no hay nada (o no es válido),
// generateEncounter() sigue siendo el fallback normal.
function readForcedEncounter() {
    try {
        const raw = sessionStorage.getItem("combate:forcedEncounter");
        if (!raw) return null;
        sessionStorage.removeItem("combate:forcedEncounter");
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return arr;
    } catch {
        return null;
    }
}

function rc(i) { return [Math.floor(i / SIZE), i % SIZE]; }

function idx(r, c) { return r * SIZE + c; }

function manhattan(a, b) {
    const [r1, c1] = rc(a), [r2, c2] = rc(b);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function neighbors4(i) {
    const [r, c] = rc(i);
    const res = [];
    const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of deltas) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) res.push(idx(nr, nc));
    }
    return res;
}

// Para habilidades con straightLineOnly: el objetivo tiene que estar en
// la misma fila o columna, a distancia <= maxRange, y sin ninguna
// unidad viva en las celdas intermedias (no atraviesa a nadie "en
// frente"). Las celdas de origen y destino no cuentan como bloqueo.
function inStraightLine(fromPos, toPos, maxRange) {
    const [r1, c1] = rc(fromPos), [r2, c2] = rc(toPos);
    if (r1 !== r2 && c1 !== c2) return false;
    const dist = manhattan(fromPos, toPos);
    if (dist === 0 || dist > maxRange) return false;
    const stepR = Math.sign(r2 - r1), stepC = Math.sign(c2 - c1);
    let r = r1 + stepR, c = c1 + stepC;
    while (r !== r2 || c !== c2) {
        if (unitAt(idx(r, c))) return false;
        r += stepR; c += stepC;
    }
    return true;
}

// Único punto de verdad para "¿esta unidad puede alcanzar esta celda
// con esta habilidad?". Por defecto es el manhattan<=range de siempre;
// una habilidad con straightLineOnly (ej: Charge) usa inStraightLine en
// su lugar. Reemplaza cualquier chequeo manual de rango en la IA, en
// el click del jugador, y en el resaltado del tablero.
function inAbilityRange(unit, targetPos, ab) {
    return ab.straightLineOnly ? inStraightLine(unit.pos, targetPos, ab.range) : manhattan(unit.pos, targetPos) <= ab.range;
}

// Todas las casillas activas dentro de `radius` (distancia Manhattan)
// del punto de impacto — incluye el propio punto de impacto (radio 0).
// Con radius=1 da exactamente la cruz: centro + 4 vecinos.
// Reusable por cualquier habilidad de área futura, solo cambiando el
// aoeRadius que declara — no hay nada de Fire Burst hardcodeado acá.
function resolveAoeCells(impactPos, radius) {
    const cells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (!state.cells[i].active) continue;
        if (manhattan(impactPos, i) <= radius) cells.push(i);
    }
    return cells;
}

// Distancias desde `from` (para decisiones: "¿cuánto me cuesta llegar a cada celda?")
function bfsDistances(from, blockedSet) {
    const dist = new Array(SIZE * SIZE).fill(Infinity);
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        for (const n of neighbors4(cur)) {
            if (!state.cells[n].active) continue;
            if (blockedSet.has(n) && n !== from) continue;
            if (dist[n] > dist[cur] + 1) { dist[n] = dist[cur] + 1; queue.push(n); }
        }
    }
    return dist;
}

// BFS desde varias casillas a la vez: distancia de cada casilla a la
// más cercana de `sources`, sin pasar por `blockedSet`.
function bfsDistancesMulti(sources, blockedSet) {
    const dist = new Array(SIZE * SIZE).fill(Infinity);
    const queue = [];
    for (const s of sources) { dist[s] = 0; queue.push(s); }
    while (queue.length) {
        const cur = queue.shift();
        for (const n of neighbors4(cur)) {
            if (!state.cells[n].active) continue;
            if (blockedSet.has(n)) continue;
            if (dist[n] > dist[cur] + 1) { dist[n] = dist[cur] + 1; queue.push(n); }
        }
    }
    return dist;
}

// Camino real de `from` a `to` (para animar la caminata casilla por casilla)
function bfsPath(from, to, blockedSet) {
    const dist = new Array(SIZE * SIZE).fill(Infinity);
    const prev = new Array(SIZE * SIZE).fill(-1);
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
        const cur = queue.shift();
        for (const n of neighbors4(cur)) {
            if (!state.cells[n].active) continue;
            if (blockedSet.has(n) && n !== from) continue;
            if (dist[n] > dist[cur] + 1) { dist[n] = dist[cur] + 1; prev[n] = cur; queue.push(n); }
        }
    }
    if (!isFinite(dist[to])) return null;
    const path = [];
    let cur = to;
    while (cur !== from) { path.push(cur); cur = prev[cur]; }
    path.reverse();
    return path;
}

function addLog(msg, cls) {
    state.log.push({ msg, cls: cls || "" });
    if (state.log.length > 100) state.log.shift();
}

// ---------- Animaciones ----------
function cellEl(pos) { return boardEl.children[pos] || null; }

// Pequeño "salto" visual de la carta usada, en la mano del jugador
async function animateCardCast(key) {
    const btn = handEl.querySelector(`[data-key="${key}"]`);
    if (!btn) return;
    btn.classList.add("card-cast");
    await sleep(CARD_CAST_DELAY);
    btn.classList.remove("card-cast");
}

// Empujón del ícono del atacante hacia el blanco (sirve para jugador y enemigos)
async function animateLunge(fromPos, toPos) {
    const el = cellEl(fromPos);
    const icon = el ? (el.querySelector(".unit-token") || el.querySelector(".unit-icon")) : null;
    if (!icon) { await sleep(LUNGE_DELAY); return; }
    const [r1, c1] = rc(fromPos), [r2, c2] = rc(toPos);
    const dx = Math.sign(c2 - c1) * 9;
    const dy = Math.sign(r2 - r1) * 9;
    icon.style.transform = `translate(${dx}px, ${dy}px)`;
    await sleep(LUNGE_DELAY);
    icon.style.transform = "translate(0,0)";
    await sleep(LUNGE_DELAY * 0.6);
}

// Resuelve un ataque completo: (carta, si es el jugador) -> empujón -> daño -> glow/número -> chequeo de victoria/derrota
async function performAttack(attacker, target, key) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (attacker.hp <= 0) return;
    const ab = ABILITIES[key];
    attacker.ap -= ab.apCost;
    if (ab.cooldown) attacker.cooldowns[key] = ab.cooldown;

    if (attacker === state.player) {
        renderHand();
        await animateCardCast(key);
    }

    if (ab.closesToMelee) {
        await chargeToMelee(attacker, target);
        if (state.gameOver || attacker.hp <= 0) return;
    }

    // Pull: el objetivo es arrastrado hasta quedar pegado al atacante y
    // recién ahí recibe el golpe. Si la trampa de la casilla lo mata (o
    // termina el combate), no hay golpe.
    if (ab.pullsToMelee) {
        await pullToMelee(attacker, target);
        if (state.gameOver || target.hp <= 0 || attacker.hp <= 0) return;
    }

    await animateLunge(attacker.pos, target.pos);

    let rawDamage = computeAbilityDamage(attacker, key, target);
    // Crítico genérico: critChance (0 a 1) y critMultiplier. Se aplica
    // sobre el daño bruto, antes de esquiva y reducción; redondea para
    // arriba.
    let isCrit = false;
    if (ab.critChance && Math.random() < ab.critChance) {
        isCrit = true;
        rawDamage = Math.ceil(rawDamage * (ab.critMultiplier || 1.5));
    }
    (attacker.passives || []).forEach(pk => {
        const pp = PASSIVES[pk];
        if (pp.targetHpThreshold != null && target.hp > 0 && target.hp / target.maxHp <= pp.targetHpThreshold
            && ab.damageStats && ab.damageStats.some(st => pp.statBoosts && pp.statBoosts[st] != null)) {
            const who = attacker === state.player ? "Jugador" : attacker.label;
            const whom = target === state.player ? "el jugador" : target.label;
            addLog(`${who} huele la debilidad de ${whom} (${pp.name}).`);
        }
    });
    const { dmg, dodged } = applyDamage(target, rawDamage, ab.damageType);
    const atkLabel = attacker === state.player ? "Jugador" : attacker.label;
    const tgtLabel = target === state.player ? "el jugador" : target.label;
    const critText = isCrit && !dodged ? " ¡Crítico!" : "";
    addLog(`${atkLabel} usa ${ab.name} contra ${tgtLabel} y le hace ${dmg} de daño.${critText}`, "dmg-tag");
    
    // Genérico: cualquier habilidad puede declarar onHitMoveGain para
    // otorgarle movimiento a quien la usa, pero SOLO si el golpe hizo
    // daño de verdad (0 por esquiva o por Defender no cuenta).
    if (ab.onHitMoveGain && dmg > 0) {
        attacker.move += ab.onHitMoveGain;
        addLog(`${atkLabel} gana ${ab.onHitMoveGain} punto${ab.onHitMoveGain > 1 ? "s" : ""} de movimiento por ${ab.name}.`);
    }

    // Genérico: cualquier habilidad puede declarar onHitApDrain para
    // quitarle PA a quien recibe, pero SOLO si el golpe hizo
    // daño de verdad (0 por esquiva o por Defender no cuenta).
     if (ab.onHitApDrain && dmg > 0) {
        target.apDrainPending = (target.apDrainPending || 0) + ab.onHitApDrain;
        addLog(`${tgtLabel} va a perder ${ab.onHitApDrain} PA en su próximo turno por ${ab.name}.`);
    }

    if (ab.onHitMpDrain && dmg > 0) {
        target.moveDrainPending = (target.moveDrainPending || 0) + ab.onHitMpDrain;
        addLog(`${tgtLabel} va a perder ${ab.onHitMpDrain} PM en su próximo turno por ${ab.name}.`);
    }

    // Genérico: cualquier habilidad puede declarar onHitLifesteal para
    // curar a quien la usa por el mismo valor del daño hecho, pero SOLO
    // si el golpe hizo daño de verdad (0 por esquiva o por Defender no
    // cuenta). El tope es el propio maxHp del atacante, igual que
    // cualquier otra cura del juego.
    let lifestealHeal = 0;
    if (ab.onHitLifesteal && dmg > 0) {
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg);
        lifestealHeal = attacker.hp - before;
        if (lifestealHeal > 0) {
            addLog(`${atkLabel} drena ${lifestealHeal} de vida con ${ab.name}.`);
        }
    }

    // Genérico: cualquier habilidad puede declarar debuffStats para
    // maldecir al blanco, pero SOLO si el golpe hizo daño de verdad. Cada
    // stat baja en el daño realmente hecho y la reducción dura todo el
    // combate (se acumula si vuelve a pegarle).
    if (ab.debuffStats && dmg > 0) {
        target.statDebuffs = target.statDebuffs || {};
        ab.debuffStats.forEach(st => {
            target.statDebuffs[st] = (target.statDebuffs[st] || 0) + dmg;
        });
        addLog(`${tgtLabel} queda maldito: -${dmg} a ${ab.debuffStats.join(", ")} hasta el final del combate.`);
    }

    // Genérico: debuffPercent baja un porcentaje de stats durante el
    // próximo turno del golpeado. No se acumula: un golpe nuevo lo renueva.
    if (ab.debuffPercent && dmg > 0) {
        const stats = {};
        ab.debuffPercent.stats.forEach(st => { stats[st] = ab.debuffPercent.percent; });
        target.percentDebuffs = { stats, turnsLeft: ab.debuffPercent.turns || 1 };
        addLog(`${tgtLabel} pierde ${Math.round(ab.debuffPercent.percent * 100)}% de ${ab.debuffPercent.stats.join(" y ")} en su próximo turno.`);
    }

    // Genérico: onHitSelfStatGain sube un stat de quien pega por el daño
    // realmente hecho, hasta el final del combate (se acumula). Corte Furioso.
    if (ab.onHitSelfStatGain && dmg > 0) {
        const st = ab.onHitSelfStatGain;
        attacker.statBuffs = attacker.statBuffs || {};
        attacker.statBuffs[st] = (attacker.statBuffs[st] || 0) + dmg;
        addLog(`${atkLabel} gana +${dmg} de ${st} hasta el final del combate (${ab.name}).`);
    }

    renderSide();
    renderLog();

    await animateAttackImpact(attacker, target, ab, dmg, dodged);
    if (lifestealHeal > 0) await animateHeal(attacker.pos, lifestealHeal);
    await applyLowHpHealIfAny(target, dmg, dodged);
    await applyRetaliationIfAny(target, attacker, dodged);
    await applyOnHitPassivesIfAny(target, attacker, dmg, dodged);

    checkGameOver();
}

// Resuelve un ataque de área completo: descuenta PA/cooldown, anima la
// carta (si es el jugador), calcula el daño UNA sola vez con el motor
// de siempre (computeAbilityDamage) y se lo aplica a cada unidad parada
// en una casilla afectada — atacante incluido si quedó en el área.
// No hay lunge (no tiene sentido "empujarse" hacia una explosión a
// distancia); en su lugar todas las casillas afectadas flashean juntas.
async function performAreaAttack(attacker, impactPos, key) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (attacker.hp <= 0) return;
    const ab = ABILITIES[key];
    attacker.ap -= ab.apCost;
    if (ab.cooldown) attacker.cooldowns[key] = ab.cooldown;

    if (attacker === state.player) {
        renderHand();
        await animateCardCast(key);
    }

    // selfCentered: el área sale de la casilla de quien la lanza, sin
    // importar qué casilla se haya elegido, y esa casilla queda afuera.
    if (ab.selfCentered) impactPos = attacker.pos;
    const affectedCells = resolveAoeCells(impactPos, ab.aoeRadius)
        .filter(pos => !(ab.selfCentered && pos === attacker.pos));
    const rawDamage = computeAbilityDamage(attacker, key);
    const attackerSide = sideOf(attacker);

    const hits = [];
    for (const pos of affectedCells) {
        const victim = unitAt(pos);
        if (!victim) continue;
        // opponentsOnly: el área ignora a los del mismo bando.
        if (ab.opponentsOnly && sideOf(victim) === attackerSide) continue;
        const { dmg, dodged } = applyDamage(victim, rawDamage, ab.damageType);
        hits.push({ victim, pos, dmg, dodged });
    }

    const atkLabel = attacker === state.player ? "Jugador" : attacker.label;
    if (hits.length === 0) {
        addLog(`${atkLabel} usa ${ab.name}, pero no impacta a nadie.`, "dmg-tag");
    } else {
        hits.forEach(h => {
            const tgtLabel = h.victim === state.player ? "el jugador" : h.victim.label;
            const selfHit = h.victim === attacker ? " (se golpea a sí mismo)" : "";
            addLog(`${atkLabel} usa ${ab.name} contra ${tgtLabel}${selfHit} y le hace ${h.dmg} de daño.`, "dmg-tag");
        });
    }
    // Genérico (mismo criterio que en performAttack): drenajes de PM/PA
    // para cada unidad que recibió daño de verdad. El propio lanzador, si
    // se golpeó a sí mismo, no se los aplica.
    hits.forEach(h => {
        if (h.dmg <= 0 || h.victim === attacker) return;
        const tgtLabel = h.victim === state.player ? "el jugador" : h.victim.label;
        if (ab.onHitMpDrain) {
            h.victim.moveDrainPending = (h.victim.moveDrainPending || 0) + ab.onHitMpDrain;
            addLog(`${tgtLabel} va a perder ${ab.onHitMpDrain} PM en su próximo turno por ${ab.name}.`);
        }
        if (ab.onHitApDrain) {
            h.victim.apDrainPending = (h.victim.apDrainPending || 0) + ab.onHitApDrain;
            addLog(`${tgtLabel} va a perder ${ab.onHitApDrain} PA en su próximo turno por ${ab.name}.`);
        }
    });

    renderSide();
    renderLog();

    // Explosión en todas las casillas afectadas a la vez, y los números
    // de daño juntos (Promise.all, no uno por uno).
    await animateAreaImpact(attacker, impactPos, affectedCells, ab, hits);
    for (const h of hits) {
        await applyLowHpHealIfAny(h.victim, h.dmg, h.dodged);
        await applyRetaliationIfAny(h.victim, attacker, h.dodged);
        await applyOnHitPassivesIfAny(h.victim, attacker, h.dmg, h.dodged);
    }

    checkGameOver();
}

async function performHeal(caster, target, key) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (caster.hp <= 0) return;
    const ab = ABILITIES[key];
    caster.ap -= ab.apCost;
    if (ab.cooldown) caster.cooldowns[key] = ab.cooldown;

    if (caster === state.player) {
        renderHand();
        await animateCardCast(key);
    }

    const healAmount = computeAbilityHeal(caster, key);
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    const actualHeal = target.hp - before;

    const casterLabel = caster === state.player ? "Jugador" : caster.label;
    const targetLabel = target === state.player ? "el jugador" : target.label;
    addLog(`${casterLabel} usa ${ab.name} sobre ${targetLabel} y cura ${actualHeal} de vida.`, "dmg-tag");

    renderSide();
    renderLog();

    if (actualHeal > 0) await animateHeal(target.pos, actualHeal);
    checkPassives(target); // dinámico: por si la curación lo saca de una pasiva de <=50% hp

    checkGameOver();
}

// Buff con blanco sobre un aliado (o sobre uno mismo). Por ahora solo
// buffType "AP" (Empower). Sobre otro: apBonusPending, que se suma al
// arrancar SU próximo turno (los PA se recalculan al inicio de cada
// turno, así que un ap += directo se perdería o llegaría tarde). Sobre
// uno mismo: se suma al instante, porque ya está en pleno turno.
async function performAllyBuff(caster, target, key) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (caster.hp <= 0) return;
    const ab = ABILITIES[key];
    caster.ap -= ab.apCost;
    if (ab.cooldown) caster.cooldowns[key] = ab.cooldown;

    if (caster === state.player) {
        renderHand();
        await animateCardCast(key);
    }

    const amount = computeAbilityBuffAmount(caster, key);
    const casterLabel = caster === state.player ? "Jugador" : caster.label;
    const targetLabel = target === state.player ? "el jugador" : target.label;

    if (ab.buffType === "AP") {
        if (target === caster) {
            caster.ap += amount;
            addLog(`${casterLabel} usa ${ab.name} sobre sí mismo y gana ${amount} PA.`, "dmg-tag");
        } else {
            target.apBonusPending = (target.apBonusPending || 0) + amount;
            addLog(`${casterLabel} usa ${ab.name} sobre ${targetLabel}: +${amount} PA en su próximo turno.`, "dmg-tag");
        }
    }

    renderSide();
    renderLog();
    fxAura(target.pos, "buff");
    await sleep(450);
}

// Reposiciona a `attacker` en una casilla libre pegada a `target`
// (Manhattan 1), eligiendo la más cercana a su posición actual. Ocurre
// SIEMPRE que se usa una habilidad con closesToMelee (aunque el golpe
// después sea esquivado/reducido) — es el gesto de cargar, no un
// premio por acertar. Si no hay ningún hueco libre pegado al objetivo,
// no mueve nada y el golpe sale desde donde ya estaba (mejor eso que
// bloquear la habilidad entera por falta de espacio).
async function chargeToMelee(attacker, target) {
    const occupied = new Set(allUnits().filter(x => x !== attacker && x.hp > 0).map(x => x.pos));
    let bestCell = -1, bestDist = Infinity;
    for (const n of neighbors4(target.pos)) {
        if (!state.cells[n].active || occupied.has(n)) continue;
        const d = manhattan(attacker.pos, n);
        if (d < bestDist) { bestDist = d; bestCell = n; }
    }
    if (bestCell === -1) return;
    attacker.pos = bestCell;
    renderBoard();
    await sleep(120);
    await triggerTrapIfAny(attacker, bestCell);
}

// Espejo de chargeToMelee: en vez de mover al atacante hacia el blanco,
// arrastra al BLANCO hasta una casilla libre pegada al atacante (la más
// cercana a donde estaba). Si ya está pegado, o no hay ningún hueco
// libre alrededor del atacante, no mueve nada y el golpe sale igual.
// Pisar una trampa en la casilla de llegada la dispara.
async function pullToMelee(attacker, target) {
    if (manhattan(attacker.pos, target.pos) <= 1) return;
    const occupied = new Set(allUnits().filter(x => x !== target && x.hp > 0).map(x => x.pos));
    let bestCell = -1, bestDist = Infinity;
    for (const n of neighbors4(attacker.pos)) {
        if (!state.cells[n].active || occupied.has(n)) continue;
        const d = manhattan(target.pos, n);
        if (d < bestDist) { bestDist = d; bestCell = n; }
    }
    if (bestCell === -1) return;
    const atkLabel = attacker === state.player ? "Jugador" : attacker.label;
    const tgtLabel = target === state.player ? "el jugador" : target.label;
    target.pos = bestCell;
    addLog(`${atkLabel} arrastra a ${tgtLabel} hasta tenerlo cuerpo a cuerpo.`);
    renderBoard();
    renderLog();
    await sleep(120);
    await triggerTrapIfAny(target, bestCell);
}

// Si quien recibió el golpe tiene un contraataque activo (ej: Ice
// Shield), le devuelve daño a quien la golpeó — proporcional a la
// MISMA reducción ya congelada al castear (no recalcula stats de
// nuevo), multiplicado por lo que declare la habilidad. No aplica si
// esquivó del todo (dodged), ni cuando no hay un atacante puntual
// (trampas) — solo en golpes directos/de área.
// Pasivas que castigan al atacante cuando la unidad recibe un golpe con
// daño real (ej. corrosiveBlood). Se dispara aunque el golpe haya matado
// a la unidad (la sangre salpica igual), pero no si fue esquivado, si el
// daño quedó en 0 por Defender, si no hay un atacante puntual (trampas)
// o si el atacante se golpeó a sí mismo con un área. El daño pasa por
// applyDamage, así que el atacante puede esquivarlo o reducirlo.
// Pasivas con lowHpHeal (Hard to Kill): al recibir daño real y quedar
// viva por debajo del umbral, la unidad se cura en ese mismo golpe.
// Si el golpe la mató, no hace nada.
async function applyLowHpHealIfAny(unit, dmgReceived, dodged) {
    if (dodged || dmgReceived <= 0 || unit.hp <= 0) return;
    if (!unit.passives || unit.passives.length === 0) return;
    for (const key of unit.passives) {
        const rule = PASSIVES[key]?.lowHpHeal;
        if (!rule) continue;
        if (unit.hp / unit.maxHp >= rule.threshold) continue;
        const heal = Math.max(1, Math.floor(effectiveStat(unit, rule.stat) / rule.divisor));
        const actualHeal = Math.min(heal, unit.maxHp - unit.hp);
        if (actualHeal <= 0) continue;
        unit.hp += actualHeal;
        checkPassives(unit);
        const label = unit === state.player ? "El jugador" : unit.label;
        addLog(`${PASSIVES[key].name}: ${label} se cura ${actualHeal}.`);
        renderSide();
        renderLog();
        await animateHeal(unit.pos, actualHeal);
    }
}

async function applyOnHitPassivesIfAny(defender, attacker, dmgReceived, dodged) {
    if (dodged || dmgReceived <= 0) return;
    if (!attacker || attacker === defender || attacker.hp <= 0) return;
    if (!defender.passives || defender.passives.length === 0) return;
    for (const key of defender.passives) {
        const p = PASSIVES[key];
        if (!p.damageStats || !defender.passivesActive[key]) continue;
        // Cuerpo a cuerpo = el atacante está a distancia 1 en el momento
        // del golpe, sin importar el alcance de la habilidad (un Thrust de
        // alcance 2 usado pegado cuenta; Pull/Charge, que terminan en
        // melee antes de pegar, también).
        if (p.meleeOnly && manhattan(attacker.pos, defender.pos) !== 1) continue;
        if (attacker.hp <= 0) break;
        const avg = averageStats(defender, p.damageStats);
        const mult = p.damageMultiplier != null ? p.damageMultiplier : 1;
        const raw = Math.max(1, Math.floor(avg * mult));
        const { dmg } = applyDamage(attacker, raw, p.damageType || "normal");
        const defLabel = defender === state.player ? "El jugador" : defender.label;
        const atkLabel = attacker === state.player ? "el jugador" : attacker.label;
        addLog(`${p.name} de ${defLabel} le hace ${dmg} de daño a ${atkLabel}.`, "dmg-tag");
        renderSide();
        renderLog();
        await animateHit(attacker.pos, dmg);
        checkGameOver();
    }
}

async function applyRetaliationIfAny(defender, attacker, dodged) {
    if (dodged) return;
    if (!defender.defendActive || !defender.defendRetaliateMultiplier) return;
    if (!attacker || attacker === defender || attacker.hp <= 0) return;
    const retaliateDmg = Math.floor((defender.defendReduction || 0) * defender.defendRetaliateMultiplier);
    if (retaliateDmg <= 0) return;
    const { dmg } = applyDamage(attacker, retaliateDmg, "normal");
    const defLabel = defender === state.player ? "El jugador" : defender.label;
    const atkLabel = attacker === state.player ? "el jugador" : attacker.label;
    addLog(`${defLabel} contraataca a ${atkLabel} y le hace ${dmg} de daño.`, "dmg-tag");
    await animateHit(attacker.pos, dmg);
    checkGameOver();
}

// Coloca una trampa en `pos`. El daño se calcula UNA vez acá, con el
// mismo motor genérico que cualquier otra habilidad de daño
// (computeAbilityDamage / averageStats), y queda congelado en la
// trampa — mismo patrón que defendReduction en Defender: quien la
// activa después puede ser una unidad con otros stats totalmente
// distintos, así que no tiene sentido recalcular en ese momento.
async function placeTrap(caster, key, pos) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (caster.hp <= 0) return;
    const ab = ABILITIES[key];
    caster.ap -= ab.apCost;
    if (ab.cooldown) caster.cooldowns[key] = ab.cooldown;
    const dmg = computeAbilityDamage(caster, key);
    state.traps.push({ pos, ownerIsPlayer: sideOf(caster) === "player", dmg, damageType: ab.damageType, moveLoss: ab.trapMoveLoss || 0 });

    const label = caster === state.player ? "Jugador" : caster.label;
    addLog(`${label} coloca una trampa oculta.`);

    if (caster === state.player) {
        renderHand();
        await animateCardCast(key);
    }
    render();
}

// Se llama cada vez que una unidad termina de ocupar una casilla
// (paso de caminata o aterrizaje de Salto — ver walkPath y los dos
// lugares que usan Salto). Solo activa trampas del bando CONTRARIO al
// que pisa: las propias no te hacen nada. Reusa applyDamage, así la
// trampa respeta Evasión/Defender de la víctima sin código nuevo.
async function triggerTrapIfAny(unit, pos) {
    const trapIdx = state.traps.findIndex(t => t.pos === pos && t.ownerIsPlayer !== (sideOf(unit) === "player"));
    if (trapIdx === -1) return;
    const trap = state.traps[trapIdx];
    state.traps.splice(trapIdx, 1); // se consume, un solo uso

    const { dmg } = applyDamage(unit, trap.dmg, trap.damageType);
    const label = unit === state.player ? "El jugador" : unit.label;
    // Sand Trap: el PM se pierde en el acto (no en el próximo turno).
    const moveLost = trap.moveLoss && unit.hp > 0 ? Math.min(trap.moveLoss, Math.max(0, unit.move)) : 0;
    if (moveLost) unit.move -= moveLost;
    const moveText = moveLost ? ` y pierde ${moveLost} PM` : "";
    addLog(`${label} pisa una trampa oculta y recibe ${dmg} de daño${moveText}.`, "dmg-tag");
    renderSide();
    renderLog();
    await animateHit(pos, dmg);
    await applyLowHpHealIfAny(unit, dmg, false);
    checkGameOver();
}

// Anima una caminata casilla por casilla siguiendo `path`, restando movimiento a cada paso
async function walkPath(u, path) {
    for (const step of path) {
        // Una trampa (Sand Trap) puede sacar PM a mitad de camino: si ya
        // no queda movimiento, la caminata se corta en la casilla actual.
        if (u.move <= 0) break;
        u.pos = step;
        u.move -= 1;
        renderBoard();
        renderSide();
        await sleep(STEP_DELAY);
        await triggerTrapIfAny(u, step);
        if (state.gameOver || u.hp <= 0) return;
    }
}

// ---------- Acciones del jugador ----------
async function tryMovePlayerTo(target) {
    const u = state.player;
    const blocked = new Set(allUnits().filter(x => x !== u && x.hp > 0).map(x => x.pos));
    const path = bfsPath(u.pos, target, blocked);
    if (!path || path.length === 0 || path.length > u.move) return;

    state.busy = true;
    render();
    await safely(() => walkPath(u, path));
    addLog(`Jugador se mueve (${path.length} casilla${path.length > 1 ? 's' : ''}).`);
    state.busy = false;
    render();
}

async function selectCard(key) {
    if (state.turn !== "player" || state.gameOver || state.busy) return;
    const ab = ABILITIES[key];
    const u = state.player;
    if (u.ap < ab.apCost) return;
    if (u.cooldowns[key] > 0) return;

    if (ab.summon && summonCellFor(u) === -1) {
        addLog(`No hay una casilla libre al lado tuyo para usar ${ab.name}.`);
        renderLog();
        return;
    }

    if (!ab.needsTarget) {
        // Usar una habilidad sin objetivo (Defender, Evasión…) cancela la
        // que estaba marcada: si no, la zona quedaba pintada y se podía
        // atacar después aunque ya no alcanzaran los PA.
        state.selection = null;
        state.busy = true;
        await safely(() => castNoTarget(u, key, "Jugador"));
        state.busy = false;
        render();
        return;
    }
    if (state.selection && state.selection.ability === key) {
        state.selection = null;
    } else {
        state.selection = { ability: key };
    }
    render();
}

async function castNoTarget(caster, key, label) {
    // Una unidad muerta no actúa (ej: la mató una trampa al caminar).
    if (caster.hp <= 0) return;
    const ab = ABILITIES[key];
    // Invocación: si no hay lugar (o la criatura no existe), no se usa y
    // no gasta PA ni entra en CD.
    let summonCell = -1;
    if (ab.summon) {
        summonCell = summonCellFor(caster);
        if (summonCell === -1 || !ENEMY_TYPES[ab.summon]) {
            if (!ENEMY_TYPES[ab.summon]) console.error(`[combate] ${ab.name}: la criatura "${ab.summon}" no existe en creature_types.`);
            addLog(`${label} no puede usar ${ab.name}: no hay lugar al lado.`);
            renderLog();
            return;
        }
    }
    caster.ap -= ab.apCost;
    if (ab.cooldown) caster.cooldowns[key] = ab.cooldown;
    let summoned = null;
    if (ab.summon) {
        summoned = spawnSummon(caster, ab.summon, summonCell);
        addLog(`${label} usa ${ab.name} y aparece ${summoned.label}.`);
    } else if (ab.reductionStats) {
        const reduction = computeAbilityReduction(caster, key);
        caster.defendReduction = reduction;
        caster.defendActive = true;
        caster.defendMagicResistant = !!ab.magicResistant;
        caster.defendRetaliateMultiplier = ab.retaliateMultiplier || 0;
        const extraMove = ab.nextTurnGrant?.move || 0;
        if (extraMove) caster.moveBonusPending = (caster.moveBonusPending || 0) + extraMove;
        const moveText = extraMove ? ` +${extraMove} PM en su próximo turno.` : "";
        addLog(`${label} usa ${ab.name}. Daño reducido en ${reduction} hasta su próximo turno.${moveText}`);
    } else if (ab.dodgeStats) {
        const chance = computeDodgeChance(caster, key);
        caster.dodgeChance = chance;
        caster.dodgeActive = true;
        addLog(`${label} usa ${ab.name}. ${chance}% de esquivar todo el daño hasta su próximo turno.`);
    } else if (ab.buffStats) {
        const bonus = computeAbilityBuff(caster, key);
        const beneficiaries = ab.buffsAllies ? [caster, ...alliesOf(caster)] : [caster];
        beneficiaries.forEach(u => {
            u.commandActive = true;
            u.commandBonus = (u.commandBonus || 0) + bonus;
        });
        addLog(`${label} usa ${ab.name}. +${bonus} de daño para su bando hasta el próximo turno de cada uno.`);
    } else if (ab.apGrantAll) {
        // Coraje: +PA ya mismo para quien lo lanza (está en pleno turno) y
        // en el próximo turno de cada aliado vivo (apBonusPending, como Potenciar).
        const n = ab.apGrantAll;
        caster.ap += n;
        const allies = alliesOf(caster);
        allies.forEach(a => { a.apBonusPending = (a.apBonusPending || 0) + n; });
        addLog(`${label} usa ${ab.name}: +${n} PA ya mismo y +${n} PA para ${allies.length} aliado(s) en su próximo turno.`);
    } else if (ab.alliesNextTurnGrant) {
        // Inspirar (Gnoll Captain): los aliados vivos reciben PM extra al
        // arrancar su próximo turno (mismo moveBonusPending que usa el
        // nextTurnGrant de Magic Shield). No incluye a quien lo lanza.
        const extraMove = ab.alliesNextTurnGrant.move || 0;
        const allies = alliesOf(caster);
        allies.forEach(a => { a.moveBonusPending = (a.moveBonusPending || 0) + extraMove; });
        addLog(`${label} usa ${ab.name}: +${extraMove} PM para ${allies.length} aliado(s) en su próximo turno.`);
    } else if (ab.resourceGrant) {
        // Genérico: a diferencia de onHitMoveGain (que depende de
        // conectar un golpe), esto se aplica siempre al castear, sin
        // target — pensado para cosas tipo Dash (+2 movimiento a
        // cambio de 1 PA, ya descontado arriba en caster.ap -= ab.apCost).
        const gains = [];
        if (ab.resourceGrant.move) {
            caster.move += ab.resourceGrant.move;
            gains.push(`${ab.resourceGrant.move} de movimiento`);
        }
        if (ab.resourceGrant.ap) {
            caster.ap += ab.resourceGrant.ap;
            gains.push(`${ab.resourceGrant.ap} de PA`);
        }
        addLog(`${label} usa ${ab.name} y gana ${gains.join(" y ")}.`);
    } else if (ab.selfStatBoost) {
        // Se acumula con otro boost activo del mismo stat (suma de %).
        caster.tempStatBoosts = { ...(caster.tempStatBoosts || {}) };
        const parts = [];
        for (const [stat, pct] of Object.entries(ab.selfStatBoost)) {
            caster.tempStatBoosts[stat] = (caster.tempStatBoosts[stat] || 0) + pct;
            parts.push(`+${Math.round(pct * 100)}% ${stat}`);
        }
        addLog(`${label} usa ${ab.name}: ${parts.join(", ")} durante este turno.`);
    }
    if (caster === state.player) {
        renderHand();
        await animateCardCast(key);
    }
    render();

    // Efecto sobre quien lo lanzó (después del render, que rehace el tablero)
    if (summoned) fxAura(summoned.pos, "buff");
    else if (ab.reductionStats) fxAura(caster.pos, "shield");
    else if (ab.dodgeStats || ab.resourceGrant) fxAura(caster.pos, "dodge");
    else if (ab.buffStats) (ab.buffsAllies ? [caster, ...alliesOf(caster)] : [caster]).forEach(u => fxAura(u.pos, "buff"));
    else if (ab.alliesNextTurnGrant) alliesOf(caster).forEach(u => fxAura(u.pos, "buff"));
    else if (ab.apGrantAll) [caster, ...alliesOf(caster)].forEach(u => fxAura(u.pos, "buff"));
    else if (ab.selfStatBoost) fxAura(caster.pos, "buff");
    await sleep(450);
}

// En el celular los nameplates están ocultos (ver battle.css): tocar una
// ficha enemiga los muestra unos segundos. Toca el DOM directo, sin
// render(), así funciona también durante el turno enemigo sin cortar
// animaciones. Si el tablero se redibuja antes, simplemente se oculta.
let nameplatePeekTimer = null;
function peekNameplate(i) {
    const occ = unitAt(i);
    if (!occ || occ === state.player) return;
    boardEl.querySelectorAll(".cell.peek").forEach(c => c.classList.remove("peek"));
    const el = cellEl(i);
    if (!el) return;
    el.classList.add("peek");
    clearTimeout(nameplatePeekTimer);
    nameplatePeekTimer = setTimeout(() => el.classList.remove("peek"), 2500);
}

async function handleCellClick(i) {
    if (state.turn !== "player" || state.gameOver || state.busy) return;

    if (state.selection) {
        const key = state.selection.ability;
        const ab = ABILITIES[key];
        const u = state.player;
        // Segunda barrera: al elegir el objetivo se vuelve a chequear que
        // alcancen los PA y que no esté en CD. Si no, se cancela la selección.
        if (u.ap < ab.apCost || (u.cooldowns[key] || 0) > 0) {
            state.selection = null;
            render();
            return;
        }
        const inRange = inAbilityRange(u, i, ab);
        if (!inRange) return;

        if (ab.targetType === "enemy") {
            const target = livingEnemies().find(e => e.pos === i);
            if (!target) return;
            state.selection = null;
            state.busy = true;
            render();
            await safely(() => performAttack(u, target, key));
            state.busy = false;
            render();
            return;
        }

        if (ab.targetType === "ally") {
            const target = selfAndAlliesOf(u).find(a => a.pos === i);
            if (!target) return;
            state.selection = null;
            state.busy = true;
            render();
            await safely(() => ab.buffType ? performAllyBuff(u, target, key) : performHeal(u, target, key));
            state.busy = false;
            render();
            return;
        }

        if (key === "salto") {
            if (!state.cells[i].active) return;
            if (unitAt(i)) return;
            state.selection = null;
            state.busy = true;
            u.ap -= ab.apCost;
            render();
            await sleep(120);
            u.pos = i;
            addLog(`Jugador salta a otra casilla.`);
            renderBoard();
            renderSide();
            renderLog();
            await safely(() => triggerTrapIfAny(u, i));
            await sleep(100);
            state.busy = false;
            render();
            return;
        }
        if (ab.targetType === "area") {
            if (!state.cells[i].active) return;
            state.selection = null;
            state.busy = true;
            render();
            await safely(() => performAreaAttack(u, i, key));
            state.busy = false;
            render();
            return;
        }
        if (ab.targetType === "trap") {
            if (!state.cells[i].active) return;
            if (unitAt(i)) return;
            if (state.traps.some(t => t.pos === i)) return; // ya hay una trampa en esa casilla
            state.selection = null;
            state.busy = true;
            render();
            await safely(() => placeTrap(u, key, i));
            state.busy = false;
            render();
            return;
        }
        return;
    }

    if (state.cells[i].active && !unitAt(i)) {
        await tryMovePlayerTo(i);
    }
}

// Suma de todo bonus de recurso (move/ap) que otorguen las pasivas
// activas de la unidad. Genérico: cualquier pasiva futura que declare
// resourceBoosts.move o resourceBoosts.ap se suma sola, sin tocar esto.
function effectiveResourceBonus(unit, resource) {
    let bonus = 0;
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (unit.passivesActive[key] && p.resourceBoosts && p.resourceBoosts[resource]) {
            bonus += p.resourceBoosts[resource];
        }
    });
    return bonus;
}

// El aiStyle "real" de la unidad, salvo que una pasiva activa lo
// sobreescriba (ej: Injured vuelve escurridizo a un lobo agresivo
// mientras esté herido). Reemplaza cualquier lectura directa de
// u.aiStyle en la IA.
function effectiveAiStyle(unit) {
    let style = unit.aiStyle;
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (unit.passivesActive[key] && p.aiStyleOverride) style = p.aiStyleOverride;
    });
    return style;
}

// Lee el valor "efectivo" de un stat: el base, más cualquier boost de
// una pasiva actualmente activa en esta unidad. Es el único lugar que
// sabe que las pasivas existen — cualquier stat que se lea por acá
// (daño, reducción, esquiva) hereda el boost gratis.
// `target` es opcional: solo lo pasan los cálculos de daño de un ataque
// a un blanco puntual. Sin blanco, las pasivas con targetHpThreshold no cuentan.
function effectiveStat(unit, statKey, target) {
    let value = Math.max(0, (unit.stats[statKey] || 0)
        + ((unit.statBuffs && unit.statBuffs[statKey]) || 0)
        - ((unit.statDebuffs && unit.statDebuffs[statKey]) || 0));
    // Boost temporal de habilidades tipo Arcane Focus (selfStatBoost).
    if (unit.tempStatBoosts && unit.tempStatBoosts[statKey] != null) {
        value = value * (1 + unit.tempStatBoosts[statKey]);
    }
    // Debuff porcentual temporal (ej: Ceguera).
    if (unit.percentDebuffs && unit.percentDebuffs.stats[statKey] != null) {
        value = value * (1 - unit.percentDebuffs.stats[statKey]);
    }
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (!p.statBoosts || p.statBoosts[statKey] == null) return;
        const active = p.targetHpThreshold != null
            ? !!(target && target.hp > 0 && target.hp / target.maxHp <= p.targetHpThreshold)
            : unit.passivesActive[key];
        if (active) value = value * (1 + p.statBoosts[statKey]);
    });
    return value;
}

function averageStats(unit, statKeys, target) {
    if (!statKeys || statKeys.length === 0) return 0;
    const sum = statKeys.reduce((acc, statKey) => acc + effectiveStat(unit, statKey, target), 0);
    return Math.floor(sum / statKeys.length);
}

function computeAbilityDamage(unit, key, target) {
    const ab = ABILITIES[key];
    const avg = averageStats(unit, ab.damageStats, target);
    const mult = ab.damageMultiplier != null ? ab.damageMultiplier : 1;
    let dmg = Math.floor(avg * mult);
    if (unit.commandActive) dmg += unit.commandBonus;
    return Math.max(1, dmg);
}

function computeAbilityHeal(unit, key) {
    const ab = ABILITIES[key];
    const avg = averageStats(unit, ab.healStats);
    const mult = ab.healMultiplier != null ? ab.healMultiplier : 1;
    return Math.floor(avg * mult);
}

// Mismo criterio que el daño: floor(floor(promedio) x multiplicador).
// Sin reductionMultiplier ni reductionMin (Defender, Ice Shield) queda
// igual que antes. reductionMin: piso de la reducción (Magic Shield: 1).
function computeAbilityReduction(unit, key) {
    const ab = ABILITIES[key];
    const avg = averageStats(unit, ab.reductionStats);
    const mult = ab.reductionMultiplier != null ? ab.reductionMultiplier : 1;
    return Math.max(ab.reductionMin || 0, Math.floor(avg * mult));
}

function computeAbilityBuff(unit, key) {
    return averageStats(unit, ABILITIES[key].buffStats);
}

// Cantidad de un buff con blanco (ej: Empower). Separado de
// computeAbilityBuff para no tocar Command. Mínimo 1.
function computeAbilityBuffAmount(unit, key) {
    const ab = ABILITIES[key];
    const avg = averageStats(unit, ab.buffStats);
    const mult = ab.buffMultiplier != null ? ab.buffMultiplier : 1;
    return Math.max(1, Math.floor(avg * mult));
}

// Motor genérico para habilidades tipo "% de esquivar todo el daño".
// A diferencia de averageStats (promedio simple), acá la fórmula usa
// la SUMA de los stats sobre una curva logarítmica, capada en 85%.
// Cualquier habilidad futura que declare dodgeStats con esta misma
// curva la reusa sin tocar esta función; si en algún momento aparece
// una curva distinta, esta función es el único lugar a cambiar.
function computeDodgeChance(unit, key) {
    const statKeys = ABILITIES[key].dodgeStats;
    const sum = statKeys.reduce((acc, statKey) => acc + effectiveStat(unit, statKey), 0);
    const raw = 25 + 30.83 * Math.log(1 + sum / 60);
    return Math.min(85, Math.floor(raw));
}

function criticalHpRatioFor(style) {
    return CRITICAL_HP_RATIO_BY_STYLE[style] != null ? CRITICAL_HP_RATIO_BY_STYLE[style] : CRITICAL_HP_RATIO;
}

// Recalcula, para cada pasiva que tenga la unidad, si su umbral de HP
// se cumple ahora mismo. Dinámico: si la vida vuelve a subir por
// encima del umbral (curación futura), la pasiva se desactiva sola.
// Solo loguea cuando realmente cambia de estado, no en cada golpe.
function checkPassives(unit) {
    if (!unit.passives || unit.passives.length === 0) return;
    const label = unit === state.player ? "El jugador" : unit.label;
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (p.targetHpThreshold != null) return; // se evalúa contra el blanco al atacar, no se "activa" por la vida propia
        const shouldBeActive = unit.hp / unit.maxHp <= p.hpThreshold;
        const wasActive = !!unit.passivesActive[key];
        if (shouldBeActive === wasActive) return;
        unit.passivesActive[key] = shouldBeActive;
        addLog(`${label} ${shouldBeActive ? "activa" : "pierde"} ${p.name}.`, "turn");
    });
}

// Suma toda la reducción de daño "pasiva" (automática, no una carta
// como Defender) de las pasivas activas de la unidad. Reusa
// averageStats, así que hereda gratis cualquier boost de stat que
// otra pasiva le esté dando en simultáneo.
function passiveReductionOf(unit) {
    let total = 0;
    if (!unit.passives) return total;
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (unit.passivesActive[key] && p.passiveReduction) {
            const avg = averageStats(unit, p.passiveReduction.stats);
            total += Math.max(1, Math.floor(avg / p.passiveReduction.divisor));
        }
    });
    return total;
}

// Al final del turno de la unidad, cualquier pasiva que declare
// endOfTurnRegen cura según su propio stat/divisor, multiplicado por
// el PA (o PM, según 'resource') que le quedó sin gastar. Mínimo 1 de cura por PA no usado
// (nunca 0, aunque el stat sea bajo) — pero si no le quedó PA sin
// usar, el total sigue dando 0 igual.
async function applyEndOfTurnRegen(unit) {
    if (!unit.passives) return;
    // checkPassives() normalmente se dispara al recibir daño o curarse
    // (ver applyDamage). Una pasiva con hpThreshold: 1 (siempre activa,
    // ej. inPain) necesita quedar marcada activa desde el turno 1, aunque
    // la unidad todavía no haya sido tocada — por eso se recalcula acá
    // también, antes de mirar passivesActive.
    checkPassives(unit);
    for (const key of unit.passives) {
        const p = PASSIVES[key];
        if (!unit.passivesActive[key] || !p.endOfTurnRegen) continue;
        // resource: qué recurso sobrante multiplica la cura. Por defecto
        // "ap" (Regeneración Gélida); "move" para la Regeneración de Trol.
        const { stat, divisor, resource = "ap" } = p.endOfTurnRegen;
        const perAp = Math.max(1, Math.floor(effectiveStat(unit, stat) / divisor));
        const heal = perAp * Math.max(0, unit[resource] || 0);
        if (heal <= 0) continue;
        const before = unit.hp;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        const actualHeal = unit.hp - before;
        if (actualHeal > 0) {
            const label = unit === state.player ? "El jugador" : unit.label;
            addLog(`${label} regenera ${actualHeal} de vida (${p.name}).`);
            renderSide();
            await animateHeal(unit.pos, actualHeal);
            checkPassives(unit);
        }
    }
}

// Hermana de applyEndOfTurnRegen, pero para pasivas que le hacen daño a
// su propia dueña al final del turno (ej. inPain: la criatura sufre por
// su propio dolor). A diferencia de endOfTurnRegen, esto NO escala con
// el PA sin gastar — es un valor fijo por turno (stat/divisor, mínimo
// 1) — así que no reusa esa cuenta. No pasa por applyDamage: es daño
// autoinfligido, no hay esquiva ni reducción posible contra uno mismo.
async function applyEndOfTurnDamage(unit) {
    if (!unit.passives) return;
    checkPassives(unit); // ver comentario en applyEndOfTurnRegen
    for (const key of unit.passives) {
        const p = PASSIVES[key];
        if (!unit.passivesActive[key] || !p.endOfTurnDamage) continue;
        const { stat, divisor } = p.endOfTurnDamage;
        const dmg = Math.max(1, Math.floor(effectiveStat(unit, stat) / divisor));
        const before = unit.hp;
        unit.hp = Math.max(0, unit.hp - dmg);
        const actualDmg = before - unit.hp;
        if (actualDmg > 0) {
            const label = unit === state.player ? "El jugador" : unit.label;
            addLog(`${label} sufre ${actualDmg} de daño por ${p.name}.`);
            renderSide();
            await animateHit(unit.pos, actualDmg);
            checkPassives(unit);
            await checkGameOver(); // esto puede matar a la unidad
        }
    }
}

// Devuelve { dmg, dodged } en vez de solo el número: algunas
// habilidades futuras (ej: Sneak) necesitan saber si el golpe REALMENTE
// conectó con daño, no solo cuánto fue. Los call-sites que solo
// quieren el número siguen leyendo `.dmg` como antes.
// Suma la esquiva (en %) de las pasivas activas con `elusiveness`.
// Recalcula passivesActive antes de leerlo: una pasiva con
// hpThreshold: 1 (siempre activa, ej. incorporeal) tiene que contar
// desde el primer golpe que recibe la unidad, aunque todavía no haya
// pasado ningún checkpoint que la marque activa (mismo motivo que en
// applyEndOfTurnRegen).
function passiveDodgeChanceOf(unit) {
    if (!unit.passives || unit.passives.length === 0) return 0;
    checkPassives(unit);
    let total = 0;
    unit.passives.forEach(key => {
        const p = PASSIVES[key];
        if (unit.passivesActive[key] && p.elusiveness) total += p.elusiveness * 100;
    });
    return total;
}

// Tope de esquiva total, el mismo que usa computeDodgeChance para Evasión.
const MAX_DODGE_CHANCE = 85;

function applyDamage(unit, rawDamage, damageType = "normal") {
    // Esquiva activa (Evasión) + esquiva pasiva se suman en UNA sola
    // tirada, con el mismo tope de 85%.
    const activeDodge = unit.dodgeActive ? unit.dodgeChance : 0;
    const dodgeChance = Math.min(MAX_DODGE_CHANCE, activeDodge + passiveDodgeChanceOf(unit));
    if (dodgeChance > 0 && Math.random() * 100 < dodgeChance) return { dmg: 0, dodged: true };
    let dmg = rawDamage;
    let totalReduction = passiveReductionOf(unit);
    if (unit.defendActive) {
        let reduction = unit.defendReduction || 0;
        // Resistencia Mágica (ej: Ice Shield): el mismo número reducido
        // al castear, pero vale DOBLE si el golpe no es de tipo normal.
        if (unit.defendMagicResistant && damageType !== "normal") reduction *= 2;
        totalReduction += reduction;
    }
    dmg = Math.max(0, dmg - totalReduction);
    unit.hp = Math.max(0, unit.hp - dmg);
    checkPassives(unit);
    return { dmg, dodged: false };
}

async function checkGameOver() {
    // Una sola vez por combate: si el último golpe dispara algo encadenado
    // (Sangre Corrosiva, contraataque), checkGameOver se llama de nuevo y
    // antes mandaba un segundo finish-combat en paralelo.
    if (state.gameOver) return;
    if (state.player.hp <= 0) {
        state.gameOver = true;
        addLog("El jugador ha caído. Derrota.", "turn");
        showOverlay(false);
        return;
    }
    [...state.allies, ...state.enemies].forEach(e => {
        if (e.hp <= 0 && !e._deadLogged) {
            e._deadLogged = true;
            addLog(`${e.label} ha caído.`, "turn");
        }
    });

    if (livingEnemies().length === 0) {
        // gameOver se marca ACÁ, sincrónico — así cualquier render() que
        // dispare el código que llamó a checkGameOver (ver los 5 call
        // sites) ya refleja "partida terminada" aunque el fetch de abajo
        // todavía no haya vuelto.
        state.gameOver = true;

        addLog("Todos los enemigos han caído. Victoria.", "turn");
        renderLog();
        await saveVictory();
    }
}

// ---------- Guardado de la victoria ----------
// El cartel de Victoria aparece SIEMPRE. Si finish-combat falla (sesión
// abierta en otro dispositivo, error del servidor, corte de red), en vez
// de quedar el tablero congelado se muestra el aviso y el botón pasa a
// "Reintentar" (o "Iniciar sesión" si la sesión ya no vale). El oro, la
// XP y la tirada del alma llegan recién cuando el guardado sale bien.
let victorySaved = false;
let victorySaving = false;
let victoryError = null; // null | "retry" | "session"

function setOverlayNote(text) {
    overlaySubtitle.textContent = text;
    overlaySubtitle.style.display = text ? "" : "none";
}

async function saveVictory() {
    if (victorySaved || victorySaving) return;
    victorySaving = true;
    victoryError = null;
    showOverlay(true);
    setOverlayNote("Guardando el resultado…");
    restartBtnEl.disabled = true;

    // El oro NO se calcula acá: se manda qué criaturas murieron y la Edge
    // Function decide cuánto vale (mirando creature_types).
    // Los invocados no dan oro ni XP: no se mandan.
    const defeatedKeys = state.enemies.filter(e => !e.summoned).map(e => e.type);
    let result;
    try {
        result = await finishCombat(defeatedKeys, state.player.hp);
    } catch (err) {
        console.error("[combate] No se pudo guardar la victoria:", err);
        const sessionLost = /autorizado/i.test(err?.message || "");
        victoryError = sessionLost ? "session" : "retry";
        setOverlayNote(sessionLost
            ? "Tu sesión se abrió en otro dispositivo, así que este combate no se pudo guardar. Volvé a iniciar sesión."
            : "No se pudo guardar el resultado. Revisá tu conexión y probá de nuevo.");
        restartBtnEl.textContent = sessionLost ? "Iniciar sesión" : "Reintentar";
        restartBtnEl.disabled = false;
        victorySaving = false;
        return;
    }

    victorySaved = true;
    victorySaving = false;
    const { progress, goldGained, xpGained, level, leveledUp } = result;
    currentProgress = progress;
    state.player.maxHp = currentProgress.maxHp;
    addLog(`Ganaste ${goldGained} de oro${xpGained > 0 ? ` y ${xpGained} de XP` : ""}.`, "turn");
    if (leveledUp) {
        addLog(`¡Subiste a nivel ${level}!`, "turn");
    }
    renderLog();

    showOverlay(true, goldGained, xpGained, leveledUp, level);
    restartBtnEl.disabled = false;

    // Un solo tiro de 5% por combate ganado, sobre las criaturas que
    // estuvieron presentes en ESTE combate (con repetición). Los bandidos
    // no dan alma. Si no hay ranuras libres para el nivel (connect-soul.ts:
    // 1 por nivel) se trata como si no hubiera caído nada.
    try {
        const soulEligibleEnemies = state.enemies.filter(e => !e.summoned && ENEMY_TYPES[e.type]?.family !== "bandidos");
        if (soulEligibleEnemies.length && Math.random() < SOUL_DROP_CHANCE) {
            const soulType = soulEligibleEnemies[Math.floor(Math.random() * soulEligibleEnemies.length)].type;
            if (hasSoulSlot(PLAYER_CONFIG.level, PLAYER_CONFIG.souls.length)) {
                await handleSoulDrop(soulType);
            }
        }
    } catch (err) {
        // El combate ya quedó guardado: si falla lo del alma, el jugador
        // sigue con el botón de siempre.
        console.error("[combate] Error con el alma:", err);
        restartBtnEl.disabled = false;
    }
}

// ---------- Red de seguridad ----------
// Envuelve cada acción del combate. Si algo tira un error inesperado (una
// animación, una pasiva, la IA), en vez de quedar el tablero trabado se
// anota en la consola, se avisa en el registro y el combate sigue. Si con
// eso ya terminó la pelea (todos los enemigos o el jugador en 0), se
// dispara el final normal.
async function safely(fn) {
    try {
        await fn();
    } catch (err) {
        console.error("[combate] Error inesperado:", err);
        addLog("Hubo un error inesperado; el combate sigue.", "turn");
        renderLog();
        if (!state.gameOver && (state.player.hp <= 0 || livingEnemies().length === 0)) {
            checkGameOver();
        }
    }
}

// Antes solo cambiaba de turno — ahora es async porque, igual que ya
// pasa en runUnitAiTurn para los enemigos, el jugador también puede
// tener pasivas de fin de turno (heredadas de un alma conectada, ver
// get-character-state.ts/player.js): regeneración (frostRegen) o daño
// autoinfligido (inPain). state.busy se pone en true ANTES de esos
// awaits para que no se pueda clickear "Terminar turno" de nuevo
// mientras se resuelven.
async function endPlayerTurn() {
    if (state.turn !== "player" || state.gameOver || state.busy) return;
    state.selection = null;
    state.player.commandActive = false;
    state.player.commandBonus = 0;
    state.player.tempStatBoosts = null; // Arcane Focus dura solo el turno
    addLog("Fin del turno del jugador.", "turn");
    state.busy = true;
    render();

    await safely(() => applyEndOfTurnRegen(state.player));
    if (!state.gameOver) await safely(() => applyEndOfTurnDamage(state.player));
    renderSide();

    if (state.gameOver) return; // ej: una pasiva lo dejó en 0 hp

    state.turn = "enemy";
    render();
    setTimeout(runEnemyPhase, 500);
}

async function runEnemyPhase() {
    // Primero juegan los invocados del jugador (los que invocó en este
    // turno también: actúan en la misma ronda).
    for (const ally of state.allies) {
        if (state.gameOver) break;
        if (ally.hp <= 0) continue;
        state.actingUnit = ally;
        renderBoard();
        await safely(() => runUnitAiTurn(ally));
        if (state.gameOver) break;
        await sleep(UNIT_TURN_GAP);
    }
    if (state.gameOver) { state.actingUnit = null; return; }
    // for...of recorre también a los que se agregan durante la fase, así
    // que lo que invoca una criatura juega en esta misma ronda.
    for (const enemy of state.enemies) {
        if (state.gameOver) break;
        if (enemy.hp <= 0) continue;
        state.actingUnit = enemy;
        renderBoard();
        // Si el turno de un enemigo falla, se pasa al siguiente y el turno
        // del jugador arranca igual (antes el combate quedaba trabado).
        await safely(() => runUnitAiTurn(enemy));
        if (state.gameOver) break;
        await sleep(UNIT_TURN_GAP);
    }
    state.actingUnit = null;
    if (!state.gameOver) addLog("Fin del turno enemigo.", "turn");
    startPlayerTurn();
}

// ---------- IA genérica (con animación) ----------
async function runUnitAiTurn(u) {
    // Blanco: el rival más cercano (ver pickTarget). Sin invocados es
    // siempre el jugador, como antes. Se vuelve a elegir en cada paso por
    // si el blanco muere o se mueve (Atraer).
    let p = null;
    let pPos = -1;
    let distToPlayer = null;

    u.move = Math.max(0, u.maxMove + effectiveResourceBonus(u, "move") + (u.moveBonusPending || 0) - (u.moveDrainPending || 0));
    u.ap = Math.max(0, u.maxAp + effectiveResourceBonus(u, "ap") + (u.apBonusPending || 0) - (u.apDrainPending || 0));
    u.apBonusPending = 0;
    u.apDrainPending = 0;
    u.moveDrainPending = 0;
    u.moveBonusPending = 0;
    u.tempStatBoosts = null;
    // Debuff porcentual: vale durante el turno que arranca y se borra al siguiente.
    if (u.percentDebuffs) {
        if (u.percentDebuffs.turnsLeft <= 0) u.percentDebuffs = null;
        else u.percentDebuffs.turnsLeft--;
    }
    u.defendActive = false;
    u.defendMagicResistant = false; 
    u.defendRetaliateMultiplier = 0;
    u.dodgeActive = false;
    u.abilities.forEach(key => {
        if (ABILITIES[key].cooldown && u.cooldowns[key] > 0) u.cooldowns[key]--;
    });

    addLog(`Turno de ${u.label}.`, "turn");
    renderLog();

    const desiredRange = desiredRangeOf(u);

    let steps = 0;
    while (steps < 10) {
        steps++;
        // Si murió en el paso anterior (una trampa al caminar, un
        // contraataque…), el turno termina acá.
        if (state.gameOver || u.hp <= 0) break;
        const target = pickTarget(u);
        if (!target) break;
        if (target !== p || target.pos !== pPos) {
            p = target;
            pPos = target.pos;
            distToPlayer = bfsDistances(p.pos, new Set());
        }
        const distToP = manhattan(u.pos, p.pos);

        // El estilo "real" para decidir este paso: medic se comporta
        // como escurridizo si no tiene a nadie herido para curar — no
        // tiene rol de soporte que cumplir ese turno, así que cae al
        // perfil evasivo en vez de quedarse plantado.
        let style = effectiveAiStyle(u);
        if (style === "medic") {
            if (nearestInjuredAlly(u)) {
                const medicResult = await runMedicPriority(u);
                if (medicResult === "continue") continue;
                // Tenía a quién curar pero no pudo curarlo ni acercarse más
                // este paso (cooldown, o ya está lo más cerca que puede) —
                // sigue como medic de acá para abajo (chequeo de ataque
                // oportunista, sin perseguir).
            } else {
                style = "escurridizo";
            }
        }

        // Defensa prioritaria: si está críticamente herida (<=35%), se
        // defiende/esquiva ANTES de intentar atacar — no como último
        // recurso. Aunque pudiera pegarle al jugador este turno, prefiere
        // protegerse primero. Distinto del 50% de más abajo, que solo
        // actúa cuando ya no le quedó otra cosa para hacer.
        if (u.hp <= u.maxHp * criticalHpRatioFor(style)) {
            const defKeyCritical = defensiveFallbackAbilityOf(u);
            if (defKeyCritical) {
                await castNoTarget(u, defKeyCritical, u.label);
                continue;
            }
        }

        // Command (o cualquier buff futuro): se castea ANTES de intentar
        // atacar, cada vez que esté disponible — no hace falta chequear
        // si ya está activo, porque el propio cooldown evita recastearlo
        // en el mismo turno una vez usado.
        const buffKey = buffFallbackAbilityOf(u);
        if (buffKey) {
            await castNoTarget(u, buffKey, u.label);
            continue;
        }

        // Invocar: cada vez que pueda (el CD largo lo limita).
        const summonKey = summonAbilitiesOf(u).find(key => canSummonNow(u, key));
        if (summonKey) {
            await castNoTarget(u, summonKey, u.label);
            continue;
        }

        // Buff con blanco (Empower): si algún aliado está en rango, se
        // castea ANTES de atacar. No depende del aiStyle. Prefiere a un
        // aliado que pueda atacar. Si no hay nadie en rango, sigue con
        // el ataque/movimiento normal. La IA no se autobufa (Empower
        // sobre sí misma cuesta 1 PA y da 1: no gana nada).
        const allyBuffKey = allyBuffAbilitiesOf(u).find(key => {
            const ab = ABILITIES[key];
            if (u.ap < ab.apCost) return false;
            if (ab.cooldown && u.cooldowns[key] > 0) return false;
            return alliesOf(u).some(a => inAbilityRange(u, a.pos, ab));
        });
        if (allyBuffKey) {
            const ab = ABILITIES[allyBuffKey];
            const inRangeAllies = alliesOf(u).filter(a => inAbilityRange(u, a.pos, ab));
            const buffTarget = inRangeAllies.find(a => attackAbilitiesOf(a).length > 0) || inRangeAllies[0];
            await performAllyBuff(u, buffTarget, allyBuffKey);
            continue;
        }

        // Primero contra su blanco; si no llega, contra cualquier otro
        // rival que tenga a tiro (solo pasa si hay invocados).
        const attackKeyFor = victim => attackAbilitiesOf(u).find(key => {
            const ab = ABILITIES[key];
            const onCooldown = ab.cooldown && u.cooldowns[key] > 0;
            if (ab.pullsToMelee && manhattan(u.pos, victim.pos) <= 1) return false; // ya está pegado: Pull no aporta
            return inAbilityRange(u, victim.pos, ab) && u.ap >= ab.apCost && !onCooldown;
        });
        let attackKey = attackKeyFor(p);
        if (!attackKey) {
            const others = opponentsOf(u).filter(o => o !== p)
                .sort((a, b) => manhattan(u.pos, a.pos) - manhattan(u.pos, b.pos));
            for (const o of others) {
                const k = attackKeyFor(o);
                if (k) { p = o; pPos = o.pos; distToPlayer = bfsDistances(p.pos, new Set()); attackKey = k; break; }
            }
        }
        if (attackKey) {
            const ab = ABILITIES[attackKey];
            if (ab.targetType === "area") {
                // El punto de impacto es la casilla del blanco. No evita
                // autolastimarse a propósito (según lo acordado); eso se
                // resolverá más adelante con resistencia al fuego.
                await performAreaAttack(u, p.pos, attackKey);
            } else {
                await performAttack(u, p, attackKey);
            }
            if (state.gameOver) break;
            continue;
        }

        // Elusive: nunca se acerca al jugador para atacar. Si ya está en
        // rango, el bloque de arriba ya atacó; si no lo está, usa su
        // movimiento para alejarse en vez de aproximarse (a diferencia de
        // escurridizo, que solo huye cuando se quedó sin PA).
        if (style === "elusive") {
            if (u.move > 0) await fleeFromPlayer(u, distToPlayer, p);
            if (await tryPlaceTrapNearPlayer(u, p)) continue;
            const defKeyElusive = defensiveFallbackAbilityOf(u);
            if (defKeyElusive && u.hp <= u.maxHp * LOW_HP_FALLBACK_RATIO) {
                await castNoTarget(u, defKeyElusive, u.label);
                continue;
            }
            break;
        }

        // Escurridizo: ya no le queda PA para atacar de nuevo. En vez de
        // seguir con la lógica de "acercarse" de más abajo (pensada para
        // el perfil agresivo por defecto), gasta el PM restante alejándose
        // lo más posible del jugador y termina el turno acá.
        if (style === "escurridizo") {
            const attackCosts = attackAbilitiesOf(u).map(key => ABILITIES[key].apCost);
            const cheapestAttackCost = attackCosts.length ? Math.min(...attackCosts) : Infinity;
            if (u.ap < cheapestAttackCost && u.move > 0) {
                await fleeFromPlayer(u, distToPlayer, p);
                break;
            }
        }

        // Medic no persigue al jugador si no pudo atacar ni curar — no
        // es su rol arriesgarse acercándose. Solo le queda, como
        // cualquiera, una defensiva si está herido, y si no, termina.
        if (style === "medic") {
            const defKeyMedic = defensiveFallbackAbilityOf(u);
            if (defKeyMedic && u.hp <= u.maxHp * LOW_HP_FALLBACK_RATIO) {
                await castNoTarget(u, defKeyMedic, u.label);
                continue;
            }
            break;
        }

        const inDesiredRange = distToP <= desiredRange;

        if (!inDesiredRange) {
            let moved = false;

            if (u.move > 0) {
                const occupied = new Set(allUnits().filter(x => x !== u && x.hp > 0).map(x => x.pos));
                const reach = bfsDistances(u.pos, occupied);
                let bestCell = -1, bestMoveCost = Infinity, bestFieldDist = distToPlayer[u.pos], foundInRange = false;

                // Rodear: distancia REAL caminando (esquivando a las demás
                // unidades) hasta la casilla libre más cercana desde donde
                // puede atacar. Así, si hay un aliado tapando el camino
                // directo, da la vuelta en vez de quedarse quieto porque
                // "en línea recta" no se acercaba.
                const attackSpots = [];
                for (let i = 0; i < SIZE * SIZE; i++) {
                    if (!state.cells[i].active || occupied.has(i)) continue;
                    if (distToPlayer[i] <= desiredRange) attackSpots.push(i);
                }
                const approach = bfsDistancesMulti(attackSpots, occupied);
                if (isFinite(approach[u.pos])) {
                    let bestApproach = approach[u.pos];
                    for (let i = 0; i < SIZE * SIZE; i++) {
                        if (i === u.pos || occupied.has(i) || !state.cells[i].active) continue;
                        const moveCost = reach[i];
                        if (!isFinite(moveCost) || moveCost > u.move) continue;
                        if (approach[i] < bestApproach || (approach[i] === bestApproach && bestCell !== -1 && moveCost < bestMoveCost)) {
                            bestApproach = approach[i];
                            bestMoveCost = moveCost;
                            bestCell = i;
                        }
                    }
                }

                // Si no hay ninguna casilla libre para atacar (el jugador ya
                // está rodeado), se acerca como antes, por distancia directa.
                if (bestCell === -1) for (let i = 0; i < SIZE * SIZE; i++) {
                    if (i === u.pos) continue;
                    if (!state.cells[i].active) continue;
                    if (occupied.has(i)) continue;
                    const moveCost = reach[i];
                    if (!isFinite(moveCost) || moveCost > u.move) continue;
                    const fieldDist = distToPlayer[i];
                    if (!isFinite(fieldDist)) continue;

                    if (fieldDist <= desiredRange) {
                        if (!foundInRange || moveCost < bestMoveCost) {
                            foundInRange = true;
                            bestMoveCost = moveCost;
                            bestCell = i;
                            bestFieldDist = fieldDist;
                        }
                    } else if (!foundInRange && fieldDist < bestFieldDist) {
                        bestFieldDist = fieldDist;
                        bestMoveCost = moveCost;
                        bestCell = i;
                    }
                }
                if (bestCell !== -1) {
                    const path = bfsPath(u.pos, bestCell, occupied);
                    if (path) {
                        await walkPath(u, path);
                        if (u.hp <= 0) break;
                        addLog(`${u.label} se mueve hacia ${nameOf(p)}.`);
                        renderLog();
                        moved = true;
                    }
                }
            }

            if (moved) continue;

            if (u.abilities.includes("salto") && u.ap >= ABILITIES.salto.apCost) {
                const occupied = new Set(allUnits().filter(x => x !== u && x.hp > 0).map(x => x.pos));
                let jumpCell = -1, jumpFieldDist = distToPlayer[u.pos];
                for (const n of neighbors4(u.pos)) {
                    if (!state.cells[n].active || occupied.has(n)) continue;
                    const fieldDist = distToPlayer[n];
                    if (fieldDist < jumpFieldDist) { jumpFieldDist = fieldDist; jumpCell = n; }
                }
                if (jumpCell !== -1) {
                    u.ap -= ABILITIES.salto.apCost;
                    renderBoard();
                    await sleep(120);
                    u.pos = jumpCell;
                    addLog(`${u.label} usa Salto para acercarse ${toNameOf(p)}.`);
                    renderBoard();
                    renderLog();
                    await triggerTrapIfAny(u, jumpCell);
                    if (state.gameOver || u.hp <= 0) break;
                    await sleep(120);
                    continue;
                }
            }

            if (await tryPlaceTrapNearPlayer(u, p)) continue;

            const defKey1 = defensiveFallbackAbilityOf(u);
            if (defKey1 && u.hp <= u.maxHp * LOW_HP_FALLBACK_RATIO) {
                await castNoTarget(u, defKey1, u.label);
                continue;
            }
            break;
        }

        if (await tryPlaceTrapNearPlayer(u, p)) continue;

        const defKey2 = defensiveFallbackAbilityOf(u);
        if (defKey2 && u.hp <= u.maxHp * LOW_HP_FALLBACK_RATIO) {
            await castNoTarget(u, defKey2, u.label);
            continue;
        }

        break;
    }

    //Reset de buffs
    u.commandActive = false;
    u.commandBonus = 0;

    if (!state.gameOver && u.hp > 0) {
        await applyEndOfTurnRegen(u);
        if (!state.gameOver && u.hp > 0) await applyEndOfTurnDamage(u);
        renderSide();
    }
}

// Prioridad del aiStyle "medic" dentro del loop de runUnitAiTurn.
// Devuelve "continue" si hizo algo este paso (curó o se acercó al
// aliado — el loop principal debe re-evaluar), o "fallthrough" si no
// hay nada que curar/a quién acercarse (deja que el loop siga con el
// chequeo de ataque normal, como cualquier otra unidad).
async function runMedicPriority(u) {
    const ally = nearestInjuredAlly(u);
    if (!ally) return "fallthrough";

    const healKey = healAbilitiesOf(u).find(key => {
        const ab = ABILITIES[key];
        const onCooldown = ab.cooldown && u.cooldowns[key] > 0;
        return inAbilityRange(u, ally.pos, ab) && u.ap >= ab.apCost && !onCooldown;
    });

    if (healKey) {
        await performHeal(u, ally, healKey);
        return "continue";
    }

    if (await moveToward(u, ally.pos)) {
        addLog(`${u.label} se acerca a ${ally.label} para curarlo.`);
        renderLog();
        return "continue";
    }

    return "fallthrough";
}

async function tryPlaceTrapNearPlayer(u, target = state.player) {
    const trapKey = trapAbilitiesOf(u).find(key => {
        const ab = ABILITIES[key];
        const onCooldown = ab.cooldown && u.cooldowns[key] > 0;
        return u.ap >= ab.apCost && !onCooldown;
    });
    if (!trapKey) return false;

    const ab = ABILITIES[trapKey];
    let bestCell = -1, bestDist = Infinity;
    for (let n = 0; n < SIZE * SIZE; n++) {
        if (!state.cells[n].active) continue;
        if (manhattan(u.pos, n) > ab.range) continue; // rango desde SU posición actual, no la del jugador
        if (unitAt(n)) continue;
        if (state.traps.some(t => t.pos === n)) continue;
        const d = manhattan(n, target.pos);
        if (d < bestDist) { bestDist = d; bestCell = n; }
    }
    if (bestCell === -1) return false;
    await placeTrap(u, trapKey, bestCell);
    return true;
}

// Usada por el aiStyle "escurridizo": con el movimiento que le quede,
// busca entre las celdas alcanzables la que queda MÁS lejos del
// jugador (en vez de más cerca, como hace el resto de la IA para
// acercarse). `distToPlayer` se recibe ya calculado por
// runUnitAiTurn para no recalcularlo de nuevo acá.
async function fleeFromPlayer(u, distToPlayer, from = state.player) {
    const occupied = new Set(allUnits().filter(x => x !== u && x.hp > 0).map(x => x.pos));
    const reach = bfsDistances(u.pos, occupied);
    let bestCell = -1, bestDist = distToPlayer[u.pos];
    for (let i = 0; i < SIZE * SIZE; i++) {
    if (i === u.pos) continue;
    if (!state.cells[i].active || occupied.has(i)) continue;
    const moveCost = reach[i];
    if (!isFinite(moveCost) || moveCost > u.move) continue;
    const fieldDist = distToPlayer[i];
    if (!isFinite(fieldDist)) continue;
    if (fieldDist > bestDist) { bestDist = fieldDist; bestCell = i; }
    }
    if (bestCell === -1) return false;
    const path = bfsPath(u.pos, bestCell, occupied);
    if (!path) return false;
    await walkPath(u, path);
    if (state.gameOver) return true;
    addLog(`${u.label} se aleja ${fromNameOf(from)}.`);
    renderLog();
    return true;
}

// Mueve a `u` lo más cerca posible de `targetPos` dentro de su
// movimiento disponible (mismo BFS que la aproximación normal hacia el
// jugador, pero generalizado a cualquier destino).
async function moveToward(u, targetPos) {
    if (u.move <= 0) return false;
    const occupied = new Set(allUnits().filter(x => x !== u && x.hp > 0).map(x => x.pos));
    const distToTarget = bfsDistances(targetPos, new Set());
    const reach = bfsDistances(u.pos, occupied);
    let bestCell = -1, bestMoveCost = Infinity, bestFieldDist = distToTarget[u.pos];
    for (let i = 0; i < SIZE * SIZE; i++) {
        if (i === u.pos) continue;
        if (!state.cells[i].active || occupied.has(i)) continue;
        const moveCost = reach[i];
        if (!isFinite(moveCost) || moveCost > u.move) continue;
        const fieldDist = distToTarget[i];
        if (!isFinite(fieldDist)) continue;
        if (fieldDist < bestFieldDist || (fieldDist === bestFieldDist && moveCost < bestMoveCost)) {
            bestFieldDist = fieldDist; bestMoveCost = moveCost; bestCell = i;
        }
    }
    if (bestCell === -1) return false;
    const path = bfsPath(u.pos, bestCell, occupied);
    if (!path) return false;
    await walkPath(u, path);
    return true;
}

function startPlayerTurn() {
    state.busy = false;
    if (state.gameOver) return;
    const u = state.player;
    u.move = Math.max(0, u.maxMove + effectiveResourceBonus(u, "move") + (u.moveBonusPending || 0) - (u.moveDrainPending || 0));
    u.ap = Math.max(0, u.maxAp + effectiveResourceBonus(u, "ap") + (u.apBonusPending || 0) - (u.apDrainPending || 0));
    u.apBonusPending = 0;
    u.apDrainPending = 0;
    u.moveDrainPending = 0;
    u.moveBonusPending = 0;
    u.tempStatBoosts = null;
    // Debuff porcentual: vale durante el turno que arranca y se borra al siguiente.
    if (u.percentDebuffs) {
        if (u.percentDebuffs.turnsLeft <= 0) u.percentDebuffs = null;
        else u.percentDebuffs.turnsLeft--;
    }
    u.defendActive = false;
    u.defendMagicResistant = false; 
    u.defendRetaliateMultiplier = 0;
    u.dodgeActive = false;
    u.abilities.forEach(key => {
        if (ABILITIES[key].cooldown && u.cooldowns[key] > 0) u.cooldowns[key]--;
    });
    state.turn = "player";
    addLog("Turno del jugador.", "turn");
    render();
}

// ---------- Render ----------
// Marca de los invocados del jugador. Va acá (y no en battle.css) para
// no depender de otra versión del CSS; se puede mover cuando quieras.
(function injectAllyStyle() {
    const style = document.createElement("style");
    style.textContent = `
        .cell.ally-unit .unit-token { box-shadow: 0 0 0 2px var(--teal, #2bb3a3); border-radius: 50%; }
        .cell.ally-unit .unit-nameplate { border-color: var(--teal, #2bb3a3); color: var(--teal, #2bb3a3); }
        .cell.ally-unit .unit-hp-fill { background: var(--teal, #2bb3a3); }
    `;
    document.head.appendChild(style);
})();
const boardEl = document.getElementById("board");
setupFx({ board: boardEl, hitDelay: HIT_DELAY, distance: manhattan });
const handEl = document.getElementById("hand");
const logEl = document.getElementById("log");
const overlayEl = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");

// El cartel de victoria/derrota se arma con 3 partes: título, un
// subtítulo opcional (oro/XP ganados, solo en victoria) y el botón.
// El subtítulo se inyecta acá en vez de tocar combate_tactico.php —
// se crea una sola vez y se inserta entre el título y el botón, que
// ya existen en el HTML.
const overlaySubtitle = document.createElement("div");
overlaySubtitle.className = "subtitle";
overlaySubtitle.id = "overlaySubtitle";
overlaySubtitle.style.margin = "0"; // el overlay ya pone gap entre hijos
overlayEl.insertBefore(overlaySubtitle, document.getElementById("restartBtn"));

// Preview de área al hacer hover: reusa resolveAoeCells, el MISMO
// cálculo que usa performAreaAttack para aplicar el daño real. Así el
// preview nunca puede mostrar algo distinto de lo que realmente pega.
// Genérico — cualquier habilidad futura con targetType "area" +
// aoeRadius lo obtiene gratis, sin tocar esta función.
function showAoePreview(impactPos, radius) {
    resolveAoeCells(impactPos, radius).forEach(pos => {
        const el = cellEl(pos);
        if (el) el.classList.add("aoe-preview");
    });
}

function clearAoePreview() {
    boardEl.querySelectorAll(".cell.aoe-preview").forEach(el => el.classList.remove("aoe-preview"));
}

function render() {
    renderBoard();
    renderSide();
    renderHand();
    renderLog();
    document.getElementById("endTurnBtn").disabled = (state.turn !== "player" || state.gameOver || state.busy);
}

function renderBoard() {
    boardEl.innerHTML = "";
    let reachableSet = new Set();
    let targetableSet = new Set();
    let areaPreviewRadius = null; // no-null si la selección actual es de área

    if (state.turn === "player" && !state.gameOver && !state.busy) {
        if (state.selection) {
            const ab = ABILITIES[state.selection.ability];
            if (ab.targetType === "area") areaPreviewRadius = ab.aoeRadius;
            for (let n = 0; n < SIZE * SIZE; n++) {
                if (state.cells[n].active && inAbilityRange(state.player, n, ab)) targetableSet.add(n);
            }
        } else {
            const blocked = new Set(allUnits().filter(x => x !== state.player && x.hp > 0).map(x => x.pos));
            const dist = bfsDistances(state.player.pos, blocked);
            for (let i = 0; i < SIZE * SIZE; i++) {
                if (state.cells[i].active && dist[i] > 0 && dist[i] <= state.player.move) reachableSet.add(i);
            }
        }
    }

    for (let i = 0; i < SIZE * SIZE; i++) {
        const cellData = state.cells[i];
        const div = document.createElement("div");
        div.className = "cell" + (cellData.active ? " active" : "") + ` tone-${cellData.tone || 0}`;

        // Decoración del bioma (árbol/arbusto en bloqueadas, pasto en libres)
        const deco = cellArtFor(cellData);
        if (!cellData.active && cellData.obstacle) div.classList.add("obstacle", `obstacle-${cellData.obstacle}`);

        const occupant = unitAt(i);
        div.innerHTML = deco;
        if (occupant) {
            const isPlayer = occupant === state.player;
            div.classList.add(isPlayer ? "player-unit" : "enemy-unit");
            // Invocado del jugador: se dibuja como criatura, con marca de aliado.
            if (!isPlayer && sideOf(occupant) === "player") div.classList.add("ally-unit");
            const acting = (isPlayer && state.turn === "player" && !state.gameOver)
                || (!isPlayer && state.actingUnit === occupant);
            const iconCls = "unit-icon" + (occupant.commandActive ? " command-buffed" : "");
            const hpPct = Math.max(0, occupant.hp) / occupant.maxHp * 100;
            div.innerHTML += (isPlayer ? "" : `<span class="unit-nameplate">${occupant.label} <span class="nameplate-hp">${Math.max(0, occupant.hp)}/${occupant.maxHp}</span></span>`)
                + `<div class="unit-token">${acting ? `<span class="turn-ring"></span>` : ""}<img class="${iconCls}" src="${occupant.icon}" alt="${isPlayer ? "Jugador" : occupant.label}"></div>`
                + `<div class="unit-hp"><div class="unit-hp-fill" style="width:${hpPct}%"></div></div>`
                + (occupant.defendActive ? `<span class="defend-badge">🛡</span>` : "")
                + (occupant.dodgeActive ? `<span class="dodge-badge">💨</span>` : "");
        }
        
        const ownTrap = state.traps.find(t => t.pos === i && t.ownerIsPlayer);
        if (ownTrap && !occupant) div.innerHTML += `<span class="trap-badge">▲</span>`;

        if (reachableSet.has(i)) div.classList.add("reachable");
        if (targetableSet.has(i)) div.classList.add("targetable");
        if (areaPreviewRadius !== null && targetableSet.has(i)) {
            div.addEventListener("mouseenter", () => showAoePreview(i, areaPreviewRadius));
            div.addEventListener("mouseleave", clearAoePreview);
        }

        div.addEventListener("click", () => {
            peekNameplate(i);
            handleCellClick(i);
        });
        boardEl.appendChild(div);
    }
}

function renderSide() {
    const p = state.player;
    document.getElementById("playerCard").classList.toggle("active-turn", state.turn === "player");
    document.getElementById("playerHpBar").style.width = (p.hp / p.maxHp * 100) + "%";
    document.getElementById("playerHpText").textContent = `${p.hp}/${p.maxHp}`;
    document.getElementById("playerMvBar").style.width = Math.min(100, p.move / p.maxMove * 100) + "%";
    document.getElementById("playerMvText").textContent = `${p.move}/${p.maxMove}`;
    document.getElementById("playerApBar").style.width = (p.ap / p.maxAp * 100) + "%";
    document.getElementById("playerApText").textContent = `${p.ap}/${p.maxAp}`;

    // La lista de enemigos de arriba se sacó del layout (el HP ahora va en
    // el nameplate de cada ficha). Si el contenedor no existe, no se dibuja.
    const container = document.getElementById("enemiesList");
    if (!container) return;
    container.innerHTML = "";
    state.enemies.forEach(e => {
        const dead = e.hp <= 0;
        const card = document.createElement("div");
        card.className = "unit-card enemy" + (dead ? " dead" : "");
        card.innerHTML = `
    <h3>${e.label}${dead ? " (caído)" : ""}</h3>
    <div class="bar-row"><span>HP</span><div class="bar-track"><div class="bar-fill hp-fill" style="width:${Math.max(0, e.hp) / e.maxHp * 100}%"></div></div><span>${Math.max(0, e.hp)}/${e.maxHp}</span></div>
    `;
        container.appendChild(card);
    });
}

// Línea corta de la carta: lo justo para decidir (daño/efecto, alcance
// si es mayor a 1, costo). El detalle completo va en el title del botón.
function cardMetaShort(u, key) {
    const ab = ABILITIES[key];
    const parts = [];
    const rangeText = ab.range > 1 ? `Alc. ${ab.range}` : null;
    if (ab.summon) {
        parts.push(`Invoca ${ENEMY_TYPES[ab.summon]?.label || ab.summon}`);
    } else if (ab.damageStats) {
        parts.push(`Daño ${computeAbilityDamage(u, key)}`);
        if (rangeText) parts.push(rangeText);
        if (ab.aoeRadius) parts.push(`Área ${ab.aoeRadius}`);
        if (ab.critChance) parts.push(`${Math.round(ab.critChance * 100)}% crít.`);
        if (ab.pullsToMelee) parts.push("Atrae");
        if (ab.debuffStats) parts.push("Maldice");
        if (ab.debuffPercent) parts.push("Ciega");
        if (ab.onHitMpDrain) parts.push(`-${ab.onHitMpDrain} PM`);
        if (ab.onHitApDrain) parts.push(`-${ab.onHitApDrain} PA`);
        if (ab.trapMoveLoss) parts.push(`-${ab.trapMoveLoss} PM`);
        if (ab.onHitSelfStatGain) parts.push(`+${ab.onHitSelfStatGain}`);
    } else if (ab.reductionStats) {
        parts.push(`Reduce ${computeAbilityReduction(u, key)}`);
        if (ab.nextTurnGrant?.move) parts.push(`+${ab.nextTurnGrant.move} PM`);
    } else if (ab.dodgeStats) {
        parts.push(`Esquiva ${computeDodgeChance(u, key)}%`);
    } else if (ab.buffType === "AP") {
        parts.push(`+${computeAbilityBuffAmount(u, key)} PA`);
        if (rangeText) parts.push(rangeText);
    } else if (ab.buffStats) {
        parts.push(`+${computeAbilityBuff(u, key)} daño`);
    } else if (ab.healStats) {
        parts.push(`Cura ${computeAbilityHeal(u, key)}`);
        if (rangeText) parts.push(rangeText);
    } else if (ab.selfStatBoost) {
        for (const [stat, pct] of Object.entries(ab.selfStatBoost)) {
            parts.push(`${stat} +${Math.round(pct * 100)}%`);
        }
    } else if (ab.apGrantAll) {
        parts.push(`+${ab.apGrantAll} PA a todos`);
    } else if (ab.alliesNextTurnGrant) {
        if (ab.alliesNextTurnGrant.move) parts.push(`+${ab.alliesNextTurnGrant.move} PM aliados`);
    } else if (ab.resourceGrant) {
        if (ab.resourceGrant.move) parts.push(`+${ab.resourceGrant.move} MOV`);
        if (ab.resourceGrant.ap) parts.push(`+${ab.resourceGrant.ap} PA`);
    } else if (ab.targetType === "empty") {
        parts.push(`Mueve ${ab.range}`);
    } else if (rangeText) {
        parts.push(rangeText);
    }
    parts.push(`${ab.apCost} PA`);
    return parts.join(" · ");
}

// Habilidades que el jugador desactivó en la página Habilidades: no se
// muestran en la mano (ver ability-prefs.js). Se leen una vez al cargar.
const hiddenAbilities = getHiddenAbilities(getSession()?.id);

function renderHand() {
    handEl.innerHTML = "";
    const u = state.player;
    visibleAbilities(u.abilities, hiddenAbilities).forEach(key => {
        const ab = ABILITIES[key];
        const btn = document.createElement("button");
        btn.className = "card-btn" + (state.selection && state.selection.ability === key ? " selected" : "");
        btn.dataset.key = key;
        const onCooldown = u.cooldowns[key] > 0;
        const noAp = u.ap < ab.apCost;
        const noRoom = !!ab.summon && summonCellFor(u) === -1;
        btn.disabled = (state.turn !== "player" || state.gameOver || state.busy || onCooldown || noAp || noRoom);


        // Si la habilidad hace daño, mostramos el número real calculado
        // con los stats actuales del jugador — no un texto fijo. Se
        // recalcula en cada render, así que si en algún momento los stats
        // cambian a mitad de partida, la carta lo refleja sola. Lo mismo
        // para Defender, pero con la reducción en vez del daño.
        let desc = ab.desc;
        if (ab.summon) {
            const cfg = ENEMY_TYPES[ab.summon];
            desc = `Invoca ${cfg?.label || ab.summon} (${cfg?.hp ?? "?"} de vida) en una casilla libre pegada a vos. Pelea solo de tu lado y juega en esta misma ronda · CD ${ab.cooldown}`;
        } else if (ab.damageStats) {
            const dmgPreview = computeAbilityDamage(u, key);
            const aoeText = ab.aoeRadius ? ` · Área radio ${ab.aoeRadius}` : "";
            const pullText = ab.pullsToMelee ? " · Atrae al objetivo" : "";
            const curseText = (ab.debuffStats ? " · Maldice: baja sus atributos en el daño hecho" : "")
                + (ab.debuffPercent ? ` · -${Math.round(ab.debuffPercent.percent * 100)}% ${ab.debuffPercent.stats.join(" y ")} en su próximo turno` : "");
            const mpText = (ab.onHitMpDrain ? ` · -${ab.onHitMpDrain} PM al golpeado` : "")
                + (ab.onHitApDrain ? ` · -${ab.onHitApDrain} PA al golpeado` : "");
            const critPct = ab.critChance ? Math.round(ab.critChance * 100) : 0;
            const critText = (critPct ? ` · ${critPct}% crítico (x${ab.critMultiplier || 1.5})` : "")
                + (ab.onHitSelfStatGain ? ` · Ganás ${ab.onHitSelfStatGain} igual al daño hecho, todo el combate` : "");
            desc = `Alcance ${ab.range} · Daño ${dmgPreview}${critText}${aoeText}${pullText}${curseText}${mpText}`;
        } else if (ab.reductionStats) {
            const reducPreview = computeAbilityReduction(u, key);
            const moveText = ab.nextTurnGrant?.move ? ` · +${ab.nextTurnGrant.move} PM tu próximo turno` : "";
            desc = `Reduce el daño recibido en ${reducPreview} hasta tu próximo turno${moveText} · CD ${ab.cooldown}`;
        } else if (ab.dodgeStats) {
            const dodgePreview = computeDodgeChance(u, key);
            desc = `${dodgePreview}% de esquivar todo el daño recibido hasta tu próximo turno`;
        } else if (ab.buffType === "AP") {
            desc = `Alcance ${ab.range} · Da +${computeAbilityBuffAmount(u, key)} PA (a ti: al instante; a un aliado: en su próximo turno)`;
        } else if (ab.buffStats) {
            const buffPreview = computeAbilityBuff(u, key);
            desc = `Aumenta tu daño y el de tus aliados en ${buffPreview} hasta tu próximo turno · CD ${ab.cooldown}`;
        } else if (ab.apGrantAll) {
            desc = `+${ab.apGrantAll} PA ya para vos y +${ab.apGrantAll} PA a tus aliados en su próximo turno · CD ${ab.cooldown}`;
        } else if (ab.healStats) {
            const healPreview = computeAbilityHeal(u, key);
            desc = `Alcance ${ab.range} · Cura ${healPreview}`;
        }

        // Carta compacta: nombre + una línea corta (cardMetaShort). El texto
        // largo queda como tooltip (title) para quien quiera el detalle.
        btn.title = `${ab.name}: ${desc} · Costo ${ab.apCost} PA`;
        const cdBadge = onCooldown ? `<span class="card-cd">CD ${u.cooldowns[key]}</span>` : "";
        btn.innerHTML = `<span class="card-name">${ab.name}</span><span class="card-meta">${cardMetaShort(u, key)}</span>${cdBadge}`;
        btn.addEventListener("click", () => selectCard(key));
        handEl.appendChild(btn);
    });
}

function renderLog() {
    logEl.innerHTML = state.log.map(l => `<div class="${l.cls}">${l.msg}</div>`).join("");
    logEl.scrollTop = logEl.scrollHeight;
}

let lastGameWon = null;

function showOverlay(playerWon, goldGained, xpGained, leveledUp, level) {
    overlayTitle.textContent = playerWon ? "Victoria" : "Derrota";
    overlayTitle.className = playerWon ? "win" : "lose";
    lastGameWon = playerWon;
    restartBtnEl.textContent = playerWon ? "Volver al laberinto" : "Volver a la ciudad";

    if (playerWon && goldGained !== undefined) {
        const levelText = leveledUp ? ` ¡Subiste a nivel ${level}!` : "";
        overlaySubtitle.textContent = `Ganaste ${goldGained} de oro${xpGained > 0 ? ` y ${xpGained} de XP` : ""}.${levelText}`;
        overlaySubtitle.style.display = "";
    } else {
        overlaySubtitle.textContent = "";
        overlaySubtitle.style.display = "none";
    }

    overlayEl.classList.add("show");
}

// ---------- Alma al ganar ----------
// Se inyecta solo (CSS + DOM) la primera vez que hace falta, mismo
// criterio que loading.js: nada que tocar en combate_tactico.php ni
// en battle.css para que esto funcione.
let soulPopupEl = null;

function ensureSoulPopup() {
    if (soulPopupEl) return soulPopupEl;

    const style = document.createElement("style");
    style.textContent = `
        #soul-popup {
            position: fixed;
            inset: 0;
            background: rgba(10, 11, 14, 0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        #soul-popup.show { display: flex; }
        #soul-popup .soul-card {
            background: var(--panel);
            border: 1px solid #2c313b;
            border-radius: 8px;
            padding: 24px 28px;
            max-width: 320px;
            text-align: center;
            font-family: var(--sans);
            color: var(--text);
        }
        #soul-popup .soul-icon {
            width: 64px;
            height: 64px;
            object-fit: contain;
            margin-bottom: 10px;
        }
        #soul-popup h3 {
            font-family: var(--mono);
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--amber);
            margin: 0 0 10px;
            font-size: 15px;
        }
        #soul-popup p {
            margin: 0 0 18px;
            font-size: 13px;
            color: var(--text-dim);
        }
        #soul-popup .soul-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        #soul-popup button {
            border: none;
            border-radius: 5px;
            padding: 8px 18px;
            font-family: var(--mono);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            cursor: pointer;
            font-weight: 700;
        }
        #soul-popup .soul-yes { background: var(--teal); color: #0c1a19; }
        #soul-popup .soul-no { background: transparent; color: var(--text-dim); border: 1px solid #2c313b; }
    `;
    document.head.appendChild(style);

    soulPopupEl = document.createElement("div");
    soulPopupEl.id = "soul-popup";
    soulPopupEl.innerHTML = `
        <div class="soul-card">
            <img class="soul-icon" id="soul-popup-icon" alt="">
            <h3>Alma capturada</h3>
            <p id="soul-popup-text"></p>
            <div class="soul-actions">
                <button type="button" class="soul-yes" id="soul-yes-btn">Conectar</button>
                <button type="button" class="soul-no" id="soul-no-btn">Descartar</button>
            </div>
        </div>
    `;
    document.body.appendChild(soulPopupEl);
    return soulPopupEl;
}

// Muestra el popup y devuelve una promesa que resuelve true/false
// según el botón que toque el jugador — así handleSoulDrop lo puede
// esperar con un simple await, como cualquier otra llamada async.
function askSoulConnect(cfg) {
    const el = ensureSoulPopup();
    document.getElementById("soul-popup-icon").src = cfg.icon || "";
    document.getElementById("soul-popup-icon").alt = cfg.label || "";
    document.getElementById("soul-popup-text").textContent =
        `Cayó un alma de ${cfg.label}. ¿Querés conectar con ella?`;
    el.classList.add("show");

    return new Promise(resolve => {
        const yesBtn = document.getElementById("soul-yes-btn");
        const noBtn = document.getElementById("soul-no-btn");
        const cleanup = (result) => {
            el.classList.remove("show");
            yesBtn.removeEventListener("click", onYes);
            noBtn.removeEventListener("click", onNo);
            resolve(result);
        };
        const onYes = () => cleanup(true);
        const onNo = () => cleanup(false);
        yesBtn.addEventListener("click", onYes);
        noBtn.addEventListener("click", onNo);
    });
}

// Reemplaza al click manual de "Volver al laberinto": se llama solo
// cuando cayó un alma (ver checkGameOver), y termina mandando al
// laberinto en los 3 casos posibles — "No", "Sí" con error (ya en el
// máximo de ranuras) o "Sí" con éxito. connect-soul no se valida acá
// dos veces: se llama y, pase lo que pase, se sigue de largo.
async function handleSoulDrop(soulType) {
    const cfg = ENEMY_TYPES[soulType] || { label: soulType };
    restartBtnEl.disabled = true; // por las dudas, mientras se resuelve esto no se puede clickear el botón de abajo

    const wantsConnect = await askSoulConnect(cfg);
    if (wantsConnect) {
        await connectSoul(soulType);
    }

    await advanceRoom();
    window.location.href = "laberinto.html";
}

document.getElementById("endTurnBtn").addEventListener("click", endPlayerTurn);
const restartBtnEl = document.getElementById("restartBtn");
restartBtnEl.addEventListener("click", async () => {
    if (lastGameWon) {
        // La victoria todavía no se guardó: el botón es "Reintentar" o
        // "Iniciar sesión" (ver saveVictory).
        if (victoryError === "session") {
            clearSession();
            window.location.href = "index.html";
            return;
        }
        if (!victorySaved) {
            await saveVictory();
            return;
        }
        await advanceRoom();
        window.location.href = "laberinto.html";
    } else {
        await resetProgress("defeat");
        window.location.href = "ciudad.html";
    }
});

newGame();
