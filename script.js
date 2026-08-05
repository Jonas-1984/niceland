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
});