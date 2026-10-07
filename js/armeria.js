import { requireSession, getSession } from "./session.js";
import { getBank } from "./citybank.js";
import {
    getItems, getEquipment, connectItem, replaceItem, getCharacterLevel,
    isItemForLevel, isItemNewForLevel, markArmeriaSeen
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

// Catálogo COMPLETO: se usa para mostrar el nombre de lo equipado aunque
// sea de otro rango de nivel. Para la lista de compra se filtra por nivel.
let items = [];
let characterLevel = 1;
let equipment = {}; // { slot: item_key }
let goldBalance = 0;

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

// El ítem equipado quedó de un rango de nivel anterior (ya no se vende).
function isOutdated(item) {
    return item && item.max_level != null && item.max_level < characterLevel;
}

// Comprar/equipar: item-connect si el slot está vacío, item-replace
// si ya hay algo puesto (ver equipment.js). El oro se valida y
// descuenta enteramente server-side — goldBalance se actualiza con
// lo que devuelve la edge function, nunca con un cálculo del cliente.
async function equipItem(item) {
    const alreadyOccupied = !!equipment[item.slot];
    const action = alreadyOccupied ? replaceItem : connectItem;

    const result = await action(item.key);
    if (result.error) {
        alert(result.error);
        return;
    }

    goldBalance = result.gold;
    equipment[item.slot] = item.key;
    updateGoldLabel();
    render();
}

function render() {
    const container = document.getElementById("armeriaSlots");
    container.innerHTML = "";

    SLOTS.forEach(slot => {
        const section = document.createElement("div");
        section.className = "armeria-slot-section";

        const forSale = items.filter(it => it.slot === slot && isItemForLevel(it, characterLevel));
        const slotHasNews = forSale.some(it => isItemNewForLevel(it, characterLevel));

        const heading = document.createElement("h3");
        heading.textContent = SLOT_LABELS[slot];
        if (slotHasNews) {
            const tag = document.createElement("span");
            tag.className = "armeria-new-tag";
            tag.textContent = "Nuevo";
            heading.appendChild(tag);
        }
        section.appendChild(heading);

        // Lo equipado: solo el nombre, salvo que sea de un nivel anterior;
        // en ese caso se muestra lo que da, para compararlo con lo nuevo.
        const currentKey = equipment[slot];
        const currentItem = currentKey ? items.find(it => it.key === currentKey) : null;
        const currentLine = document.createElement("div");
        currentLine.className = "armeria-current";
        currentLine.textContent = `Equipado: ${currentItem?.label || currentKey || "Ninguno"}`;
        if (isOutdated(currentItem)) {
            currentLine.classList.add("armeria-current--outdated");
            const detail = document.createElement("div");
            detail.className = "armeria-current-detail";
            const grants = grantsLine(currentItem);
            detail.textContent = `De nivel anterior · Te da: ${statsLine(currentItem.stats)}${grants ? " · " + grants : ""}`;
            currentLine.appendChild(detail);
        }
        section.appendChild(currentLine);

        const list = document.createElement("div");
        list.className = "armeria-item-list";
        if (forSale.length === 0) {
            const empty = document.createElement("div");
            empty.className = "armeria-empty";
            empty.textContent = "No hay items para tu nivel en este slot.";
            list.appendChild(empty);
        }

        forSale.forEach(item => {
            const isEquipped = equipment[slot] === item.key;
            const canAfford = goldBalance >= item.price;

            const isNew = isItemNewForLevel(item, characterLevel);
            const grants = grantsLine(item);

            const card = document.createElement("div");
            card.className = "armeria-item-card" + (isEquipped ? " equipped" : "") + (isNew ? " is-new" : "");
            card.innerHTML = `
                <div class="armeria-item-header">
                    <span class="armeria-item-name">${item.label}${isNew ? ' <span class="armeria-new-tag">Nuevo</span>' : ""}</span>
                    <span class="armeria-item-price">${item.price} ${ICON_COINS}</span>
                </div>
                <div class="armeria-item-stats">${statsLine(item.stats)}</div>
                ${grants ? `<div class="armeria-item-grants">${grants}</div>` : ""}
            `;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "armeria-item-btn";
            if (isEquipped) {
                btn.textContent = "Equipado";
                btn.disabled = true;
            } else {
                btn.textContent = equipment[slot] ? "Reemplazar" : "Comprar";
                btn.disabled = !canAfford;
                btn.addEventListener("click", () => equipItem(item));
            }
            card.appendChild(btn);
            list.appendChild(card);
        });

        section.appendChild(list);
        container.appendChild(section);
    });
}

async function init() {
    const [itemsRes, equipmentRes, bankRes, levelRes] = await Promise.all([
        getItems(), getEquipment(), getBank(), getCharacterLevel()
    ]);
    items = itemsRes;
    characterLevel = levelRes;
    equipment = equipmentRes;
    goldBalance = bankRes.gold;
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
