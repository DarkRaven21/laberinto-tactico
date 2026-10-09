// ============================================================
// ability-text.js — lo que se MUESTRA de una habilidad: números y textos.
// Lo usan battle.js (carta y tooltip), habilidades.js, admin.js y el
// bestiario. No calcula el combate: battle.js sigue con sus compute*.
// Las fórmulas son las mismas; battle.js avisa en consola si alguna
// vez dan distinto (ver checkTextNumbers en battle.js).
//
// Cada página le pasa una función getStat(nombreDelStat) → número:
//   combate: stats efectivos del momento · Habilidades: los del personaje
//   bestiario: los de la criatura · admin: los cargados a mano.
//
// También arma el texto de las PASIVAS (passiveLines), a partir de sus
// campos en passives.js. Con getStat muestra los números (mismas cuentas
// que battle.js); sin getStat muestra la fórmula, para almas e ítems.
// ============================================================

const DODGE_CAP = 85;
const pct = x => Math.round(x * 100);

// Atributos que usa la habilidad para su efecto principal, sin repetir.
export function usedStats(ab) {
    const lists = [ab.damageStats, ab.reductionStats, ab.healStats, ab.shieldStats, ab.buffStats, ab.dodgeStats];
    const seen = new Set();
    const out = [];
    lists.forEach(list => (list || []).forEach(st => {
        if (!seen.has(st)) { seen.add(st); out.push(st); }
    }));
    return out;
}

// floor(suma / cantidad), igual que averageStats en battle.js.
function avgOf(list, getStat) {
    if (!list || list.length === 0) return 0;
    return Math.floor(list.reduce((acc, st) => acc + getStat(st), 0) / list.length);
}

// Números de la habilidad. Solo trae los campos que aplican.
// opts.extraDamage: bonus plano al daño (Comandar activo, en combate).
export function abilityNumbers(ab, getStat, opts = {}) {
    const n = {};
    if (ab.damageStats) {
        const base = Math.floor(avgOf(ab.damageStats, getStat) * (ab.damageMultiplier ?? 1));
        n.damage = Math.max(1, base + (opts.extraDamage || 0));
        if (ab.critChance) n.crit = Math.ceil(n.damage * (ab.critMultiplier ?? 1.5));
    }
    if (ab.reductionStats) {
        n.reduction = Math.max(ab.reductionMin || 0, Math.floor(avgOf(ab.reductionStats, getStat) * (ab.reductionMultiplier ?? 1)));
        if (ab.retaliateMultiplier) n.retaliate = Math.floor(n.reduction * ab.retaliateMultiplier);
    }
    if (ab.healStats) {
        n.heal = Math.floor(avgOf(ab.healStats, getStat) * (ab.healMultiplier ?? 1));
    }
    if (ab.shieldStats) {
        n.shield = Math.floor(avgOf(ab.shieldStats, getStat) * (ab.shieldMultiplier ?? 1));
    }
    if (ab.buffStats) {
        const avg = avgOf(ab.buffStats, getStat);
        n.buff = ab.buffType === "AP" ? Math.max(1, Math.floor(avg * (ab.buffMultiplier ?? 1))) : avg;
    }
    if (ab.dodgeStats) {
        const sum = ab.dodgeStats.reduce((acc, st) => acc + getStat(st), 0);
        n.dodge = Math.min(DODGE_CAP, Math.floor(25 + 30.83 * Math.log(1 + sum / 60)));
    }
    return n;
}

// Nombre de la criatura invocada: el que pase la página (combate y
// bestiario lo sacan de creature_types) o el summonLabel de abilities.js.
function summonLabelOf(ab, opts) {
    return opts.summonLabel ?? ab.summonLabel ?? ab.summon;
}

// Costo, CD y alcance (chips de Habilidades y del bestiario).
export function metaChips(ab) {
    return [
        `${ab.apCost} PA`,
        ab.cooldown ? `CD ${ab.cooldown}` : "Sin CD",
        ab.range > 0 ? `Alcance ${ab.range}` : (ab.summon ? "A tu lado" : "Sobre vos")
    ];
}

