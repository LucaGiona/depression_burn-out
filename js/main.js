import * as dom from "./dom.js";
import { state, recordAnswer } from "./state.js";
import { loadTopic } from "./data-loader.js";
import { createQuizEngine } from "./quiz-engine.js";
import { renderScore } from "./scoreboard.js";
import { initMultipleChoice } from "./modes/multiple-choice.js";
import { initSlotClassification } from "./modes/slot-classification.js";
import { initCloze } from "./modes/cloze.js";
import { initImageQuiz } from "./modes/image-quiz.js";
import { initGlossary } from "./glossary.js";
import { initDocuments } from "./documents.js";

const TOPIC_ID = "depression";

// Tab-ID → Verfügbarkeit (hat das Thema Daten dafür?) und Init-Funktion
const MODES = {
    mc: { isAvailable: topic => Boolean(topic.modes.multipleChoice), init: initMultipleChoice },
    slot: { isAvailable: topic => Boolean(topic.modes.classification), init: initSlotClassification },
    cloze: { isAvailable: topic => Boolean(topic.modes.cloze), init: initCloze },
    images: { isAvailable: topic => Boolean(topic.modes.imageQuiz), init: initImageQuiz },
    glossary: { isAvailable: topic => Boolean(topic.glossary), init: initGlossary },
    docs: { isAvailable: topic => Boolean(topic.documents?.length), init: initDocuments },
};

// Glossar und Lernhefte zuerst, damit die Quiz-Modi darauf verlinken können
const INIT_ORDER = ["glossary", "docs", "mc", "slot", "cloze", "images"];

function getPanel(tab) {
    return document.querySelector(`#${tab.getAttribute("aria-controls")}`);
}

function showMode(modeId) {
    state.activeMode = modeId;
    dom.modeTabs.forEach(tab => {
        const isActive = tab.dataset.mode === modeId;
        tab.setAttribute("aria-selected", String(isActive));
        getPanel(tab).hidden = !isActive;
    });
    if (window.location.hash.slice(1) !== modeId) {
        history.replaceState(null, "", `#${modeId}`);
    }
}

function initTabs(availableModes) {
    dom.modeTabs.forEach(tab => {
        if (!availableModes.includes(tab.dataset.mode)) {
            tab.hidden = true;
            getPanel(tab).hidden = true;
            return;
        }
        tab.addEventListener("click", () => showMode(tab.dataset.mode));
    });

    const hashMode = window.location.hash.slice(1);
    const firstQuiz = INIT_ORDER.slice(2).find(modeId => availableModes.includes(modeId));
    showMode(availableModes.includes(hashMode) ? hashMode : firstQuiz ?? availableModes[0]);
}

function showError(message) {
    dom.appError.textContent = message;
    dom.appError.hidden = false;
}

function createLinks(topic, glossaryApi) {
    const documents = new Map((topic.documents ?? []).map(doc => [doc.id, doc]));
    return {
        hasGlossaryTerm: term => Boolean(glossaryApi?.hasTerm(term)),
        openGlossary: term => {
            showMode("glossary");
            glossaryApi.focusTerm(term);
        },
        getDocument: id => documents.get(id) ?? null,
    };
}

async function start() {
    try {
        state.topic = await loadTopic(TOPIC_ID);
    } catch (error) {
        console.error(error);
        showError("Die Lerninhalte konnten nicht geladen werden. Bitte die App über einen lokalen Webserver öffnen (z. B. Live Server in VS Code).");
        return;
    }

    const { title, unit } = state.topic.topic;
    dom.topicTitle.textContent = [title, unit, "Prototyp"].filter(Boolean).join(" · ");

    const engine = createQuizEngine({
        highscore: state.progress.highscore,
        onAnswer: (result, snapshot) => {
            recordAnswer(result, snapshot.highscore);
            renderScore(snapshot, result.gained);
        },
    });
    renderScore(engine.getSnapshot());

    const availableModes = INIT_ORDER.filter(modeId => MODES[modeId].isAvailable(state.topic));
    let glossaryApi = null;
    const links = createLinks(state.topic, {
        hasTerm: term => glossaryApi?.hasTerm(term) ?? false,
        focusTerm: term => glossaryApi?.focusTerm(term),
    });

    availableModes.forEach(modeId => {
        const api = MODES[modeId].init({ topic: state.topic, engine, links });
        if (modeId === "glossary") {
            glossaryApi = api;
        }
    });
    initTabs(availableModes);
}

start();
