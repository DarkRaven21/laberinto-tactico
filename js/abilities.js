// ============================================================
// abilities.js — definición de todas las habilidades.
// Lo importan battle.js (combate) y admin.js (tabla de stats).
// Para sumar o cambiar una habilidad, se toca solo este archivo.
// ============================================================

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
        desc: "Alcance 2 · Daño según Reflejos/Fuerza/Voluntad/Creatividad"
    },
    fireburst: {
        name: "Estallido de Fuego", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "area",
        aoeRadius: 1,
        damageStats: ["Inteligencia", "Sabiduría", "Autocontrol", "Determinación", "Foco Magico"],
        damageMultiplier: 0.75,
        damageType: "fuego",
        fx: { projectile: "orb", arc: true },
        desc: "Alcance 2 · Explota en cruz (radio 1) · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    firebolt: {
        name: "Saeta de Fuego", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Agresividad", "Agudeza mental", "Percepción", "Foco Magico"],
        damageMultiplier: 1.25,
        damageType: "fuego",
        desc: "Alcance 2 · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    firemagic: {
        name: "Magia de Fuego", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Agresividad", "Agudeza mental", "Percepción", "Foco Magico"],
        damageMultiplier: 0.4,
        damageType: "fuego",
        desc: "Alcance 2 · Daño según Inteligencia/Sabiduría/Autocontrol/Determinación x0.75 · CD 2"
    },
    icemagic: {
        name: "Magia de Hielo", range: 2, apCost: 1, cooldown: 0, needsTarget: true, targetType: "enemy",
        damageStats: ["Afinidad mágica", "Autocontrol", "Concentración", "Percepción", "Foco Magico"],
        damageMultiplier: 0.4,
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
        damageMultiplier: 0.75,
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
        damageMultiplier: 1.75,
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
        damageMultiplier: 0.9,
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
        damageMultiplier: 1.2,
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
        damageMultiplier: 1.15,
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
        damageMultiplier: 0.75,
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
        damageMultiplier: 1.3,
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
        damageMultiplier: 0.75,
        damageType: "magic",
        onHitApDrain: 1,
        fx: { projectile: "none" },
        desc: "Explota en cruz alrededor de quien la lanza · -1 PA a cada rival golpeado · CD 1"
    },
    // Mecha Flame. Stats de Estallido de Fuego con Impetu en vez de Sabiduría.
    flamethrow: {
        name: "Lanzallamas", range: 2, apCost: 2, cooldown: 2, needsTarget: true, targetType: "enemy",
        damageStats: ["Inteligencia", "Impetu", "Autocontrol", "Determinación", "Foco Magico"],
        damageMultiplier: 1.3,
        damageType: "fuego",
        fx: { projectile: "none" },
        desc: "Alcance 2 · Chorro de fuego · CD 2"
    },
    // Mech Pulser. Híbrido distancia + magia, alcance de todo el tablero.
    pulse: {
        name: "Pulso", range: 8, apCost: 2, cooldown: 1, needsTarget: true, targetType: "enemy",
        damageStats: ["Percepción", "Concentración", "Paciencia", "Arma Distancia", "Foco Magico"],
        damageType: "magic",
        fx: { projectile: "orb", arc: false },
        desc: "Alcance 8 · Pulso de energía · CD 1"
    },
};
