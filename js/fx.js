// ---------- fx.js — efectos visuales del combate ----------
// Todo lo que se ve cuando pasa algo en el tablero: números flotantes,
// proyectiles, impactos por tipo, auras, esquivas y temblor. Es
// decorativo: nada acá toca stats, HP ni el orden del combate.
//
// battle.js tiene que llamar a setupFx() una vez, cuando ya existe el
// tablero, pasándole:
//   board    → el elemento #board (sus hijos son las casillas, en orden)
//   hitDelay → cuánto dura el glow + número flotante (HIT_DELAY)
//   distance → función (posA, posB) => distancia en casillas (manhattan)
//
// Lo que se usa desde afuera: animateHit, animateHeal,
// animateAttackImpact, animateAreaImpact y fxAura.

const cfg = {
    board: null,
    hitDelay: 400,
    distance: () => 0
};

export function setupFx({ board, hitDelay, distance }) {
    if (board) cfg.board = board;
    if (hitDelay != null) cfg.hitDelay = hitDelay;
    if (distance) cfg.distance = distance;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function cellEl(pos) { return cfg.board?.children[pos] || null; }

// Motor genérico: glow en la celda + número flotante que se desvanece.
// animateHit (daño) y animateHeal (curación) son la misma mecánica con
// distinta clase CSS y signo — cualquier tercer caso futuro (ej. escudo
// ganado) la reusa sin duplicar timers.
async function animateFloatingNumber(pos, text, cellCls, floatCls) {
    const el = cellEl(pos);
    if (!el) return;
    if (cellCls) el.classList.add(cellCls);
    const numEl = document.createElement("div");
    numEl.className = floatCls;
    numEl.textContent = text;
    el.appendChild(numEl);
    await sleep(cfg.hitDelay);
    if (cellCls) el.classList.remove(cellCls);
    numEl.remove();
}

export async function animateHit(pos, dmg) {
    await animateFloatingNumber(pos, `-${dmg}`, "cell-hit", "dmg-float");
}

export async function animateHeal(pos, heal) {
    fxHeal(pos);
    await animateFloatingNumber(pos, `+${heal}`, "cell-heal", "heal-float");
}

// ---------- Efectos visuales de habilidades ----------
// Cada habilidad puede definir su efecto con un campo opcional `fx`:
//
//   fx: { effect: "poison", projectile: "dart", arc: false }
//
//   effect     → look del impacto y color: slash, fire, ice, acid,
//                poison, arcane, shadow, plant, electric. Si falta, sale del damageType.
//   projectile → qué viaja cuando el ataque es a distancia:
//                "arrow" (flecha fina), "dart" (dardo con estela),
//                "orb" (bola) o "none" (sin proyectil, impacto directo).
//                Si falta, usa el default del effect.
//   arc        → true = viaja en arco, false = recto. Si falta: las
//                bolas van en arco y lo demás recto.
//
// Sin `fx`, todo sale de los defaults de abajo, así que una habilidad
// nueva ya trae su animación. Todo es decorativo: nada acá toca stats,
// HP ni el orden del combate. Colores y formas: sección "Efectos" de
// battle.css (un effect nuevo = sus variables --fx-* ahí).
const FX_BY_DAMAGE_TYPE = {
    normal: "slash",
    fuego: "fire",
    hielo: "ice",
    acido: "acid",
    veneno: "poison",
    magic: "arcane",
    oscuro: "shadow",
    planta: "plant",
    electric: "electric"
};
const FX_DEFAULT_PROJECTILE = {
    slash: "arrow",
    acid: "orb",
    electric: "none" // el rayo cae del cielo sobre el blanco, no viaja
    // el resto: "dart"
};
const FX_PROJECTILE_MS = 320;
const FX_CLEANUP_MS = 1000;

function fxConfigFor(ab) {
    const custom = ab.fx || {};
    const effect = custom.effect || FX_BY_DAMAGE_TYPE[ab.damageType] || "slash";
    const projectile = custom.projectile || FX_DEFAULT_PROJECTILE[effect] || "dart";
    const arc = custom.arc ?? (projectile === "orb");
    return { effect, projectile, arc };
}

function fxEl(parent, cls, vars) {
    const el = document.createElement("div");
    el.className = cls;
    if (vars) Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    parent.appendChild(el);
    return el;
}

// Contenedor de efecto dentro de una casilla; se borra solo.
function fxCellLayer(pos) {
    const cell = cellEl(pos);
    if (!cell) return null;
    const layer = fxEl(cell, "fx-layer");
    setTimeout(() => layer.remove(), FX_CLEANUP_MS);
    return layer;
}

// Centro de una casilla en coordenadas del .board-wrap (para lo que
// viaja entre casillas, como los proyectiles).
function fxCellCenter(pos) {
    const cell = cellEl(pos);
    const wrap = cfg.board?.parentElement;
    if (!cell || !wrap) return null;
    const c = cell.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    return { x: c.left - w.left + c.width / 2, y: c.top - w.top + c.height / 2 };
}

function fxBurst(parent, cls, count, minDist, maxDist, riseBias = 0) {
    for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = minDist + Math.random() * (maxDist - minDist);
        fxEl(parent, cls, {
            "--dx": `${Math.round(Math.cos(ang) * dist)}px`,
            "--dy": `${Math.round(Math.sin(ang) * dist - riseBias)}px`
        });
    }
}

