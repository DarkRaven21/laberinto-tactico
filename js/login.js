import { saveSession, getSession } from "./session.js";
import { supabaseFetch } from "./httpClient.js";

if (getSession()) {
    window.location.href = "ciudad.html";
}

async function loadClasses() {
    const select = document.getElementById("c-class");
    const cached = sessionStorage.getItem("cache:characterClasses");

    if (cached) {
        try {
            const classes = JSON.parse(cached);
            classes.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.key;
                opt.textContent = c.label;
                select.appendChild(opt);
            });
            return;
        } catch {
            // cache corrupta, seguimos y la pedimos de nuevo
        }
    }

    const res = await supabaseFetch("/rest/v1/character_classes?select=key,label");
    const classes = await res.json();
    sessionStorage.setItem("cache:characterClasses", JSON.stringify(classes));
    classes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.textContent = c.label;
        select.appendChild(opt);
    });
}

function showError(msg) {
    document.getElementById("loginError").textContent = msg;
}

function switchTab(tab) {
    document.getElementById("tabCreate").classList.toggle("active", tab === "create");
    document.getElementById("tabLogin").classList.toggle("active", tab === "login");
    document.getElementById("formCreate").classList.toggle("active", tab === "create");
    document.getElementById("formLogin").classList.toggle("active", tab === "login");
    showError("");
}

async function crearPersonaje() {
    const name = document.getElementById("c-name").value;
    const age = document.getElementById("c-age").value;
    const gender = document.getElementById("c-gender").value;
    const password = document.getElementById("c-password").value;
    const class_key = document.getElementById("c-class").value;

    if (!gender) {
        showError("Elegí un género.");
        return;
    }

    const res = await supabaseFetch("/functions/v1/create-character", {
        method: "POST",
        body: JSON.stringify({ name, age: Number(age), gender, password, class_key })
    });
    const data = await res.json();

    if (data.error) {
        showError(data.error);
        return;
    }

    await login(name, password);
}

async function login(nameOverride, passwordOverride) {
    const name = nameOverride ?? document.getElementById("l-name").value;
    const password = passwordOverride ?? document.getElementById("l-password").value;

    const res = await supabaseFetch("/functions/v1/login-character", {
        method: "POST",
        body: JSON.stringify({ name, password })
    });
    const data = await res.json();

    if (data.error) {
        showError(data.error);
        return;
    }

    saveSession(data.character);
    window.location.href = "ciudad.html";
}

document.getElementById("tabCreate").addEventListener("click", () => switchTab("create"));
document.getElementById("tabLogin").addEventListener("click", () => switchTab("login"));
document.getElementById("createBtn").addEventListener("click", crearPersonaje);
document.getElementById("loginBtn").addEventListener("click", () => login());

loadClasses();
