// ============================================================
// loading.js — indicador global de "estamos esperando al server".
// Cero configuración: la primera vez que se llama a show()/withLoading()
// se inyecta a sí mismo (un <style> en <head> + un <div> en <body>),
// así ninguna página .php necesita markup ni <link> nuevo para esto.
// Un solo lugar de verdad para el look del loader — cambiarlo acá
// (colores, spinner vs. barra, posición) alcanza para toda la app.
// Es un overlay centrado con fondo oscuro (no un iconito de esquina):
// a propósito bloquea clicks mientras está visible, para evitar
// doble-submit en formularios (ej. login) mientras espera al server.
// ============================================================

// Contador en vez de un booleano: puede haber más de un fetch en
// vuelo al mismo tiempo (ej. progress-action pidiendo varias cosas
// en paralelo desde distintos módulos). El spinner tiene que quedarse
// visible hasta que el ÚLTIMO termine, no desaparecer cuando termina
// cualquiera de ellos.
let pending = 0;
let el = null;

function ensureElement() {
    if (el) return el;

    const style = document.createElement("style");
    style.textContent = `
        #global-loading {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(10, 11, 14, 0.35);
            /* Tiene que quedar SIEMPRE arriba de cualquier otro overlay
            inyectado (soul-popup y lifestyle-modal usan 10000) — si no,
            una request que arranca con un modal ya abierto (ej. click
            en "Confirmar" del estilo de vida) prende el spinner pero
            queda tapado atrás del modal, y se ve como que no pasa nada. */
            z-index: 10500;
        }
        #global-loading.show { display: flex; }
        #global-loading .global-loading-spinner {
            width: 34px;
            height: 34px;
            border: 4px solid rgba(255, 255, 255, 0.15);
            border-top-color: var(--amber, #c99a4a);
            border-radius: 50%;
            animation: global-loading-spin 0.7s linear infinite;
        }
        @keyframes global-loading-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    el = document.createElement("div");
    el.id = "global-loading";
    el.innerHTML = `<div class="global-loading-spinner"></div>`;
    document.body.appendChild(el);
    return el;
}

function show() {
    pending++;
    ensureElement().classList.add("show");
}

function hide() {
    pending = Math.max(0, pending - 1);
    if (pending === 0 && el) el.classList.remove("show");
}

// Envuelve cualquier función async: prende el spinner antes de
// arrancarla, lo apaga en el finally (salga bien o mal la promesa,
// así un error de red no deja el spinner tildado para siempre).
export async function withLoading(fn) {
    show();
    try {
        return await fn();
    } finally {
        hide();
    }
}
