
(() => {
  "use strict";

  // Update this path if your Excel file is stored elsewhere.
  const DATA_FILE = "dat/dat-rel.xlsx";

  const track = document.getElementById("celebrationTrack");
  const status = document.getElementById("celebrationStatus");

  const HEADER_ALIASES = {
    surname: ["COGNOME", "SURNAME", "LAST NAME"],
    firstName: ["NOME", "FIRST NAME", "NAME"],
    photo: ["BASE 64", "BASE64", "FOTO", "FOTOGRAFIA", "PHOTO", "IMMAGINE"],
    birthday: [
      "NASCITA", "DATA DI NASCITA", "DATA NASCITA",
      "BIRTHDAY", "DATE OF BIRTH"
    ],
    profession: [
      "PROFESSIONE", "DATA PROFESSIONE", "PROFESSIONE RELIGIOSA",
      "PRIMA PROFESSIONE", "PROFESSIONE TEMPORANEA",
      "PROFESSIONE PERPETUA", "VOTI", "DATA DEI VOTI"
    ],
    ordination: [
      "ORDINAZIONE", "DATA ORDINAZIONE",
      "ORDINAZIONE SACERDOTALE",
      "DATA ORDINAZIONE SACERDOTALE",
      "SACERDOZIO", "ANNIVERSARIO DI ORDINAZIONE"
    ]
  };

  const TYPE_CONFIG = {
    birthday: {
      cssClass: "birthday",
      icon: "🎂",
      label: "Compleanno",
      message: "Tanti auguri di buon compleanno!"
    },
    profession: {
      cssClass: "profession",
      icon: "✦",
      label: "Professione religiosa",
      message: "Auguri per il tuo anniversario di professione religiosa!"
    },
    ordination: {
      cssClass: "ordination",
      icon: "✝",
      label: "Ordinazione sacerdotale",
      message: "Auguri per il tuo anniversario di ordinazione sacerdotale!"
    }
  };

  function normalizeHeader(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function setLoading(message, visible = true) {
    if (!status) return;

    status.textContent = message;
    status.hidden = !visible;
  }

  function findColumn(headers, aliases) {
    const normalizedAliases = aliases.map(normalizeHeader);

    return headers.findIndex(header =>
      normalizedAliases.includes(normalizeHeader(header))
    );
  }

  function cell(row, index) {
    return index >= 0 ? row[index] : "";
  }

  function validDate(year, month, day) {
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
    }

    // Excel serial date.
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(
        Date.UTC(1899, 11, 30) + Math.round(value) * 86400000
      );

      return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      );
    }

    const raw = String(value ?? "").trim();

    if (!raw) return null;

    // ISO: yyyy-mm-dd, yyyy/mm/dd, or yyyy.mm.dd.
    let match = raw.match(
      /^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/
    );

    if (match) {
      return validDate(+match[1], +match[2], +match[3]);
    }

    // Italian format: dd/mm/yyyy, dd.mm.yyyy, or dd-mm-yyyy.
    match = raw.match(
      /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/
    );

    if (match) {
      let year = +match[3];

      if (year < 100) {
        year += year < 40 ? 2000 : 1900;
      }

      return validDate(year, +match[2], +match[1]);
    }

    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }

    return null;
  }

  function parsePhoto(value) {
    if (value == null) return "";

    let raw = String(value).trim();

    if (!raw) return "";

    // If Excel contains an HTML img element, extract its src.
    const imgMatch = raw.match(
      /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i
    );

    if (imgMatch) {
      raw = imgMatch[1].trim();
    }

    // Absolute URLs, data URLs, root-relative paths.
    if (/^(https?:|data:image\/|blob:|\/)/i.test(raw)) {
      return raw;
    }

    // Common relative image paths.
    if (/^(?:\.\.?\/|img\/|images\/|dat\/)/i.test(raw)) {
      return raw;
    }

    // A bare base64 image payload.
    const compact = raw.replace(/\s/g, "");

    if (
      compact.length > 100 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(compact)
    ) {
      return `data:image/jpeg;base64,${compact}`;
    }

    // Leave other paths unchanged.
    return raw;
  }

  function safeText(value) {
    return String(value ?? "").trim();
  }

  function buildPeople(rows, headers) {
    const columns = {};

    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      columns[key] = findColumn(headers, aliases);
    }

    const people = [];

    rows.forEach(row => {
      const firstName = safeText(cell(row, columns.firstName));
      const surname = safeText(cell(row, columns.surname));

      if (!firstName && !surname) return;

      people.push({
        name: [firstName, surname].filter(Boolean).join(" "),
        photo: parsePhoto(cell(row, columns.photo)),
        dates: {
          birthday: parseDate(cell(row, columns.birthday)),
          profession: parseDate(cell(row, columns.profession)),
          ordination: parseDate(cell(row, columns.ordination))
        }
      });
    });

    return people;
  }

  function atMidnight(date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isLeapYear(year) {
    return (
      year % 4 === 0 &&
      (year % 100 !== 0 || year % 400 === 0)
    );
  }

  function dateInCurrentYear(originalDate, year) {
    if (!originalDate) return null;

    const month = originalDate.getMonth();
    let day = originalDate.getDate();

    // Use February 28 for February 29 celebrations in non-leap years.
    if (month === 1 && day === 29 && !isLeapYear(year)) {
      day = 28;
    }

    return new Date(year, month, day);
  }

  function ordinalItalian(number) {
    return `${number}°`;
  }


function milestoneLabel(type, number) {
  if (type === "birthday") {
    return `${ordinalItalian(number)} Compleanno`;
  }

  if (type === "profession") {
    return `${ordinalItalian(number)} Anniversario di Professione Religiosa`;
  }

  return `${ordinalItalian(number)} Anniversario di Ordinazione Sacerdotale`;
}


  function makeCelebrations(people, today) {
    const celebrations = [];
    const year = today.getFullYear();

    people.forEach(person => {
      for (const type of Object.keys(TYPE_CONFIG)) {
        const originalDate = person.dates[type];

        if (!originalDate) continue;

        const date = dateInCurrentYear(originalDate, year);
        const milestone = year - originalDate.getFullYear();

        if (!date || milestone < 1) continue;

        celebrations.push({
          ...person,
          type,
          date,
          milestone,
          milestoneLabel: milestoneLabel(type, milestone),
          config: TYPE_CONFIG[type]
        });
      }
    });

    celebrations.sort((a, b) =>
      a.date - b.date || a.name.localeCompare(b.name, "it")
    );

    return celebrations;
  }


function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
} 



