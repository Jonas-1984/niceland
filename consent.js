/*
 * Cookie-/Einwilligungsverwaltung (DSGVO / TDDDG)
 *
 * - Gespeichert wird ausschließlich die Auswahl des Besuchers im localStorage
 *   (Schlüssel "niceland-consent"). Das ist technisch notwendig und setzt kein Tracking.
 * - Externe Inhalte (Google Maps) werden erst NACH Einwilligung geladen.
 * - "Datum und Uhrzeit" wird lokal im Browser berechnet, ist aber als Option wählbar.
 *
 * API:  NicelandConsent.subscribe(fn)  -> fn({maps, datetime}) sofort und bei jeder Änderung
 *       NicelandConsent.allow("maps")    -> einzelne Funktion aktivieren
 *       NicelandConsent.open()          -> Einstellungsdialog öffnen
 */
(function () {
    "use strict";

    var STORAGE_KEY = "niceland-consent";
    var VERSION = 1;
    var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // Einwilligung nach 12 Monaten erneut einholen
    var PRIVACY_URL = "datenschutz.html";

    var CATEGORIES = [
        {
            key: "maps",
            label: "Google Maps und Bewertungen",
            desc: "Zeigt eine Google-Karte und die Google-Bewertungen unseres Betriebs. Beim Laden werden Daten (u. a. Ihre IP-Adresse) an Google übertragen."
        },
        {
            key: "datetime",
            label: "Datum und Uhrzeit",
            desc: "Zeigt Datum, Uhrzeit, Wochentag und Kalenderwoche in der Fußleiste. Die Berechnung erfolgt lokal in Ihrem Browser, es werden keine Daten übertragen."
        }
    ];

    // Datum/Uhrzeit und Wochentag/KW erscheinen nur auf größeren Bildschirmen
    var SMALL_ONLY_HIDDEN = { datetime: true };

    function isSmallScreen() {
        return window.matchMedia("(max-width: 768px)").matches;
    }

    function visibleCategories() {
        return CATEGORIES.filter(function (cat) {
            return !(isSmallScreen() && SMALL_ONLY_HIDDEN[cat.key]);
        });
    }

    var state = null;
    var listeners = [];
    var lastFocus = null;
    var bannerEl = null;
    var modalEl = null;

    function readStored() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || parsed.version !== VERSION) return null;
            var age = Date.now() - new Date(parsed.timestamp).getTime();
            return age >= 0 && age < MAX_AGE_MS ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    function writeStored(value) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch (e) {
            /* Speicher nicht verfügbar: Auswahl gilt nur für diese Seitenansicht */
        }
    }

    function snapshot() {
        return {
            maps: !!(state && state.maps),
            datetime: !!(state && state.datetime)
        };
    }

    function notify() {
        var snap = snapshot();
        listeners.slice().forEach(function (fn) { fn(snap); });
    }

    function save(choices) {
        state = {
            version: VERSION,
            timestamp: new Date().toISOString(),
            maps: !!choices.maps,
            datetime: !!choices.datetime
        };
        writeStored(state);
        closeBanner();
        closeModal();
        notify();
    }

    function subscribe(fn) {
        listeners.push(fn);
        fn(snapshot());
    }

    function allow(key) {
        var next = snapshot();
        next[key] = true;
        save(next);
    }

    /* ---------- Banner ---------- */

    function openBanner() {
        if (bannerEl) return;
        bannerEl = document.createElement("div");
        var optionalNames = visibleCategories().map(function (cat) { return cat.label; }).join(", ");
        bannerEl.className = "consent-banner";
        bannerEl.setAttribute("role", "dialog");
        bannerEl.setAttribute("aria-modal", "false");
        bannerEl.setAttribute("aria-labelledby", "consent-banner-title");
        bannerEl.innerHTML =
            '<h2 id="consent-banner-title">Cookies &amp; externe Dienste</h2>' +
            "<p>Wir speichern nur Ihre Auswahl auf diesem Gerät. Optionale Funktionen (" + optionalNames + ") sind " +
            "standardmäßig <strong>aus</strong> und werden nur mit Ihrer Einwilligung aktiviert. " +
            'Dabei können Daten, z.&nbsp;B. Ihre IP-Adresse, an Dritte übertragen werden. Mehr dazu in der ' +
            '<a href="' + PRIVACY_URL + '">Datenschutzerklärung</a>.</p>' +
            '<div class="consent-actions">' +
            '<button type="button" class="consent-btn" data-consent="necessary">Nur notwendige</button>' +
            '<button type="button" class="consent-btn consent-btn-ghost" data-consent="settings">Einstellungen</button>' +
            '<button type="button" class="consent-btn" data-consent="all">Alle akzeptieren</button>' +
            "</div>";
        document.body.appendChild(bannerEl);
    }

    function closeBanner() {
        if (bannerEl) {
            bannerEl.remove();
            bannerEl = null;
        }
    }

    /* ---------- Einstellungsdialog ---------- */

    function openModal() {
        if (modalEl) return;
        lastFocus = document.activeElement;
        var current = snapshot();

        var rows = visibleCategories().map(function (cat) {
            return '<div class="consent-row">' +
                '<div class="consent-row-text"><strong>' + cat.label + "</strong><p>" + cat.desc + "</p></div>" +
                '<label class="consent-switch"><input type="checkbox" data-category="' + cat.key + '"' +
                (current[cat.key] ? " checked" : "") + ' aria-label="' + cat.label + '"><span></span></label>' +
                "</div>";
        }).join("");

        modalEl = document.createElement("div");
        modalEl.className = "consent-overlay";
        modalEl.innerHTML =
            '<div class="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">' +
            '<button type="button" class="consent-close" data-consent="close" aria-label="Schließen">&times;</button>' +
            '<h2 id="consent-modal-title">Cookie-Einstellungen</h2>' +
            '<p class="consent-intro">Sie entscheiden, welche Funktionen aktiv sind. Ihre Auswahl können Sie jederzeit über ' +
            'den Link „Cookies“ in der Fußleiste ändern oder widerrufen. Details in der ' +
            '<a href="' + PRIVACY_URL + '">Datenschutzerklärung</a>.</p>' +
            '<div class="consent-row">' +
            '<div class="consent-row-text"><strong>Notwendig</strong><p>Speichert Ihre Cookie-Auswahl in Ihrem Browser. ' +
            'Ohne diese Speicherung könnten wir Ihre Entscheidung nicht merken. Immer aktiv.</p></div>' +
            '<label class="consent-switch"><input type="checkbox" checked disabled aria-label="Notwendig"><span></span></label>' +
            "</div>" +
            rows +
            '<div class="consent-actions">' +
            '<button type="button" class="consent-btn" data-consent="necessary">Nur notwendige</button>' +
            '<button type="button" class="consent-btn" data-consent="save">Auswahl speichern</button>' +
            '<button type="button" class="consent-btn" data-consent="all">Alle akzeptieren</button>' +
            "</div></div>";
        document.body.appendChild(modalEl);

        var first = modalEl.querySelector("input:not([disabled]), button");
        if (first) first.focus();
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.remove();
        modalEl = null;
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
        lastFocus = null;
    }

    function collectModalChoices() {
        var choices = snapshot();
        visibleCategories().forEach(function (cat) {
            var input = modalEl.querySelector('input[data-category="' + cat.key + '"]');
            choices[cat.key] = !!(input && input.checked);
        });
        return choices;
    }

    function trapFocus(event) {
        if (!modalEl || event.key !== "Tab") return;
        var focusable = modalEl.querySelectorAll("button, input:not([disabled]), a[href]");
        if (!focusable.length) return;
        var firstEl = focusable[0];
        var lastEl = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === firstEl) {
            event.preventDefault();
            lastEl.focus();
        } else if (!event.shiftKey && document.activeElement === lastEl) {
            event.preventDefault();
            firstEl.focus();
        }
    }

    document.addEventListener("click", function (event) {
        var opener = event.target.closest("[data-open-cookie-settings]");
        if (opener) {
            event.preventDefault();
            openModal();
            return;
        }

        var optin = event.target.closest("[data-optin]");
        if (optin) {
            event.preventDefault();
            allow(optin.getAttribute("data-optin"));
            return;
        }

        var button = event.target.closest("[data-consent]");
        if (!button) {
            if (modalEl && event.target === modalEl) closeModal();
            return;
        }

        switch (button.getAttribute("data-consent")) {
            case "all":
                var all = snapshot();
                visibleCategories().forEach(function (cat) { all[cat.key] = true; });
                save(all);
                break;
            case "necessary":
                save({ maps: false, datetime: false });
                break;
            case "save":
                save(collectModalChoices());
                break;
            case "settings":
                openModal();
                break;
            case "close":
                closeModal();
                break;
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
        trapFocus(event);
    });

    /* ---------- Google Maps (erst nach Einwilligung) ---------- */

    var lastMapsState = null;

    function renderMaps(allowed) {
        if (allowed === lastMapsState) return;
        lastMapsState = allowed;

        document.querySelectorAll(".map-frame[data-map-src]").forEach(function (frame) {
            frame.textContent = "";

            if (allowed) {
                var iframe = document.createElement("iframe");
                iframe.src = frame.getAttribute("data-map-src");
                iframe.title = "Karte von Hamburg";
                iframe.loading = "lazy";
                iframe.referrerPolicy = "no-referrer-when-downgrade";
                iframe.allowFullscreen = true;
                frame.appendChild(iframe);
                return;
            }

            var box = document.createElement("div");
            box.className = "map-placeholder";
            box.innerHTML =
                "<p>Die Karte wird erst nach Ihrer Einwilligung geladen. Dabei werden Daten (u.&nbsp;a. Ihre IP-Adresse) " +
                'an Google übertragen. Mehr dazu in der <a href="' + PRIVACY_URL + '">Datenschutzerklärung</a>.</p>' +
                '<button type="button" class="consent-btn" data-optin="maps">Google Maps aktivieren</button>';
            frame.appendChild(box);
        });
    }

    /* ---------- Start ---------- */

    function init() {
        state = readStored();
        subscribe(function (snap) { renderMaps(snap.maps); });

        if (!state && !document.body.hasAttribute("data-no-banner")) openBanner();
    }

    window.NicelandConsent = {
        subscribe: subscribe,
        allow: allow,
        open: openModal
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
