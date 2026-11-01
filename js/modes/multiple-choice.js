import * as dom from "../dom.js";
import { createChoiceQuiz } from "./choice-quiz.js";

export function initMultipleChoice({ topic, engine, links }) {
    createChoiceQuiz({
        modeId: "mc",
        items: topic.modes.multipleChoice.items,
        categories: topic.categories,
        categoryLabels: new Map(topic.categories.map(category => [category.id, category.label])),
        engine,
        links,
        panel: dom.panelMc,
        stage: dom.mcStage,
        filter: dom.mcFilter,
        roundSizeBox: dom.mcRoundSize,
    });
}