async function fxProjectile(fromPos, toPos, fx) {
    if (fx.projectile === "none") return;
    const a = fxCellCenter(fromPos), b = fxCellCenter(toPos);
    if (!a || !b) return;
    const wrap = cfg.board?.parentElement;
    const el = fxEl(wrap, `fx-bolt fx-${fx.effect} fx-shape-${fx.projectile}`);
    el.style.left = `${a.x}px`;
    el.style.top = `${a.y}px`;
    const dx = b.x - a.x, dy = b.y - a.y;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const arc = fx.arc ? -Math.min(50, Math.hypot(dx, dy) * 0.25) : 0;
    const anim = el.animate([
        { transform: `translate(-50%, -50%) translate(0px, 0px) rotate(${ang}deg) scale(0.6)` },
        { transform: `translate(-50%, -50%) translate(${dx / 2}px, ${dy / 2 + arc}px) rotate(${ang}deg) scale(1)` },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${ang}deg) scale(0.9)` }
    ], { duration: FX_PROJECTILE_MS, easing: "ease-in" });
    await anim.finished.catch(() => {});
    el.remove();
}

// Impacto sobre una casilla según el tipo.
function fxImpact(pos, kind) {
    const layer = fxCellLayer(pos);
    if (!layer) return;
    layer.classList.add(`fx-${kind}`); // los hijos heredan los colores --fx-* del efecto
    if (kind === "slash") {
        fxEl(layer, "fx-streak", { "--r": "-35deg" });
        fxEl(layer, "fx-streak fx-streak-2", { "--r": "35deg" });
        fxEl(layer, "fx-ring");
    } else if (kind === "fire") {
        fxEl(layer, "fx-blast fx-fire");
        fxBurst(fxEl(layer, "fx-origin"), "fx-spark fx-fire", 8, 30, 55, 18);
    } else if (kind === "ice") {
        const origin = fxEl(layer, "fx-origin");
        for (let i = 0; i < 6; i++) fxEl(origin, "fx-shard", { "--a": `${i * 60}deg`, "animation-delay": `${i * 0.03}s` });
        fxEl(layer, "fx-frost");
    } else if (kind === "acid" || kind === "poison") {
        fxEl(layer, "fx-puddle");
        fxBurst(fxEl(layer, "fx-origin"), "fx-drop", 8, 25, 50, -10);
    } else if (kind === "arcane") {
        fxEl(layer, "fx-arcane-ring");
        fxBurst(fxEl(layer, "fx-origin"), "fx-spark fx-arcane", 8, 25, 50, 10);
    } else if (kind === "shadow") {
        // Mismo dibujo que arcano, con los colores oscuros (ver battle.css).
        fxEl(layer, "fx-arcane-ring");
        fxBurst(fxEl(layer, "fx-origin"), "fx-spark fx-shadow", 8, 25, 50, -6);
    } else if (kind === "electric") {
        // Rayo: cae desde arriba sobre la casilla, destello azul y chispas.
        fxEl(layer, "fx-flash");
        fxEl(layer, "fx-lightning");
        fxBurst(fxEl(layer, "fx-origin"), "fx-spark fx-electric", 9, 22, 48, 4);
    } else if (kind === "plant") {
        // Latigazo: dos trazos verdes y hojas que saltan.
        fxEl(layer, "fx-streak", { "--r": "-20deg" });
        fxEl(layer, "fx-streak fx-streak-2", { "--r": "25deg" });
        fxBurst(fxEl(layer, "fx-origin"), "fx-drop", 7, 25, 48, 6);
    }
}

function fxHurt(pos) {
    const token = cellEl(pos)?.querySelector(".unit-token");
    if (!token) return;
    token.classList.remove("fx-hurt");
    void token.offsetWidth; // reinicia la animación si ya la tenía
    token.classList.add("fx-hurt");
    setTimeout(() => token.classList.remove("fx-hurt"), 600);
}

async function fxDodge(pos) {
    const token = cellEl(pos)?.querySelector(".unit-token");
    if (token) {
        token.classList.add("fx-dodge");
        setTimeout(() => token.classList.remove("fx-dodge"), 750);
    }
    await animateFloatingNumber(pos, "Esquiva", "", "dodge-float");
}

function fxHeal(pos) {
    const layer = fxCellLayer(pos);
    if (!layer) return;
    fxEl(layer, "fx-heal-glow");
    const origin = fxEl(layer, "fx-origin");
    [-22, -8, 6, 18, -14].forEach((dx, i) => fxEl(origin, "fx-plus", { "--dx": `${dx}px`, "animation-delay": `${i * 0.08}s` }));
}

export function fxAura(pos, variant) {
    const layer = fxCellLayer(pos);
    if (layer) fxEl(layer, `fx-aura fx-aura-${variant}`);
}

function fxQuake() {
    const wrap = cfg.board?.parentElement;
    if (!wrap) return;
    wrap.classList.remove("fx-quake");
    void wrap.offsetWidth;
    wrap.classList.add("fx-quake");
    setTimeout(() => wrap.classList.remove("fx-quake"), 500);
}

// Ataque a un blanco: proyectil si es a distancia, y después impacto,
// sacudida y número a la vez. Si lo esquivó, la ficha se corre y dice "Esquiva".
export async function animateAttackImpact(attacker, target, ab, dmg, dodged) {
    const fx = fxConfigFor(ab);
    if (cfg.distance(attacker.pos, target.pos) > 1) await fxProjectile(attacker.pos, target.pos, fx);
    if (dodged) {
        await fxDodge(target.pos);
        return;
    }
    fxImpact(target.pos, fx.effect);
    if (dmg > 0) fxHurt(target.pos);
    await animateHit(target.pos, dmg);
}

// Área: proyectil hasta el centro, explosión en todas las casillas
// afectadas (haya o no alguien) y el tablero tiembla.
export async function animateAreaImpact(attacker, impactPos, cells, ab, hits) {
    const fx = fxConfigFor(ab);
    const kind = fx.effect;
    if (cfg.distance(attacker.pos, impactPos) > 0) await fxProjectile(attacker.pos, impactPos, fx);
    cells.forEach(pos => {
        const layer = fxCellLayer(pos);
        if (layer) fxEl(layer, `fx-blast fx-${kind}`, { "animation-delay": pos === impactPos ? "0s" : "0.08s" });
    });
    const center = fxCellLayer(impactPos);
    if (center) fxBurst(fxEl(center, "fx-origin"), `fx-spark fx-${kind}`, 10, 45, 90, 20);
    fxQuake();
    hits.forEach(h => { if (!h.dodged && h.dmg > 0) fxHurt(h.pos); });
    await Promise.all(hits.map(h => h.dodged ? fxDodge(h.pos) : animateHit(h.pos, h.dmg)));
}
