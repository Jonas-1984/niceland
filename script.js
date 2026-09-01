document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const pages = document.querySelectorAll(".page");

    navItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();

            const targetId = item.getAttribute("data-target");

            // Aktive Klasse von Nav-Items entfernen
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");

            // Passende Seite anzeigen, alle anderen ausblenden
            pages.forEach((page) => {
                page.classList.toggle("active", page.id === targetId);
            });
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

        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();

            if (!contactForm.reportValidity()) return;

            successMessage.classList.add("visible");
            contactForm.reset();
        });
    }
});