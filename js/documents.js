import * as dom from "./dom.js";
import { createElement } from "./utils.js";

// Liste der Lernhefte (PDF) – ohne Punkte, nur zum Nachlesen
export function initDocuments({ topic }) {
    dom.docList.replaceChildren(...topic.documents.map(doc => {
        const card = createElement("article", "doc-card");
        const icon = createElement("span", "doc-icon", "PDF");
        icon.setAttribute("aria-hidden", "true");
        const body = createElement("div", "doc-body");
        body.append(
            createElement("h3", "doc-title", doc.title),
            createElement("p", "doc-desc", doc.description),
            createElement("p", "doc-meta", doc.pages ? `${doc.pages} Seiten` : "")
        );
        const link = createElement("a", "btn btn--ghost doc-open", "Öffnen");
        link.href = doc.file;
        link.target = "_blank";
        link.rel = "noopener";
        card.append(icon, body, link);
        return card;
    }));
}
