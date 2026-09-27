/* ==========================================================
CONGREGAZIONE PONTIFICIA
I RELIGIOSI
Main JavaScript
========================================================== */

/* ==========================================================
FILES
========================================================== */

const EXCEL_FILE = "dat/dat-rel.xlsx";
const LOGO_PATH = "img/logo.png";

/* ==========================================================
EXCEL COLUMN NAMES
========================================================== */

const COLUMNS = {

 
surname: "COGNOME",
firstName: "NOME",
relstatus: "STATUS",
birth: "NASCITA",
nationality: "NAZIONALITA",
profession: "PROFESSIONE",
phone: "CELLULARE",
email: "EMAIL",
mission: "LUOGO DI MISSIONE",
photo: "BASE 64"
 

};

/* ==========================================================
DOM ELEMENTS
========================================================== */

const searchInput =
document.getElementById("religiousSearch");

const searchClear =
document.getElementById("searchClear");

const suggestionsBox =
document.getElementById("religiousSuggestions");

const religiousPhoto =
document.getElementById("religiousPhoto");

const religiousSurname =
document.getElementById("religiousSurname");

const religiousFirstname =
document.getElementById("religiousFirstname");

const religiousProfession =
document.getElementById("religiousProfession");

const religiousStatus =
document.getElementById("relstatus");

const religiousBirth =
document.getElementById("religiousBirth");

const religiousNationality =
document.getElementById("religiousNationality");

const religiousProfessionData =
document.getElementById("religiousProfessionData");

const religiousMission =
document.getElementById("religiousMission");

const religiousPhone =
document.getElementById("religiousPhone");

const religiousEmail =
document.getElementById("religiousEmail");

/* ==========================================================
DATA
========================================================== */

let religiousData = [];

/* ==========================================================
TEXT NORMALIZATION
========================================================== */

function normalizeText(value) {

 
if (value === null || value === undefined) {
    return "";
}

return String(value)
    .replace(/\uFEFF/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "")
    .join("\n")
    .trim();
 

}

/* ==========================================================
SEARCH NORMALIZATION
========================================================== */

function normalizeSearch(value) {

 
return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
 

}

/* ==========================================================
ITALIAN DATE FORMAT
========================================================== */

function formatItalianDate(value) {

 
const text = normalizeText(value);

if (!text) {
    return "";
}


/*
   Expected format:

   DD-MM-YYYY

   Example:

   13-09-1997
*/

const match =
    text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);

if (!match) {
    return text;
}


const day = parseInt(match[1], 10);
const month = parseInt(match[2], 10);
const year = match[3];


const months = [

    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre"

];


if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
) {
    return text;
}


return `${day} ${months[month - 1]} ${year}`;
 

}

/* ==========================================================
FULL NAME
========================================================== */

function getFullName(person) {

 
const surname =
    normalizeText(person[COLUMNS.surname]);

const firstName =
    normalizeText(person[COLUMNS.firstName]);


return [surname, firstName]
    .filter(Boolean)
    .join(" ");
 

}

/* ==========================================================
SORT RELIGIOUS
========================================================== */

function sortReligious() {

 
religiousData.sort((a, b) => {

    const surnameA =
        normalizeText(a[COLUMNS.surname]);

    const surnameB =
        normalizeText(b[COLUMNS.surname]);

    const surnameCompare =
        surnameA.localeCompare(
            surnameB,
            "it",
            { sensitivity: "base" }
        );


    if (surnameCompare !== 0) {
        return surnameCompare;
    }


    const firstNameA =
        normalizeText(a[COLUMNS.firstName]);

    const firstNameB =
        normalizeText(b[COLUMNS.firstName]);


    return firstNameA.localeCompare(
        firstNameB,
        "it",
        { sensitivity: "base" }
    );

});
 

}

/* ==========================================================
LOAD EXCEL DATA
========================================================== */