function getVisibleCelebrations(all, today) {
  const todayItems = all.filter(item => sameDay(item.date, today));
  const upcoming = all.filter(item => item.date > today);
  const past = all.filter(item => item.date < today);
  
  // Create a local calendar-date key without UTC/time-zone shifts.
  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    return `${year}-${month}-${day}`;
  }
  
  // Find the three most recent DISTINCT dates before today.
  const pastDates = [
      ...new Set(past.map(item => dateKey(item.date)))
    ]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 3)
    .reverse(); // <-- THIS FIXES THE ORDER (-3, -2, -1 leading up to Today)
  
  // Include EVERY celebration belonging to those three dates.
  const pastCards = [];
  
  pastDates.forEach(key => {
    const celebrationsOnDate = past
      .filter(item => dateKey(item.date) === key)
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
    
    celebrationsOnDate.forEach(item => {
      pastCards.push({
        kind: "individual",
        ...item
      });
    });
  });
  
  const chosen = [];
  
  // Today's group summary comes first when multiple people celebrate.
  if (todayItems.length > 1) {
    chosen.push({
      kind: "group",
      date: today,
      items: todayItems
    });
  }
  
  // Then show every individual celebration for today.
  chosen.push(
    ...todayItems.map(item => ({
      kind: "individual",
      ...item
    }))
  );
  
  // Preserve the existing upcoming-celebration behavior.
  const futureCount = Math.min(
    upcoming.length,
    Math.max(3, 7 - chosen.length)
  );
  
  chosen.push(
    ...upcoming.slice(0, futureCount).map(item => ({
      kind: "individual",
      ...item
    }))
  );
  
  return [...pastCards, ...chosen];
}


  function createPhoto(person) {
    const wrapper = document.createElement("div");
    wrapper.className = "celebration-photo";

    if (!person.photo) {
      wrapper.classList.add("is-placeholder");
      wrapper.setAttribute("aria-hidden", "true");
      return wrapper;
    }

    const image = document.createElement("img");
    image.src = person.photo;
    image.alt = `Foto di ${person.name}`;
    image.loading = "lazy";
    image.decoding = "async";

    image.addEventListener("error", () => {
      wrapper.replaceChildren();
      wrapper.classList.add("is-placeholder");
      wrapper.setAttribute("aria-hidden", "true");
    }, { once: true });

    wrapper.appendChild(image);

    return wrapper;
  }

  function createIndividualCard(item) {
    const card = document.createElement("article");

    card.className =
      `celebration-card celebration-${item.config.cssClass}`;

    card.setAttribute(
      "aria-label",
      `${item.milestoneLabel}: ${item.name}`
    );

    card.appendChild(createPhoto(item));

    const content = document.createElement("div");
    content.className = "celebration-content";

    const type = document.createElement("div");
    type.className = "celebration-icon";
    type.textContent = item.config.icon;
    type.setAttribute("aria-hidden", "true");

    const title = document.createElement("h2");
    title.className = "celebration-title";
    title.textContent = item.milestoneLabel;

    const name = document.createElement("p");
    name.className = "celebration-name";
    name.textContent = item.name;

    const date = document.createElement("p");
    date.className = "celebration-date";
    date.textContent = formatDate(item.date);

    const message = document.createElement("p");
    message.className = "celebration-message";
    message.textContent = item.config.message;

    content.append(type, title, name, date, message);
    card.appendChild(content);

    return card;
  }

  function createGroupCard(group) {
    const card = document.createElement("article");
    card.className = "celebration-card celebration-group-card";

    card.setAttribute(
      "aria-label",
      `Celebrazioni di oggi, ${group.items.length} persone`
    );

    const heading = document.createElement("header");
    heading.className = "celebration-group-heading";

    const title = document.createElement("h2");
    title.className = "celebration-group-title";
    title.textContent = "Celebrazioni di oggi";

    const date = document.createElement("p");
    date.className = "celebration-group-date";
    date.textContent = formatFullDate(group.date);

    heading.append(title, date);

    const list = document.createElement("div");
    list.className = "celebration-group-list";
    list.setAttribute(
      "aria-label",
      "Persone che festeggiano oggi"
    );

    group.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "celebration-group-person";

      const icon = document.createElement("div");
      icon.className = "celebration-group-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.config.icon;

      const details = document.createElement("div");
      details.className = "celebration-group-details";

      const name = document.createElement("p");
      name.className = "celebration-group-name";
      name.textContent = item.name;

      const type = document.createElement("p");
      type.className = "celebration-group-type";
      type.textContent = item.milestoneLabel;

      details.append(name, type);
      row.append(icon, details);
      list.appendChild(row);
    });

    card.append(heading, list);

    return card;
  }

  function render(items, today) {
    track.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "celebration-empty";
      empty.textContent = "Non ci sono celebrazioni disponibili.";
      track.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      fragment.appendChild(
        item.kind === "group"
          ? createGroupCard(item)
          : createIndividualCard(item)
      );
    });

    track.appendChild(fragment);

    // Initial position:
    // today's group, today's celebration, nearest upcoming, or first card.
    let startIndex = items.findIndex(item => item.kind === "group");

    if (startIndex < 0) {
      startIndex = items.findIndex(
        item =>
          item.kind === "individual" &&
          sameDay(item.date, today)
      );

      if (startIndex < 0) {
        startIndex = items.findIndex(
          item =>
            item.kind === "individual" &&
            item.date > today
        );
      }

      if (startIndex < 0) startIndex = 0;
    }

    requestAnimationFrame(() => {
      const target = track.children[startIndex];

      if (target) {
        track.scrollTo({
          left: target.offsetLeft,
          behavior: "auto"
        });
      }
    });
  }

  async function loadCelebrations() {
    try {
      if (!window.XLSX) {
        throw new Error("La libreria Excel non è stata caricata.");
      }

      setLoading("Caricamento delle celebrazioni…", true);

      const response = await fetch(DATA_FILE, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Impossibile leggere ${DATA_FILE} (${response.status}).`
        );
      }

      const buffer = await response.arrayBuffer();

      const workbook = window.XLSX.read(buffer, {
        type: "array",
        cellDates: true
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("Il file Excel non contiene fogli.");
      }

      const sheet = workbook.Sheets[sheetName];

      const rows = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: true
      });

      if (rows.length < 2) {
        render([], atMidnight(new Date()));
        setLoading("", false);
        return;
      }

      const people = buildPeople(rows.slice(1), rows[0]);
      const today = atMidnight(new Date());
      const all = makeCelebrations(people, today);
      const visible = getVisibleCelebrations(all, today);

      render(visible, today);
      setLoading("", false);

    } catch (error) {
      console.error(
        "[Aggiornamenti] Errore nel caricamento:",
        error
      );

      track.replaceChildren();

      const message = document.createElement("div");
      message.className = "celebration-empty";
      message.textContent =
        "Non è stato possibile caricare le celebrazioni. " +
        "Controlla il file dat/dat-rel.xlsx e riprova.";

      track.appendChild(message);
      setLoading("", false);
    }
  }

  if (track) {
    loadCelebrations();
  }
})();
