import { requireSession, getSession } from "./session.js";
import { getBank } from "./citybank.js";
import {
    getItems, getEquipment, connectItem, replaceItem, getCharacterLevel,
    isItemForLevel, canBuyAtLevel, isSpecialItem, isItemNewForLevel, markArmeriaSeen,
    getMaterialCatalog, getMaterials
} from "./equipment.js";
import { ICON_COINS } from "./icons.js";
import { ABILITIES } from "./abilities.js";
import { PASSIVES } from "./passives.js";

requireSession();

// Mismo orden/llaves que la columna `slot` de la tabla items (ver
// armeria_schema.sql) — "arma" agrupa todas las opciones de arma
// (incluye armas a dos manos, focos mágicos, etc.), es un solo slot.
const SLOTS = ["casco", "pecho", "botas", "amuleto", "brazales", "piernas", "arma"];
const SLOT_LABELS = {
    casco: "Casco", pecho: "Pecho", botas: "Botas",
    amuleto: "Amuleto", brazales: "Brazales", piernas: "Piernas", arma: "Arma"
};
const SPECIAL_TAB = "especiales";

// Catálogo COMPLETO: se usa para mostrar el nombre de lo equipado aunque
// sea de otro rango de nivel.
let items = [];
let characterLevel = 1;
let equipment = {};   // { slot: item_key }
let goldBalance = 0;
let materialCatalog = {}; // { family: label }
let materials = {};       // { family: cantidad }
let tabs = [];            // [{ key, label, level }]
let activeTab = null;

function updateGoldLabel() {
    document.getElementById("goldLabel").innerHTML = `Oro: ${goldBalance} ${ICON_COINS}`;
}

function statsLine(stats) {
    return Object.entries(stats || {}).map(([k, v]) => `${k} +${v}`).join(" · ");
}

// Habilidades y pasivas que da el ítem, solo el nombre (de abilities.js
// y passives.js; si una clave no existe, se muestra la clave).
function grantsLine(item) {
    const parts = [];
    const abilities = (item.abilities || []).map(k => ABILITIES[k]?.name || k);
    if (abilities.length) parts.push(`${abilities.length > 1 ? "Habilidades" : "Habilidad"}: ${abilities.join(", ")}`);
    const passives = (item.passives || []).map(k => PASSIVES[k]?.name || k);
    if (passives.length) parts.push(`${passives.length > 1 ? "Pasivas" : "Pasiva"}: ${passives.join(", ")}`);
    return parts.join(" · ");
}

// El ítem equipado quedó de un rango de nivel anterior.
function isOutdated(item) {
    return item && !isSpecialItem(item) && item.max_level != null && item.max_level < characterLevel;
}

// ---------- Pestañas ----------
// Una pestaña por nivel, de 1 a tu nivel: cada una muestra exactamente lo
// que se vendía en ese nivel (isItemForLevel), como la Armería de antes.
// Los niveles seguidos con la misma lista se juntan ("Nivel 1–2"). Más
// "Especiales" si tenés algún objeto de familia que sirva para crear algo.
function normalItems() {
    return items.filter(it => !isSpecialItem(it));
}

function itemsForTab(level) {
    return normalItems().filter(it => isItemForLevel(it, level));
}

function buildTabs() {
    const out = [];
    let prevSig = null;
    for (let lv = 1; lv <= characterLevel; lv++) {
        const list = itemsForTab(lv);
        if (!list.length) continue;
        const sig = list.map(it => it.key).sort().join("|");
        const last = out[out.length - 1];
        if (last && sig === prevSig) {
            last.level = lv; // mismo contenido: se estira la pestaña anterior
            last.label = `Nivel ${last.from}–${lv}`;
        } else {
            out.push({ key: `lv${lv}`, label: `Nivel ${lv}`, from: lv, level: lv });
        }
        prevSig = sig;
    }
    if (craftableFamilies().length) out.push({ key: SPECIAL_TAB, label: "Especiales" });
    return out;
}