async function loadReligiousData() {

 
if (typeof XLSX === "undefined") {

    console.error(
        "SheetJS non è stato caricato."
    );

    return;
}


try {

    const response =
        await fetch(
            EXCEL_FILE,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Errore HTTP ${response.status}`
        );

    }


    const arrayBuffer =
        await response.arrayBuffer();


    const workbook =
        XLSX.read(
            arrayBuffer,
            {
                type: "array",
                cellDates: true
            }
        );


    const firstSheetName =
        workbook.SheetNames[0];


    if (!firstSheetName) {

        throw new Error(
            "Nessun foglio trovato nel file Excel."
        );

    }


    const worksheet =
        workbook.Sheets[firstSheetName];


    const rows =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                defval: "",
                raw: false
            }
        );


    religiousData =
        rows
            .map(row => {

                const cleaned = {};

                Object.keys(COLUMNS).forEach(key => {

                    cleaned[COLUMNS[key]] =
                        normalizeText(
                            row[COLUMNS[key]]
                        );

                });

                return cleaned;

            })
            .filter(row => {

                return Object.values(row)
                    .some(value => value !== "");

            });


    sortReligious();


    console.log(
        `${religiousData.length} religiosi caricati.`
    );


} catch (error) {

    console.error(
        "Errore nel caricamento dei dati dei religiosi:",
        error
    );

}
 

}

/* ==========================================================
CREATE SUGGESTION
========================================================== */

function createSuggestion(person) {

 
const button =
    document.createElement("button");


button.type = "button";

button.className =
    "religious-suggestion";

button.setAttribute(
    "role",
    "option"
);


button.textContent =
    getFullName(person);


button.addEventListener(
    "click",
    () => {

        selectReligious(person);

    }
);


return button;
 

}

/* ==========================================================
SHOW SUGGESTIONS
========================================================== */

function showSuggestions(list) {

 
if (!suggestionsBox) {
    return;
}


suggestionsBox.innerHTML = "";


if (!list.length) {

    suggestionsBox.classList.remove("show");

    if (searchInput) {
        searchInput.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    return;
}


list.forEach(person => {

    suggestionsBox.appendChild(
        createSuggestion(person)
    );

});


suggestionsBox.classList.add("show");


if (searchInput) {

    searchInput.setAttribute(
        "aria-expanded",
        "true"
    );

}
 

}

/* ==========================================================
FILTER RELIGIOUS
========================================================== */

function filterReligious() {

 
if (!searchInput) {
    return;
}


const query =
    normalizeSearch(
        searchInput.value
    );


/*
   Empty search:

   show all religious.
*/

if (!query) {

    showSuggestions(
        religiousData
    );

    return;
}


/*
   Search only by:

   COGNOME + NOME
*/

const results =
    religiousData.filter(person => {

        const fullName =
            normalizeSearch(
                getFullName(person)
            );


        return fullName.includes(query);

    });


showSuggestions(
    results.slice(0, 8)
);
 

}

/* ==========================================================
SELECT RELIGIOUS
========================================================== */

function selectReligious(person) {

 
if (!person) {
    return;
}


const fullName =
    getFullName(person);


/*
   Keep selected name in search field.
*/

if (searchInput) {

    searchInput.value =
        fullName;

    searchInput.setAttribute(
        "aria-expanded",
        "false"
    );


    /* Keep clear button visible */

    if (searchClear) {

        searchClear.classList.add(
            "show"
        );

    }

}


/*
   Close suggestions.
*/

if (suggestionsBox) {

    suggestionsBox.classList.remove(
        "show"
    );

}


/*
   Render profile.
*/

renderProfile(person);
 

}

/* ==========================================================
RENDER PROFILE
========================================================== */

function renderProfile(person) {

 
const surname =
    normalizeText(
        person[COLUMNS.surname]
    );

const firstName =
    normalizeText(
        person[COLUMNS.firstName]
    );

const relstatus =
    normalizeText(
        person[COLUMNS.relstatus]
    );

const birth =
    formatItalianDate(
        person[COLUMNS.birth]
    );

const nationality =
    normalizeText(
        person[COLUMNS.nationality]
    );

const profession =
    normalizeText(
        person[COLUMNS.profession]
    );

const phone =
    normalizeText(
        person[COLUMNS.phone]
    );

const email =
    normalizeText(
        person[COLUMNS.email]
    );

const mission =
    normalizeText(
        person[COLUMNS.mission]
    );

const photo =
    normalizeText(
        person[COLUMNS.photo]
    );


/* =========================
   NAME
========================== */

if (religiousSurname) {
    religiousSurname.textContent =
        surname;
}

if (religiousFirstname) {
    religiousFirstname.textContent =
        firstName;
}


/* =========================
   PROFESSION
========================== */

if (religiousProfession) {

    religiousProfession.textContent =
        profession;

}


if (religiousStatus) {

    religiousStatus.textContent =
        relstatus;

}



if (religiousProfessionData) {

    religiousProfessionData.textContent =
        profession;

}


/* =========================
   PERSONAL DATA
========================== */

if (religiousBirth) {

    religiousBirth.textContent =
        birth;

}

if (religiousNationality) {

    religiousNationality.textContent =
        nationality;

}

if (religiousMission) {

    religiousMission.textContent =
        mission;

}


/* =========================
   PHONE
========================== */

if (religiousPhone) {

    religiousPhone.textContent =
        phone;

    if (phone) {

        religiousPhone.href =
            `tel:${phone.replace(
                /[^\d+]/g,
                ""
            )}`;

    } else {

        religiousPhone.removeAttribute(
            "href"
        );

    }

}


/* =========================
   EMAIL
========================== */

if (religiousEmail) {

    religiousEmail.textContent =
        email;

    if (email) {

        religiousEmail.href =
            `mailto:${email}`;

    } else {

        religiousEmail.removeAttribute(
            "href"
        );

    }

}


/* =========================
   PHOTO
========================== */

setPhoto(photo);
 

}

/* ==========================================================
SET PHOTO
========================================================== */

function setPhoto(photo) {

 
if (!religiousPhoto) {
    return;
}


/*
   The Excel file already contains
   the complete data URI.

   Example:

   data:image/png;base64,...
*/

const completeDataUri =
    /^data:image\/[a-zA-Z0-9.+-]+;base64,/;


if (
    photo &&
    completeDataUri.test(photo)
) {

    religiousPhoto.src =
        photo.replace(
            /\s+/g,
            ""
        );


    religiousPhoto.onerror =
        () => {

            religiousPhoto.onerror =
                null;

            religiousPhoto.src =
                LOGO_PATH;

        };


} else {

    religiousPhoto.src =
        LOGO_PATH;

}
 

}

/* ==========================================================
CLEAR PROFILE
========================================================== */

function clearProfile() {

 
if (religiousSurname) {
    religiousSurname.textContent = "";
}

if (religiousFirstname) {
    religiousFirstname.textContent = "";
}

if (religiousProfession) {
    religiousProfession.textContent = "";
}

if (religiousStatus) {
    religiousStatus.textContent = "";
}

if (religiousBirth) {
    religiousBirth.textContent = "";
}

if (religiousNationality) {
    religiousNationality.textContent = "";
}

if (religiousProfessionData) {
    religiousProfessionData.textContent = "";
}

if (religiousMission) {
    religiousMission.textContent = "";
}


if (religiousPhone) {

    religiousPhone.textContent = "";

    religiousPhone.removeAttribute(
        "href"
    );

}


if (religiousEmail) {

    religiousEmail.textContent = "";

    religiousEmail.removeAttribute(
        "href"
    );

}


if (religiousPhoto) {

    religiousPhoto.src =
        LOGO_PATH;

}
 

}

/* ==========================================================
SEARCH INPUT
========================================================== */

if (searchInput) {


    /* ======================================================
       INPUT
    ====================================================== */

    searchInput.addEventListener(
        "input",
        () => {

            filterReligious();


            /* Show / hide clear button */

            if (searchClear) {

                searchClear.classList.toggle(
                    "show",
                    searchInput.value.trim() !== ""
                );

            }

        }
    );


    /* ======================================================
       FOCUS
    ====================================================== */

    searchInput.addEventListener(
        "focus",
        () => {

            /*
               If the field is empty,
               open the complete list.

               If it contains text,
               show matching results.
            */

            filterReligious();

        }
    );


    /* ======================================================
       CLICK
    ====================================================== */

    searchInput.addEventListener(
        "click",
        () => {

            filterReligious();

        }
    );


    /* ======================================================
       KEYBOARD
    ====================================================== */

    searchInput.addEventListener(
        "keydown",
        event => {


            /* =========================
               ESCAPE
            ========================== */

            if (event.key === "Escape") {

                if (suggestionsBox) {

                    suggestionsBox.classList.remove(
                        "show"
                    );

                }

                searchInput.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }


            /* =========================
               ARROWDOWN
            ========================== */

            /*
               ArrowDown can open the list
               even when the field is empty.
            */

            if (
                event.key === "ArrowDown" &&
                suggestionsBox &&
                !suggestionsBox.classList.contains("show")
            ) {

                event.preventDefault();

                filterReligious();

            }

        }
    );


    /* ======================================================
       CLEAR SEARCH
    ====================================================== */

    if (searchClear) {

        searchClear.addEventListener(
            "click",
            () => {


                /* Clear search field */

                searchInput.value = "";


                /* Hide clear button */

                searchClear.classList.remove(
                    "show"
                );


                /* Update suggestions */

                filterReligious();


                /* Return focus to search */

                searchInput.focus();

            }
        );

    }

}


/* ==========================================================
CLICK OUTSIDE
========================================================== */

document.addEventListener(
    "click",
    event => {


        if (!suggestionsBox || !searchInput) {
            return;
        }


        const searchWrapper =
            document.querySelector(
                ".religiosi-search-wrapper"
            );


        if (
            searchWrapper &&
            !searchWrapper.contains(event.target)
        ) {

            suggestionsBox.classList.remove(
                "show"
            );


            searchInput.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }

);

/* ==========================================================
INITIALIZE
========================================================== */

async function initializeReligiousPage() {

 
clearProfile();

if (searchInput) {

    searchInput.value = "";

    searchInput.setAttribute(
        "aria-expanded",
        "false"
    );

}

await loadReligiousData();
 

}

/* ==========================================================
START
========================================================== */

if (document.readyState === "loading") {

 
document.addEventListener(
    "DOMContentLoaded",
    initializeReligiousPage
);
 

} else {

 
initializeReligiousPage();
 

}
