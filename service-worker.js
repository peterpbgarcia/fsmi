/* =========================================================
   FSMI CONGREGATION APP
   SERVICE WORKER
   ========================================================= */

const CACHE_NAME = "fsmi-app-v1.0.3";
const UPDATE_CACHE_NAME = CACHE_NAME + "-update";


/* =========================================================
   FILES TO CACHE
   ========================================================= */

const APP_FILES = [
    "/.htaccess",
    "/aggiornamenti.html",
    "/calendario.html",
    "/css/aggiornamenti.css",
    "/css/documenti.css",
    "/css/religiosi.css",
    "/css/style.css",
    "/dat/costituzioni.xlsx",
    "/dat/dat-rel.xlsx",
    "/dat/direttorio.xlsx",
    "/documenti.html",
    "/documenti/annuario.html",
    "/documenti/costituzioni.html",
    "/documenti/css/subcss.css",
    "/documenti/direttorio.html",
    "/documenti/js/constitution.js",
    "/documenti/js/documenti.js",
    "/documenti/pdf/annuariofsmi.pdf",
    "/documenti/pdf/annuariofsmi-ORG.pdf",
    "/icons/icon-128.webp",
    "/icons/icon-192.webp",
    "/icons/icon-256.webp",
    "/icons/icon-48.webp",
    "/icons/icon-512.webp",
    "/icons/icon-72.webp",
    "/icons/icon-96.webp",
    "/icons/logo.png",
    "/img/logo.png",
    "/img/logo-192.png",
    "/img/logo-512.png",
    "/index.html",
    "/js/aggiornamenti.js",
    "/js/app.js",
    "/js/religiosi.js",
    "/js/xlsx.full.min.js",
    "/manifest.webmanifest",
    "/NO INDEXING.txt",
    "/npx http-server.txt",
    "/religiosi.html"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            for (const file of APP_FILES) {
                try {
                    const response = await fetch(file, {
                        cache: "reload"
                    });

                    if (!response.ok) {
                        throw new Error("HTTP " + response.status);
                    }

                    await cache.put(file, response);

                    console.log("[FSMI] Cached:", file);

                } catch (error) {
                    console.error(
                        "[FSMI] Cache failed:",
                        file,
                        error
                    );
                }
            }

            await self.skipWaiting();
        })()
    );
});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys.map(key => {
                    if (
                        (
                            key.startsWith("fsmi-app-") ||
                            key.startsWith("fsmi-update-")
                        ) &&
                        key !== CACHE_NAME
                    ) {
                        return caches.delete(key);
                    }
                })
            );

            await self.clients.claim();

            console.log("[FSMI] Service worker activated.");
        })()
    );
});


/* =========================================================
   MANUAL UPDATE MESSAGE
   ========================================================= */

self.addEventListener("message", event => {
    if (
        !event.data ||
        event.data.type !== "UPDATE_APP"
    ) {
        return;
    }

    event.waitUntil(
        updateApp()
            .then(() => {
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({
                        success: true
                    });
                }
            })
            .catch(error => {
                console.error("[FSMI] Update failed:", error);

                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({
                        success: false,
                        error: error.message
                    });
                }
            })
    );
});


/* =========================================================
   UPDATE APP
   ========================================================= */

async function updateApp() {

    console.log("[FSMI] Starting complete app update...");

    /* 1. Remove previous temporary cache */

    await caches.delete(UPDATE_CACHE_NAME);

    /* 2. Create temporary update cache */

    const updateCache = await caches.open(
        UPDATE_CACHE_NAME
    );

    /* 3. Download every listed file */

    for (const file of APP_FILES) {
        try {
            console.log("[FSMI] Downloading:", file);

            const response = await fetch(file, {
                cache: "reload"
            });

            if (!response.ok) {
                throw new Error(
                    "HTTP " + response.status + " - " + file
                );
            }

            await updateCache.put(
                file,
                response.clone()
            );

            console.log("[FSMI] Updated:", file);

        } catch (error) {

            await caches.delete(UPDATE_CACHE_NAME);

            throw new Error(
                "Impossibile aggiornare:\n" +
                file +
                "\n\n" +
                error.message
            );
        }
    }

    /* 4. All downloads succeeded; replace main cache */

    const mainCache = await caches.open(CACHE_NAME);

    const oldRequests = await mainCache.keys();

    for (const request of oldRequests) {
        await mainCache.delete(request);
    }

    /* 5. Copy updated files into main cache */

    const newRequests = await updateCache.keys();

    for (const request of newRequests) {
        const response = await updateCache.match(request);

        if (response) {
            await mainCache.put(request, response);
        }
    }

    /* 6. Delete temporary cache */

    await caches.delete(UPDATE_CACHE_NAME);

    console.log("[FSMI] App updated successfully.");
}


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    /* Only GET requests */

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    /* Only this website */

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {

            const cache = await caches.open(CACHE_NAME);

            /* 1. Exact request, including query parameters */

            let cached = await cache.match(request);

            if (cached) {
                return cached;
            }

            /* 2. Match URL without query parameters */

            cached = await cache.match(url.pathname);

            if (cached) {
                return cached;
            }

            /* 3. Try network */

            try {
                const response = await fetch(request);

                if (
                    response &&
                    response.status === 200 &&
                    response.type !== "opaque"
                ) {
                    event.waitUntil(
                        cache.put(
                            url.pathname,
                            response.clone()
                        ).catch(error => {
                            console.warn(
                                "[FSMI] Cache write failed:",
                                url.pathname,
                                error
                            );
                        })
                    );
                }

                return response;

            } catch (error) {

                console.warn(
                    "[FSMI] Offline request failed:",
                    url.href
                );

                /* 4. Offline fallback */

                const fallback = await cache.match("/index.html");

                if (fallback) {
                    return fallback;
                }

                return new Response(
                    "Sei offline e questa pagina non ÃƒÆ’Ã‚Â¨ disponibile.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8"
                        }
                    }
                );
            }
        })()
    );
});