// Familias de las que tenés objeto Y que tienen algún especial que podés hacer.
function craftableFamilies() {
    return Object.keys(materials).filter(fam => materials[fam] > 0
        && items.some(it => it.requires_material === fam && canBuyAtLevel(it, characterLevel)));
}

// "Nuevo": solo en la pestaña de tu nivel, si hay ítems que aparecen justo ahí.
function tabHasNews(tab) {
    if (tab.key === SPECIAL_TAB || tab.level !== characterLevel) return false;
    return itemsForTab(characterLevel).some(it => isItemNewForLevel(it, characterLevel));
}

function renderTabs() {
    const bar = document.getElementById("armeriaTabs");
    bar.innerHTML = "";
    tabs.forEach(tab => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "armeria-tab" + (tab.key === activeTab ? " active" : "") + (tab.key === SPECIAL_TAB ? " armeria-tab--special" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", String(tab.key === activeTab));
        btn.textContent = tab.label;
        if (tabHasNews(tab)) {
            const dot = document.createElement("span");
            dot.className = "armeria-new-tag";
            dot.textContent = "Nuevo";
            btn.appendChild(dot);
        }
        btn.addEventListener("click", () => {
            activeTab = tab.key;
            render();
        });
        bar.appendChild(btn);
    });
}

// ---------- Compra ----------
// item-connect si el slot está vacío, item-replace si ya hay algo puesto.
// El oro (y el objeto, si es especial) se validan y descuentan en el
// servidor: goldBalance se actualiza con lo que devuelve.
async function equipItem(item) {
    if (isSpecialItem(item)) {
        const mat = materialCatalog[item.requires_material] || "el objeto";
        const replacing = equipment[item.slot] ? ` Reemplaza lo que tenés en ${SLOT_LABELS[item.slot].toLowerCase()}.` : "";
        const ok = confirm(`¿Crear ${item.label} por ${item.price} de oro y 1 ${mat}? Mantenimiento: ${item.maintenance_price || 0} de oro por mes.${replacing}`);
        if (!ok) return;
    }
    const action = equipment[item.slot] ? replaceItem : connectItem;
    const result = await action(item.key);
    if (result.error) {
        alert(result.error);
        return;
    }
    goldBalance = result.gold;
    equipment[item.slot] = item.key;
    if (isSpecialItem(item)) {
        materials[item.requires_material] = Math.max(0, (materials[item.requires_material] || 0) - 1);
        tabs = buildTabs();
        if (!tabs.some(t => t.key === activeTab)) activeTab = defaultTab();
    }
    updateGoldLabel();
    render();
}

// ---------- Cartas ----------
// Valor más alto de cualquier stat entre los ítems de una lista (y lo
// equipado en ese slot): con eso se llena la barra, así las cartas de
// una misma sección se comparan entre sí.
function maxStatOf(list, slot) {
    const eq = equipment[slot] ? items.find(it => it.key === equipment[slot]) : null;
    const values = [...list, eq].filter(Boolean).flatMap(it => Object.values(it.stats || {}));
    return Math.max(1, ...values);
}

