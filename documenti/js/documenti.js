/* ==========================================================
   COSTITUZIONE — FLOATING READING CONTROLS
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const constitution = document.querySelector(".constitution");

    const tools = document.getElementById(
        "constitutionTools"
    );

    const toggle = document.getElementById(
        "constitutionToolsToggle"
    );

    const backToIndex = document.getElementById(
        "constitutionBackToIndex"
    );

    const increase = document.getElementById(
        "constitutionIncrease"
    );

    const decrease = document.getElementById(
        "constitutionDecrease"
    );


    /* ------------------------------------------------------
       STOP IF THIS IS NOT THE CONSTITUTION PAGE
    ------------------------------------------------------ */

    if (
        !constitution ||
        !tools ||
        !toggle ||
        !backToIndex ||
        !increase ||
        !decrease
    ) {
        return;
    }


    /* ------------------------------------------------------
       TEXT SIZE SETTINGS

       Default: 12px
       Minimum: 7px
       Maximum: 17px

       Exactly 5 steps in each direction.
    ------------------------------------------------------ */

    const DEFAULT_SIZE = 16;
    const MIN_SIZE = 12;
    const MAX_SIZE = 21;

    const STORAGE_KEY = "constitutionTextSize";


    /* ------------------------------------------------------
       LOAD SAVED TEXT SIZE
    ------------------------------------------------------ */

    const savedSize = parseInt(
        localStorage.getItem(STORAGE_KEY),
        10
    );

    let textSize =
        Number.isInteger(savedSize) &&
        savedSize >= MIN_SIZE &&
        savedSize <= MAX_SIZE
            ? savedSize
            : DEFAULT_SIZE;


    /* ------------------------------------------------------
       APPLY TEXT SIZE
    ------------------------------------------------------ */

    function applyTextSize() {

        constitution.style.setProperty(
            "--constitution-reading-size",
            `${textSize}px`
        );

    }


    /* Apply immediately */

    applyTextSize();


    /* ======================================================
       OPEN / CLOSE FLOATING MENU
    ====================================================== */

    toggle.addEventListener("click", () => {

        const isOpen =
            tools.classList.toggle("is-open");


        toggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );


        if (isOpen) {

            toggle.textContent = "×";

            toggle.setAttribute(
                "aria-label",
                "Chiudi strumenti di lettura"
            );

        } else {

            toggle.textContent = "⋮";

            toggle.setAttribute(
                "aria-label",
                "Apri strumenti di lettura"
            );

        }

    });


    /* ======================================================
       AUMENTA TESTO
    ====================================================== */

    increase.addEventListener("click", () => {

        if (textSize >= MAX_SIZE) {
            return;
        }


        textSize += 1;


        localStorage.setItem(
            STORAGE_KEY,
            String(textSize)
        );


        applyTextSize();

    });


    /* ======================================================
       DIMINUISCI TESTO
    ====================================================== */

    decrease.addEventListener("click", () => {

        if (textSize <= MIN_SIZE) {
            return;
        }


        textSize -= 1;


        localStorage.setItem(
            STORAGE_KEY,
            String(textSize)
        );


        applyTextSize();

    });


    /* ======================================================
       TORNA ALL'INDICE
    ====================================================== */

    backToIndex.addEventListener("click", () => {

        const index =
            constitution.querySelector(
                ".constitution-index"
            );


        if (!index) {
            return;
        }


        /* Scroll smoothly to the Constitution Index */

        index.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


        /* --------------------------------------------------
           Remove the current chapter hash from the URL.
        -------------------------------------------------- */

        if (history.replaceState) {

            history.replaceState(
                null,
                "",
                window.location.pathname +
                window.location.search
            );

        }


        /* --------------------------------------------------
           Close the floating menu
        -------------------------------------------------- */

        tools.classList.remove("is-open");


        toggle.setAttribute(
            "aria-expanded",
            "false"
        );


        toggle.setAttribute(
            "aria-label",
            "Apri strumenti di lettura"
        );


        toggle.textContent = "⋮";

    });

});