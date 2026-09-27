/* ==========================================================
   CONGREGAZIONE PONTIFICIA
   Main JavaScript
   Multi-page navigation
========================================================== */


/* ==========================================================
   ELEMENTS
========================================================== */

const menuToggle = document.getElementById("menuToggle");
const sideNav = document.getElementById("sideNav");
const navOverlay = document.getElementById("navOverlay");


/* ==========================================================
   MENU
========================================================== */

function openMenu() {

    document.body.classList.add("menu-open");

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );

        menuToggle.setAttribute(
            "aria-label",
            "Chiudi menu"
        );

    }

}


function closeMenu() {

    document.body.classList.remove("menu-open");

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        menuToggle.setAttribute(
            "aria-label",
            "Apri menu"
        );

    }

}


function toggleMenu() {

    if (
        document.body.classList.contains(
            "menu-open"
        )
    ) {

        closeMenu();

    } else {

        openMenu();

    }

}


/* ==========================================================
   HAMBURGER
========================================================== */

if (menuToggle) {

    menuToggle.addEventListener(
        "click",
        toggleMenu
    );

}


/* ==========================================================
   OVERLAY
========================================================== */

if (navOverlay) {

    navOverlay.addEventListener(
        "click",
        closeMenu
    );

}


/* ==========================================================
   NAVIGATION
========================================================== */

/*
   The new app uses separate HTML pages:

       index.html
       religiosi.html
       documenti.html
       calendario.html

   Therefore navigation is handled by normal
   <a href="..."> links.

   We only close the menu when a navigation
   link is clicked.
*/

document.querySelectorAll(
    ".nav-item"
).forEach(item => {

    item.addEventListener(
        "click",
        () => {

            closeMenu();

        }
    );

});


/* ==========================================================
   ESCAPE KEY
========================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            document.body.classList.contains(
                "menu-open"
            )
        ) {

            closeMenu();

        }

    }
);


/* ==========================================================
   INITIAL STATE
========================================================== */

function initializeApp() {

    closeMenu();

}


/* ==========================================================
   START
========================================================== */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}