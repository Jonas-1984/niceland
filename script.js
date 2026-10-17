document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const pages = document.querySelectorAll(".page");
    const nav = document.querySelector(".glass-nav");
    const homeItem = nav ? nav.querySelector('.nav-item[data-target="home"]') : null;

    // Mobile-Version: Wetter, Datum/Uhrzeit und Wochentag/KW werden nicht angezeigt
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    // Mobile-Version: Menü ist eingeklappt (nur Home-Symbol) und klappt per Antippen auf
    const setNavOpen = (open) => {
        if (!nav) return;
        nav.classList.toggle("open", open);
        if (homeItem) {
            if (mobileQuery.matches) homeItem.setAttribute("aria-expanded", String(open));
            else homeItem.removeAttribute("aria-expanded");
        }
    };

    const showPage = (targetId) => {
        document.body.dataset.page = targetId;
        // Aktive Klasse nur beim passenden Nav-Item setzen
        navItems.forEach((nav) => nav.classList.toggle("active", nav.getAttribute("data-target") === targetId));

        // Passende Seite anzeigen, alle anderen ausblenden
        pages.forEach((page) => {
            page.classList.toggle("active", page.id === targetId);
        });
    };

    navItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();

            // Erstes Antippen des Home-Symbols (Mobile) öffnet nur das Menü
            if (mobileQuery.matches && nav && !nav.classList.contains("open")) {
                setNavOpen(true);
                return;
            }

            showPage(item.getAttribute("data-target"));
            setNavOpen(false);
        });
    });

    // Menü schließen: Tippen außerhalb, Escape oder Wechsel zur Desktop-Ansicht
    document.addEventListener("click", (e) => {
        if (nav && nav.classList.contains("open") && !nav.contains(e.target)) setNavOpen(false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setNavOpen(false);
    });
    mobileQuery.addEventListener("change", () => setNavOpen(false));
    setNavOpen(false);
    document.body.dataset.page = (document.querySelector(".page.active") || {}).id || "home";

    // Klick auf das Logo führt zurück zur Startseite
    document.querySelectorAll(".logo, .topbar-logo").forEach((logo) => {
        logo.addEventListener("click", () => {
            showPage("home");
            setNavOpen(false);
            window.scrollTo({ top: 0 });
        });
    });

    const gallery = document.querySelector(".gallery");
    if (gallery) {
        const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
        const dots = Array.from(gallery.querySelectorAll(".gallery-dot"));
        const caption = gallery.querySelector(".gallery-caption");
        const captionText = gallery.querySelector(".gallery-caption-text");

        const TRANSITION_MS = 900;
        const AUTOPLAY_MS = 6000;
        const CAPTION_MS = 300;

        let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains("active")));
        let isAnimating = false;
        let autoplayTimer = null;

        const updateDots = (index) => {
            dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
        };

        const updateCaption = (index) => {
            if (!caption || !captionText) return;
            caption.style.opacity = "0";
            setTimeout(() => {
                captionText.textContent = slides[index].getAttribute("data-desc") || "";
                caption.style.opacity = "1";
            }, CAPTION_MS);
        };

        const showSlide = (nextIndex, direction) => {
            if (nextIndex === activeIndex || isAnimating) return;
            isAnimating = true;

            const current = slides[activeIndex];
            const next = slides[nextIndex];

            next.style.transition = "none";
            next.style.transform = direction === "next" ? "translateX(40px)" : "translateX(-40px)";
            next.style.opacity = "0";
            next.style.zIndex = "2";
            current.style.zIndex = "1";

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    next.style.transition = `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`;
                    next.style.transform = "translateX(0)";
                    next.style.opacity = "1";
                    current.style.transition = `opacity ${TRANSITION_MS}ms ease`;
                    current.style.opacity = "0";
                });
            });

            setTimeout(() => {
                current.classList.remove("active");
                current.style.cssText = "";
                next.classList.add("active");
                next.style.cssText = "";
                activeIndex = nextIndex;
                isAnimating = false;
                updateDots(activeIndex);
                updateCaption(activeIndex);
            }, TRANSITION_MS);
        };

        const goRelative = (step) => {
            const nextIndex = (activeIndex + step + slides.length) % slides.length;
            showSlide(nextIndex, step > 0 ? "next" : "prev");
        };

        const startAutoplay = () => {
            autoplayTimer = setInterval(() => goRelative(1), AUTOPLAY_MS);
        };

        const resetAutoplay = () => {
            clearInterval(autoplayTimer);
            startAutoplay();
        };

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                if (index === activeIndex) return;
                showSlide(index, index > activeIndex ? "next" : "prev");
                resetAutoplay();
            });
        });

        const galleryTrack = gallery.querySelector(".gallery-track");
        const SWIPE_THRESHOLD = 40;
        let touchStartX = null;
        let touchStartY = null;
        let isSwiping = null;

        galleryTrack.addEventListener("touchstart", (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = null;
        }, { passive: true });

        galleryTrack.addEventListener("touchmove", (e) => {
            if (touchStartX === null) return;

            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            if (isSwiping === null) {
                isSwiping = Math.abs(deltaX) > Math.abs(deltaY);
            }

            // Nur bei horizontaler Wisch-Absicht das native (vertikale) Scrollen unterbinden.
            if (isSwiping) e.preventDefault();
        }, { passive: false });

        galleryTrack.addEventListener("touchend", (e) => {
            if (touchStartX === null) return;

            const deltaX = e.changedTouches[0].clientX - touchStartX;
            touchStartX = null;
            touchStartY = null;

            if (isSwiping && Math.abs(deltaX) >= SWIPE_THRESHOLD) {
                goRelative(deltaX < 0 ? 1 : -1);
                resetAutoplay();
            }

            isSwiping = null;
        }, { passive: true });

        updateDots(activeIndex);
        updateCaption(activeIndex);
        startAutoplay();
    }

    const servicesGrid = document.querySelector(".services-grid");
    if (servicesGrid && window.matchMedia("(max-width: 768px)").matches) {
        const items = Array.from(servicesGrid.querySelectorAll(".service-item"));
        const SERVICE_AUTOPLAY_MS = 6000;
        const SERVICE_SWIPE_THRESHOLD = 40;

        let activeServiceIndex = Math.max(0, items.findIndex((item) => item.classList.contains("active")));
        let serviceAutoplayTimer = null;

        const showService = (index) => {
            items.forEach((item, i) => item.classList.toggle("active", i === index));
            activeServiceIndex = index;
        };

        const goServiceRelative = (step) => {
            showService((activeServiceIndex + step + items.length) % items.length);
        };

        const startServiceAutoplay = () => {
            serviceAutoplayTimer = setInterval(() => goServiceRelative(1), SERVICE_AUTOPLAY_MS);
        };

        const resetServiceAutoplay = () => {
            clearInterval(serviceAutoplayTimer);
            startServiceAutoplay();
        };

        const SERVICE_SWIPE_INTENT_THRESHOLD = 10;
        let servicePointerStartX = null;
        let servicePointerStartY = null;
        let isServiceSwiping = null;
        let activeServicePointerId = null;

        servicesGrid.addEventListener("pointerdown", (e) => {
            activeServicePointerId = e.pointerId;
            servicePointerStartX = e.clientX;
            servicePointerStartY = e.clientY;
            isServiceSwiping = null;
            servicesGrid.setPointerCapture(e.pointerId);
        });

        servicesGrid.addEventListener("pointermove", (e) => {
            if (servicePointerStartX === null || e.pointerId !== activeServicePointerId) return;

            const deltaX = e.clientX - servicePointerStartX;
            const deltaY = e.clientY - servicePointerStartY;

            if (isServiceSwiping === null && (Math.abs(deltaX) > SERVICE_SWIPE_INTENT_THRESHOLD || Math.abs(deltaY) > SERVICE_SWIPE_INTENT_THRESHOLD)) {
                isServiceSwiping = Math.abs(deltaX) > Math.abs(deltaY);
            }

            if (isServiceSwiping) e.preventDefault();
        }, { passive: false });

        const endServiceSwipe = (e) => {
            if (servicePointerStartX === null || e.pointerId !== activeServicePointerId) return;

            const deltaX = e.clientX - servicePointerStartX;
            servicePointerStartX = null;
            servicePointerStartY = null;
            activeServicePointerId = null;

            if (!isServiceSwiping || Math.abs(deltaX) < SERVICE_SWIPE_THRESHOLD) {
                isServiceSwiping = null;
                return;
            }

            goServiceRelative(deltaX < 0 ? 1 : -1);
            resetServiceAutoplay();
            isServiceSwiping = null;
        };

        servicesGrid.addEventListener("pointerup", endServiceSwipe);
        servicesGrid.addEventListener("pointercancel", () => {
            servicePointerStartX = null;
            servicePointerStartY = null;
            isServiceSwiping = null;
            activeServicePointerId = null;
        });

        showService(activeServiceIndex);
        startServiceAutoplay();
    }

    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        const successMessage = document.getElementById("contact-form-success");
        const errorMessage = document.getElementById("contact-form-error");
        const submitButton = contactForm.querySelector(".form-submit");
        const submitLabel = submitButton.textContent;
        const formOpenedAt = Date.now();
        const FALLBACK_ERROR = "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt an info@niceland-hamburg.de.";

        const showMessage = (el, text) => {
            successMessage.classList.remove("visible");
            errorMessage.classList.remove("visible");
            if (text) el.textContent = text;
            el.classList.add("visible");
        };

        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!contactForm.reportValidity()) return;

            const data = new FormData(contactForm);
            // Sekunden seit dem Laden der Seite (Spam-Schutz, siehe send-mail.php)
            data.set("t", String(Math.round((Date.now() - formOpenedAt) / 1000)));

            submitButton.disabled = true;
            submitButton.textContent = "Wird gesendet …";
            successMessage.classList.remove("visible");
            errorMessage.classList.remove("visible");

            try {
                const response = await fetch(contactForm.getAttribute("action"), { method: "POST", body: data });
                const result = await response.json();

                if (response.ok && result.ok) {
                    showMessage(successMessage, result.message);
                    contactForm.reset();
                } else {
                    showMessage(errorMessage, result.message || FALLBACK_ERROR);
                }
            } catch (err) {
                showMessage(errorMessage, FALLBACK_ERROR);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = submitLabel;
            }
        });
    }

    // ===== Footer: Wetter, Datum/Uhrzeit, Wochentag/KW (nur nach Einwilligung) =====
    const weatherEl = document.getElementById("footer-weather");
    const datetimeEl = document.getElementById("footer-datetime");
    const weekEl = document.getElementById("footer-week");

    const TIME_ZONE = "Europe/Berlin";

    // Platzhalter mit Aktivieren-Schaltfläche, solange keine Einwilligung vorliegt
    const showOptIn = (el, key, label) => {
        el.textContent = "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "footer-optin";
        button.setAttribute("data-optin", key);
        button.textContent = label;
        el.appendChild(button);
    };

    // ISO-8601-Kalenderwoche
    const getIsoWeek = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    const dateFormat = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFormat = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const weekdayFormat = new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, weekday: "long" });

    let clockTimer = null;

    const updateClock = () => {
        const now = new Date();
        datetimeEl.textContent = `${dateFormat.format(now)} · ${timeFormat.format(now)} Uhr`;
        // Datum in Berliner Zeit für die Wochennummer verwenden
        const berlin = new Date(now.toLocaleString("en-US", { timeZone: TIME_ZONE }));
        weekEl.textContent = `${weekdayFormat.format(now)} · KW ${getIsoWeek(berlin)}`;
    };

    const startClock = () => {
        if (clockTimer) return;
        updateClock();
        clockTimer = setInterval(updateClock, 1000);
    };

    const stopClock = () => {
        clearInterval(clockTimer);
        clockTimer = null;
        showOptIn(datetimeEl, "datetime", "Datum & Uhrzeit anzeigen");
        weekEl.textContent = "–";
    };

    // Wetterdaten des Deutschen Wetterdienstes (DWD) über Bright Sky, Station Hamburg
    const WEATHER_LABELS = {
        "clear-day": "Klar",
        "clear-night": "Klar",
        "partly-cloudy-day": "Teils bewölkt",
        "partly-cloudy-night": "Teils bewölkt",
        "cloudy": "Bewölkt",
        "fog": "Nebel",
        "wind": "Windig",
        "rain": "Regen",
        "sleet": "Schneeregen",
        "snow": "Schnee",
        "hail": "Hagel",
        "thunderstorm": "Gewitter"
    };

    const WEATHER_URL = "https://api.brightsky.dev/current_weather?lat=53.55&lon=9.99&tz=Europe%2FBerlin&units=dwd";

    let weatherTimer = null;
    let weatherRequestId = 0;

    const loadWeather = async () => {
        const requestId = ++weatherRequestId;
        try {
            const response = await fetch(WEATHER_URL, { referrerPolicy: "no-referrer" });
            if (!response.ok) throw new Error(response.status);
            const { weather } = await response.json();
            if (requestId !== weatherRequestId || !weatherTimer) return;

            const parts = [`HH ${Math.round(weather.temperature)} °C`];
            if (WEATHER_LABELS[weather.icon]) parts.push(WEATHER_LABELS[weather.icon]);
            if (weather.wind_speed_10 != null) parts.push(`Wind ${Math.round(weather.wind_speed_10)} km/h`);
            if (weather.relative_humidity != null) parts.push(`${Math.round(weather.relative_humidity)} %`);

            weatherEl.textContent = parts.join(" · ");
            weatherEl.title = "Wetter Hamburg: Temperatur, Wetterlage, Wind, Luftfeuchtigkeit. Quelle: Deutscher Wetterdienst (DWD) über Bright Sky";
        } catch (err) {
            if (requestId === weatherRequestId && weatherTimer) {
                weatherEl.textContent = "Wetter derzeit nicht verfügbar";
            }
        }
    };

    const startWeather = () => {
        if (weatherTimer) return;
        weatherEl.textContent = "Wetter wird geladen …";
        weatherTimer = setInterval(loadWeather, 15 * 60 * 1000);
        loadWeather();
    };

    const stopWeather = () => {
        clearInterval(weatherTimer);
        weatherTimer = null;
        weatherRequestId++;
        weatherEl.removeAttribute("title");
        showOptIn(weatherEl, "weather", "Wetter anzeigen");
    };

    if (weatherEl && datetimeEl && weekEl && window.NicelandConsent) {
        let consentState = { weather: false, datetime: false };

        // Nur auf größeren Bildschirmen und nur mit Einwilligung: sonst keine Abrufe und keine Uhr
        const applyFooter = () => {
            const show = !mobileQuery.matches;
            if (show && consentState.weather) startWeather(); else stopWeather();
            if (show && consentState.datetime) startClock(); else stopClock();
        };

        window.NicelandConsent.subscribe((consent) => {
            consentState = consent;
            applyFooter();
        });
        mobileQuery.addEventListener("change", applyFooter);
    }
});
