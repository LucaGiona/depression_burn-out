import * as dom from "./dom.js";
import { createElement } from "./utils.js";
import { ALPHABET, filterEntries, groupByLetter, normalizeText } from "./glossary-search.js";

// Nachschlage-Ansicht: keine Punkte, nur Suchen, Filtern und Lesen
export function initGlossary({ topic }) {
    const { topics, entries } = topic.glossary;
    const topicLabels = new Map(topics.map(entry => [entry.id, entry.label]));
    const view = { query: "", topicId: null };
    let sectionsByLetter = new Map();

    function renderTopicFilter() {
        const options = [{ id: null, label: "Alle" }, ...topics];
        dom.glossaryTopics.replaceChildren(...options.map(option => {
            const chip = createElement("button", "chip", option.label);
            chip.type = "button";
            chip.setAttribute("aria-pressed", String(view.topicId === option.id));
            chip.addEventListener("click", () => {
                view.topicId = option.id;
                renderTopicFilter();
                renderList();
            });
            return chip;
        }));
    }

    function createEntry(entry) {
        const article = createElement("article", "glossary-entry");
        article.dataset.term = normalizeText(entry.term);
        const head = createElement("div", "glossary-entry-head");
        head.append(
            createElement("dfn", "glossary-term", entry.term),
            createElement("span", "glossary-topic", topicLabels.get(entry.topic) ?? entry.topic)
        );
        article.append(
            head,
            createElement("p", "glossary-meaning", entry.meaning),
        );
        if (entry.explanation) {
            article.append(createElement("p", "glossary-explanation", entry.explanation));
        }
        if (entry.aliases?.length) {
            article.append(createElement("p", "glossary-aliases", `auch: ${entry.aliases.join(", ")}`));
        }
        return article;
    }

    function renderLetterNav(availableLetters) {
        dom.glossaryLetters.replaceChildren(...ALPHABET.map(letter => {
            const button = createElement("button", "glossary-letter", letter);
            button.type = "button";
            button.disabled = !availableLetters.has(letter);
            button.setAttribute("aria-label", `Zu ${letter} springen`);
            button.addEventListener("click", () => {
                sectionsByLetter.get(letter)?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            return button;
        }));
    }

    function renderEmptyState() {
        const empty = createElement("div", "glossary-empty");
        const reset = createElement("button", "btn btn--ghost", "Suche zurücksetzen");
        reset.type = "button";
        reset.addEventListener("click", () => {
            view.query = "";
            view.topicId = null;
            dom.glossarySearch.value = "";
            renderTopicFilter();
            renderList();
            dom.glossarySearch.focus();
        });
        empty.append(createElement("p", "", "Kein Begriff gefunden."), reset);
        dom.glossaryList.replaceChildren(empty);
    }

    function renderList() {
        const filtered = filterEntries(entries, view);
        const groups = groupByLetter(filtered);
        sectionsByLetter = new Map();

        dom.glossaryCount.textContent = filtered.length === 1 ? "1 Begriff" : `${filtered.length} Begriffe`;
        renderLetterNav(new Set(groups.map(group => group.letter)));

        if (groups.length === 0) {
            renderEmptyState();
            return;
        }

        dom.glossaryList.replaceChildren(...groups.map(group => {
            const section = createElement("section", "glossary-group");
            section.append(createElement("h3", "glossary-group-letter", group.letter), ...group.entries.map(createEntry));
            sectionsByLetter.set(group.letter, section);
            return section;
        }));
    }

    dom.glossarySearch.addEventListener("input", () => {
        view.query = dom.glossarySearch.value;
        renderList();
    });
    dom.glossarySearch.addEventListener("keydown", event => {
        if (event.key === "Escape" && dom.glossarySearch.value) {
            dom.glossarySearch.value = "";
            view.query = "";
            renderList();
        }
    });

    // Sprung aus einem Quiz: Begriff suchen, Eintrag hervorheben
    function focusTerm(term) {
        view.query = term;
        view.topicId = null;
        dom.glossarySearch.value = term;
        renderTopicFilter();
        renderList();
        const target = dom.glossaryList.querySelector(`[data-term="${CSS.escape(normalizeText(term))}"]`)
            ?? dom.glossaryList.querySelector(".glossary-entry");
        if (target) {
            target.classList.add("glossary-entry--focus");
            target.scrollIntoView({ block: "center" });
        }
    }

    function hasTerm(term) {
        const key = normalizeText(term);
        return entries.some(entry => normalizeText(entry.term) === key);
    }

    renderTopicFilter();
    renderList();
    return { focusTerm, hasTerm };
}
