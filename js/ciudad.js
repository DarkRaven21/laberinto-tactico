import { getBank } from "./citybank.js";
import { requireSession, clearSession, getSession } from "./session.js";
import { getLifestyle, setLifestyle, FOOD_OPTIONS, SLEEP_OPTIONS } from "./lifestyle.js";
import { getItems, getEquipment, sellItem, hasUnseenArmeriaNews } from "./equipment.js";
import { ICON_COINS } from "./icons.js";
import { CITY_EVENTS, buyEvent } from "./events.js";
import { PLAYER_CONFIG } from "./player.js";

const TAX_INTERVAL = 6;
// Inflación de comida y descanso: +25% compuesto cada 6 vueltas
const INFLATION_RATE = 0.25;
function inflatedPrice(base) {
    return Math.round(base * Math.pow(1 + INFLATION_RATE, Math.floor(laberintoEntries / TAX_INTERVAL)));
}
const TAX_CAP = 1200;
const TAX_MANUAL = { 1: 50, 2: 75, 3: 150 };
const TAX_RATE = 0.9133;

function taxForCharge(n) {
    if (TAX_MANUAL[n] != null) return TAX_MANUAL[n];
    return Math.round(TAX_CAP - (TAX_CAP - 150) * Math.pow(TAX_RATE, n - 3));
}

requireSession();

// Mismo mapeo que armeria.js — se necesita acá para mostrar el
// nombre del slot en la lista de "vender" del popup.
const SLOT_LABELS = {
    casco: "Casco", pecho: "Pecho", botas: "Botas",
    amuleto: "Amuleto", brazales: "Brazales", piernas: "Piernas", arma: "Arma"
};

let goldBalance = 0;
let itemsCatalog = [];   // catálogo completo (para sacar label/maintenance_price/price)
let equipment = {};      // { slot: item_key } — se achica cuando se vende algo
let taxPending = false;
let taxDue = 0;
let laberintoEntries = 0;
let activeEvents = [];       // 3 keys de city_events, elegidos por el server en 'reset'
let usedEvents = [];

function updateGoldLabel() {
    document.getElementById("goldLabel").innerHTML = `Oro: ${goldBalance} ${ICON_COINS}`;
    // El modal tapa el goldLabel de atrás (fondo casi opaco) — si ya
    // está creado, le mantenemos su propio número sincronizado acá,
    // en el mismo lugar donde ya se actualiza goldBalance.
    const modalGoldEl = document.getElementById("lifestyle-gold-amount");
    if (modalGoldEl) modalGoldEl.textContent = goldBalance;
    // El aviso del impuesto compara contra el oro actual, así que se
    // repinta acá también.
    renderTaxNotice();
    // El oro cambia desde varios lugares (vender equipo, pagar
    // impuesto, comprar otro evento) — repintar acá evita tener que
    // acordarse de llamar a renderEvents() en cada uno de ellos.
    renderEvents();
}

// ---------- Aviso del impuesto ----------
// Tarjeta en la barra lateral (#taxNotice en ciudad.php). Muestra
// cuánto es el próximo impuesto y cuándo se cobra, para que el jugador
// lo vea venir. El impuesto se activa al VOLVER de la excursión número
// múltiplo de TAX_INTERVAL (lo prende 'reset' en progress-action) y se
// paga al confirmar comida y descanso. Solo vista previa: el cobro real
// lo decide set-lifestyle.ts.
function renderTaxNotice() {
    const el = document.getElementById("taxNotice");
    if (!el) return;

    let title, amount, when;
    if (taxPending) {
        title = "Impuesto pendiente";
        amount = taxDue;
        when = "Se cobra al confirmar comida y descanso.";
    } else {
        const nextCharge = Math.floor(laberintoEntries / TAX_INTERVAL) + 1;
        const remaining = TAX_INTERVAL - (laberintoEntries % TAX_INTERVAL);
        title = "Próximo impuesto";
        amount = taxForCharge(nextCharge);
        when = remaining === 1
            ? "Se cobra al volver de tu próxima excursión."
            : `Se cobra dentro de ${remaining} excursiones al laberinto.`;
    }

    const missing = amount - goldBalance;
    const status = missing > 0
        ? `<span class="tax-status tax-status--short">Te faltan ${missing} ${ICON_COINS}</span>`
        : `<span class="tax-status tax-status--ok">Ya lo tenés cubierto</span>`;

    el.className = "ciudad-tax-card" + (taxPending ? " ciudad-tax-card--pending" : "");
    el.innerHTML = `
        <div class="tax-title">${title}</div>
        <div class="tax-amount">${amount} ${ICON_COINS}</div>
        <div class="tax-when">${when}</div>
        ${status}
    `;
}

