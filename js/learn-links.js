import { createElement } from "./utils.js";

// Verweise nach einer Antwort: „Im Glossar“ und „Im Lernheft nachlesen“.
// `links` kommt aus main.js, damit die Modi die Tabs nicht selbst kennen müssen.
export function createLearnLinks(item, links) {
    const box = createElement("div", "learn-links");

    if (item.glossary && links.hasGlossaryTerm(item.glossary)) {
        const button = createElement("button", "learn-link", `Im Glossar: ${item.glossary}`);
        button.type = "button";
        button.addEventListener("click", () => links.openGlossary(item.glossary));
        box.append(button);
    }

    const doc = item.source ? links.getDocument(item.source.doc) : null;
    if (doc) {
        const { chapter, page } = item.source;
        const where = [chapter && `Kapitel ${chapter}`, page && `S. ${page}`].filter(Boolean).join(", ");
        const label = `Nachlesen: ${doc.title}${where ? ` (${where})` : ""}`;
        const anchor = createElement("a", "learn-link learn-link--doc", label);
        // #page=N: Der PDF-Viewer des Browsers öffnet direkt die Seite mit der Antwort.
        anchor.href = page ? `${doc.file}#page=${page}` : doc.file;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        box.append(anchor);
    }

    return box.childElementCount ? box : null;
}