// Stats en columna: nombre · barra · valor · diferencia con lo equipado.
// La rayita blanca de la barra marca lo que da tu ítem equipado en ese
// stat. Al final, tachados, los stats que tenés y este ítem no da.
function statRows(item, maxVal) {
    const isEquipped = equipment[item.slot] === item.key;
    const eqItem = equipment[item.slot] ? items.find(it => it.key === equipment[item.slot]) : null;
    const eq = isEquipped ? {} : (eqItem?.stats || {});
    const own = item.stats || {};
    const keys = [...Object.keys(own), ...Object.keys(eq).filter(k => !(k in own))];
    const pct = v => Math.min(100, (v / maxVal) * 100);

    const box = document.createElement("div");
    box.className = "armeria-stat-list";
    keys.forEach(k => {
        const v = own[k] || 0;
        const lost = !(k in own);
        const diff = v - (eq[k] || 0);
        const row = document.createElement("div");
        row.className = "armeria-stat-row" + (lost ? " is-lost" : "");
        const delta = isEquipped || !eqItem ? "" :
            diff > 0 ? `<span class="armeria-stat-delta up">▲${diff}</span>`
            : diff < 0 ? `<span class="armeria-stat-delta down">▼${-diff}</span>`
            : `<span class="armeria-stat-delta same">=</span>`;
        const ghost = !isEquipped && eq[k] ? `<span class="armeria-stat-ghost" style="left:${pct(eq[k])}%"></span>` : "";
        row.innerHTML = `
            <span class="armeria-stat-name">${k}</span>
            <span class="armeria-stat-bar"><span class="armeria-stat-fill" style="width:${pct(v)}%"></span>${ghost}</span>
            <span class="armeria-stat-value">${lost ? "—" : v}</span>
            ${delta || '<span class="armeria-stat-delta"></span>'}`;
        box.appendChild(row);
    });

    // Total: dato chico (no reemplaza mirar qué stats te sirven).
    if (!isEquipped && eqItem) {
        const tot = Object.values(own).reduce((a, b) => a + b, 0);
        const totEq = Object.values(eq).reduce((a, b) => a + b, 0);
        const d = tot - totEq;
        const total = document.createElement("div");
        total.className = "armeria-stat-total";
        total.innerHTML = `Total ${tot} ${d > 0 ? `<span class="armeria-stat-delta up">▲${d}</span>` : d < 0 ? `<span class="armeria-stat-delta down">▼${-d}</span>` : ""} <span class="armeria-stat-vs">vs ${totEq} de ${eqItem.label}</span>`;
        box.appendChild(total);
    }
    return box;
}

function itemCard(item, { showSlot = false, maxVal = 10 } = {}) {
    const isEquipped = equipment[item.slot] === item.key;
    const canAfford = goldBalance >= item.price;
    const isNew = isItemNewForLevel(item, characterLevel);
    const grants = grantsLine(item);
    const special = isSpecialItem(item);

    const card = document.createElement("div");
    card.className = "armeria-item-card" + (isEquipped ? " equipped" : "") + (isNew ? " is-new" : "") + (special ? " is-special" : "");
    const slotTag = showSlot ? `<span class="armeria-item-slot">${SLOT_LABELS[item.slot] || item.slot}</span>` : "";
    const matLine = special ? `<div class="armeria-item-material">+ 1 ${materialCatalog[item.requires_material] || item.requires_material}</div>` : "";
    card.innerHTML = `
        <div class="armeria-item-header">
            <span class="armeria-item-name">${item.label}${isNew ? ' <span class="armeria-new-tag">Nuevo</span>' : ""}</span>
            <span class="armeria-item-price">${item.price} ${ICON_COINS}</span>
        </div>
        ${slotTag}
        ${matLine}
    `;
    card.appendChild(statRows(item, maxVal));
    if (grants) {
        const g = document.createElement("div");
        g.className = "armeria-item-grants";
        g.textContent = grants;
        card.appendChild(g);
    }

    // Pie: mantenimiento (en su propia línea, separado) y el botón.
    const footer = document.createElement("div");
    footer.className = "armeria-item-footer";
    footer.innerHTML = `<div class="armeria-item-upkeep">Mantenimiento <strong>${item.maintenance_price || 0} ${ICON_COINS}</strong> por mes</div>`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "armeria-item-btn";
    if (isEquipped) {
        btn.textContent = "Equipado";
        btn.disabled = true;
    } else {
        btn.textContent = special ? "Crear" : (equipment[item.slot] ? "Reemplazar" : "Comprar");
        btn.disabled = !canAfford;
        btn.addEventListener("click", () => equipItem(item));
    }
    footer.appendChild(btn);
    card.appendChild(footer);
    return card;
}

