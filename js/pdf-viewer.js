import * as dom from "./dom.js";
import { createElement, prefersReducedMotion } from "./utils.js";

// Lernheft-Viewer: zeigt ein PDF als Fenster über der App (PDF.js, lokal in vendor/).
// Springt auf eine Seite und markiert dort die Wörter der Antwort.
// PDF.js wird erst beim ersten Öffnen geladen, damit der App-Start leicht bleibt.

const PDFJS_URL = new URL("../vendor/pdfjs/pdf.min.mjs", import.meta.url);
const WORKER_URL = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url);
const MIN_WORD_LENGTH = 4;
const STOP_WORDS = new Set("eine einer einem einen nicht oder auch sind wird werden dass durch nach beim über unter sowie diese dieser kann können haben wenn dann mehr sehr immer schon noch ohne gegen ihre ihren sich nur oft meist bzw".split(" "));

let pdfjsPromise = null;
const documentCache = new Map();

function loadPdfjs() {
    pdfjsPromise ??= import(PDFJS_URL.href).then(lib => {
        lib.GlobalWorkerOptions.workerSrc = WORKER_URL.href;
        return lib;
    });
    return pdfjsPromise;
}

function loadDocument(lib, file) {
    const url = new URL(file, document.baseURI).href;
    if (!documentCache.has(url)) {
        documentCache.set(url, lib.getDocument({ url }).promise.catch(error => {
            documentCache.delete(url);
            throw error;
        }));
    }
    return documentCache.get(url);
}

const normalize = text => text.toLowerCase().normalize("NFC").replace(/­/g, "");

export function highlightWords(phrases) {
    const words = phrases.flatMap(phrase => normalize(phrase).match(/[a-zäöüß0-9-]+/g) ?? []);
    const long = words.filter(word => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word));
    return [...new Set(long.length ? long : words)];
}

export function createPdfViewer() {
    const view = {
        lib: null,
        pdf: null,
        targetPage: 1,
        words: [],
        currentPage: 1,
        renderObserver: null,
        pageObserver: null,
        openToken: 0,
    };

    function setStatus(text) {
        dom.pdfViewerStatus.textContent = text;
        dom.pdfViewerStatus.hidden = !text;
    }

    function updatePageInfo() {
        const total = view.pdf?.numPages ?? 0;
        dom.pdfViewerPage.textContent = total ? `S. ${view.currentPage} / ${total}` : "";
        dom.pdfViewerPrev.disabled = view.currentPage <= 1;
        dom.pdfViewerNext.disabled = view.currentPage >= total;
    }

    function pageElement(number) {
        return dom.pdfViewerPages.querySelector(`[data-page="${number}"]`);
    }

    function scrollToPage(number, smooth = false) {
        pageElement(number)?.scrollIntoView({ block: "start", behavior: smooth && !prefersReducedMotion ? "smooth" : "auto" });
    }

    function markWords(textLayer) {
        if (!view.words.length) {
            return null;
        }
        let first = null;
        textLayer.querySelectorAll("span").forEach(span => {
            const text = normalize(span.textContent);
            if (view.words.some(word => text.includes(word))) {
                span.classList.add("pdf-mark");
                first ??= span;
            }
        });
        return first;
    }

    async function renderPage(element, token) {
        if (element.dataset.rendered) {
            return;
        }
        element.dataset.rendered = "true";
        const number = Number(element.dataset.page);
        const page = await view.pdf.getPage(number);
        if (token !== view.openToken) {
            return;
        }
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = element.clientWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const ratio = window.devicePixelRatio || 1;

        const canvas = createElement("canvas", "pdf-canvas");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        element.style.setProperty("--scale-factor", String(scale));
        element.replaceChildren(canvas);

        await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
            transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
        }).promise;

        const textLayer = createElement("div", "pdf-text-layer");
        element.append(textLayer);
        await new view.lib.TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport }).render();

        if (number === view.targetPage && token === view.openToken) {
            const firstMark = markWords(textLayer);
            firstMark?.scrollIntoView({ block: "center" });
        }
    }

    function buildPages(firstViewport, token) {
        const ratio = firstViewport.height / firstViewport.width;
        const pages = Array.from({ length: view.pdf.numPages }, (_, index) => {
            const element = createElement("div", "pdf-page");
            element.dataset.page = String(index + 1);
            element.style.aspectRatio = `1 / ${ratio}`;
            element.setAttribute("aria-label", `Seite ${index + 1}`);
            return element;
        });
        dom.pdfViewerPages.replaceChildren(...pages);

        view.renderObserver = new IntersectionObserver(entries => {
            entries.filter(entry => entry.isIntersecting).forEach(entry => {
                renderPage(entry.target, token).catch(error => console.error(error));
            });
        }, { root: dom.pdfViewerPages, rootMargin: "100% 0px" });

        view.pageObserver = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting);
            if (visible.length) {
                view.currentPage = Number(visible[0].target.dataset.page);
                updatePageInfo();
            }
        }, { root: dom.pdfViewerPages, threshold: 0.5 });

        pages.forEach(element => {
            view.renderObserver.observe(element);
            view.pageObserver.observe(element);
        });
    }

    function cleanup() {
        view.openToken += 1;
        view.renderObserver?.disconnect();
        view.pageObserver?.disconnect();
        view.renderObserver = view.pageObserver = null;
        dom.pdfViewerPages.replaceChildren();
        view.pdf = null;
    }

    async function open(doc, { page = 1, highlight = [], closeLabel = "← Zurück zur Frage" } = {}) {
        cleanup();
        const token = view.openToken;
        view.targetPage = page;
        view.currentPage = page;
        view.words = highlightWords(highlight);
        dom.pdfViewerTitle.textContent = doc.title;
        dom.pdfViewerClose.textContent = closeLabel;
        dom.pdfViewerFallback.href = page > 1 ? `${doc.file}#page=${page}` : doc.file;
        dom.pdfViewerPage.textContent = "";
        setStatus("Lernheft wird geladen …");

        if (!dom.pdfViewer.open) {
            dom.pdfViewer.showModal();
            history.pushState({ pdfViewer: true }, "");
        }

        try {
            view.lib = await loadPdfjs();
            const pdf = await loadDocument(view.lib, doc.file);
            if (token !== view.openToken) {
                return;
            }
            view.pdf = pdf;
            view.targetPage = Math.min(Math.max(page, 1), pdf.numPages);
            const firstPage = await pdf.getPage(1);
            buildPages(firstPage.getViewport({ scale: 1 }), token);
            setStatus("");
            updatePageInfo();
            scrollToPage(view.targetPage);
            await renderPage(pageElement(view.targetPage), token);
        } catch (error) {
            console.error(error);
            if (token === view.openToken) {
                setStatus("Das Lernheft konnte hier nicht angezeigt werden. Über „Als PDF öffnen“ geht es trotzdem.");
            }
        }
    }

    function close() {
        if (dom.pdfViewer.open) {
            dom.pdfViewer.close();
        }
    }

    dom.pdfViewerClose.addEventListener("click", close);
    dom.pdfViewerPrev.addEventListener("click", () => scrollToPage(view.currentPage - 1, true));
    dom.pdfViewerNext.addEventListener("click", () => scrollToPage(view.currentPage + 1, true));

    // Schließen per Button, Esc oder Zurück-Taste (Android) – immer über das close-Event aufräumen
    dom.pdfViewer.addEventListener("close", () => {
        cleanup();
        if (history.state?.pdfViewer) {
            history.back();
        }
    });
    window.addEventListener("popstate", close);

    return { open, close };
}
