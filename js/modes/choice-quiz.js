import { createItemBag } from "../quiz-engine.js";
import { createCategoryFilter } from "../category-filter.js";
import { createLearnLinks } from "../learn-links.js";
import { loadSetting, saveSetting } from "../storage.js";
import { createElement, shuffle } from "../utils.js";

// Fragen pro Runde; 0 = alle Fragen der gewählten Themen
const ROUND_SIZES = [5, 10, 20, 0];
const DEFAULT_ROUND_SIZE = 10;

// Gemeinsame Logik für „Multiple Choice“ und „Bilder“: Runde mit 5, 10, 20 oder allen Fragen,
// Erklärung nach jeder Antwort, Auswertung und „Falsche wiederholen“.
export function createChoiceQuiz({ modeId, items, categories, engine, links, panel, stage, filter, roundSizeBox, categoryLabels }) {
    const bag = createItemBag(items);
    const categoryFilter = createCategoryFilter({
        container: filter,
        categories,
        items,
        onChange: pool => {
            bag.setItems(pool);
            startRound();
        },
    });

    const view = {
        roundSize: loadSetting("roundSize", DEFAULT_ROUND_SIZE),
        round: [],
        index: 0,
        order: [],
        answered: false,
        right: 0,
        wrong: [],
    };

    function drawRound() {
        const pool = categoryFilter.getPool();
        const size = view.roundSize ? Math.min(view.roundSize, pool.length) : pool.length;
        const picked = new Set();
        while (picked.size < size) {
            picked.add(bag.next());
        }
        return [...picked];
    }

    function renderRoundSize() {
        const label = createElement("span", "round-size-label", "Fragen pro Runde");
        const group = createElement("div", "segmented");
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", "Fragen pro Runde");
        ROUND_SIZES.forEach(size => {
            const button = createElement("button", "segment", size ? String(size) : "Alle");
            button.type = "button";
            button.setAttribute("aria-pressed", String(view.roundSize === size));
            button.addEventListener("click", () => setRoundSize(size));
            group.append(button);
        });
        roundSizeBox.replaceChildren(label, group);
    }

    function setRoundSize(size) {
        if (view.roundSize === size) {
            return;
        }
        view.roundSize = size;
        saveSetting("roundSize", size);
        renderRoundSize();
        startRound();
    }

    // Wechsel in einem anderen Modus (gemeinsame Einstellung) übernehmen, sobald dieser Tab sichtbar wird
    function syncRoundSize() {
        const stored = loadSetting("roundSize", DEFAULT_ROUND_SIZE);
        if (stored !== view.roundSize && view.index === 0 && !view.answered) {
            view.roundSize = stored;
            renderRoundSize();
            startRound();
        }
    }

    function startRound(list = null) {
        view.round = list ?? drawRound();
        view.index = 0;
        view.right = 0;
        view.wrong = [];
        renderQuestion();
    }

    function currentItem() {
        return view.round[view.index];
    }

    function renderFigure(image) {
        const figure = createElement("figure", "quiz-figure");
        const img = createElement("img", "quiz-figure-img");
        img.src = image.src;
        img.alt = image.alt ?? "";
        img.loading = "lazy";
        figure.append(img);
        if (image.credit) {
            figure.append(createElement("figcaption", "quiz-figure-credit", `Abbildung: ${image.credit}`));
        }
        return figure;
    }

    function renderQuestion() {
        const item = currentItem();
        view.answered = false;
        view.order = shuffle(item.options.map((_, index) => index));

        const meta = createElement("div", "quiz-meta");
        meta.append(
            createElement("span", "", `Frage ${view.index + 1} / ${view.round.length}`),
            createElement("span", "quiz-meta-tag", categoryLabels.get(item.category) ?? item.category)
        );
        const bar = createElement("div", "quiz-track");
        const fill = createElement("i", "quiz-fill");
        fill.style.width = `${(view.index / view.round.length) * 100}%`;
        bar.append(fill);

        const parts = [meta, bar];
        if (item.image) {
            parts.push(renderFigure(item.image));
        }
        parts.push(createElement("p", "question-prompt", item.prompt));

        const options = createElement("div", "options");
        view.order.forEach((optionIndex, position) => {
            const button = createElement("button", "option");
            button.type = "button";
            button.dataset.index = String(optionIndex);
            button.append(createElement("kbd", "option-key", String(position + 1)), createElement("span", "", item.options[optionIndex]));
            button.addEventListener("click", () => handleAnswer(optionIndex));
            options.append(button);
        });
        parts.push(options);

        stage.replaceChildren(...parts);
    }

    function handleAnswer(chosenIndex) {
        const item = currentItem();
        if (view.answered || !item) {
            return;
        }
        view.answered = true;
        const isCorrect = chosenIndex === item.answerIndex;
        if (isCorrect) {
            view.right += 1;
        } else {
            view.wrong.push(item);
        }

        stage.querySelectorAll(".option").forEach(button => {
            const index = Number(button.dataset.index);
            button.disabled = true;
            if (index === item.answerIndex) {
                button.classList.add("option--right");
            } else if (index === chosenIndex) {
                button.classList.add("option--wrong");
            }
        });

        const result = engine.submitAnswer({ itemId: item.id, mode: modeId, correct: isCorrect });
        renderFeedback(item, isCorrect, result.gained);
    }

    function renderFeedback(item, isCorrect, gained) {
        const feedback = createElement("div", `feedback ${isCorrect ? "feedback--ok" : "feedback--no"}`);
        const verdict = isCorrect
            ? `Richtig, +${gained}`
            : `Nicht ganz. Richtig ist: ${item.options[item.answerIndex]}`;
        feedback.append(createElement("span", "feedback-verdict", verdict), createElement("p", "", item.explanation));
        const learnLinks = createLearnLinks(item, links);
        if (learnLinks) {
            feedback.append(learnLinks);
        }

        const isLast = view.index === view.round.length - 1;
        const next = createElement("button", "btn", isLast ? "Auswertung" : "Weiter");
        next.type = "button";
        next.addEventListener("click", goNext);
        const actions = createElement("div", "actions");
        actions.append(next);

        stage.append(feedback, actions);
        next.focus({ preventScroll: true });
    }

    function goNext() {
        if (!view.answered) {
            return;
        }
        if (view.index < view.round.length - 1) {
            view.index += 1;
            renderQuestion();
            stage.scrollIntoView({ block: "nearest" });
        } else {
            renderSummary();
        }
    }

    function renderSummary() {
        const total = view.round.length;
        const summary = createElement("div", "quiz-summary");
        summary.append(
            createElement("p", "quiz-summary-score", `${view.right} / ${total}`),
            createElement("p", "quiz-summary-text", view.right === total
                ? "Alles richtig. Stark!"
                : `${total - view.right} ${total - view.right === 1 ? "Frage" : "Fragen"} noch einmal anschauen.`)
        );
        if (view.wrong.length) {
            const list = createElement("ul", "quiz-summary-list");
            view.wrong.forEach(item => list.append(createElement("li", "", item.prompt)));
            summary.append(list);
        }

        const actions = createElement("div", "actions");
        const again = createElement("button", "btn", "Neue Runde");
        again.type = "button";
        again.addEventListener("click", () => startRound());
        actions.append(again);
        if (view.wrong.length) {
            const retry = createElement("button", "btn btn--ghost", `Falsche wiederholen (${view.wrong.length})`);
            retry.type = "button";
            retry.addEventListener("click", () => startRound(shuffle(view.wrong)));
            actions.append(retry);
        }
        stage.replaceChildren(summary, actions);
        again.focus({ preventScroll: true });
    }

    function handleKeydown(event) {
        if (panel.hidden || event.target.closest("input, textarea, select")) {
            return;
        }
        if (event.key === "Enter" && view.answered && !event.target.closest("button, a")) {
            event.preventDefault();
            goNext();
            return;
        }
        const number = Number.parseInt(event.key, 10);
        const item = currentItem();
        if (!view.answered && item && number >= 1 && number <= view.order.length) {
            handleAnswer(view.order[number - 1]);
        }
    }

    document.addEventListener("keydown", handleKeydown);
    new MutationObserver(() => {
        if (!panel.hidden) syncRoundSize();
    }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });

    renderRoundSize();
    startRound();
}