function equippedLine(slot) {
    const currentKey = equipment[slot];
    const currentItem = currentKey ? items.find(it => it.key === currentKey) : null;
    const line = document.createElement("div");
    line.className = "armeria-current";
    line.textContent = `Equipado: ${currentItem?.label || currentKey || "Ninguno"}`;
    // De un nivel anterior: se muestra lo que da, para compararlo.
    if (isOutdated(currentItem)) {
        line.classList.add("armeria-current--outdated");
        const detail = document.createElement("div");
        detail.className = "armeria-current-detail";
        const grants = grantsLine(currentItem);
        detail.textContent = `De nivel anterior · Te da: ${statsLine(currentItem.stats)}${grants ? " · " + grants : ""}`;
        line.appendChild(detail);
    }
    return line;
}

// ---------- Vistas ----------
function renderTier(container, tab) {
    SLOTS.forEach(slot => {
        const forSale = itemsForTab(tab.level).filter(it => it.slot === slot);
        if (!forSale.length) return;

        const section = document.createElement("div");
        section.className = "armeria-slot-section";
        const heading = document.createElement("h3");
        heading.textContent = SLOT_LABELS[slot];
        if (tab.level === characterLevel && forSale.some(it => isItemNewForLevel(it, characterLevel))) {
            const tag = document.createElement("span");
            tag.className = "armeria-new-tag";
            tag.textContent = "Nuevo";
            heading.appendChild(tag);
        }
        section.appendChild(heading);
        section.appendChild(equippedLine(slot));

        const list = document.createElement("div");
        list.className = "armeria-item-list";
        const maxVal = maxStatOf(forSale, slot);
        forSale.forEach(item => list.appendChild(itemCard(item, { maxVal })));
        section.appendChild(list);
        container.appendChild(section);
    });
}

function renderSpecials(container) {
    const intro = document.createElement("p");
    intro.className = "armeria-special-intro";
    intro.textContent = "Piezas únicas creadas con objetos de las criaturas del laberinto. Cada una gasta un objeto al crearse. Son caras de hacer y de mantener.";
    container.appendChild(intro);

    craftableFamilies().forEach(fam => {
        const section = document.createElement("div");
        section.className = "armeria-slot-section";
        const heading = document.createElement("h3");
        heading.textContent = materialCatalog[fam] || fam;
        const count = document.createElement("span");
        count.className = "armeria-material-count";
        count.textContent = `×${materials[fam]}`;
        heading.appendChild(count);
        section.appendChild(heading);

        const list = document.createElement("div");
        list.className = "armeria-item-list";
        const specials = items.filter(it => it.requires_material === fam && canBuyAtLevel(it, characterLevel));
        specials.forEach(item => list.appendChild(itemCard(item, { showSlot: true, maxVal: maxStatOf(specials, item.slot) })));
        section.appendChild(list);
        container.appendChild(section);
    });
}

function render() {
    renderTabs();
    const container = document.getElementById("armeriaSlots");
    container.innerHTML = "";
    const tab = tabs.find(t => t.key === activeTab);
    if (!tab) return;
    if (tab.key === SPECIAL_TAB) renderSpecials(container);
    else renderTier(container, tab);
}

// Al entrar: el tramo más alto que tenés disponible.
function defaultTab() {
    const tiers = tabs.filter(t => t.key !== SPECIAL_TAB);
    return tiers.length ? tiers[tiers.length - 1].key : tabs[0]?.key ?? null;
}

async function init() {
    const [itemsRes, equipmentRes, bankRes, levelRes, catalogRes, materialsRes] = await Promise.all([
        getItems(), getEquipment(), getBank(), getCharacterLevel(), getMaterialCatalog(), getMaterials()
    ]);
    items = itemsRes;
    characterLevel = levelRes;
    equipment = equipmentRes;
    goldBalance = bankRes.gold;
    materialCatalog = Object.fromEntries(catalogRes.map(m => [m.family, m.label]));
    materials = materialsRes;
    tabs = buildTabs();
    activeTab = defaultTab();
    // Entró a la armería en este nivel: se apaga el "!" de la ciudad.
    const session = getSession();
    if (session) markArmeriaSeen(characterLevel, session.id);
    updateGoldLabel();
    render();
}

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();
