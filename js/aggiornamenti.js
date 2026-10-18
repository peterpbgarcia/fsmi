/* ==========================================================
   AGGIORNAMENTI
   Celebrazioni + Vatican News
   Data source: dat/dat-rel.xlsx
   ========================================================== */

"use strict";

/* FILES */
const EXCEL_FILE = "dat/dat-rel.xlsx";
const LOGO_PATH = "img/logo.png";

/*
 * The script searches for matching column names.
 * If your workbook uses different headings, add them here.
 */
const COLUMN_ALIASES = {
  surname: [
    "COGNOME",
    "SURNAME",
    "LAST NAME"
  ],

  firstName: [
    "NOME",
    "FIRST NAME",
    "NAME"
  ],

  photo: [
    "BASE 64",
    "BASE64",
    "FOTO",
    "FOTOGRAFIA",
    "PHOTO",
    "IMMAGINE"
  ],

  birth: [
    "NASCITA",
    "DATA DI NASCITA",
    "DATA NASCITA",
    "BIRTHDAY",
    "DATE OF BIRTH"
  ],

  profession: [
    "PROFESSIONE",
    "DATA PROFESSIONE",
    "PROFESSIONE RELIGIOSA",
    "PRIMA PROFESSIONE",
    "PROFESSIONE TEMPORANEA",
    "PROFESSIONE PERPETUA",
    "VOTI",
    "DATA DEI VOTI"
  ],

  ordination: [
    "ORDINAZIONE",
    "DATA ORDINAZIONE",
    "ORDINAZIONE SACERDOTALE",
    "DATA ORDINAZIONE SACERDOTALE",
    "SACERDOZIO",
    "ANNIVERSARIO SACERDOTALE",
    "ORDINATION",
    "PRIESTHOOD"
  ]
};

/* ELEMENTS */
const track = document.getElementById("celebrationTrack");
const status = document.getElementById("celebrationStatus");
const previousButton = document.getElementById("previousCelebration");
const nextButton = document.getElementById("nextCelebration");

let celebrations = [];
let currentIndex = 0;
let touchStartX = 0;

/* ----------------------------------------------------------
   TEXT HELPERS
   ---------------------------------------------------------- */

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findColumn(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeText);

  // First try exact matches.
  for (const header of headers) {
    if (normalizedAliases.includes(normalizeText(header))) {
      return header;
    }
  }

  // Then allow a longer heading containing a known alias.
  for (const header of headers) {
    const normalizedHeader = normalizeText(header);

    for (const alias of normalizedAliases) {
      if (
        alias.length >= 5 &&
        normalizedHeader.includes(alias)
      ) {
        return header;
      }
    }
  }

  return null;
}

function getCell(row, column) {
  return column ? row[column] : "";
}

function getFullName(row, columns) {
  const firstName = String(
    getCell(row, columns.firstName) ?? ""
  ).trim();

  const surname = String(
    getCell(row, columns.surname) ?? ""
  ).trim();

  return [firstName, surname]
    .filter(Boolean)
    .join(" ");
}

/* ----------------------------------------------------------
   EXCEL DATE PARSING
   ---------------------------------------------------------- */

function parseDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // SheetJS may return Excel dates as JavaScript Date objects.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      day: value.getDate(),
      month: value.getMonth(),
      year: value.getFullYear()
    };
  }

  // Excel serial date.
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed && parsed.m && parsed.d) {
      return {
        day: parsed.d,
        month: parsed.m - 1,
        year: parsed.y || null
      };
    }

    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  // Italian format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  let match = text.match(
    /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/
  );

  if (match) {
    let year = Number(match[3]);

    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;

    if (isValidDate(day, month, year)) {
      return { day, month, year };
    }
  }

  // Date without year: DD/MM
  match = text.match(/^(\d{1,2})[/. -](\d{1,2})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;

    if (isValidMonthDay(day, month)) {
      return { day, month, year: null };
    }
  }

  // ISO format: YYYY-MM-DD
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (isValidDate(day, month, year)) {
      return { day, month, year };
    }
  }

  // Last attempt for recognizable date strings.
  const timestamp = Date.parse(text);

  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp);

    return {
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear()
    };
  }

  return null;
}

function isValidMonthDay(day, month) {
  if (month < 0 || month > 11 || day < 1) {
    return false;
  }

  const daysInMonth = [
    31, 29, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31
  ];

  return day <= daysInMonth[month];
}

function isValidDate(day, month, year) {
  if (!isValidMonthDay(day, month)) {
    return false;
  }

  const date = new Date(year, month, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

function formatItalianDate(day, month) {
  const date = new Date(2024, month, day);

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long"
  }).format(date);
}

