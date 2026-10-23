"use strict";

document.addEventListener("DOMContentLoaded", initConstitution);

function initConstitution() {

    // ---------------------------------------------------------
    // DOCUMENT CONFIGURATION
    // ---------------------------------------------------------

    const documentElement = document.querySelector(".constitution-document");

    const DOCUMENT_TYPE = (
        documentElement?.dataset.document || "costituzioni"
    ).toLowerCase();

    const EXCEL_PATH =
        documentElement?.dataset.workbook || "../dat/costituzioni.xlsx";

    const IS_COSTITUZIONI = DOCUMENT_TYPE === "costituzioni";

    const DOCUMENT_NAME = IS_COSTITUZIONI
        ? "Costituzioni"
        : "Direttorio";

    // No parts are excluded: PRELIMINARI must be included.
    const EXCLUDED_PARTS = new Set();

    const MIN_FONT_SIZE = 13;
    const MAX_FONT_SIZE = 28;
    const FONT_STEP = 1;

    const el = {
        search: document.getElementById("constitutionSearch"),
        suggestions: document.getElementById("constitutionSearchSuggestions"),
        clear: document.getElementById("constitutionClearSearch"),
        index: document.getElementById("constitutionIndex"),
        content: document.getElementById("constitutionContent"),
        decrease: document.getElementById("constitutionDecrease"),
        increase: document.getElementById("constitutionIncrease"),
        backToTop: document.getElementById("constitutionBackToTop"),
        status: document.getElementById("constitutionSearchStatus"),
        message: document.getElementById("constitutionMessage"),
        indexSection: document.querySelector(".constitution-index-section")
    };

    if (!el.index || !el.content) {
        console.error(
            `${DOCUMENT_NAME}: #constitutionIndex o #constitutionContent non trovato.`
        );
        return;
    }

    if (typeof XLSX === "undefined") {
        showMessage("La libreria XLSX non è stata caricata.");
        return;
    }

    let parts = [];
    let fontSize = 17;

    bindControls();
    setFontSize(fontSize);
    loadExcel();

    // ---------------------------------------------------------
    // GENERAL HELPERS
    // ---------------------------------------------------------

    function normalize(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("it")
            .trim()
            .replace(/[.:]/g, "")
            .replace(/\s+/g, " ");
    }

    function normalizeColumn(value) {
        return String(value ?? "").trim().toUpperCase();
    }

    function cell(row, column) {
        const wanted = normalizeColumn(column);

        const key = Object.keys(row).find(
            name => normalizeColumn(name) === wanted
        );

        return key === undefined
            ? ""
            : String(row[key] ?? "").trim();
    }

    function validateColumns(rows) {
        const required = [
            "PART",
            "CHAPTER",
            "SUBTITLE",
            "TYPE",
            "NUMBER",
            "TEXT",
            "SUBTEXT"
        ];

        const available = new Set(
            Object.keys(rows[0]).map(normalizeColumn)
        );

        const missing = required.filter(
            name => !available.has(normalizeColumn(name))
        );

        if (missing.length) {
            throw new Error(
                "Colonne mancanti nel file Excel: " + missing.join(", ")
            );
        }
    }

    // ---------------------------------------------------------
    // LOAD EXCEL
    // ---------------------------------------------------------

    async function loadExcel() {
        showMessage(`Caricamento del ${DOCUMENT_NAME}…`);

        try {
            const response = await fetch(EXCEL_PATH, {
                cache: "no-cache"
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const buffer = await response.arrayBuffer();

            const workbook = XLSX.read(buffer, {
                type: "array"
            });

            if (!workbook.SheetNames.length) {
                throw new Error("Nessun foglio Excel trovato.");
            }

            const worksheet = workbook.Sheets[
                workbook.SheetNames[0]
            ];

            const rows = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
                raw: false
            });

            if (!rows.length) {
                throw new Error("Il foglio Excel è vuoto.");
            }

            validateColumns(rows);

            parts = groupRows(rows);

            renderAll();
            hideMessage();

        } catch (error) {
            console.error(
                `Errore nel caricamento del ${DOCUMENT_NAME}:`,
                error
            );

            showMessage(
                `Impossibile caricare il ${DOCUMENT_NAME}. ` +
                "Controlla il file Excel e il percorso."
            );
        }
    }

    // ---------------------------------------------------------
    // GROUP EXCEL ROWS
    // ---------------------------------------------------------

    function groupRows(rows) {
        const result = [];
        const partsByName = new Map();

        let currentPart = null;
        let currentChapter = null;
        let currentSubtitleGroup = null;
        let skippingExcludedPart = false;
        let chapterCounter = 0;

        rows.forEach((sourceRow, sourceIndex) => {
            const partName = cell(sourceRow, "PART");
            const chapterName = cell(sourceRow, "CHAPTER");
            const subtitle = cell(sourceRow, "SUBTITLE");

            // A populated PART cell starts or continues a part.
            if (partName) {
                const partKey = normalize(partName);

                skippingExcludedPart = EXCLUDED_PARTS.has(partKey);

                if (skippingExcludedPart) {
                    currentPart = null;
                    currentChapter = null;
                    currentSubtitleGroup = null;
                    return;
                }

                if (
                    !currentPart ||
                    normalize(currentPart.name) !== partKey
                ) {
                    currentPart = partsByName.get(partKey);

                    if (!currentPart) {
                        currentPart = {
                            name: partName,
                            items: [],
                            chapters: []
                        };

                        partsByName.set(partKey, currentPart);
                        result.push(currentPart);
                    }

                    currentChapter = null;
                    currentSubtitleGroup = null;
                }
            }

            if (skippingExcludedPart || !currentPart) {
                return;
            }

            // Repeated chapter names continue the existing chapter.
            if (chapterName) {
                const chapterKey = normalize(chapterName);

                if (
                    !currentChapter ||
                    normalize(currentChapter.name) !== chapterKey
                ) {
                    currentChapter = {
                        id: `${DOCUMENT_TYPE}-chapter-${++chapterCounter}`,
                        name: chapterName,
                        items: []
                    };

                    currentPart.chapters.push(currentChapter);

                    currentPart.items.push({
                        kind: "chapter",
                        chapter: currentChapter
                    });

                    currentSubtitleGroup = null;
                }
            }

            const row = {
                sourceIndex,
                part: currentPart.name,
                chapter: currentChapter ? currentChapter.name : "",
                subtitle,
                type: cell(sourceRow, "TYPE"),
                number: cell(sourceRow, "NUMBER"),
                text: cell(sourceRow, "TEXT"),
                subtext: cell(sourceRow, "SUBTEXT")
            };

            if (!currentChapter) {
                currentPart.items.push({
                    kind: "row",
                    row
                });

                currentSubtitleGroup = null;
                return;
            }

            // A new subtitle starts a new subsection.
            if (subtitle) {
                const subtitleKey = normalize(subtitle);

                if (
                    !currentSubtitleGroup ||
                    normalize(currentSubtitleGroup.name) !== subtitleKey
                ) {
                    currentSubtitleGroup = {
                        kind: "subtitle",
                        name: subtitle,
                        rows: []
                    };

                    currentChapter.items.push(currentSubtitleGroup);
                }

                currentSubtitleGroup.rows.push(row);
                return;
            }

            // Blank subtitle continues the current subsection.
            if (currentSubtitleGroup) {
                currentSubtitleGroup.rows.push(row);
            } else {
                currentChapter.items.push({
                    kind: "row",
                    row
                });
            }
        });

        return sortParts(result);
    }

    // ---------------------------------------------------------
    // PART ORDER
    // ---------------------------------------------------------

    function sortParts(list) {
        return list;
    }

    // ---------------------------------------------------------
    // SEARCH
    // ---------------------------------------------------------

    function textMatchesQuery(text, query) {
        if (!query) return true;
        const normText = normalize(text);
        const normQuery = normalize(query);
        if (!normQuery) return true;

        return normText.includes(normQuery);
    }

    function rowMatches(row, query) {
        if (!query) return true;

        const combined = [
            row.part,
            row.chapter,
            row.subtitle,
            row.number,
            row.type,
            row.text,
            row.subtext
        ].join(" ");

        return textMatchesQuery(combined, query);
    }

    function itemMatches(item, query) {
        if (!query) return true;

        if (item.kind === "row") {
            return rowMatches(item.row, query);
        }

        if (item.kind === "subtitle") {
            return textMatchesQuery(item.name, query) ||
                item.rows.some(row => rowMatches(row, query));
        }

        if (item.kind === "chapter") {
            return textMatchesQuery(item.chapter.name, query) ||
                item.chapter.items.some(
                    child => itemMatches(child, query)
                );
        }

        return false;
    }

    function filterItems(items, query) {
        if (!query) return items;

        const result = [];

        items.forEach(item => {
            if (item.kind === "row") {
                if (rowMatches(item.row, query)) {
                    result.push(item);
                }

                return;
            }

            if (item.kind === "subtitle") {
                const titleMatches = textMatchesQuery(item.name, query);

                const matchingRows = item.rows.filter(
                    row => rowMatches(row, query)
                );

                if (titleMatches) {
                    result.push({
                        ...item,
                        rows: item.rows
                    });
                } else if (matchingRows.length) {
                    result.push({
                        ...item,
                        rows: matchingRows
                    });
                }

                return;
            }

            if (item.kind === "chapter") {
                const chapter = item.chapter;

                const titleMatches = textMatchesQuery(
                    chapter.name,
                    query
                );

                const matchingItems = filterItems(
                    chapter.items,
                    query
                );

                if (titleMatches) {
                    result.push({
                        ...item,
                        filteredItems: chapter.items
                    });
                } else if (matchingItems.length) {
                    result.push({
                        ...item,
                        filteredItems: matchingItems
                    });
                }
            }
        });

        return result;
    }

    function renderAll() {
        const query = normalize(el.search?.value || "");

        const visibleParts = parts
            .filter(part => !query || partMatches(part, query))
            .map(part => ({
                source: part,
                name: part.name,
                items: filterItems(part.items, query)
            }));

        renderIndex(visibleParts, query);
        renderDocument(visibleParts, query);
        updateSearchStatus(visibleParts, query);

        if (el.clear) {
            el.clear.hidden = !query;
        }

        // Show/hide index section based on whether there is an active search query
        if (el.indexSection) {
            el.indexSection.style.display = query ? "none" : "";
        }
    }

    function partMatches(part, query) {
        return textMatchesQuery(part.name, query) ||
            part.items.some(item => itemMatches(item, query));
    }

    // ---------------------------------------------------------
    // INDEX
    // ---------------------------------------------------------

    function renderIndex(visibleParts, query) {
        el.index.replaceChildren();

        if (!visibleParts.length) {
            el.index.appendChild(
                messageElement(
                    "Nessun risultato trovato.",
                    "constitution-index-empty"
                )
            );

            return;
        }

        visibleParts.forEach(part => {
            const details = document.createElement("details");

            details.className = "constitution-index-part";

            if (query) {
                details.open = true;
            }

            const summary = document.createElement("summary");

            summary.className = "constitution-index-part-title";

            appendHighlightedText(summary, part.name, query);
            details.appendChild(summary);

            const chapterContainer = document.createElement("div");

            chapterContainer.className =
                "constitution-index-chapters";

            part.items.forEach(item => {
                if (item.kind !== "chapter") return;

                const link = document.createElement("a");

                link.className = "constitution-index-chapter";
                link.href = `#${item.chapter.id}`;

                appendHighlightedText(
                    link,
                    item.chapter.name,
                    query
                );

                link.addEventListener("click", event => {
                    event.preventDefault();

                    const target = document.getElementById(
                        item.chapter.id
                    );

                    if (target) {
                        target.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                });

                chapterContainer.appendChild(link);
            });

            details.appendChild(chapterContainer);
            el.index.appendChild(details);
        });
    }

    // ---------------------------------------------------------
    // DOCUMENT
    // ---------------------------------------------------------

    function renderDocument(visibleParts, query) {
        el.content.replaceChildren();

        if (!visibleParts.length) {
            el.content.appendChild(
                messageElement(
                    query
                        ? "Nessun risultato trovato."
                        : "Nessun contenuto disponibile.",
                    "constitution-no-results"
                )
            );

            return;
        }

        visibleParts.forEach(part => {
            const partSection = document.createElement("section");

            partSection.className = "constitution-part";
            partSection.style.display = "block";
            partSection.style.width = "100%";
            partSection.style.maxWidth = "none";

            const partHeading = document.createElement("h2");

            partHeading.className = "constitution-part-title";

            appendHighlightedText(
                partHeading,
                part.name,
                query
            );

            partSection.appendChild(partHeading);

            renderItems(part.items, partSection, query);

            el.content.appendChild(partSection);
        });
    }

    function renderItems(items, container, query) {
        items.forEach(item => {
            if (item.kind === "row") {
                container.appendChild(
                    renderRow(item.row, query)
                );

                return;
            }

            if (item.kind === "subtitle") {
                container.appendChild(
                    renderSubtitleGroup(item, query)
                );

                return;
            }

            if (item.kind === "chapter") {
                const chapter = item.chapter;

                const section = document.createElement("section");

                section.className = "constitution-chapter";
                section.id = chapter.id;

                const heading = document.createElement("h3");

                heading.className = "constitution-chapter-title";

                appendHighlightedText(
                    heading,
                    chapter.name,
                    query
                );

                section.appendChild(heading);

                renderItems(
                    item.filteredItems || chapter.items,
                    section,
                    query
                );

                container.appendChild(section);
            }
        });
    }

    function renderSubtitleGroup(group, query) {
        const section = document.createElement("section");

        section.className = "constitution-subsection";

        const heading = document.createElement("h4");

        heading.className = "constitution-subsection-title";

        appendHighlightedText(
            heading,
            group.name,
            query
        );

        section.appendChild(heading);

        group.rows.forEach(row => {
            section.appendChild(renderRow(row, query));
        });

        return section;
    }

    // ---------------------------------------------------------
    // ROW RENDERING
    // ---------------------------------------------------------

    function renderRow(row, query) {
        const type = normalize(row.type);

        const isQuote = [
            "quote",
            "quotation",
            "citazione"
        ].includes(type);

        const isCanon = [
            "canon",
            "canone",
            "canone numerato"
        ].includes(type);

        const isText = [
            "text",
            "testo"
        ].includes(type);

        // QUOTATIONS
        if (isQuote) {
            return renderQuote(row, query);
        }

        // GENERAL TEXT
        if (isText) {
            const article = document.createElement("article");

            article.id = `${DOCUMENT_TYPE}-row-${row.sourceIndex}`;
            article.className = "constitution-text-entry";

            const content = document.createElement("div");

            content.className = "constitution-text-content";

            if (row.text) {
                appendHighlightedText(
                    content,
                    row.text,
                    query
                );
            }

            article.appendChild(content);

            return article;
        }

        // CANONS AND OTHER ROW TYPES
        const article = document.createElement("article");

        article.id = `${DOCUMENT_TYPE}-row-${row.sourceIndex}`;

        article.className = isCanon
            ? "document-canon canon-row"
            : "constitution-entry";

        if (isCanon && row.number) {
            const number = document.createElement("div");

            number.className = "canon-number";

            appendHighlightedText(
                number,
                row.number,
                query
            );

            article.appendChild(number);
        }

        const body = document.createElement("div");

        body.className = isCanon
            ? "canon-body"
            : "canon-entry";

        if (row.text) {
            const text = document.createElement("div");

            text.className = "canon-text";

            appendHighlightedText(
                text,
                row.text,
                query
            );

            body.appendChild(text);
        }

        if (row.subtext) {
            const subtext = document.createElement("div");

            subtext.className = "canon-subtext";

            appendHighlightedText(
                subtext,
                row.subtext,
                query
            );

            body.appendChild(subtext);
        }

        article.appendChild(body);

        return article;
    }

    function renderQuote(row, query) {
        const quote = document.createElement("blockquote");

        quote.id = `${DOCUMENT_TYPE}-row-${row.sourceIndex}`;
        quote.className = "constitution-quote document-quote";

        if (row.text) {
            const text = document.createElement("p");

            text.className = "constitution-quote-text";

            appendHighlightedText(
                text,
                row.text,
                query
            );

            quote.appendChild(text);
        }

        if (row.subtext) {
            const source = document.createElement("cite");

            source.className = "constitution-quote-source";

            appendHighlightedText(
                source,
                row.subtext,
                query
            );

            quote.appendChild(source);
        }

        return quote;
    }

    // ---------------------------------------------------------
    // SAFE SEARCH HIGHLIGHTING (Supports Partial Matches)
    // ---------------------------------------------------------

    function appendHighlightedText(element, value, query) {
        const text = String(value ?? "");

        if (!query) {
            element.textContent = text;
            return;
        }

        const normQuery = normalize(query);
        if (!normQuery) {
            element.textContent = text;
            return;
        }

        const normalizedChars = [];
        const positions = [];

        let offset = 0;

        for (const character of text) {
            const normalizedCharacter = character
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLocaleLowerCase("it");

            for (const char of normalizedCharacter) {
                normalizedChars.push(char);

                positions.push({
                    start: offset,
                    end: offset + character.length
                });
            }

            offset += character.length;
        }

        const normalizedText = normalizedChars.join("");
        const fragment = document.createDocumentFragment();

        let searchFrom = 0;
        let originalEnd = 0;
        let match;

        while (
            (match = normalizedText.indexOf(normQuery, searchFrom)) !== -1
        ) {
            const first = positions[match];

            const last = positions[
                match + normQuery.length - 1
            ];

            if (!first || !last) break;

            if (first.start > originalEnd) {
                fragment.appendChild(
                    document.createTextNode(
                        text.slice(originalEnd, first.start)
                    )
                );
            }

            const mark = document.createElement("mark");

            mark.textContent = text.slice(
                first.start,
                last.end
            );

            fragment.appendChild(mark);

            originalEnd = last.end;
            searchFrom = match + normQuery.length;
        }

        if (originalEnd === 0) {
            element.textContent = text;
            return;
        }

        if (originalEnd < text.length) {
            fragment.appendChild(
                document.createTextNode(
                    text.slice(originalEnd)
                )
            );
        }

        element.appendChild(fragment);
    }

    // ---------------------------------------------------------
    // SEARCH SUGGESTIONS
    // ---------------------------------------------------------

    function isCanonRow(row) {
        return [
            "canon",
            "canone",
            "canone numerato"
        ].includes(normalize(row.type));
    }

    function getSuggestionRows(query) {
        const results = [];

        function collect(items) {
            items.forEach(item => {
                if (item.kind === "row") {
                    const rowSearchable = [
                        item.row.number,
                        item.row.type,
                        item.row.text,
                        item.row.subtext
                    ].join(" ");

                    if (!query || textMatchesQuery(rowSearchable, query)) {
                        results.push(item.row);
                    }

                } else if (item.kind === "subtitle") {
                    const subtitleName = item.name;

                    if (!query || textMatchesQuery(subtitleName, query)) {
                        results.push({
                            sourceIndex: item.rows[0]?.sourceIndex,
                            part: item.rows[0]?.part || "",
                            chapter: item.rows[0]?.chapter || "",
                            subtitle: subtitleName,
                            type: "heading",
                            number: "",
                            text: subtitleName,
                            subtext: ""
                        });
                    }

                    item.rows.forEach(row => {
                        const rowSearchable = [
                            row.number,
                            row.type,
                            row.text,
                            row.subtext
                        ].join(" ");

                        if (!query || textMatchesQuery(rowSearchable, query)) {
                            results.push(row);
                        }
                    });

                } else if (item.kind === "chapter") {
                    collect(item.chapter.items);
                }
            });
        }

        parts.forEach(part => {
            collect(part.items);
        });

        return results;
    }

    function getSuggestionTarget(row) {
        return document.getElementById(
            `${DOCUMENT_TYPE}-row-${row.sourceIndex}`
        );
    }

    function renderSuggestions() {
        if (!el.suggestions || !el.search || !parts.length) {
            return;
        }

        const rawQuery = el.search.value.trim();
        const query = normalize(rawQuery);

        el.suggestions.replaceChildren();
        el.suggestions.hidden = true;

        if (!query) return;

        // Numeric searches prioritize exact canon-number matches.
        const numberQuery = query
            .replace(/^(canone|canon|n)\s*/, "")
            .replace(/\.$/, "")
            .trim();

        const rows = getSuggestionRows(query);

        const exactCanons = rows.filter(row =>
            isCanonRow(row) &&
            normalize(row.number).replace(/\.$/, "") === numberQuery
        );

        const seen = new Set();
        const candidates = [];

        [...exactCanons, ...rows].forEach(row => {
            if (row.sourceIndex === undefined) return;

            const key = String(row.sourceIndex) + "_" + (row.type === "heading" ? "heading" : "row");

            if (seen.has(key)) return;

            seen.add(key);
            candidates.push(row);
        });

        candidates.slice(0, 5).forEach(row => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "constitution-search-suggestion";
            button.setAttribute("role", "option");

            const text = document.createElement("span");

            text.className = "constitution-suggestion-text";

            const displayText = (
                row.text ||
                row.subtext ||
                row.subtitle ||
                row.chapter ||
                row.part ||
                ""
            ).replace(/\s+/g, " ").trim();

            const maxLength = 110;

            const excerpt = displayText.length > maxLength
                ? displayText.slice(0, maxLength).trim() + "…"
                : displayText;

            appendHighlightedText(text, excerpt, query);
            button.appendChild(text);

            if (isCanonRow(row) && row.number) {
                const number = document.createElement("span");

                number.className = "constitution-suggestion-number";
                number.textContent = `Can. ${row.number}`;

                button.appendChild(number);
            }

            button.addEventListener("click", () => {
                selectSuggestion(row);
            });

            el.suggestions.appendChild(button);
        });

        el.suggestions.hidden = candidates.length === 0;
    }

    function selectSuggestion(row) {
        if (!el.search) return;

        el.search.value = "";

        // Reset the page view when clicking a suggestion
        renderAll();

        if (el.suggestions) {
            el.suggestions.replaceChildren();
            el.suggestions.hidden = true;
        }

        const target = getSuggestionTarget(row);

        if (!target) {
            console.warn(
                "Destinazione della ricerca non trovata:",
                row.sourceIndex
            );

            return;
        }

        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        target.classList.remove("constitution-search-target");

        // Restart the temporary highlight.
        void target.offsetWidth;

        target.classList.add("constitution-search-target");

        window.setTimeout(() => {
            target.classList.remove("constitution-search-target");
        }, 2200);
    }

    function closeSuggestions() {
        if (!el.suggestions) return;

        el.suggestions.hidden = true;
    }

    document.addEventListener("click", event => {
        if (
            !event.target.closest(".constitution-search-section")
        ) {
            closeSuggestions();
        }
    });

    el.search?.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSuggestions();
        }
    });

    // ---------------------------------------------------------
    // SEARCH STATUS
    // ---------------------------------------------------------

    function updateSearchStatus(visibleParts, query) {
        if (!el.status) return;

        if (!query) {
            el.status.textContent = "";
            el.status.hidden = true;
            return;
        }

        let count = 0;

        function countItems(items) {
            items.forEach(item => {
                if (item.kind === "row") {
                    if (rowMatches(item.row, query)) {
                        count++;
                    }

                } else if (item.kind === "subtitle") {
                    item.rows.forEach(row => {
                        if (rowMatches(row, query)) {
                            count++;
                        }
                    });

                } else if (item.kind === "chapter") {
                    countItems(
                        item.filteredItems || item.chapter.items
                    );
                }
            });
        }

        visibleParts.forEach(part => {
            countItems(part.items);
        });

        el.status.textContent = count === 1
            ? "1 risultato trovato"
            : `${count} risultati trovati`;

        el.status.hidden = false;
    }

    // ---------------------------------------------------------
    // CONTROLS
    // ---------------------------------------------------------

    function bindControls() {
        // Show suggestions as user types, but DO NOT filter the main page automatically
        el.search?.addEventListener("input", () => {
            renderSuggestions();
        });

        // Filter the main page and hide the index ONLY when pressing Enter
        el.search?.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                closeSuggestions();
                renderAll();
            }
        });

        // Reset everything when clicking clear (×)
        el.clear?.addEventListener("click", () => {
            if (el.search) {
                el.search.value = "";
                el.search.focus();
            }

            renderAll();
            closeSuggestions();
        });

        el.decrease?.addEventListener("click", () => {
            setFontSize(fontSize - FONT_STEP);
        });

        el.increase?.addEventListener("click", () => {
            setFontSize(fontSize + FONT_STEP);
        });

        el.backToTop?.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    function setFontSize(size) {
        fontSize = Math.max(
            MIN_FONT_SIZE,
            Math.min(MAX_FONT_SIZE, size)
        );

        el.content.style.fontSize = `${fontSize}px`;

        el.content.style.setProperty(
            "--constitution-reading-size",
            `${fontSize}px`
        );

        if (el.decrease) {
            el.decrease.disabled = fontSize <= MIN_FONT_SIZE;
        }

        if (el.increase) {
            el.increase.disabled = fontSize >= MAX_FONT_SIZE;
        }
    }

    // ---------------------------------------------------------
    // MESSAGES
    // ---------------------------------------------------------

    function messageElement(text, className) {
        const p = document.createElement("p");

        p.className = className;
        p.textContent = text;

        return p;
    }

    function showMessage(text) {
        if (!el.message) return;

        el.message.textContent = text;
        el.message.hidden = false;
    }

    function hideMessage() {
        if (!el.message) return;

        el.message.textContent = "";
        el.message.hidden = true;
    }
}
