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
        const chapter = item.source.chapter ? `, Kapitel ${item.source.chapter}` : "";
        const anchor = createElement("a", "learn-link learn-link--doc", `Nachlesen: ${doc.title}${chapter}`);
        anchor.href = doc.file;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        box.append(anchor);
    }

    return box.childElementCount ? box : null;
}