// Versión larga: una línea por efecto (Habilidades, bestiario).
// opts.summonHp: vida de la criatura invocada, si se conoce.
export function effectLines(ab, n, opts = {}) {
    const L = [];

    if (ab.summon) {
        const hp = opts.summonHp != null ? ` (${opts.summonHp} de vida)` : "";
        L.push(`Invoca ${summonLabelOf(ab, opts)}${hp} en una casilla libre pegada a vos`);
        L.push("Pelea de tu lado y juega en esta misma ronda");
    }

    if (ab.damageStats) {
        L.push(ab.targetType === "trap" ? `Trampa oculta: daño ${n.damage} al pisarla` : `Daño ${n.damage}`);
        if (n.crit != null) L.push(`${pct(ab.critChance)}% de crítico (${n.crit})`);
        if (ab.leapAttack) {
            L.push("Saltás a la casilla y dañás a los rivales pegados");
        } else if (ab.aoeRadius) {
            L.push(ab.selfCentered ? `Área ${ab.aoeRadius} alrededor tuyo` : `Área ${ab.aoeRadius}`);
            L.push(ab.opponentsOnly ? "Solo daña a rivales" : "Daña a todos los del área, también a tus aliados y a vos");
        }
        if (ab.straightLineOnly) L.push("Solo en línea recta, sin nadie en el medio");
        if (ab.closesToMelee) L.push("Te pone cuerpo a cuerpo con el objetivo");
        if (ab.pullsToMelee) L.push("Atrae al objetivo hasta tenerlo cuerpo a cuerpo");
        if (ab.debuffStats) L.push(`Maldice: baja ${ab.debuffStats.join(", ")} en el daño hecho, todo el combate`);
        if (ab.debuffPercent) L.push(`-${pct(ab.debuffPercent.percent)}% ${ab.debuffPercent.stats.join(" y ")} en su próximo turno`);
        if (ab.onHitApDrain) L.push(`-${ab.onHitApDrain} PA al golpeado en su próximo turno`);
        if (ab.onHitMpDrain) L.push(`-${ab.onHitMpDrain} PM al golpeado en su próximo turno`);
        if (ab.trapMoveLoss) L.push(`-${ab.trapMoveLoss} PM al pisarla, en el momento`);
        if (ab.onHitMoveGain) L.push(`+${ab.onHitMoveGain} PM si golpea`);
        if (ab.onHitLifesteal) L.push("Te cura lo que pega");
        if (ab.onHitSelfStatGain) L.push(`Ganás ${ab.onHitSelfStatGain} igual al daño hecho, todo el combate`);
    }

    if (ab.reductionStats) {
        L.push(`Reduce ${n.reduction} el daño recibido hasta tu próximo turno`);
        if (ab.magicResistant) L.push(`Contra daño que no sea normal reduce el doble (${n.reduction * 2})`);
        if (n.retaliate) L.push(`Devuelve ${n.retaliate} de daño a quien te pegue`);
        if (ab.nextTurnGrant?.move) L.push(`+${ab.nextTurnGrant.move} PM tu próximo turno`);
    }

    if (ab.healStats) L.push(`Cura ${n.heal} a un aliado o a vos`);

    if (ab.shieldStats) {
        L.push(`Escudo de ${n.shield} a un aliado o a vos`);
        L.push("Se gasta antes que la vida; no se suma, queda el más grande");
    }

    if (ab.buffStats) {
        if (ab.buffType === "AP") L.push(`+${n.buff} PA: a vos al instante, a un aliado en su próximo turno`);
        else L.push(`+${n.buff} de daño ${ab.buffsAllies ? "a vos y tus aliados" : "a vos"} hasta tu próximo turno`);
    }

    if (ab.dodgeStats) L.push(`${n.dodge}% de esquivar todo el daño hasta tu próximo turno`);

    if (ab.selfStatBoost) {
        for (const [st, p] of Object.entries(ab.selfStatBoost)) L.push(`${st} +${pct(p)}% durante este turno`);
    }
    if (ab.apGrantAll) L.push(`+${ab.apGrantAll} PA ya para vos y +${ab.apGrantAll} PA a tus aliados en su próximo turno`);
    if (ab.alliesNextTurnGrant?.move) L.push(`+${ab.alliesNextTurnGrant.move} PM a tus aliados en su próximo turno`);
    if (ab.resourceGrant?.move) L.push(`+${ab.resourceGrant.move} PM ya`);
    if (ab.resourceGrant?.ap) L.push(`+${ab.resourceGrant.ap} PA ya`);
    if (ab.targetType === "empty" && !ab.leapAttack) {
        L.push(`Te mueve a una casilla libre a ${ab.range} o menos de distancia`);
    }
    return L;
}

