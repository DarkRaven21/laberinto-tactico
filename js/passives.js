// ============================================================
// passives.js — catálogo de PASIVAS (criaturas, almas e ítems).
// Se movió acá desde battle.js para que otras páginas (armería,
// alquimista, admin) puedan mostrar el nombre en español sin
// cargar el combate. battle.js lo importa; para sumar o cambiar
// una pasiva se toca solo este archivo.
// ============================================================

export const PASSIVES = {
    furiaSangre: {
        name: "Furia de Sangre",
        hpThreshold: 0.5, // se activa con hp/maxHp <= 0.5
        statBoosts: { "Agresividad": 0.25, "Fuerza": 0.25, "Instinto": 0.25 }
    },
    injured: {
        name: "Herido",
        hpThreshold: 0.5,
        resourceBoosts: { move: 1 },
        aiStyleOverride: "escurridizo"   // mientras esté activa, la IA se comporta como escurridiza
    },
    lastStand: {
        name: "Última Resistencia",
        hpThreshold: 0.5,
        resourceBoosts: { ap: 1 }
    },
    frostRegen: {
        name: "Regeneración Gélida",
        hpThreshold: 0.5,
        endOfTurnRegen: { stat: "Regeneración", divisor: 20 },
        aiStyleOverride: "elusive"
    },
    thickSkin: {
        name: "Piel Gruesa",
        hpThreshold: 0.5,
        // capByPlayerLevel: la reducción nunca supera el nivel del jugador.
        passiveReduction: { stats: ["Resistencia", "Sensibilidad al dolor", "Entereza", "Voluntad"], divisor: 4, capByPlayerLevel: true }
    },
    inPain: {
        name: "En Agonía",
        hpThreshold: 1,
        endOfTurnDamage: { stat: "Regeneración", divisor: 10 }
        //Esto en realidad tiene que hacerle daño a la criatura al final de su turno por valor igual a regeneracion / 10 (minimo 1), redondea hacia abajo
    },
    bloodthirst: {
        name: "Sed de Sangre",
        // A diferencia de hpThreshold (vida de la PROPIA unidad, se guarda en
        // passivesActive), targetHpThreshold mira la vida del BLANCO y se
        // evalúa en el momento de calcular el daño: los statBoosts solo
        // cuentan contra un objetivo con hp/maxHp <= 0.5. Ver effectiveStat.
        targetHpThreshold: 0.5,
        statBoosts: { "Atletismo": 0.3, "Percepción": 0.3, "Instinto": 0.3 }
    },
    incorporeal: {
        name: "Incorpóreo",
        hpThreshold: 1, // siempre activa
        // Esquiva pasiva: probabilidad (0-1) de esquivar TODO el daño de
        // un golpe, sin gastar PA. Genérico: cualquier pasiva que declare
        // elusiveness la suma (ver passiveDodgeChanceOf / applyDamage).
        elusiveness: 0.05
    },
    // Sand Statue. Al recibir daño real y quedar viva por debajo del 30%,
    // se cura en ese mismo golpe max(1, floor(Regeneración / 5)). Si el
    // golpe la mata, no se cura. Ver applyLowHpHealIfAny.
    // Swarm. +1 PM siempre (hpThreshold 1 = siempre activa). Como toda
    // pasiva, pasa al jugador con el alma.
    flutter: {
        name: "Revoloteo",
        hpThreshold: 1,
        resourceBoosts: { move: 1 }
    },
    // Cave Trol. Por debajo del 75% de vida, al final de su turno se cura
    // max(1, floor(Regeneración / 4)) por cada PM que le quedó sin usar.
    // Como toda pasiva, pasa al jugador con el alma.
    trollRegen: {
        name: "Regeneración de Trol",
        hpThreshold: 0.75,
        endOfTurnRegen: { stat: "Regeneración", divisor: 4, resource: "move" }
    },
    hardToKill: {
        name: "Duro de Matar",
        lowHpHeal: { threshold: 0.3, stat: "Regeneración", divisor: 5 }
    },
    corrosiveBlood: {
        name: "Sangre Corrosiva",
        hpThreshold: 1, // siempre activa
        // Daño de vuelta al atacante cada vez que esta unidad recibe un
        // golpe que le hace daño real (no esquivado, dmg > 0).
        // Genérico: cualquier pasiva que declare damageStats funciona así
        // (ver applyOnHitPassivesIfAny). Daño = floor(promedio × mult), mínimo 1.
        damageMultiplier: 0.4,
        damageStats: ["Fortaleza", "Regeneración", "Resistencia", "Resistencia Mágica", "Entereza"],
        damageType: "acido",
        meleeOnly: true, // solo si el atacante está pegado (distancia 1) al recibir el golpe
    },
    // Flying Countess (familia infernal). damageTypeResist: multiplica el
    // daño bruto de ese tipo ANTES de reducciones y escudo, redondeando
    // para abajo. Genérico: sirve para cualquier tipo de daño (ver
    // damageTypeMultiplierOf / applyDamage en battle.js).
    fireResist: {
        name: "Resistencia al Fuego",
        hpThreshold: 1, // siempre activa
        damageTypeResist: { fuego: 0.5 },
    },
    // Reborn (familia undead). Con 50% de vida o menos, recibe el 85% del
    // daño bruto, antes de reducciones y escudo, redondeando para abajo.
    // damageTakenMultiplier es genérico: vale para todo tipo de daño.
    hardened: {
        name: "Dureza",
        hpThreshold: 0.5,
        damageTakenMultiplier: 0.85,
    },

};