// Los tres botones de navegación ya están en el markup de ciudad.php
// (header/sidebar) — acá solo se enganchan los listeners.
document.getElementById("goToArmeriaBtn").addEventListener("click", () => {
    window.location.href = "armeria.html";
});

document.getElementById("goToLaberintoBtn").addEventListener("click", () => {
    window.location.href = "laberinto.html";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
});

// ---------- Estilo de vida ----------
// Modal bloqueante, inyectado por JS (mismo criterio que el
// soul-popup de battle.js) — no toca ciudad.php. Aparece cada vez
// que se llega a la ciudad con la elección en null (ver 'reset' en
// progress-action.ts, que la limpia al salir del laberinto).
//
// El mantenimiento del equipo se cobra ACÁ junto con comida/descanso
// (ver set-lifestyle.ts) — no es un cargo aparte. Por eso el popup
// también muestra el equipo actual con un botón "Vender" por item:
// es la única forma de bajar ese costo si no alcanza el oro.
let lifestyleModalEl = null;
let selectedFood = null;
let selectedSleep = null;

function ensureLifestyleModal() {
    if (lifestyleModalEl) return lifestyleModalEl;

    const style = document.createElement("style");
    style.textContent = `
        #lifestyle-modal {
            position: fixed;
            inset: 0;
            background: rgba(10, 11, 14, 0.92);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        #lifestyle-modal.show { display: flex; }
        #lifestyle-modal .lifestyle-card {
            background: var(--panel);
            border: 1px solid #2c313b;
            border-radius: 8px;
            padding: 28px 32px;
            max-width: 560px;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            text-align: center;
            font-family: var(--sans);
            color: var(--text);
        }
        #lifestyle-modal h2 {
            font-family: var(--mono);
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--amber);
            font-size: 16px;
            margin: 0 0 20px;
        }
        #lifestyle-modal .lifestyle-gold {
            font-family: var(--mono);
            font-size: 13px;
            color: var(--amber);
            margin-bottom: 18px;
        }
        #lifestyle-modal .lifestyle-tax {
            font-family: var(--mono);
            font-size: 13px;
            color: var(--crimson);
            margin-bottom: 18px;
            font-weight: 700;
        }
        #lifestyle-modal .lifestyle-death-message {
            font-family: var(--sans);
            font-size: 14px;
            color: var(--text);
            line-height: 1.5;
            margin-bottom: 20px;
        }
        #lifestyle-modal .lifestyle-death-btn {
            background: var(--crimson);
            color: #1c1712;
            border: none;
            border-radius: 5px;
            padding: 10px 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            font-family: var(--mono);
            text-transform: uppercase;
            font-size: 12px;
        }
        #lifestyle-modal .lifestyle-death-btn:hover { filter: brightness(1.1); }
        #lifestyle-modal .lifestyle-row { margin-bottom: 20px; text-align: left; }
        #lifestyle-modal .lifestyle-row h3 {
            font-family: var(--mono);
            font-size: 12px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--text-dim);
            margin: 0 0 8px;
        }
        #lifestyle-modal .lifestyle-options { display: flex; gap: 8px; flex-wrap: wrap; }
        #lifestyle-modal .lifestyle-option-btn {
            flex: 1 1 140px;
            background: #232833;
            border: 1px solid #363c48;
            border-radius: 5px;
            color: var(--text);
            padding: 10px 12px;
            cursor: pointer;
            font-family: var(--sans);
            font-size: 13px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
            transition: border-color 0.12s ease, background 0.12s ease;
        }
        #lifestyle-modal .lifestyle-option-btn:hover { border-color: var(--amber); background: #2b313d; }
        #lifestyle-modal .lifestyle-option-btn.selected { border-color: var(--teal); background: #233030; }
        #lifestyle-modal .lifestyle-option-price { font-family: var(--mono); font-size: 11px; color: var(--amber); }
        #lifestyle-modal .lifestyle-equipment-list { display: flex; flex-direction: column; gap: 8px; }
        #lifestyle-modal .lifestyle-equipment-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: #232833;
            border: 1px solid #363c48;
            border-radius: 5px;
            padding: 8px 10px;
            font-size: 12px;
        }
        #lifestyle-modal .lifestyle-equipment-name { font-family: var(--sans); }
        #lifestyle-modal .lifestyle-equipment-maintenance { font-family: var(--mono); color: var(--crimson); white-space: nowrap; }
        #lifestyle-modal .lifestyle-sell-btn {
            background: var(--crimson);
            color: #1c1712;
            border: none;
            border-radius: 4px;
            padding: 5px 12px;
            font-weight: 700;
            cursor: pointer;
            font-family: var(--mono);
            text-transform: uppercase;
            font-size: 10px;
            white-space: nowrap;
        }
        #lifestyle-modal .lifestyle-sell-btn:hover { filter: brightness(1.1); }
        #lifestyle-modal .lifestyle-total { font-family: var(--mono); font-size: 12px; color: var(--text-dim); margin-bottom: 6px; }
        #lifestyle-modal .lifestyle-warning { color: var(--crimson); font-family: var(--mono); font-size: 11px; min-height: 14px; margin-bottom: 10px; }
        #lifestyle-modal .lifestyle-confirm-btn {
            background: var(--teal);
            color: #0c1a19;
            border: none;
            border-radius: 5px;
            padding: 10px 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            font-family: var(--mono);
            text-transform: uppercase;
            font-size: 12px;
        }
        #lifestyle-modal .lifestyle-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    lifestyleModalEl = document.createElement("div");
    lifestyleModalEl.id = "lifestyle-modal";
    lifestyleModalEl.innerHTML = `
        <div class="lifestyle-card">
            <h2>¿Cómo será tu estilo de vida este mes?</h2>
            <div class="lifestyle-gold">Oro disponible: <span id="lifestyle-gold-amount">0</span> ${ICON_COINS}</div>
            <div class="lifestyle-tax" id="lifestyle-tax-line" style="display: none;">Impuesto de este ciclo: <span id="lifestyle-tax-amount">0</span> ${ICON_COINS}</div>

            <div id="lifestyle-body">
                <div class="lifestyle-row">
                    <h3>Elige qué vas a comer este mes</h3>
                    <div class="lifestyle-options" id="lifestyle-food-options"></div>
                </div>
                <div class="lifestyle-row">
                    <h3>Elige dónde vas a dormir este mes</h3>
                    <div class="lifestyle-options" id="lifestyle-sleep-options"></div>
                </div>
                <div class="lifestyle-row" id="lifestyle-equipment-row" style="display: none;">
                    <h3>Tu equipo — mantenimiento mensual</h3>
                    <div class="lifestyle-equipment-list" id="lifestyle-equipment-list"></div>
                </div>
                <div class="lifestyle-total" id="lifestyle-total-line">Costo total (comida + descanso + mantenimiento): <span id="lifestyle-total-cost">0</span> ${ICON_COINS}</div>
                <div class="lifestyle-warning" id="lifestyle-warning"></div>
                <button type="button" class="lifestyle-confirm-btn" id="lifestyle-confirm-btn" disabled>Confirmar</button>
            </div>

            <div id="lifestyle-death-body" style="display: none;">
                <div class="lifestyle-death-message">Tu personaje no tiene para pagar los impuestos y por lo tanto será decapitado.</div>
                <button type="button" class="lifestyle-death-btn" id="lifestyle-death-btn">Crear nuevo personaje</button>
            </div>
        </div>
    `;
    document.body.appendChild(lifestyleModalEl);

    renderLifestyleOptions(FOOD_OPTIONS, document.getElementById("lifestyle-food-options"), key => {
        selectedFood = key;
        updateLifestyleSelectionUI();
    });
    renderLifestyleOptions(SLEEP_OPTIONS, document.getElementById("lifestyle-sleep-options"), key => {
        selectedSleep = key;
        updateLifestyleSelectionUI();
    });
    document.getElementById("lifestyle-confirm-btn").addEventListener("click", confirmLifestyle);
    document.getElementById("lifestyle-death-btn").addEventListener("click", confirmDeath);

    return lifestyleModalEl;
}

function renderLifestyleOptions(options, container, onPick) {
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lifestyle-option-btn";
        btn.dataset.key = opt.key;
        btn.innerHTML = `<span>${opt.label}</span><span class="lifestyle-option-price">${inflatedPrice(opt.price)} ${ICON_COINS}</span>`;
        btn.addEventListener("click", () => onPick(opt.key));
        container.appendChild(btn);
    });
}

// Suma el maintenance_price de todo lo que SIGUE equipado (lo que se
// vendió ya no está en `equipment`, así que no suma más acá).
function currentMaintenanceTotal() {
    return Object.values(equipment).reduce((sum, itemKey) => {
        const item = itemsCatalog.find(it => it.key === itemKey);
        return sum + (item?.maintenance_price || 0);
    }, 0);
}

// Cuánto oro llegaría a tener el jugador si vendiera TODO lo que le
// queda puesto ahora mismo (mismo cálculo que item-sell.ts:
// price - maintenance_price, piso 0). No hace falta que venda de a
// uno para saber si el impuesto es pagable — con esto alcanza para
// decidirlo de una.
function maxRecoverableGold() {
    const saleValue = Object.values(equipment).reduce((sum, itemKey) => {
        const item = itemsCatalog.find(it => it.key === itemKey);
        if (!item) return sum;
        return sum + Math.max(0, (item.price || 0) - (item.maintenance_price || 0));
    }, 0);
    return goldBalance + saleValue;
}

// Con impuesto pendiente, comida y descanso pueden elegirse gratis
// (Mendigar/Calle) y el mantenimiento baja a 0 si se vende todo — así
// que lo único que puede hacer imposible pagar es el impuesto en sí.
// Si ni vendiendo absolutamente todo alcanza, no hay ninguna decisión
// que tomar en el modal: es game over.
function isHopeless() {
    return taxPending && maxRecoverableGold() < taxDue;
}

function renderEquipmentSection() {
    const row = document.getElementById("lifestyle-equipment-row");
    const list = document.getElementById("lifestyle-equipment-list");
    if (!row || !list) return;

    const slots = Object.keys(equipment);
    if (slots.length === 0) {
        row.style.display = "none";
        return;
    }
    row.style.display = "";
    list.innerHTML = "";

    slots.forEach(slot => {
        const itemKey = equipment[slot];
        const item = itemsCatalog.find(it => it.key === itemKey);
        if (!item) return;

        const card = document.createElement("div");
        card.className = "lifestyle-equipment-item";
        card.innerHTML = `
            <span class="lifestyle-equipment-name">${SLOT_LABELS[slot] || slot}: ${item.label}</span>
            <span class="lifestyle-equipment-maintenance">Mant. ${item.maintenance_price || 0} ${ICON_COINS}</span>
        `;

        const sellBtn = document.createElement("button");
        sellBtn.type = "button";
        sellBtn.className = "lifestyle-sell-btn";
        sellBtn.textContent = "Vender";
        sellBtn.addEventListener("click", () => handleSellItem(slot));
        card.appendChild(sellBtn);

        list.appendChild(card);
    });
}

async function handleSellItem(slot) {
    const result = await sellItem(slot);
    if (result.error) {
        alert(result.error);
        return;
    }
    goldBalance = result.gold;
    delete equipment[slot];
    updateGoldLabel();
    renderEquipmentSection();
    updateLifestyleSelectionUI();
}

function currentTotalCost() {
    const foodPrice = inflatedPrice(FOOD_OPTIONS.find(o => o.key === selectedFood)?.price ?? 0);
    const sleepPrice = inflatedPrice(SLEEP_OPTIONS.find(o => o.key === selectedSleep)?.price ?? 0);
    return foodPrice + sleepPrice + currentMaintenanceTotal() + (taxPending ? taxDue : 0);
}

function updateLifestyleSelectionUI() {
    const bodyEl = document.getElementById("lifestyle-body");
    const deathBodyEl = document.getElementById("lifestyle-death-body");
    const taxLineEl = document.getElementById("lifestyle-tax-line");

    if (taxLineEl) {
        taxLineEl.style.display = taxPending ? "" : "none";
        const taxAmountEl = document.getElementById("lifestyle-tax-amount");
        if (taxAmountEl) taxAmountEl.textContent = taxDue;
    }

    // Con impuesto pendiente, comida/descanso gratis + vender todo el
    // equipo ya no alcanza — no hay ninguna elección que hacer en el
    // modal normal, así que ni se muestra: pasa directo a la pantalla
    // de game over.
    if (isHopeless()) {
        if (bodyEl) bodyEl.style.display = "none";
        if (deathBodyEl) deathBodyEl.style.display = "";
        return;
    }
    if (bodyEl) bodyEl.style.display = "";
    if (deathBodyEl) deathBodyEl.style.display = "none";

    document.querySelectorAll("#lifestyle-food-options .lifestyle-option-btn")
        .forEach(btn => btn.classList.toggle("selected", btn.dataset.key === selectedFood));
    document.querySelectorAll("#lifestyle-sleep-options .lifestyle-option-btn")
        .forEach(btn => btn.classList.toggle("selected", btn.dataset.key === selectedSleep));

    const total = currentTotalCost();
    document.getElementById("lifestyle-total-cost").textContent = total;
    const totalLineEl = document.getElementById("lifestyle-total-line");
    if (totalLineEl) {
        totalLineEl.firstChild.textContent = taxPending
            ? "Costo total (comida + descanso + mantenimiento + impuesto): "
            : "Costo total (comida + descanso + mantenimiento): ";
    }

    const bothChosen = selectedFood && selectedSleep;
    const canAfford = goldBalance >= total;
    document.getElementById("lifestyle-warning").textContent =
        bothChosen && !canAfford ? "No te alcanza el oro — vendé equipo para cubrir la diferencia." : "";
    document.getElementById("lifestyle-confirm-btn").disabled = !bothChosen || !canAfford;
}

async function confirmLifestyle() {
    const result = await setLifestyle(selectedFood, selectedSleep);
    if (result.dead) {
        handleDeath();
        return;
    }
    if (result.error) {
        alert(result.error);
        return;
    }
    goldBalance = result.gold;
    if (result.tax_charged) {
        taxPending = false;
        taxDue = 0;
    }
    updateGoldLabel();
    lifestyleModalEl.classList.remove("show");
}

// Dispara el mismo camino de siempre (set-lifestyle.ts), con las
// opciones más baratas posibles — no importa cuáles, porque en este
// estado sabemos que no alcanza de ninguna forma. El server es quien
// decide de verdad si corresponde matar al personaje: este botón no
// marca `dead` por su cuenta, solo confirma lo que el cliente ya
// veía venir (ver isHopeless).
async function confirmDeath() {
    const result = await setLifestyle("mendigar", "calle");
    if (result.dead) {
        handleDeath();
        return;
    }
    // No debería pasar (isHopeless ya lo descartó antes de mostrar
    // este botón), pero por las dudas: si el server no lo mata,
    // seguimos el camino normal en vez de dejar al jugador colgado.
    if (result.error) {
        alert(result.error);
        return;
    }
    goldBalance = result.gold;
    if (result.tax_charged) {
        taxPending = false;
        taxDue = 0;
    }
    updateGoldLabel();
    lifestyleModalEl.classList.remove("show");
}

function handleDeath() {
    clearSession();
    window.location.href = "index.html";
}

async function checkLifestyle() {
    // Personaje recién creado, todavía no hizo ninguna pasada: no se
    // le pregunta nada. Sin fila en character_lifestyle, tanto
    // get-character-state como getRegen ya caen en multiplicador
    // neutro (1.0) — así que esta primera pasada queda sin buff ni
    // debuff simplemente por no forzar la elección, no hace falta
    // nada más del lado del server.
    if (laberintoEntries === 0) return;

    const lifestyle = await getLifestyle();
    if (!lifestyle.food_choice || !lifestyle.sleep_choice) {
        ensureLifestyleModal().classList.add("show");
        renderEquipmentSection();
        updateGoldLabel();       // el modal recién se creó — sincronizamos su span de oro
        updateLifestyleSelectionUI();
    }
}

function renderEvents() {
    const grid = document.getElementById("eventsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    activeEvents.forEach(key => {
        const evt = CITY_EVENTS[key];
        if (!evt) return; // catálogo desincronizado con lo que mandó el server — no debería pasar

        const already = usedEvents.includes(key);
        const price = evt.base_price;
        const statsLine = (evt.stats || []).map(s => `+3 ${s}`).join(", ");

        const slot = document.createElement("div");
        slot.className = "ciudad-event-slot";
        slot.innerHTML = `
            <span class="ciudad-event-slot-label">${evt.label}</span>
            <span class="ciudad-event-slot-stats">${statsLine}</span>
            <span class="ciudad-event-slot-price">${price} ${ICON_COINS}</span>
        `;

        const buyBtn = document.createElement("button");
        buyBtn.type = "button";
        buyBtn.className = "ciudad-event-buy-btn";
        buyBtn.textContent = already ? "Ya participaste" : "Participar";
        buyBtn.disabled = already || goldBalance < price;
        buyBtn.addEventListener("click", () => handleBuyEvent(key, evt, price));
        slot.appendChild(buyBtn);

        grid.appendChild(slot);
    });
}

async function handleBuyEvent(key, evt, price) {
    const statsLine = (evt.stats || []).join(", ");
    const ok = confirm(`¿Participar de "${evt.label}" por ${price} de oro? Vas a subir +3 en: ${statsLine}.`);
    if (!ok) return;

    const result = await buyEvent(key);
    if (result.dead) {
        handleDeath();
        return;
    }
    if (result.error) {
        alert(result.error);
        return;
    }
    goldBalance = result.gold;
    usedEvents = result.used_events || [...usedEvents, key];
    updateGoldLabel();
}

function renderCharacterCard() {
    if (!PLAYER_CONFIG) return; // sesión inválida/personaje muerto — player.js ya redirigió a login

    const portraitEl = document.getElementById("characterPortrait");
    if (portraitEl && PLAYER_CONFIG.icon) {
        portraitEl.innerHTML = `<img src="${PLAYER_CONFIG.icon}" alt="${PLAYER_CONFIG.name || ''}">`;
    }

    const nameEl = document.getElementById("characterName");
    if (nameEl) nameEl.textContent = PLAYER_CONFIG.name || "";

    const levelEl = document.getElementById("characterLevel");
    if (levelEl) levelEl.textContent = `Nivel ${PLAYER_CONFIG.level}`;
}

// "!" en el botón Armería cuando hay ítems nuevos para tu nivel que
// todavía no viste (se apaga al entrar a la armería, ver armeria.js).
function renderArmeriaBadge() {
    const btn = document.getElementById("goToArmeriaBtn");
    const session = getSession();
    if (!btn || !session || !PLAYER_CONFIG) return;
    const show = hasUnseenArmeriaNews(itemsCatalog, PLAYER_CONFIG.level, session.id);
    btn.querySelector(".ciudad-nav-badge")?.remove();
    btn.classList.toggle("ciudad-nav-btn--news", show);
    if (show) {
        const badge = document.createElement("span");
        badge.className = "ciudad-nav-badge";
        badge.textContent = "!";
        badge.title = "Hay equipo nuevo para tu nivel";
        btn.appendChild(badge);
        btn.setAttribute("aria-label", "Armería (hay equipo nuevo para tu nivel)");
    } else {
        btn.removeAttribute("aria-label");
    }
}

async function init() {
    renderCharacterCard();
    const [bank, itemsRes, equipmentRes] = await Promise.all([
        getBank(), getItems(), getEquipment()
    ]);
    goldBalance = bank.gold;
    itemsCatalog = itemsRes;
    equipment = equipmentRes;
    taxPending = !!bank.tax_pending;
    taxDue = taxPending ? taxForCharge(bank.laberinto_entries / TAX_INTERVAL) : 0;
    laberintoEntries = bank.laberinto_entries || 0;
    activeEvents = bank.active_events || [];
    usedEvents = bank.used_events || [];
    updateGoldLabel();
    renderArmeriaBadge();
    await checkLifestyle();
}

init();
