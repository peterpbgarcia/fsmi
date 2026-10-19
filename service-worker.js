/* =========================================================
   FSMI CONGREGATION APP
   SERVICE WORKER
   ========================================================= */

const CACHE_NAME = "fsmi-app-v1.0.2";

/* =========================================================
   FILES TO CACHE
   ========================================================= */

const APP_FILES = [
    "aggiornamenti.html",
    "calendario.html",
    "css/aggiornamenti.css",
    "css/documenti.css",
    "css/religiosi.css",
    "css/style.css",
    "dat/costituzioni.xlsx",
    "dat/dat-rel.xlsx",
    "dat/direttorio.xlsx",
    "documenti.html",
    "documenti/annuario.html",
    "documenti/costituzioni.html",
    "documenti/css/subcss.css",
    "documenti/direttorio.html",
    "documenti/js/constitution.js",
    "documenti/js/documenti.js",
    "documenti/pdf/annuariofsmi.pdf",
    "documenti/pdf/annuariofsmi-ORG.pdf",
    "icons/icon-128.webp",
    "icons/icon-192.webp",
    "icons/icon-256.webp",
    "icons/icon-48.webp",
    "icons/icon-512.webp",
    "icons/icon-72.webp",
    "icons/icon-96.webp",
    "icons/logo.png",
    "img/logo.png",
    "img/logo-192.png",
    "img/logo-512.png",
    "index.html",
    "js/aggiornamenti.js",
    "js/app.js",
    "js/religiosi.js",
    "js/xlsx.full.min.js",
    "manifest.webmanifest",
    "religiosi.html"
];


/* =========================================================
   INSTALL (Strict Caching)
   ========================================================= */

self.addEventListener("install", event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            // If any file fails to fetch, installation aborts safely
            for (const file of APP_FILES) {
                const response = await fetch(file, { cache: "reload" });

                if (!response.ok) {
                    throw new Error("HTTP " + response.status + " - " + file);
                }

                await cache.put(file, response);
                console.log("[FSMI] Cached:", file);
            }

            await self.skipWaiting();
        })()
    );
});


/* =========================================================
   ACTIVATE (Cleanup Old Caches)
   ========================================================= */

self.addEventListener("activate", event => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys.map(key => {
                    if (key.startsWith("fsmi-app-") && key !== CACHE_NAME) {
                        console.log("[FSMI] Deleting old cache:", key);
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
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            // 1. Exact request match (including query parameters)
            let cached = await cache.match(request);
            if (cached) {
                return cached;
            }

            // 2. Match URL without query parameters
            const cleanUrl = new URL(request.url);
            cleanUrl.search = "";
            cached = await cache.match(cleanUrl);
            if (cached) {
                return cached;
            }

            // 3. Try network
            try {
                const response = await fetch(request);

                if (response && response.status === 200 && response.type !== "opaque") {
                    event.waitUntil(
                        cache.put(cleanUrl, response.clone()).catch(error => {
                            console.warn("[FSMI] Cache write failed:", cleanUrl.href, error);
                        })
                    );
                }

                return response;

            } catch (error) {
                console.warn("[FSMI] Offline request failed:", url.href);

                // 4. Offline fallback
                const fallback = await cache.match("index.html");
                if (fallback) {
                    return fallback;
                }

                return new Response(
                    "Sei offline e questa pagina non è disponibile.",
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