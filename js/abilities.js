// ============================================================
// abilities.js — definición de todas las habilidades.
// Lo importan battle.js (combate) y admin.js (tabla de stats).
// Para sumar o cambiar una habilidad, se toca solo este archivo.
// ============================================================

// Escala de multiplicadores para habilidades de 2 PA (sesión 05/10):
//   cuerpo a cuerpo 2.2 · cuerpo a cuerpo con efecto 2.0
//   distancia 2.1 · distancia con efecto 1.9
//   zona 1.75 · zona con efecto 1.6
// Tiro Lejano (3 PA): 1.9.
export const ABILITIES = {
    golpe: {
        name: "Golpe", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Agresividad", "Instinto", "Arma Melee"],
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    smash: {
        name: "Aplastar", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Fortaleza", "Fuerza", "Terquedad", "Espiritu", "Arma Melee"],
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    drainLife: {
        name: "Drenar Vida", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Regeneración", "Perspicacia", "Agresividad", "Impulsividad", "Determinación"],
        damageType: "normal",
        damageMultiplier: 1.1,
        onHitLifesteal: true, // cura a quien la usa por el mismo valor del daño que hizo (ver performAttack)
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    combo: {
        name: "Combo", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Acrobacias", "Percepción", "Instinto", "Arma Melee"],
        damageType: "normal",
        damageMultiplier: 0.9,
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    // Ataque propio de Dos Armas (items.abilities de dos_armas). Único
    // uso de Velocidad. critChance/critMultiplier son genéricos: los
    // resuelve performAttack para cualquier habilidad que los declare.
    doubleStrike: {
        name: "Doble Golpe", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Velocidad", "Acrobacias", "Arma Melee", "Iniciativa", "Fuerza"],
        damageType: "normal",
        critChance: 0.05,
        critMultiplier: 1.5,
        desc: "Alcance 1 · 5% de crítico (daño x1.5)"
    },
    sneak: {
        name: "Golpe Furtivo", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Acrobacias", "Reflejos", "Ingenio", "Iniciativa", "Arma Melee"],
        onHitMoveGain: 1,
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto · Si golpea, +1 de movimiento"
    },
    poisonDagger: {
        name: "Daga Venenosa", range: 1, apCost: 2, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Acrobacias", "Movilidad", "Ingenio", "Conocimiento", "Arma Melee"],
        onHitMoveGain: 1,
        damageMultiplier: 2.0,
        critChance: 0.15,
        critMultiplier: 1.5,
        damageType: "veneno",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto · Si golpea, +1 de movimiento"
    },
    trap: {
        name: "Trampa", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "trap",
        damageStats: ["Ingenio", "Inteligencia", "Paciencia", "Suerte"],
        damageType: "normal",
        desc: "Alcance 1 · Coloca una trampa oculta en una casilla vacía · Daño al activarse según Fuerza/Agresividad/Atletismo/Instinto"
    },
    salto: {
        name: "Salto", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "empty",
        desc: "Alcance 1 · Te mueve a la casilla"
    },
    defender: {
        name: "Defender", range: 0, apCost: 1, cooldown: 2, needsTarget: false,
        reductionStats: ["Resistencia", "Entereza", "Voluntad", "Sensibilidad al dolor", "Armadura"],
        desc: "Reduce el daño recibido hasta tu próximo turno · CD 2"
    },
    evasion: {
        name: "Evasión", range: 0, apCost: 1, cooldown: 1, needsTarget: false,
        dodgeStats: ["Reflejos", "Percepción", "Movilidad", "Instinto"],
        desc: "% de esquivar todo el daño recibido hasta tu próximo turno"
    },
    dash: {
        name: "Impulso", range: 0, apCost: 1, cooldown: 2, needsTarget: false,
        resourceGrant: { move: 2 },
        desc: "Ganás 2 de movimiento a cambio de 1 PA · CD 2"
    },
    disparo: {
        name: "Disparo", range: 2, apCost: 2, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Reflejos", "Percepción", "Paciencia", "Arma Distancia"],
        damageType: "normal",
        damageMultiplier: 2.1,
        desc: "Alcance 2 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    fireburst: {
        name: "Estallido de Fuego", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        damageStats: ["Inteligencia", "Sabiduría", "Autocontrol", "Determinación", "Foco Magico"],
        damageMultiplier: 1.75,
        damageType: "fuego",
        fx: { projectile: "orb", arc: true },
        desc: "Alcance 2 · Explota en cruz (radio 1) · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    firebolt: {
        name: "Saeta de Fuego", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Agresividad", "Agudeza mental", "Percepción", "Foco Magico"],
        damageMultiplier: 2.1,
        damageType: "fuego",
        desc: "Alcance 2 · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    firemagic: {
        name: "Magia de Fuego", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Agresividad", "Agudeza mental", "Percepción", "Foco Magico"],
        damageMultiplier: 0.45,
        damageType: "fuego",
        desc: "Alcance 2 · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    icemagic: {
        name: "Magia de Hielo", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Autocontrol", "Concentración", "Percepción", "Foco Magico"],
        damageMultiplier: 0.45,
        damageType: "hielo",
        desc: "Alcance 2 · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    abrumar: {
        name: "Abrumar", range: 1, apCost: 1, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Voluntad", "Atletismo", "Impulsividad", "Arma Melee"],
        onHitApDrain: 1,
        damageMultiplier: 1.35,
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    slow: {
        name: "Ralentizar", range: 4, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Reflejos", "Conocimiento", "Ingenio", "Afinidad mágica", "Arma Distancia"],
        onHitApDrain: 1,
        damageMultiplier: 0.4,
        damageType: "veneno",
        desc: "Alcance 4 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    poisonDart: {
        name: "Dardo Venenoso", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Capacidad pulmonar", "Concentración", "Percepción", "Agresividad", "Impetu"],
        damageType: "veneno",
        desc: "Alcance 2 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    poisonSpear: {
        name: "Lanza Venenosa", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Reflejos", "Fuerza", "Conocimiento", "Disciplina", "Instinto", "Arma Melee"],
        damageType: "veneno",
        fx: { projectile: "arrow" },
        desc: "Alcance 2 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    fireBreath: {
        name: "Aliento de Fuego", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Capacidad pulmonar", "Espiritu", "Confianza", "Impulsividad", "Impetu"],
        damageType: "fuego",
        damageMultiplier: 1.15,
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    shieldBash: {
        name: "Golpe de Escudo", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Resistencia", "Voluntad", "Mentalidad táctica", "Terquedad"],
        onHitMpDrain: 1,
        damageMultiplier: 0.8,
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    tripManeuver: {
        name: "Zancadilla", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Disciplina", "Iniciativa", "Arma Melee"],
        onHitMpDrain: 1,
        damageMultiplier: 1.2,
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    smallHeal: {
        name: "Curación Menor", range: 3, apCost: 2, cooldown: 1, needsTarget: true, targetType: "ally",
        healStats: ["Sabiduría", "Conocimiento", "Espiritu", "Confianza", "Foco Magico"],
        desc: "Alcance 3 · Cura a un aliado según Sabiduría/Conocimiento/Espíritu/Confianza/Foco Mágico"
    },
    longShot: {
        name: "Tiro Lejano", range: 5, apCost: 3, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Mentalidad táctica", "Percepción", "Paciencia", "Arma Distancia"],
        damageType: "normal",
        damageMultiplier: 1.9,
        desc: "Alcance 5 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    slash: {
        name: "Tajo", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Reflejos", "Percepción", "Arma Melee"],
        damageType: "normal",
        desc: "Alcance 1 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    thrust: {
        name: "Estocada", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Determinación", "Disciplina", "Instinto", "Arma Melee"],
        damageType: "normal",
        fx: { projectile: "none" },
        desc: "Alcance 2 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    charge: {
        name: "Carga", range: 2, apCost: 1, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Agresividad", "Impulsividad", "Iniciativa"],
        damageMultiplier: 0.6,
        closesToMelee: true,
        straightLineOnly: true,
        damageType: "normal",
        fx: { projectile: "none" },
        desc: "Alcance 2 en línea recta · Te pone en melee con el objetivo · Daño bajo según Atletismo/Fuerza/Agresividad/Impulsividad/Iniciativa"
    },
    slam: {
        name: "Golpe Brutal", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Impetu", "Arma Melee"],
        damageMultiplier: 1.15,
        damageType: "normal",
        desc: "Alcance 1 · Daño según Fuerza/Agresividad/Atletismo/Instinto"
    },
    iceShield: {
        name: "Escudo de Hielo", range: 0, apCost: 1, cooldown: 3, needsTarget: false,
        reductionStats: ["Resistencia", "Resistencia Mágica", "Terquedad", "Determinación", "Afinidad mágica", "Foco Magico"],
        magicResistant: true,
        retaliateMultiplier: 0.5,
        desc: "Reduce el daño recibido hasta tu próximo turno (x2 contra daño que no sea normal) · CD 3"
    },
    // Defender del mago: misma mecánica (reducción plana contra todo),
    // pero con stats mentales/mágicos, reduce x0.75 y da +1 PM al
    // arrancar tu próximo turno para poder alejarte. Lo otorga el item
    // foco_magico_defensivo (items.abilities).
    magicShield: {
        name: "Escudo Mágico", range: 0, apCost: 1, cooldown: 2, needsTarget: false,
        reductionStats: ["Prudencia", "Resistencia Mágica", "Espiritu", "Fortaleza", "Foco Magico"],
        reductionMultiplier: 0.75,
        reductionMin: 1,
        nextTurnGrant: { move: 1 },
        desc: "Reduce el daño recibido hasta tu próximo turno y da +1 PM en tu próximo turno · CD 2"
    },
    // ---------- Armas de nivel 3 ----------
    // Bastón de Hielo. Usa onHitApDrain (genérico): si el golpe hace
    // daño real, el blanco pierde 1 PA al arrancar su próximo turno.
    freezeCold: {
        name: "Congelar", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Autocontrol", "Concentración", "Creatividad", "Foco Magico"],
        damageMultiplier: 1.9,
        damageType: "hielo",
        onHitApDrain: 1,
        fx: { projectile: "none" },
        desc: "Alcance 2 · Si golpea, el blanco pierde 1 PA en su próximo turno · CD 2"
    },
    // Bastón Arcano. Autobuff: multiplica stats propios solo durante el
    // turno en que se lanza (selfStatBoost → tempStatBoosts, lo lee
    // effectiveStat y se borra al terminar el turno de quien lo lanzó).
    // Foco Magico x2: sube hechizos y también Magic Shield / Ice Shield.
    arcaneFocus: {
        name: "Foco Arcano", range: 0, apCost: 1, cooldown: 2, needsTarget: false,
        selfStatBoost: { "Foco Magico": 1.0 },
        desc: "Duplica tu Foco Magico durante este turno · CD 2"
    },
    // Arco Mágico. Híbrido arco + magia.
    arcaneShot: {
        name: "Disparo Arcano", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Arma Distancia", "Foco Magico", "Percepción", "Afinidad mágica", "Perspicacia"],
        damageMultiplier: 1.1,
        damageType: "magic",
        fx: { projectile: "arrow" },
        desc: "Alcance 3 · Flecha mágica · CD 1"
    },
    // Espada Rúnica. Híbrido melee + magia.
    boomingBlade: {
        name: "Hoja Atronadora", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Arma Melee", "Foco Magico", "Fuerza", "Afinidad mágica", "Resiliencia"],
        damageMultiplier: 1.1,
        damageType: "magic",
        desc: "Alcance 1 · Golpe mágico · CD 1"
    },
    // ---------- Familia desert (nivel 3) ----------
    poisonSting: {
        name: "Aguijón Venenoso", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Agresividad", "Instinto", "Movilidad", "Resistencia Mágica", "Arma Melee"],
        damageMultiplier: 1.2,
        damageType: "veneno",
        desc: "Alcance 1 · Aguijón venenoso · CD 1"
    },
    // Trampa como Trap, pero al pisarla además saca PM en ese mismo
    // momento (trapMoveLoss): si quien la pisa se queda sin movimiento,
    // la caminata se corta ahí (ver walkPath).
    sandTrap: {
        name: "Trampa de Arena", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "trap",
        damageStats: ["Ingenio", "Inteligencia", "Paciencia", "Suerte"],
        damageType: "normal",
        trapMoveLoss: 1,
        desc: "Alcance 3 · Trampa oculta: daño y -1 PM al pisarla · CD 1"
    },
    necroPunch: {
        name: "Puño Necrótico", range: 1, apCost: 2, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Espiritu", "Resiliencia", "Determinación", "Arma Melee"],
        damageMultiplier: 2.2,
        damageType: "magic",
        desc: "Alcance 1 · Golpe necrótico"
    },
    command: {
        name: "Comandar", range: 0, apCost: 1, cooldown: 3, needsTarget: false,
        buffStats: ["Inspiracion", "Liderazgo", "Autocontrol", "Espiritu", "Mentalidad táctica"],
        buffsAllies: true,
        desc: "Aumenta tu daño y el de tus aliados hasta tu próximo turno · CD 3"
    },
    empower: {
        name: "Potenciar", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "ally",
        buffStats: ["Concentración", "Conocimiento", "Carisma", "Voluntad", "Afinidad mágica"],
        buffMultiplier: 0.15,
        buffType: "AP",
        // Aumenta los PA del aliado en: floor(promedio * buffMultiplier), mínimo 1.
        // Sobre otro aliado: los PA llegan al arrancar SU próximo turno (apBonusPending).
        // Sobre uno mismo: se suman al instante.
        desc: "Alcance 3 · Aumenta los PA del aliado en"
    },
    bubble: {
        name: "Burbuja", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Agudeza mental", "Paciencia", "Espiritu", "Afinidad mágica", "Foco Magico"],
        damageMultiplier: 0.8,
        damageType: "magic",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 2 · Daño según"
    },
    pull: {
        name: "Atraer", range: 2, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Fuerza", "Reflejos", "Instinto", "Impulsividad"],
        damageMultiplier: 1.4,
        damageType: "normal",
        fx: { projectile: "none" },
        pullsToMelee: true, // acerca al objetivo hasta dejarlo cuerpo a cuerpo con quien la usa (ver pullToMelee)
        desc: "Alcance 2 · Daño según"
    },
    curse: {
        name: "Maldición", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Concentración", "Sabiduría", "Carisma", "Agresividad", "Foco Magico"],
        damageMultiplier: 0.35,
        damageType: "magic",
        fx: { projectile: "none" },
        // Maldición: si el golpe hace daño de verdad (dmg > 0), cada stat de
        // debuffStats del blanco baja en ese mismo dmg, hasta el final del
        // combate. Se acumula entre lanzamientos (ver statDebuffs).
        debuffStats: ["Fuerza", "Reflejos", "Sensibilidad al dolor", "Agudeza mental", "Iniciativa", "Instinto"],
        desc: "Alcance 3 · Daño según"
    },
    vineBurst: {
        name: "Estallido de Lianas", range: 3, apCost: 2, cooldown: 2, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        damageStats: ["Agudeza mental", "Concentración", "Confianza", "Impulsividad", "Afinidad mágica", "Foco Magico"],
        damageMultiplier: 1.6,
        onHitMpDrain: 1,
        damageType: "magic",
        fx: { effect: "acid", projectile: "none" },
        desc: "Alcance 3 · Explota en cruz (radio 1)"
    },
    grapple: {
        name: "Apresar", range: 2, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Movilidad", "Reflejos", "Resistencia", "Paciencia", "Iniciativa"],
        onHitMpDrain: 1,
        damageType: "normal",
        fx: { projectile: "none" },
        desc: "Alcance 2 · Daño según"
    },
    spectralTouch: {
        name: "Toque Espectral", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Resistencia Mágica", "Inteligencia", "Persuasión", "Espiritu", "Resiliencia"],
        damageType: "magic",
        damageMultiplier: 1.2,
        desc: "Alcance 1 · Daño según"
    },
    acidVomit: {
        name: "Vómito Ácido", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Capacidad pulmonar", "Resistencia", "Agresividad", "Terquedad", "Resiliencia"],
        damageType: "acido",
        damageMultiplier: 2.1,
        desc: "Alcance 2 · Daño según"
    },
    // ---------- Familia dwarvenLaboratory (nivel 3) ----------
    // Mech Orb. Área en cruz alrededor de quien la lanza (selfCentered:
    // el impacto es su propia casilla y no se golpea a sí mismo) y solo
    // daña a los rivales (opponentsOnly: no lastima a sus aliados).
    // El -1 PA se acumula si le pegan varios orbes.
    novaBurst: {
        name: "Estallido Nova", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        selfCentered: true,
        opponentsOnly: true,
        damageStats: ["Afinidad mágica", "Concentración", "Iniciativa", "Movilidad", "Foco Magico"],
        damageMultiplier: 0.65,
        damageType: "magic",
        onHitApDrain: 1,
        fx: { projectile: "none" },
        desc: "Explota en cruz alrededor de quien la lanza · -1 PA a cada rival golpeado · CD 1"
    },
    // Mecha Flame. Stats de Estallido de Fuego con Impetu en vez de Sabiduría.
    flamethrow: {
        name: "Lanzallamas", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Inteligencia", "Impetu", "Autocontrol", "Determinación", "Foco Magico"],
        damageMultiplier: 2.1,
        damageType: "fuego",
        fx: { projectile: "none" },
        desc: "Alcance 2 · Chorro de fuego · CD 2"
    },
    // Mech Pulser. Híbrido distancia + magia, alcance de todo el tablero.
    pulse: {
        name: "Pulso", range: 8, apCost: 2, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Percepción", "Concentración", "Paciencia", "Arma Distancia", "Foco Magico"],
        damageMultiplier: 2.1,
        damageType: "magic",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 8 · Pulso de energía · CD 1"
    },
    // ---------- Familia seaNier (nivel 3) ----------
    // Giant Crab. 4 stats a propósito: el Arma Melee pesa 1/4 del promedio.
    clap: {
        name: "Tenaza", range: 1, apCost: 2, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Fortaleza", "Terquedad", "Arma Melee"],
        damageMultiplier: 2.0,
        damageType: "normal",
        onHitMpDrain: 1,
        fx: { projectile: "none" },
        desc: "Alcance 1 · Si golpea, el blanco pierde 1 PM en su próximo turno · CD 1"
    },
    // Nier Soldier y Siren Paladin. Se pega con el arma pero sale de la magia del mar.
    seaSlash: {
        name: "Tajo Marino", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Arma Melee", "Inteligencia", "Afinidad mágica", "Fuerza", "Reflejos"],
        damageMultiplier: 1.2,
        damageType: "magic",
        fx: { projectile: "none" },
        desc: "Alcance 1 · Daño según"
    },
    // Nier Hunter.
    seaShot: {
        name: "Disparo Marino", range: 3, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Arma Distancia", "Inteligencia", "Afinidad mágica", "Percepción", "Paciencia"],
        damageMultiplier: 0.8,
        damageType: "magic",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 3 · Daño según"
    },
    // Nier Shrouder. Como Estallido de Lianas, pero de hielo, saca PA en
    // vez de PM y solo daña a los rivales (opponentsOnly).
    mist: {
        name: "Niebla", range: 3, apCost: 2, cooldown: 2, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        opponentsOnly: true,
        damageStats: ["Afinidad mágica", "Autocontrol", "Concentración", "Creatividad", "Foco Magico"],
        damageMultiplier: 1.6,
        damageType: "hielo",
        onHitApDrain: 1,
        fx: { projectile: "none" },
        desc: "Alcance 3 · Explota en cruz (radio 1) · -1 PA a cada rival golpeado · CD 2"
    },
    // ---------- Familia darkForest (nivel 3) ----------
    // Doom Pixie. Estallido de Fuego oscuro con +1 de alcance; solo daña a los rivales.
    darkPulse: {
        name: "Pulso Oscuro", range: 3, apCost: 2, cooldown: 2, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        opponentsOnly: true,
        damageStats: ["Inteligencia", "Sabiduría", "Autocontrol", "Determinación", "Foco Magico"],
        damageMultiplier: 1.75,
        damageType: "oscuro",
        fx: { projectile: "orb", arc: true },
        desc: "Alcance 3 · Explota en cruz (radio 1) · CD 2"
    },
    // Forest Hag. Saeta de Fuego de planta que además saca 1 PM.
    vineLash: {
        name: "Látigo de Lianas", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Agresividad", "Agudeza mental", "Percepción", "Foco Magico"],
        damageMultiplier: 1.9,
        damageType: "planta",
        onHitMpDrain: 1,
        fx: { projectile: "none" },
        desc: "Alcance 2 · -1 PM al golpeado · CD 2"
    },
    // Forest Hag. Baja un porcentaje de stats durante el próximo turno del
    // golpeado (debuffPercent, ver battle.js). No se acumula: se renueva.
    blindness: {
        name: "Ceguera", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Percepción", "Ingenio", "Agudeza mental", "Concentración", "Foco Magico"],
        damageMultiplier: 0.2,
        damageType: "oscuro",
        debuffPercent: { stats: ["Foco Magico", "Arma Distancia"], percent: 0.25, turns: 1 },
        fx: { projectile: "none" },
        desc: "Alcance 3 · -25% Foco Mágico y Arma Distancia durante su próximo turno · CD 1"
    },
    // Fairy Shadow. Reemplaza a Toque Espectral en esta criatura.
    spectralSlash: {
        name: "Tajo Espectral", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Foco Magico", "Arma Melee", "Espiritu", "Inteligencia", "Resiliencia"],
        damageMultiplier: 1.3,
        damageType: "oscuro",
        fx: { projectile: "none" },
        desc: "Alcance 1 · CD 1"
    },
    // ---------- Familia ice (nivel 4) ----------
    // Ice Elf / Ice Trol. Como Tiro Lejano pero de 1 PA y hielo:
    // Afinidad mágica y Autocontrol en lugar de Atletismo y Mentalidad táctica.
    iceShot: {
        name: "Disparo de Hielo", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Autocontrol", "Percepción", "Paciencia", "Arma Distancia"],
        damageType: "hielo",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 3 · CD 1"
    },
    // Ice Assassin. Si golpea, el blanco pierde 1 PA en su próximo turno.
    coldSlash: {
        name: "Tajo Gélido", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Acrobacias", "Reflejos", "Afinidad mágica", "Instinto", "Arma Melee"],
        damageType: "hielo",
        onHitApDrain: 1,
        fx: { projectile: "none" },
        desc: "Alcance 1 · Si golpea, el blanco pierde 1 PA en su próximo turno · CD 1"
    },
    // Ice Bear. Pega con Armadura en lugar de Arma Melee (3 PA, x2.5).
    // Si golpea, el blanco pierde 2 PM en su próximo turno.
    bodySlam: {
        name: "Golpe de Cuerpo", range: 1, apCost: 3, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Fortaleza", "Resistencia", "Atletismo", "Armadura"],
        damageType: "normal",
        damageMultiplier: 2.5,
        onHitMpDrain: 2,
        desc: "Alcance 1 · Si golpea, el blanco pierde 2 PM en su próximo turno · CD 2"
    },
    // ---------- Familia gnoll (nivel 4) ----------
    // Gnoll Witch. 2 PA, sin CD, x2.2 (pedido de la persona).
    bloodRot: {
        name: "Sangre Podrida", range: 3, apCost: 2, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Sabiduría", "Determinación", "Agresividad", "Foco Magico"],
        damageMultiplier: 2.2,
        damageType: "oscuro",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 3"
    },
    // Gnoll Captain. +1 PM a todos los aliados vivos en su próximo turno
    // (no a quien lo lanza). Ver alliesNextTurnGrant en castNoTarget.
    inspire: {
        name: "Inspirar", range: 0, apCost: 1, cooldown: 2, needsTarget: false,
        alliesNextTurnGrant: { move: 1 },
        desc: "Tus aliados ganan +1 PM en su próximo turno · CD 2"
    },
    // Invocaciones. `summon` es la key de creature_types de la criatura que
    // aparece (en una casilla libre pegada a quien la usa, de su bando).
    // Para otra invocación: copiar esta entrada y cambiar summon/name.
    // Los invocados no dan oro, XP ni alma. Ver spawnSummon en battle.js.
    summonYoungWolf: {
        name: "Invocar Lobo Joven", range: 0, apCost: 3, cooldown: 8, needsTarget: false,
        summon: "youngWolf",
        desc: "Invoca un Young Wolf a tu lado · CD 8"
    },
    // Hobgoblin Commander.
    summonGoblinWarrior: {
        name: "Invocar Guerrero Goblin", range: 0, apCost: 3, cooldown: 8, needsTarget: false,
        summon: "goblinWarrior",
        desc: "Invoca un Goblin Warrior a tu lado · CD 8"
    },
    // Orc Ranger.
    summonOldWolf: {
        name: "Invocar Lobo Viejo", range: 0, apCost: 3, cooldown: 8, needsTarget: false,
        summon: "oldWolf",
        desc: "Invoca un Old Wolf a tu lado · CD 8"
    },
    // Orc Commander.
    summonVulture: {
        name: "Invocar Buitre", range: 0, apCost: 3, cooldown: 8, needsTarget: false,
        summon: "vulture",
        desc: "Invoca un Vulture a tu lado · CD 8"
    },

    // ---------- Familia orc (nivel 4) ----------
    // Orc Marauder / Orc Warrior.
    hack: {
        name: "Hachazo", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Reflejos", "Agresividad", "Determinación", "Instinto", "Arma Melee"],
        damageMultiplier: 1.1,
        damageType: "normal",
        desc: "Alcance 1 · CD 1"
    },
    // Orc Ranger.
    preciseShot: {
        name: "Golpe Certero", range: 3, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Reflejos", "Agudeza mental", "Percepción", "Suerte", "Arma Distancia"],
        damageMultiplier: 1.1,
        damageType: "normal",
        desc: "Alcance 3 · CD 1"
    },
    // Orc Shaman. Mismos stats y alcance que Curación Menor.
    bigHeal: {
        name: "Curación Mayor", range: 3, apCost: 3, cooldown: 3, needsTarget: true, targetType: "ally",
        healStats: ["Sabiduría", "Conocimiento", "Espiritu", "Confianza", "Foco Magico"],
        healMultiplier: 1.5,
        desc: "Alcance 3 · Cura a un aliado · CD 3"
    },
    // Orc Shaman. Tipo "electric": sin entrada propia en FX_BY_DAMAGE_TYPE
    // (fx.js) usa el efecto por defecto hasta que se le agregue uno.
    lightning: {
        name: "Relámpago", range: 3, apCost: 2, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Sabiduría", "Impulsividad", "Espiritu", "Instinto", "Foco Magico"],
        damageMultiplier: 2.1,
        damageType: "electric",
        desc: "Alcance 3 · CD 1"
    },
    // Orc Warrior. onHitSelfStatGain: si el golpe hace daño, quien lo lanza
    // gana ese stat por el daño hecho, hasta el final del combate (se
    // acumula). Genérico: ver performAttack y statBuffs en battle.js.
    furyCut: {
        name: "Corte Furioso", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Fuerza", "Agresividad", "Impulsividad", "Voluntad", "Arma Melee"],
        damageMultiplier: 0.9,
        damageType: "normal",
        onHitSelfStatGain: "Agresividad",
        desc: "Alcance 1 · Ganás Agresividad igual al daño hecho, todo el combate · CD 1"
    },
    // Orc Commander. apGrantAll: +N PA ya mismo para quien lo lanza y +N PA
    // en el próximo turno de cada aliado vivo. Ver castNoTarget.
    courage: {
        name: "Coraje", range: 0, apCost: 1, cooldown: 3, needsTarget: false,
        apGrantAll: 1,
        desc: "+1 PA ya para vos y +1 PA a tus aliados en su próximo turno · CD 3"
    },

    // ---------- Familia mind (nivel 4) ----------
    // Daño "psychic" (efecto propio en fx.js). Espada y Tajo Mental pegan
    // con el arma (daño normal) pero se ven psíquicos (fx.effect).
    // Mind Warrior. Sin CD: se puede usar varias veces por turno.
    mindSword: {
        name: "Espada Mental", range: 1, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Atletismo", "Arma Melee", "Confianza", "Liderazgo", "Mentalidad táctica"],
        damageMultiplier: 1.1,
        damageType: "normal",
        fx: { effect: "psychic" },
        desc: "Alcance 1"
    },
    // Mind Slasher.
    mindSlash: {
        name: "Tajo Mental", range: 1, apCost: 1, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Reflejos", "Arma Melee", "Ingenio", "Persuasión", "Mentalidad táctica"],
        damageMultiplier: 1.1,
        damageType: "normal",
        onHitMpDrain: 1,
        fx: { effect: "psychic" },
        desc: "Alcance 1 · -1 PM al golpeado · CD 1"
    },
    // Mind Destroyer.
    stun: {
        name: "Aturdir", range: 3, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Foco Magico", "Inteligencia", "Mentalidad táctica", "Carisma"],
        damageMultiplier: 2.3,
        damageType: "psychic",
        onHitApDrain: 1,
        onHitMpDrain: 1,
        desc: "Alcance 3 · -1 PA y -1 PM al golpeado · CD 2"
    },
    // Mind Destroyer / Master Mind. Sin CD.
    shock: {
        name: "Descarga", range: 3, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Inteligencia", "Foco Magico", "Ingenio", "Persuasión"],
        damageMultiplier: 0.9,
        damageType: "psychic",
        desc: "Alcance 3"
    },
    // Elder Brain.
    mindPulse: {
        name: "Pulso Mental", range: 6, apCost: 2, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Foco Magico", "Inspiracion", "Persuasión", "Carisma"],
        damageMultiplier: 2.1,
        damageType: "psychic",
        desc: "Alcance 6 · CD 1"
    },
    // Master Mind. shieldStats: da un escudo (vida extra que se gasta
    // antes que la vida) = floor(promedio × shieldMultiplier). Dura hasta
    // gastarse; no se suma: queda el más grande. Ver performShield.
    shield: {
        name: "Escudo", range: 3, apCost: 1, cooldown: 3, needsTarget: true, targetType: "ally",
        shieldStats: ["Confianza", "Inspiracion", "Liderazgo", "Foco Magico"],
        shieldMultiplier: 1.7,
        desc: "Alcance 3 · Escudo a un aliado o a vos · CD 3"
    },
    // Elder Brain. Como Salto (movesCaster), con más alcance y CD.
    teleport: {
        name: "Teletransporte", range: 2, apCost: 1, cooldown: 1, needsTarget: true, targetType: "empty",
        desc: "Alcance 2 · Te mueve a la casilla · CD 1"
    },

    // ---------- Familia grok (nivel 4) ----------
    // Grok Fighter / Giant Toad. leapAttack: salta a una casilla vacía a su
    // alcance y daña en cruz alrededor de donde cae (selfCentered + radio 1),
    // solo a rivales. Ver handleCellClick y la IA (paso "Salto con ataque").
    pierceJump: {
        name: "Salto Perforante", range: 2, apCost: 2, cooldown: 1, needsTarget: true, targetType: "empty",
        leapAttack: true,
        aoeRadius: 1,
        selfCentered: true,
        opponentsOnly: true,
        damageStats: ["Atletismo", "Percepción", "Acrobacias", "Impetu", "Arma Melee"],
        damageMultiplier: 1.75,
        damageType: "normal",
        desc: "Alcance 2 · Saltás a la casilla y dañás a los rivales pegados · CD 1"
    },
    // Grok Poisoner. Solo daña a rivales.
    poisonCloud: {
        name: "Nube Venenosa", range: 3, apCost: 3, cooldown: 3, needsTarget: true, targetType: "area",
        aoeRadius: 2,
        opponentsOnly: true,
        damageStats: ["Afinidad mágica", "Creatividad", "Foco Magico", "Conocimiento", "Paciencia"],
        damageMultiplier: 2.5,
        damageType: "veneno",
        desc: "Alcance 3 · Área radio 2 · Solo daña a rivales · CD 3"
    },
    // Grok Elder.
    acidBubble: {
        name: "Burbuja Ácida", range: 3, apCost: 3, cooldown: 3, needsTarget: true, targetType: "enemy",
        damageStats: ["Capacidad pulmonar", "Agresividad", "Foco Magico", "Creatividad", "Resistencia Mágica"],
        damageMultiplier: 3.3,
        damageType: "acido",
        fx: { projectile: "orb", arc: true },
        desc: "Alcance 3 · CD 3"
    },
    // Grok Summoner.
    summonBloodGnome: {
        name: "Invocar Gnomo de Sangre", range: 0, apCost: 3, cooldown: 8, needsTarget: false,
        summon: "bloodGnome",
        desc: "Invoca un Blood Gnome a tu lado · CD 8"
    },
};
