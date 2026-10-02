// ============================================================
// ciudad-ayuda.js — popup "Cómo funciona el juego" de la ciudad.
// Se abre solo la primera vez que cada personaje entra a la ciudad
// (se recuerda en localStorage, por personaje) y después cuando el
// jugador toca el botón "?" del header. Va en su propio archivo para
// no tocar ciudad.js.
// ============================================================
import { getSession } from "./session.js";

const overlay = document.getElementById("helpOverlay");
const helpBtn = document.getElementById("helpBtn");
const closeBtn = document.getElementById("helpCloseBtn");
const okBtn = document.getElementById("helpOkBtn");

function seenKey() {
    const session = getSession();
    return `combate:helpSeen:${session?.id ?? "anon"}`;
}

function alreadySeen() {
    try {
        return localStorage.getItem(seenKey()) === "1";
    } catch {
        return false; // sin localStorage: se muestra, no pasa nada
    }
}

function markSeen() {
    try {
        localStorage.setItem(seenKey(), "1");
    } catch {
        // sin localStorage: la próxima vez se vuelve a mostrar
    }
}

function openHelp() {
    overlay.classList.add("show");
    document.body.classList.add("help-open");
    overlay.querySelector(".help-dialog-body").scrollTop = 0;
    okBtn.focus();
}

function closeHelp() {
    overlay.classList.remove("show");
    document.body.classList.remove("help-open");
    markSeen();
    helpBtn.focus();
}

helpBtn.addEventListener("click", openHelp);
closeBtn.addEventListener("click", closeHelp);
okBtn.addEventListener("click", closeHelp);

// Click en el fondo oscuro (fuera del cuadro) también cierra.
overlay.addEventListener("click", e => {
    if (e.target === overlay) closeHelp();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && overlay.classList.contains("show")) closeHelp();
});

if (!alreadySeen()) openHelp();
