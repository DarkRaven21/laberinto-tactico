import { requireSession } from "./session.js";
import { getBank } from "./citybank.js";
import { getItems, getEquipment, connectItem, replaceItem, getCharacterLevel, isItemForLevel } from "./equipment.js";
import { ICON_COINS } from "./icons.js";

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

        const heading = document.createElement("h3");
        heading.textContent = SLOT_LABELS[slot];
        section.appendChild(heading);

        const currentKey = equipment[slot];
        const currentLabel = currentKey ? (items.find(it => it.key === currentKey)?.label || currentKey) : "Ninguno";
        const currentLine = document.createElement("div");
        currentLine.className = "armeria-current";
        currentLine.textContent = `Equipado: ${currentLabel}`;
        section.appendChild(currentLine);

        const list = document.createElement("div");
        list.className = "armeria-item-list";

        const forSale = items.filter(it => it.slot === slot && isItemForLevel(it, characterLevel));
        if (forSale.length === 0) {
            const empty = document.createElement("div");
            empty.className = "armeria-empty";
            empty.textContent = "No hay items para tu nivel en este slot.";
            list.appendChild(empty);
        }

        forSale.forEach(item => {
            const isEquipped = equipment[slot] === item.key;
            const canAfford = goldBalance >= item.price;

            const card = document.createElement("div");
            card.className = "armeria-item-card" + (isEquipped ? " equipped" : "");
            card.innerHTML = `
                <div class="armeria-item-header">
                    <span class="armeria-item-name">${item.label}</span>
                    <span class="armeria-item-price">${item.price} ${ICON_COINS}</span>
                </div>
                <div class="armeria-item-stats">${statsLine(item.stats)}</div>
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
    updateGoldLabel();
    render();
}

document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "ciudad.html";
});

init();
