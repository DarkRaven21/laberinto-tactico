// ============================================================
// ciudad-tablon.js — Tablón de anuncios de la ciudad.
//  · Notas del parche: el contenido es HTML fijo en ciudad.html
//    (#patchOverlay). Para publicar notas nuevas se reemplaza ese
//    bloque y se cambia su data-version: eso vuelve a encender el
//    "Nuevo" para todos.
//  · Mejores exploradores: top 10 por XP (función SQL get_leaderboard).
// ============================================================
import { getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

const overlay = document.getElementById("patchOverlay");
const openBtn = document.getElementById("patchOpenBtn");
const newTag = document.getElementById("patchNewTag");
const titleEl = document.getElementById("patchCardTitle");

// ---------- Notas del parche ----------
function seenKey() {
    const session = getSession();
    return `combate:patchSeen:${session?.id || "anon"}`;
}

function patchVersion() {
    return overlay?.dataset.version || "";
}

function isUnread() {
    try {
        return localStorage.getItem(seenKey()) !== patchVersion();
    } catch {
        return false;
    }
}

function markRead() {
    try {
        localStorage.setItem(seenKey(), patchVersion());
    } catch {
        // sin storage: el "Nuevo" vuelve a aparecer, no es grave
    }
}

function renderPatchCard() {
    if (titleEl && overlay) titleEl.textContent = overlay.dataset.title || "Notas del parche";
    if (newTag) newTag.hidden = !isUnread();
}

function openPatch() {
    overlay.classList.add("show");
    document.body.classList.add("help-open");
    markRead();
    renderPatchCard();
}

function closePatch() {
    overlay.classList.remove("show");
    document.body.classList.remove("help-open");
}

if (overlay && openBtn) {
    openBtn.addEventListener("click", openPatch);
    overlay.querySelectorAll("[data-close-patch]").forEach(btn => btn.addEventListener("click", closePatch));
    // Click afuera del cuadro o Escape también cierran.
    overlay.addEventListener("click", e => { if (e.target === overlay) closePatch(); });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && overlay.classList.contains("show")) closePatch();
    });
    renderPatchCard();
}

// ---------- Mejores exploradores ----------
function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
}

async function renderLeaderboard() {
    const body = document.getElementById("leaderboardBody");
    if (!body) return;
    try {
        const res = await supabaseFetch("/rest/v1/rpc/get_leaderboard", { method: "POST", body: "{}" });
        const rows = await res.json();
        if (!Array.isArray(rows)) throw new Error("Respuesta inválida");
        if (rows.length === 0) {
            body.innerHTML = `<tr><td colspan="5" class="lb-empty">Todavía nadie ganó experiencia.</td></tr>`;
            return;
        }
        body.innerHTML = rows.map((r, i) => `
            <tr class="${r.dead ? "lb-dead" : ""}">
                <td class="lb-pos">${i + 1}</td>
                <td class="lb-name">${escapeHtml(r.name)}<span class="lb-class">${escapeHtml(r.class_label || "")}</span></td>
                <td class="lb-level">${r.level}</td>
                <td class="lb-xp">${r.xp}</td>
                <td class="lb-status"><span class="lb-badge ${r.dead ? "lb-badge--dead" : "lb-badge--alive"}">${r.dead ? "Muerto" : "Vivo"}</span></td>
            </tr>
        `).join("");
    } catch {
        body.innerHTML = `<tr><td colspan="5" class="lb-empty">No se pudo cargar la tabla. Probá más tarde.</td></tr>`;
    }
}

renderLeaderboard();