/*
 * Returns the next occurrence of a month/day date.
 * Birthdays and anniversaries recur annually.
 */
function getNextOccurrence(parsedDate, today = new Date()) {
  if (!parsedDate) {
    return null;
  }

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let year = todayDate.getFullYear();
  let occurrence = makeSafeDate(
    year,
    parsedDate.month,
    parsedDate.day
  );

  if (occurrence < todayDate) {
    year += 1;
    occurrence = makeSafeDate(
      year,
      parsedDate.month,
      parsedDate.day
    );
  }

  return occurrence;
}

function makeSafeDate(year, month, day) {
  /*
   * Handles 29 February in non-leap years by using
   * the last day of February for that year.
   */
  const date = new Date(year, month, day);

  if (date.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }

  return date;
}

/* ----------------------------------------------------------
   CELEBRATION TYPES
   ---------------------------------------------------------- */

const CELEBRATION_TYPES = {
  birthday: {
    title: "BIRTHDAY",
    icon: "🎂",
    priority: 1
  },

  profession: {
    title: "RELIGIOUS PROFESSION",
    icon: "🕊",
    priority: 2
  },

  ordination: {
    title: "ANNIVERSARIO SACERDOTALE",
    icon: "✝",
    priority: 3
  }
};

/* ----------------------------------------------------------
   PHOTO HANDLING
   ---------------------------------------------------------- */

function getPhotoSource(value) {
  if (value === null || value === undefined) {
    return LOGO_PATH;
  }

  const photo = String(value).trim();

  if (!photo) {
    return LOGO_PATH;
  }

  // Existing BASE 64 field may contain a complete data URI.
  if (
    photo.startsWith("data:image/") ||
    photo.startsWith("https://") ||
    photo.startsWith("http://")
  ) {
    return photo;
  }

  // Or it may contain the base64 payload only.
  if (/^[A-Za-z0-9+/=\s]+$/.test(photo) && photo.length > 100) {
    return "data:image/jpeg;base64," +
      photo.replace(/\s/g, "");
  }

  // Otherwise treat it as a relative image path.
  return photo;
}

/* ----------------------------------------------------------
   CREATE CELEBRATIONS
   ---------------------------------------------------------- */

function addCelebration(list, row, columns, type, rawDate) {
  const parsedDate = parseDate(rawDate);
  const name = getFullName(row, columns);

  if (!parsedDate || !name) {
    return;
  }

  const nextDate = getNextOccurrence(parsedDate);

  if (!nextDate) {
    return;
  }

  const years = parsedDate.year
    ? nextDate.getFullYear() - parsedDate.year
    : null;

  let title = type.title;

  // Add anniversary years when the original year is available.
  if (
    type === CELEBRATION_TYPES.ordination &&
    years !== null &&
    years > 0
  ) {
    title = `${years}° ANNIVERSARIO SACERDOTALE`;
  } else if (
    type === CELEBRATION_TYPES.profession &&
    years !== null &&
    years > 0
  ) {
    title = `${years}° ANNIVERSARIO DI PROFESSIONE`;
  }

  list.push({
    name,
    title,
    icon: type.icon,
    dateText: formatItalianDate(
      parsedDate.day,
      parsedDate.month
    ),
    nextDate,
    photo: getPhotoSource(
      getCell(row, columns.photo)
    ),
    priority: type.priority
  });
}

/* ----------------------------------------------------------
   WORKBOOK PROCESSING
   ---------------------------------------------------------- */

