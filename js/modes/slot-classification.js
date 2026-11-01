import * as dom from "../dom.js";
import { createItemBag } from "../quiz-engine.js";
import { createCategoryFilter } from "../category-filter.js";
import { createElement, pickRandom, prefersReducedMotion } from "../utils.js";

const MODE_ID = "slot";
const SPIN_ROWS_MIN = 22;
const SPIN_ROWS_RANDOM = 6;
const SPIN_DURATION_MS = 2600;
const SPIN_DURATION_RANDOM_MS = 500;
const REDUCED_SPIN_DURATION_MS = 300;
const BLUR_PORTION = 0.55;
const LEVER_RESET_MS = 350;
const SPIN_EASING = "cubic-bezier(.12,.72,.18,1)";

export function initSlotClassification({ topic, engine }) {
    const items = topic.modes.classification.items;
    const bag = createItemBag(items);
    createCategoryFilter({
        container: dom.slotFilter,
        categories: topic.categories,
        items,
        onChange: pool => bag.setItems(pool),
    });

    const view = {
        shownItem: pickRandom(items),
        currentItem: null,
        isSpinning: false,
        isAnswered: true,
        round: 0,
    };

    function createReelRow(item) {
        const row = createElement("div", "reel-row");
        row.append(createElement("div", "reel-term", item.term));
        if (item.sub) {
            row.append(createElement("div", "reel-sub", item.sub));
        }
        return row;
    }

    function renderStrip(rowItems) {
        dom.slotStrip.replaceChildren(...rowItems.map(createReelRow));
    }

    // Start: bisheriger Begriff in der Mitte, Ziel an vorletzter Stelle
    function buildSpinRows(targetItem) {
        const fillerCount = prefersReducedMotion
            ? 3
            : SPIN_ROWS_MIN + Math.floor(Math.random() * SPIN_ROWS_RANDOM);
        const rows = [pickRandom(items), view.shownItem];
        for (let i = 0; i < fillerCount; i += 1) {
            rows.push(pickRandom(items));
        }
        rows.push(targetItem, pickRandom(items));
        return rows;
    }

    function animateStrip(offset, duration) {
        const strip = dom.slotStrip;
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        void strip.offsetHeight;
        strip.style.transition = `transform ${duration}ms ${SPIN_EASING}`;
        strip.style.transform = `translateY(${-offset}px)`;

        if (!prefersReducedMotion) {
            strip.classList.add("reel-strip--blur");
            window.setTimeout(() => strip.classList.remove("reel-strip--blur"), duration * BLUR_PORTION);
        }
    }

    function setControlsDisabled(isDisabled) {
        dom.slotLever.disabled = isDisabled;
        dom.slotSpinBtn.disabled = isDisabled;
    }

    function pullLever() {
        dom.slotLever.classList.add("lever--pulled");
        window.setTimeout(() => dom.slotLever.classList.remove("lever--pulled"), LEVER_RESET_MS);
    }

    function renderHint(text) {
        dom.slotQuestion.replaceChildren(createElement("p", "idle-hint", text));
    }

    function spin() {
        if (view.isSpinning || !view.isAnswered) {
            return;
        }
        view.isSpinning = true;
        view.isAnswered = false;
        view.round += 1;

        const targetItem = bag.next();
        view.currentItem = targetItem;

        const rows = buildSpinRows(targetItem);
        renderStrip(rows);
        const rowHeight = dom.slotStrip.firstElementChild.offsetHeight;
        const targetIndex = rows.length - 2;
        const duration = prefersReducedMotion
            ? REDUCED_SPIN_DURATION_MS
            : SPIN_DURATION_MS + Math.random() * SPIN_DURATION_RANDOM_MS;

        animateStrip(rowHeight * (targetIndex - 1), duration);
        pullLever();
        setControlsDisabled(true);
        dom.slotRound.textContent = `Runde ${view.round}`;
        dom.slotJsonPeek.textContent = JSON.stringify(targetItem, null, 4);
        renderHint("Die Walze läuft …");

        window.setTimeout(() => {
            view.shownItem = targetItem;
            view.isSpinning = false;
            renderQuestion(targetItem);
        }, duration + 60);
    }

    function renderQuestion(item) {
        const prompt = createElement("div", "question-prompt", `${item.term} – ${item.prompt}`);
        const options = createElement("div", "options");

        item.options.forEach((label, index) => {
            const button = createElement("button", "option");
            button.type = "button";
            button.append(createElement("kbd", "option-key", String(index + 1)), createElement("span", "", label));
            button.addEventListener("click", () => handleAnswer(index));
            options.append(button);
        });

        dom.slotQuestion.replaceChildren(prompt, options);
        options.firstElementChild.focus({ preventScroll: true });
    }

    function handleAnswer(chosenIndex) {
        const item = view.currentItem;
        if (view.isAnswered || view.isSpinning || !item) {
            return;
        }
        view.isAnswered = true;

        const isCorrect = chosenIndex === item.answerIndex;
        dom.slotQuestion.querySelectorAll(".option").forEach((button, index) => {
            button.disabled = true;
            if (index === item.answerIndex) {
                button.classList.add("option--right");
            } else if (index === chosenIndex) {
                button.classList.add("option--wrong");
            }
        });

        const result = engine.submitAnswer({ itemId: item.id, mode: MODE_ID, correct: isCorrect });
        renderFeedback(item, isCorrect, result.gained);

        setControlsDisabled(false);
        dom.slotSpinBtn.textContent = "Nächste Runde";
        dom.slotSpinBtn.focus({ preventScroll: true });
    }

    function renderFeedback(item, isCorrect, gained) {
        const feedback = createElement("div", `feedback ${isCorrect ? "feedback--ok" : "feedback--no"}`);
        const verdict = isCorrect
            ? `Richtig, +${gained}`
            : `Nicht ganz. Richtig ist: ${item.options[item.answerIndex]}`;
        feedback.append(
            createElement("span", "feedback-verdict", verdict),
            createElement("p", "", item.explanation)
        );
        dom.slotQuestion.append(feedback);
    }

    function handleKeydown(event) {
        if (dom.panelSlot.hidden) {
            return;
        }
        if (event.code === "Space" && !event.target.closest("button, input, summary")) {
            event.preventDefault();
            spin();
            return;
        }
        const number = Number.parseInt(event.key, 10);
        const item = view.currentItem;
        if (item && !view.isAnswered && !view.isSpinning && number >= 1 && number <= item.options.length) {
            handleAnswer(number - 1);
        }
    }

    dom.slotLever.addEventListener("click", spin);
    dom.slotSpinBtn.addEventListener("click", spin);
    document.addEventListener("keydown", handleKeydown);

    renderStrip([pickRandom(items), view.shownItem, pickRandom(items)]);
}
