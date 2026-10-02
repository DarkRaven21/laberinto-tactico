// icons.js — íconos sueltos de Lucide (https://lucide.dev, licencia ISC)
// usados en la UI. Van como string crudo de SVG en vez de cargar el
// paquete de lucide entero: no hay build step en este proyecto, así
// que no tiene sentido meter un runtime nuevo por un puñado de íconos.
// Para agregar otro: sacar el path de https://lucide.dev/icons/<nombre>
// y pegarlo acá con el mismo wrapper (viewBox 24x24, stroke currentColor).

export const ICON_COINS = `<svg class="lucide-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`;

export const ICON_HOURGLASS = `<svg class="lucide-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>`;