async function loadCelebrations() {
  if (typeof XLSX === "undefined") {
    throw new Error(
      "La libreria Excel non è stata caricata."
    );
  }

  const response = await fetch(EXCEL_FILE, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Impossibile leggere ${EXCEL_FILE} (${response.status}).`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true
  });

  if (!workbook.SheetNames.length) {
    throw new Error("Il file Excel non contiene fogli.");
  }

  /*
   * Use the first worksheet.
   * If the relevant data is on another worksheet, change
   * workbook.SheetNames[0] to the correct sheet name.
   */
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true
  });

  if (!rows.length) {
    throw new Error("Il foglio Excel non contiene dati.");
  }

  const headers = Object.keys(rows[0]);

  const columns = {
    surname: findColumn(headers, COLUMN_ALIASES.surname),
    firstName: findColumn(headers, COLUMN_ALIASES.firstName),
    photo: findColumn(headers, COLUMN_ALIASES.photo),
    birth: findColumn(headers, COLUMN_ALIASES.birth),
    profession: findColumn(headers, COLUMN_ALIASES.profession),
    ordination: findColumn(headers, COLUMN_ALIASES.ordination)
  };

  if (!columns.surname || !columns.firstName) {
    throw new Error(
      "Non trovo le colonne NOME e COGNOME nel file Excel."
    );
  }

  const list = [];

  rows.forEach(row => {
    // Birthdays
    if (columns.birth) {
      addCelebration(
        list,
        row,
        columns,
        CELEBRATION_TYPES.birthday,
        getCell(row, columns.birth)
      );
    }

    // Religious profession anniversaries
    if (columns.profession) {
      addCelebration(
        list,
        row,
        columns,
        CELEBRATION_TYPES.profession,
        getCell(row, columns.profession)
      );
    }

    // Sacerdotal ordination anniversaries
    if (columns.ordination) {
      addCelebration(
        list,
        row,
        columns,
        CELEBRATION_TYPES.ordination,
        getCell(row, columns.ordination)
      );
    }
  });

  /*
   * Sort by the next upcoming date.
   * When two celebrations fall on the same date,
   * sort them by celebration type.
   */
  list.sort((a, b) => {
    const dateDifference = a.nextDate - b.nextDate;

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return a.priority - b.priority;
  });

  return list;
}

/* ----------------------------------------------------------
   RENDER CARDS
   ---------------------------------------------------------- */

function createCelebrationCard(item) {
  const card = document.createElement("article");
  card.className = "celebration-card";

  const photo = document.createElement("img");
  photo.className = "celebration-photo";
  photo.alt = item.name;
  photo.loading = "lazy";
  photo.src = item.photo;

  photo.onerror = () => {
    if (photo.src.endsWith(LOGO_PATH)) {
      return;
    }

    photo.src = LOGO_PATH;
  };

  const content = document.createElement("div");
  content.className = "celebration-content";

  const icon = document.createElement("div");
  icon.className = "celebration-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = item.icon;

  const title = document.createElement("h2");
  title.className = "celebration-title";
  title.textContent = item.title;

  const name = document.createElement("p");
  name.className = "celebration-name";
  name.textContent = item.name;

  const date = document.createElement("p");
  date.className = "celebration-date";
  date.textContent = item.dateText;

  content.append(icon, title, name, date);
  card.append(photo, content);

  return card;
}

function renderCelebrations() {
  track.replaceChildren();

  if (!celebrations.length) {
    status.textContent =
      "Non sono state trovate celebrazioni. Controlla le date nel file Excel.";
    return;
  }

  status.textContent = "";

  celebrations.forEach(item => {
    track.appendChild(createCelebrationCard(item));
  });

  updateArrowVisibility();
}

function updateArrowVisibility() {
  const hasMultiple = celebrations.length > 1;

  previousButton.hidden = !hasMultiple;
  nextButton.hidden = !hasMultiple;
}

function goToCelebration(index) {
  if (!celebrations.length) {
    return;
  }

  currentIndex =
    (index + celebrations.length) % celebrations.length;

  const card = track.children[currentIndex];

  if (card) {
    card.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start"
    });
  }
}

/* ----------------------------------------------------------
   CAROUSEL CONTROLS
   ---------------------------------------------------------- */

previousButton.addEventListener("click", () => {
  goToCelebration(currentIndex - 1);
});

nextButton.addEventListener("click", () => {
  goToCelebration(currentIndex + 1);
});

track.addEventListener("scroll", () => {
  if (!track.children.length) {
    return;
  }

  const cardWidth = track.clientWidth;

  if (cardWidth > 0) {
    currentIndex = Math.round(
      track.scrollLeft / cardWidth
    );
  }
}, { passive: true });

/*
 * Native touch swipes work through scroll-snap.
 * These handlers add a simple fallback for browsers
 * where horizontal gestures are not handled smoothly.
 */
track.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

track.addEventListener("touchend", event => {
  const touchEndX = event.changedTouches[0].screenX;
  const difference = touchStartX - touchEndX;

  if (Math.abs(difference) < 45) {
    return;
  }

  if (difference > 0) {
    goToCelebration(currentIndex + 1);
  } else {
    goToCelebration(currentIndex - 1);
  }
}, { passive: true });

/* Keyboard support */
document.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") {
    goToCelebration(currentIndex - 1);
  }

  if (event.key === "ArrowRight") {
    goToCelebration(currentIndex + 1);
  }
});

/* ----------------------------------------------------------
   INITIALIZATION
   ---------------------------------------------------------- */

async function initializeUpdates() {
  try {
    celebrations = await loadCelebrations();
    renderCelebrations();
  } catch (error) {
    console.error("Errore Aggiornamenti:", error);

    status.textContent =
      "Impossibile caricare le celebrazioni. Verifica il file Excel e riprova.";
  }
}

initializeUpdates();