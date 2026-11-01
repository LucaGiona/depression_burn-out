import * as dom from "../dom.js";
import { createCategoryFilter } from "../category-filter.js";
import { createLearnLinks } from "../learn-links.js";
import { loadSetting, saveSetting } from "../storage.js";
import { gradeGap, selectOptions, bankWords } from "../cloze-grading.js";
import { createElement } from "../utils.js";

const MODE_ID = "cloze";
const DIFFICULTIES = [
    { id: "bank", label: "Wortbank" },
    { id: "select", label: "Auswahl" },
    { id: "type", label: "Eintippen" },
];
const PARTIAL_POINTS = 50;

export function initCloze({ topic, engine, links }) {
    const items = topic.modes.cloze.items;
    const categoryFilter = createCategoryFilter({
        container: dom.clozeFilter,
        categories: topic.categories,
        items,
        onChange: pool => restart(pool),
    });

    const view = {
        difficulty: loadSetting("clozeDifficulty", "bank"),
        order: [],
        pos: 0,
        activeGap: 0,
        answers: new Map(), // itemId → { values, checked, result }
    };

    const currentItem = () => view.order[view.pos];

    function answerState(item) {
        if (!view.answers.has(item.id)) {
            view.answers.set(item.id, { values: item.gaps.map(() => ""), checked: false, result: [] });
        }
        return view.answers.get(item.id);
    }

    const countCorrect = state => state.result.filter(result => result !== "bad").length;

    function restart(list) {
        view.order = list;
        view.pos = 0;
        view.activeGap = 0;
        list.forEach(item => view.answers.delete(item.id));
        render();
    }

    // ---------- Schwierigkeit
    function renderDifficulty() {
        dom.clozeModes.replaceChildren(...DIFFICULTIES.map(option => {
            const button = createElement("button", "segment", option.label);
            button.type = "button";
            button.setAttribute("aria-pressed", String(view.difficulty === option.id));
            button.addEventListener("click", () => setDifficulty(option.id));
            return button;
        }));
    }

    function setDifficulty(id) {
        view.difficulty = id;
        saveSetting("clozeDifficulty", id);
        const item = currentItem();
        if (item) {
            const state = answerState(item);
            if (!state.checked) {
                state.values = item.gaps.map(() => "");
                view.activeGap = 0;
            }
        }
        renderDifficulty();
        render();
    }

    // ---------- Darstellung
    function renderProgress() {
        const total = view.order.length;
        const done = Math.min(view.pos + (currentItem() && answerState(currentItem()).checked ? 1 : 0), total);
        dom.clozePos.textContent = `${Math.min(view.pos + 1, total)} / ${total}`;
        dom.clozeFill.style.width = `${total ? (done / total) * 100 : 0}%`;
    }

    function createGap(item, state, gapIndex) {
        const value = state.values[gapIndex];
        const result = state.checked ? state.result[gapIndex] : "";
        const classes = ["gap"];
        if (result) classes.push(`gap--${result}`);
        if (!value && !state.checked) classes.push("gap--empty");
        if (!state.checked && view.difficulty === "bank" && gapIndex === view.activeGap) classes.push("gap--active");
        const label = `Lücke ${gapIndex + 1}`;

        if (!state.checked && view.difficulty === "type") {
            const input = createElement("input", classes.join(" "));
            input.value = value;
            input.setAttribute("aria-label", label);
            input.autocomplete = "off";
            input.spellcheck = false;
            input.setAttribute("autocapitalize", "off");
            input.style.width = `${Math.max(6, ...item.gaps[gapIndex].answers.map(answer => answer.length)) * 0.62 + 0.8}em`;
            input.addEventListener("input", () => {
                state.values[gapIndex] = input.value;
            });
            input.addEventListener("keydown", event => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const inputs = [...dom.clozeStage.querySelectorAll("input.gap")];
                const next = inputs[inputs.indexOf(input) + 1];
                if (next) next.focus();
                else check(item, state);
            });
            return [input];
        }

        if (!state.checked && view.difficulty === "select") {
            const select = createElement("select", classes.join(" "));
            select.setAttribute("aria-label", label);
            select.append(new Option("…", ""));
            selectOptions(item, gapIndex).forEach(word => select.append(new Option(word, word, false, word === value)));
            select.addEventListener("change", () => {
                state.values[gapIndex] = select.value;
                updateCheckButton(state);
            });
            return [select];
        }

        const button = createElement("button", classes.join(" "), value || " ");
        button.type = "button";
        button.disabled = state.checked;
        button.setAttribute("aria-label", label);
        button.addEventListener("click", () => {
            state.values[gapIndex] = "";
            view.activeGap = gapIndex;
            render();
        });
        const nodes = [button];
        if (state.checked && result !== "ok") {
            nodes.push(createElement("span", "gap-fix", item.gaps[gapIndex].answers[0]));
        }
        return nodes;
    }

    function createText(item, state) {
        const paragraph = createElement("p", "cloze-text");
        item.text.split(/\{\{(\d+)\}\}/).forEach((part, index) => {
            if (index % 2 === 0) {
                paragraph.append(part);
            } else {
                paragraph.append(...createGap(item, state, Number(part)));
            }
        });
        return paragraph;
    }

    function createBank(item, state) {
        const used = [...state.values];
        const bank = createElement("div", "word-bank");
        bank.setAttribute("aria-label", "Wortbank");
        bankWords(item).forEach(word => {
            const usedAt = used.indexOf(word);
            if (usedAt > -1) used[usedAt] = null;
            const chip = createElement("button", "chip word-chip", word);
            chip.type = "button";
            chip.disabled = usedAt > -1;
            chip.addEventListener("click", () => placeWord(state, word));
            bank.append(chip);
        });
        const hint = createElement("p", "cloze-hint", "Wort antippen setzt es in die markierte Lücke. Gefüllte Lücke antippen leert sie.");
        return [bank, hint];
    }

    function placeWord(state, word) {
        const target = state.values[view.activeGap] ? state.values.findIndex(value => !value) : view.activeGap;
        if (target < 0) return;
        state.values[target] = word;
        const nextEmpty = state.values.findIndex(value => !value);
        view.activeGap = nextEmpty < 0 ? target : nextEmpty;
        render();
    }

    function createFeedback(item, state) {
        const correct = countCorrect(state);
        const all = item.gaps.length;
        const tone = correct === all ? "ok" : correct ? "mid" : "no";
        const feedback = createElement("div", `feedback feedback--${tone === "ok" ? "ok" : "no"}`);
        const verdict = createElement("span", "feedback-verdict");
        verdict.append(createElement("span", `pill pill--${tone}`, `${correct} / ${all}`), ` ${correct === all ? "Alle Lücken richtig." : correct ? "Teilweise richtig." : "Noch nicht – schau dir die Lösung an."}`);
        feedback.append(verdict);

        item.gaps.forEach((gap, index) => {
            if (state.result[index] === "near") {
                feedback.append(createElement("p", "cloze-near", `„${state.values[index]}“ als richtig gewertet, korrekt geschrieben: ${gap.answers[0]}`));
            }
        });
        const merke = createElement("div", "merke");
        merke.append(createElement("b", "merke-label", "So merk ich’s mir"), createElement("span", "", item.merke));
        feedback.append(merke);
        const learnLinks = createLearnLinks(item, links);
        if (learnLinks) feedback.append(learnLinks);
        return feedback;
    }

    function updateCheckButton(state) {
        const checkButton = dom.clozeStage.querySelector(".js-check");
        if (checkButton) {
            checkButton.disabled = view.difficulty !== "type" && !state.values.every(value => value.trim());
        }
    }

    function render() {
        renderProgress();
        if (view.pos >= view.order.length) {
            renderSummary();
            return;
        }
        const item = currentItem();
        const state = answerState(item);

        const sheet = createElement("article", "sheet");
        const source = createElement("div", "sheet-source");
        source.append(createElement("span", "", item.sourceLabel ?? topic.topic.title), createElement("span", "", item.id));
        sheet.append(source, createElement("h2", "sheet-title", item.section), createText(item, state));
        if (view.difficulty === "bank" && !state.checked) {
            sheet.append(...createBank(item, state));
        }
        if (state.checked) {
            sheet.append(createFeedback(item, state));
        }

        const actions = createElement("div", "actions actions--split");
        const back = createElement("button", "btn btn--ghost", "Zurück");
        back.type = "button";
        back.disabled = view.pos === 0;
        back.addEventListener("click", () => {
            view.pos -= 1;
            view.activeGap = 0;
            render();
        });
        let primary;
        if (state.checked) {
            primary = createElement("button", "btn", view.pos === view.order.length - 1 ? "Auswertung" : "Weiter");
            primary.addEventListener("click", () => {
                view.pos += 1;
                view.activeGap = 0;
                render();
                dom.panelCloze.scrollIntoView({ block: "start" });
            });
        } else {
            primary = createElement("button", "btn js-check", "Prüfen");
            primary.addEventListener("click", () => check(item, state));
        }
        primary.type = "button";
        actions.append(back, primary);

        dom.clozeStage.replaceChildren(sheet, actions);
        updateCheckButton(state);

        const inputs = [...dom.clozeStage.querySelectorAll("input.gap")];
        if (inputs.length && !state.checked && !dom.panelCloze.hidden) {
            (inputs.find(input => !input.value) ?? inputs[0]).focus({ preventScroll: true });
        }
    }

    function check(item, state) {
        if (state.checked) return;
        state.result = item.gaps.map((gap, index) => gradeGap(state.values[index], gap));
        state.checked = true;
        const correct = countCorrect(state);
        const allRight = correct === item.gaps.length;
        engine.submitAnswer({
            itemId: item.id,
            mode: MODE_ID,
            correct: allRight,
            partialPoints: allRight ? 0 : Math.round((PARTIAL_POINTS * correct) / item.gaps.length),
        });
        render();
    }

    function renderSummary() {
        let got = 0;
        let max = 0;
        const list = createElement("ul", "cloze-summary-list");
        const wrong = [];
        view.order.forEach(item => {
            const state = view.answers.get(item.id);
            const correct = state?.checked ? countCorrect(state) : 0;
            got += correct;
            max += item.gaps.length;
            if (!state?.checked || state.result.some(result => result === "bad")) wrong.push(item);
            const row = createElement("li", "");
            const tone = correct === item.gaps.length ? "ok" : correct ? "mid" : "no";
            row.append(createElement("span", "", item.section), createElement("span", `pill pill--${tone}`, `${correct} / ${item.gaps.length}`));
            list.append(row);
        });

        const sheet = createElement("article", "sheet");
        sheet.append(
            createElement("h2", "sheet-title", "Auswertung"),
            createElement("p", "cloze-big", `${got} / ${max}`),
            createElement("p", "cloze-hint", `Lücken richtig (${max ? Math.round((got / max) * 100) : 0} %)`),
            list
        );
        const actions = createElement("div", "actions");
        const again = createElement("button", "btn", "Alles nochmal");
        again.type = "button";
        again.addEventListener("click", () => restart(categoryFilter.getPool()));
        const retry = createElement("button", "btn btn--ghost", `Nur Fehler wiederholen (${wrong.length})`);
        retry.type = "button";
        retry.disabled = wrong.length === 0;
        retry.addEventListener("click", () => restart(wrong));
        actions.append(again, retry);
        dom.clozeStage.replaceChildren(sheet, actions);
    }

    renderDifficulty();
    restart(categoryFilter.getPool());
}
