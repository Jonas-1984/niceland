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
            if (!caption) return;
            caption.style.opacity = "0";
            setTimeout(() => {
                caption.textContent = slides[index].getAttribute("data-desc") || "";
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

        updateDots(activeIndex);
        updateCaption(activeIndex);
        startAutoplay();
    }
});