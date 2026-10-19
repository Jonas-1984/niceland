/*
 * Google-Bewertungen im Bewertungskästchen der Kontaktseite.
 *
 * - Es wird nichts von Google geladen, bevor der Besucher im Cookie-Banner "Google Maps und Bewertungen" akzeptiert hat.
 * - Der API-Schlüssel steht in google-config.js (nicht in Git). Vorlage: google-config.example.js
 * - Zeigt Sterne-Durchschnitt, Anzahl und bis zu 5 Rezensionen (Daten, die Google liefert, unverändert).
 *
 * Optionale Werte in google-config.js:
 *   window.GOOGLE_MAPS_API_KEY = "...";      // Pflicht
 *   window.NICELAND_PLACE_ID   = "...";      // optional: überschreibt die eingebaute Place-ID
 *   window.NICELAND_REVIEW_URL = "...";      // optional (der Bewertungslink steht fest im Knopf in index.html)
 */
(function () {
    "use strict";

    var box = document.getElementById("google-reviews");
    if (!box) return;

    var body = document.getElementById("review-body");
    var writeLink = document.getElementById("review-write");
    var allLink = document.getElementById("review-all");
    var loadBtn = document.getElementById("review-load");

    var CONFIG_URL = "google-config.js?v=20261019";
    var PLACE_ID = "ChIJB1JLG9PRsEMRf-5u6PlD1XU"; // öffentliche Place-ID des Unternehmensprofils (kein Geheimnis)
    var SEARCH_TEXT = "Niceland-Hamburg Lübeck";
    var NAME_MATCH = "niceland";
    var ROTATE_MS = 8000;
    var MAX_TEXT = 400;

    var consent = false;
    var started = false;
    var visible = false;
    var rotateTimer = null;

    /* ---------- kleine Helfer ---------- */

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function safeUrl(url) {
        return typeof url === "string" && /^https:\/\//i.test(url) ? url : "";
    }

    function clear() {
        if (rotateTimer) {
            clearInterval(rotateTimer);
            rotateTimer = null;
        }
        while (body.firstChild) body.removeChild(body.firstChild);
    }

    function showNote(text) {
        clear();
        body.appendChild(el("p", "review-note", text));
    }

    function setWriteUrl(url) {
        var safe = safeUrl(url);
        if (safe && !writeLink.hasAttribute("data-fixed")) writeLink.setAttribute("href", safe);
    }

    function setAllUrl(url) {
        var safe = safeUrl(url);
        if (safe) {
            allLink.setAttribute("href", safe);
            allLink.hidden = false;
        }
    }

    function stars(rating) {
        var value = Math.max(0, Math.min(5, Number(rating) || 0));
        var wrap = el("span", "review-stars");
        wrap.setAttribute("role", "img");
        wrap.setAttribute("aria-label", value.toFixed(1).replace(".", ",") + " von 5 Sternen");
        wrap.appendChild(el("span", "review-stars-bg", "★★★★★"));
        var fg = el("span", "review-stars-fg", "★★★★★");
        fg.style.width = (value / 5) * 100 + "%";
        wrap.appendChild(fg);
        return wrap;
    }

    function formatScore(rating) {
        return (Number(rating) || 0).toFixed(1).replace(".", ",");
    }

    function reviewText(review) {
        var t = review && review.text;
        if (t && typeof t === "object") t = t.text;
        t = typeof t === "string" ? t.trim() : "";
        if (t.length > MAX_TEXT) t = t.slice(0, MAX_TEXT).replace(/\s+\S*$/, "") + " …";
        return t;
    }

    /* ---------- Darstellung ---------- */

    function render(data) {
        clear();
        loadBtn.hidden = true;

        var reviews = (data.reviews || []).filter(function (r) { return reviewText(r) || r.rating; }).slice(0, 5);

        if (!data.count && !reviews.length) {
            showNote("Noch keine Bewertungen. Wir freuen uns über Ihre Rückmeldung nach unserer gemeinsamen Arbeit.");
            return;
        }

        var summary = el("div", "review-summary");
        summary.appendChild(el("span", "review-score", formatScore(data.rating)));
        summary.appendChild(stars(data.rating));
        summary.appendChild(el("span", "review-count", (data.count || reviews.length) + (data.count === 1 ? " Bewertung" : " Bewertungen")));
        body.appendChild(summary);

        if (!reviews.length) {
            body.appendChild(el("p", "review-note", "Vielen Dank an alle, die uns bewertet haben. Rezensionen mit Text erscheinen hier."));
            return;
        }

        body.appendChild(el("span", "review-divider"));

        var quote = el("div", "review-quote");
        var slidesWrap = el("div", "review-slides");
        quote.appendChild(slidesWrap);
        body.appendChild(quote);

        // Alle Rezensionen liegen übereinander in einer Zelle: die Höhe bleibt stabil, gewechselt wird per Überblendung.
        var slides = reviews.map(function (r, n) {
            var slide = el("div", "review-slide");
            if (n !== 0) slide.setAttribute("aria-hidden", "true");

            var text = reviewText(r);
            if (text) slide.appendChild(el("p", "review-text", "„" + text + "“"));

            var meta = el("div", "review-meta");
            meta.appendChild(stars(r.rating));
            var author = (r.authorAttribution && r.authorAttribution.displayName) || r.author || "";
            var authorUri = r.authorAttribution && safeUrl(r.authorAttribution.uri);
            if (author) {
                if (authorUri) {
                    var a = el("a", null, author);
                    a.href = authorUri;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.tabIndex = n === 0 ? 0 : -1;
                    meta.appendChild(a);
                } else {
                    meta.appendChild(el("span", null, author));
                }
            }
            if (r.relativePublishTimeDescription) meta.appendChild(el("span", null, "· " + r.relativePublishTimeDescription));
            slide.appendChild(meta);
            slidesWrap.appendChild(slide);
            return slide;
        });

        var dots = [];
        var index = 0;

        function show(i) {
            index = i;
            slides.forEach(function (s, n) {
                var active = n === i;
                s.classList.toggle("is-active", active);
                s.setAttribute("aria-hidden", active ? "false" : "true");
                var link = s.querySelector("a");
                if (link) link.tabIndex = active ? 0 : -1;
            });
            dots.forEach(function (d, n) { d.classList.toggle("active", n === i); });
        }

        if (reviews.length > 1) {
            var dotWrap = el("div", "review-dots");
            dots = reviews.map(function (_, n) {
                var d = el("button", "review-dot");
                d.type = "button";
                d.setAttribute("aria-label", "Bewertung " + (n + 1));
                d.addEventListener("click", function () {
                    show(n);
                    restart();
                });
                dotWrap.appendChild(d);
                return d;
            });
            quote.appendChild(dotWrap);
        }

        function restart() {
            if (rotateTimer) clearInterval(rotateTimer);
            rotateTimer = null;
            if (reviews.length > 1) {
                rotateTimer = setInterval(function () { show((index + 1) % reviews.length); }, ROTATE_MS);
            }
        }

        show(0);
        restart();
    }

    function renderLocked() {
        clear();
        loadBtn.hidden = false;
        body.appendChild(el("p", "review-note",
            "Die Google-Bewertungen werden erst nach Ihrer Einwilligung geladen. Dabei werden Daten (u. a. Ihre IP-Adresse) an Google übertragen."));
    }

    /* ---------- Laden (nur mit Einwilligung) ---------- */

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function loadMaps(key) {
        return new Promise(function (resolve, reject) {
            if (window.google && window.google.maps) return resolve();
            window.__nicelandMapsReady = resolve;
            loadScript("https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) +
                "&libraries=places&loading=async&language=de&region=DE&callback=__nicelandMapsReady").catch(reject);
        });
    }

    function start() {
        if (started) return;
        started = true;
        showNote("Bewertungen werden geladen …");

        var configReady = window.GOOGLE_MAPS_API_KEY ? Promise.resolve() : loadScript(CONFIG_URL);

        configReady
            .then(function () {
                if (!window.GOOGLE_MAPS_API_KEY) throw new Error("kein Schlüssel");
                setWriteUrl(window.NICELAND_REVIEW_URL);
                return loadMaps(window.GOOGLE_MAPS_API_KEY);
            })
            .then(function () { return window.google.maps.importLibrary("places"); })
            .then(function (lib) {
                var Place = lib.Place;
                var cachedId = window.NICELAND_PLACE_ID || PLACE_ID || safeSession("niceland-place-id");

                function withPlace(id) {
                    sessionSet("niceland-place-id", id);
                    sessionSet("niceland-place-id", id);
                    if (!window.NICELAND_REVIEW_URL) setWriteUrl("https://search.google.com/local/writereview?placeid=" + encodeURIComponent(id));
                    var place = new Place({ id: id });
                    return place.fetchFields({ fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"] }).then(function () {
                        if (place.userRatingCount > 0) setAllUrl(place.googleMapsURI);
                        render({ rating: place.rating, count: place.userRatingCount, reviews: place.reviews });
                    });
                }

                if (cachedId) return withPlace(cachedId);

                return Place.searchByText({
                    textQuery: SEARCH_TEXT,
                    fields: ["id", "displayName"],
                    maxResultCount: 5,
                    language: "de",
                    region: "de"
                }).then(function (res) {
                    var places = (res && res.places) || [];
                    var match = places.filter(function (p) {
                        return String(p.displayName || "").toLowerCase().indexOf(NAME_MATCH) !== -1;
                    })[0];
                    if (!match) {
                        showNote("Hier erscheinen die Google-Bewertungen, sobald es welche gibt. Bewerten Sie uns gern auf Google.");
                        return null;
                    }
                    return withPlace(match.id);
                });
            })
            .catch(function (err) {
                started = false;
                console.warn("Google-Bewertungen konnten nicht geladen werden:", err);
                showNote("Die Bewertungen sind derzeit nicht abrufbar. Sie können uns trotzdem gern auf Google bewerten.");
            });
    }

    function safeSession(key) {
        try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function sessionSet(key, value) {
        try { window.sessionStorage.setItem(key, value); } catch (e) { /* ohne Zwischenspeicher weiter */ }
    }

    function update() {
        if (!consent) {
            started = false;
            renderLocked();
            return;
        }
        if (visible && !started) start();
        else if (!started) showNote("Ihre Meinung ist uns wichtig. Bewerten Sie uns gern auf Google.");
    }

    /* ---------- Start ---------- */

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            visible = entries.some(function (e) { return e.isIntersecting; });
            if (visible && consent && !started) start();
        }).observe(box);
    } else {
        visible = true;
    }

    if (window.NicelandConsent) {
        window.NicelandConsent.subscribe(function (c) {
            consent = !!c.maps;
            update();
        });
    } else {
        renderLocked();
    }

    // Test- und Erweiterungsschnittstelle
    window.NicelandReviews = { render: render };
})();