// Tooltip del combate: alcance + efectos + CD, en una sola línea.
export function tooltipLine(ab, n, opts = {}) {
    const parts = [];
    if (ab.range > 0) parts.push(`Alcance ${ab.range}`);
    parts.push(...effectLines(ab, n, opts));
    if (ab.cooldown) parts.push(`CD ${ab.cooldown}`);
    return parts.join(" · ");
}

// Línea corta de la carta del combate (igual que el viejo cardMetaShort).
export function shortLine(ab, n, opts = {}) {
    const parts = [];
    const rangeText = ab.range > 1 ? `Alc. ${ab.range}` : null;
    if (ab.summon) {
        parts.push(`Invoca ${summonLabelOf(ab, opts)}`);
    } else if (ab.damageStats) {
        parts.push(`Daño ${n.damage}`);
        if (rangeText) parts.push(rangeText);
        if (ab.aoeRadius) parts.push(`Área ${ab.aoeRadius}`);
        if (ab.critChance) parts.push(`${pct(ab.critChance)}% crít.`);
        if (ab.pullsToMelee) parts.push("Atrae");
        if (ab.debuffStats) parts.push("Maldice");
        if (ab.debuffPercent) parts.push("Ciega");
        if (ab.onHitMpDrain) parts.push(`-${ab.onHitMpDrain} PM`);
        if (ab.onHitApDrain) parts.push(`-${ab.onHitApDrain} PA`);
        if (ab.trapMoveLoss) parts.push(`-${ab.trapMoveLoss} PM`);
        if (ab.onHitSelfStatGain) parts.push(`+${ab.onHitSelfStatGain}`);
    } else if (ab.reductionStats) {
        parts.push(`Reduce ${n.reduction}`);
        if (ab.nextTurnGrant?.move) parts.push(`+${ab.nextTurnGrant.move} PM`);
    } else if (ab.dodgeStats) {
        parts.push(`Esquiva ${n.dodge}%`);
    } else if (ab.buffType === "AP") {
        parts.push(`+${n.buff} PA`);
        if (rangeText) parts.push(rangeText);
    } else if (ab.buffStats) {
        parts.push(`+${n.buff} daño`);
    } else if (ab.healStats) {
        parts.push(`Cura ${n.heal}`);
        if (rangeText) parts.push(rangeText);
    } else if (ab.selfStatBoost) {
        for (const [st, p] of Object.entries(ab.selfStatBoost)) parts.push(`${st} +${pct(p)}%`);
    } else if (ab.shieldStats) {
        parts.push(`Escudo ${n.shield}`);
        if (rangeText) parts.push(rangeText);
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

// Versión compacta para la tabla del admin: solo los números.
export function compactLine(ab, n) {
    const p = [];
    if (n.damage != null) p.push(n.crit != null ? `Daño ${n.damage} (crít. ${n.crit})` : `Daño ${n.damage}`);
    if (n.reduction != null) p.push(`Reduce ${n.reduction}`);
    if (n.heal != null) p.push(`Cura ${n.heal}`);
    if (n.shield != null) p.push(`Escudo ${n.shield}`);
    if (n.buff != null) p.push(ab.buffType === "AP" ? `+${n.buff} PA` : `+${n.buff} daño`);
    if (n.dodge != null) p.push(`Esquiva ${n.dodge}%`);
    return p.join(" · ");
}

// ============================================================
// PASIVAS
// ============================================================

// "A, B y C" (o "e" si la última empieza con sonido de i: "e Instinto").
function listEs(arr) {
    if (arr.length <= 1) return arr.join("");
    const last = arr[arr.length - 1];
    const conj = /^(i|hi)/i.test(last) && !/^hi[aeou]/i.test(last) ? "e" : "y";
    return `${arr.slice(0, -1).join(", ")} ${conj} ${last}`;
}

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

const DAMAGE_TYPE_TEXT = {
    normal: "",
    fuego: " de fuego",
    hielo: " de hielo",
    acido: " de ácido",
    veneno: " de veneno",
    magic: " mágico",
    oscuro: " oscuro",
    planta: " de planta",
    electric: " eléctrico",
    psychic: " psíquico"
};

// Una línea por efecto de la pasiva, a partir de sus campos en
// passives.js. Los campos que solo cambian la IA (aiStyleOverride) no
// se muestran.
// getStat (opcional): si viene, curas, daños y reducción salen con su
// número, con las mismas cuentas que battle.js (applyEndOfTurnRegen,
// applyEndOfTurnDamage, passiveReductionOf, applyLowHpHealIfAny,
// applyOnHitPassivesIfAny). Usa los stats base: en combate pueden
// variar si otra pasiva o un buff los sube. Sin getStat, la fórmula.
export function passiveLines(pas, getStat = null) {
    const L = [];
    if (!pas) return L;

    // max(1, floor(stat / divisor)), como en battle.js.
    const perStat = (stat, divisor) => getStat
        ? String(Math.max(1, Math.floor(getStat(stat) / divisor)))
        : `${stat} ÷ ${divisor} (mínimo 1)`;

    const when = pas.hpThreshold != null && pas.hpThreshold < 1
        ? `con ${pct(pas.hpThreshold)}% de vida o menos: `
        : "";

    if (pas.statBoosts) {
        const groups = {};
        for (const [st, p] of Object.entries(pas.statBoosts)) (groups[pct(p)] ||= []).push(st);
        const target = pas.targetHpThreshold != null
            ? ` contra un blanco con ${pct(pas.targetHpThreshold)}% de vida o menos`
            : "";
        for (const [x, stats] of Object.entries(groups)) {
            L.push(cap(`${when}${listEs(stats)} +${x}%${target}`));
        }
    }

    if (pas.resourceBoosts) {
        const parts = [];
        if (pas.resourceBoosts.move) parts.push(`+${pas.resourceBoosts.move} PM`);
        if (pas.resourceBoosts.ap) parts.push(`+${pas.resourceBoosts.ap} PA`);
        if (parts.length) L.push(cap(`${when}${parts.join(" y ")} por turno`));
    }

    // Multiplica por el PA (o PM, según resource) que le quedó sin usar.
    if (pas.endOfTurnRegen) {
        const r = pas.endOfTurnRegen;
        const res = r.resource === "move" ? "PM" : "PA";
        L.push(cap(`${when}al final de su turno se cura ${perStat(r.stat, r.divisor)} por cada ${res} que no usó`));
    }

    if (pas.endOfTurnDamage) {
        const d = pas.endOfTurnDamage;
        L.push(cap(`${when}al final de su turno recibe ${perStat(d.stat, d.divisor)} de daño`));
    }

    // max(1, floor(promedio / divisor)), tope opcional el nivel del jugador.
    if (pas.passiveReduction) {
        const r = pas.passiveReduction;
        const capTxt = r.capByPlayerLevel ? " (como máximo, el nivel del jugador)" : "";
        const amount = getStat
            ? `${Math.max(1, Math.floor(avgOf(r.stats, getStat) / r.divisor))}`
            : `promedio de ${listEs(r.stats)} ÷ ${r.divisor} (mínimo 1)`;
        L.push(cap(`${when}reduce ${amount} el daño recibido${capTxt}`));
    }

    if (pas.elusiveness) {
        L.push(cap(`${when}${pct(pas.elusiveness)}% de esquivar todo el daño de un golpe`));
    }

    if (pas.lowHpHeal) {
        const h = pas.lowHpHeal;
        L.push(`Si un golpe lo deja por debajo del ${pct(h.threshold)}% de vida sin matarlo, se cura ${perStat(h.stat, h.divisor)}`);
    }

    // max(1, floor(promedio × multiplicador)).
    if (pas.damageStats) {
        const type = DAMAGE_TYPE_TEXT[pas.damageType] ?? "";
        const melee = pas.meleeOnly ? " cuerpo a cuerpo" : "";
        const mult = pas.damageMultiplier ?? 1;
        const amount = getStat
            ? `${Math.max(1, Math.floor(avgOf(pas.damageStats, getStat) * mult))} de daño${type}`
            : `daño${type} según ${listEs(pas.damageStats)} (x${mult})`;
        L.push(cap(`${when}cuando recibe un golpe${melee}, devuelve ${amount}`));
    }

    return L;
}
