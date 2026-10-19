/* ============================================
   CONGREGAZIONE FSMI
   UNIVERSAL PAGE STACK
   ============================================ */

(() => {
    "use strict";

    /* Avoid initializing the manager more than once. */
    if (window.AppStack) return;

    /* Pages inside an overlay use the main window's stack. */
    if (window.parent !== window) {
        try {
            if (window.parent.AppStack) {
                window.AppStack = window.parent.AppStack;
            }
        } catch (error) {
            console.error("Unable to access the parent stack:", error);
        }
    }

    const isMainWindow = window.parent === window;

    /*
     * The main window owns the stack.
     * Child pages only use its public API.
     */
    if (!isMainWindow) {
        installPageHandlers();
        return;
    }

    const layers = [];
    let nextId = 0;
    let host = null;

    /* --------------------------------------------
       CREATE THE OVERLAY CONTAINER
       -------------------------------------------- */

    function getHost() {
        if (host && host.isConnected) return host;

        host = document.createElement("div");
        host.id = "app-stack-host";

        Object.assign(host.style, {
            position: "fixed",
            inset: "0",
            zIndex: "9999",
            overflow: "hidden",
            pointerEvents: "none"
        });

        document.body.appendChild(host);

        return host;
    }

    /* --------------------------------------------
       OPEN A NEW LAYER
       -------------------------------------------- */

    function open(url, options = {}) {
        let destination;

        try {
            destination = new URL(url, document.baseURI);
        } catch (error) {
            console.error("Invalid page URL:", url);
            return null;
        }

        /* Only open pages belonging to this app's origin. */
        if (destination.origin !== window.location.origin) {
            console.error("Cannot stack a page from another origin.");
            return null;
        }

        const frame = document.createElement("iframe");
        const id = ++nextId;

        frame.id = `app-stack-layer-${id}`;
        frame.title = options.title || "Pagina";
        frame.src = destination.href;

        Object.assign(frame.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            border: "0",
            display: "block",
            background: "#eaf6ff",
            pointerEvents: "auto"
        });

        const layer = {
            id,
            url: destination.href,
            title: frame.title,
            frame
        };

        layers.push(layer);
        getHost().appendChild(frame);

        /* Push history state so browser back button / swipe gesture closes the overlay */
        if (typeof history.pushState === "function") {
            history.pushState({ appStackLayer: true }, "", window.location.href);
        }

        refreshLayers();

        return id;
    }

    /* --------------------------------------------
       PRESERVE UNDERLYING PAGES
       -------------------------------------------- */

    function refreshLayers() {
        const topIndex = layers.length - 1;

        layers.forEach((layer, index) => {
            const isTop = index === topIndex;

            layer.frame.style.visibility = isTop
                ? "visible"
                : "hidden";

            layer.frame.style.pointerEvents = isTop
                ? "auto"
                : "none";

            layer.frame.setAttribute(
                "aria-hidden",
                String(!isTop)
            );
        });

        if (layers.length === 0 && host) {
            host.remove();
            host = null;
        }
    }

    /* --------------------------------------------
       CLOSE ONLY THE TOPMOST LAYER
       -------------------------------------------- */

    function closeTop() {
        if (layers.length === 0) return false;

        const closedLayer = layers.pop();

        closedLayer.frame.remove();

        refreshLayers();

        const previousLayer = layers[layers.length - 1];

        if (previousLayer) {
            previousLayer.frame.focus();
        } else {
            window.focus();
        }

        return true;
    }

    /* --------------------------------------------
       STACK INFORMATION
       -------------------------------------------- */

    function getDepth() {
        return layers.length;
    }

    function getTop() {
        const top = layers[layers.length - 1];

        if (!top) return null;

        return {
            id: top.id,
            url: top.url,
            title: top.title
        };
    }

    /* --------------------------------------------
       PUBLIC API
       -------------------------------------------- */

    window.AppStack = Object.freeze({
        open,
        closeTop,
        getDepth,
        getTop
    });

    /* --------------------------------------------
       BROWSER BACK BUTTON / SWIPE GESTURE SUPPORT
       -------------------------------------------- */

    window.addEventListener("popstate", () => {
        if (layers.length > 0) {
            closeTop();
        }
    });

    /* --------------------------------------------
       FUTURE PAGE LINKS
       Only links marked data-overlay are intercepted.
       Ordinary links remain unchanged.
       -------------------------------------------- */

    installPageHandlers();

    function installPageHandlers() {
        document.addEventListener("click", event => {
            const link = event.target.closest("a[data-overlay]");

            if (!link) return;

            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                link.hasAttribute("download") ||
                (link.target && link.target !== "_self")
            ) {
                return;
            }

            let destination;

            try {
                destination = new URL(link.href, document.baseURI);
            } catch (error) {
                return;
            }

            if (destination.origin !== window.location.origin) {
                return;
            }

            const manager = window.parent !== window
                ? window.parent.AppStack
                : window.AppStack;

            if (!manager) return;

            event.preventDefault();

            manager.open(destination.href, {
                title: link.textContent.trim() || "Pagina"
            });
        });

        /* Desktop keyboard support; no visible close button. */
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;

            const manager = window.parent !== window
                ? window.parent.AppStack
                : window.AppStack;

            if (!manager || manager.getDepth() === 0) return;

            event.preventDefault();
            event.stopPropagation();
            manager.closeTop();
        });
    }

    /* --------------------------------------------
       ANDROID BACK BUTTON — CAPACITOR
       -------------------------------------------- */

    function registerAndroidBack() {
        const appPlugin = window.Capacitor?.Plugins?.App;

        if (!appPlugin?.addListener) return;

        appPlugin.addListener("backButton", () => {
            if (closeTop()) return;

            /* No overlays remain: return to normal app exit. */
            appPlugin.exitApp?.();
        });
    }

    registerAndroidBack();

})();