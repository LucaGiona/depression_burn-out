import * as dom from "../dom.js";
import { createChoiceQuiz } from "./choice-quiz.js";

// Wie Multiple Choice, aber jedes Item bringt ein Bild (eigenes SVG-Schema) mit.
export function initImageQuiz({ topic, engine, links }) {
    createChoiceQuiz({
        modeId: "images",
        items: topic.modes.imageQuiz.items,
        categories: topic.categories,
        categoryLabels: new Map(topic.categories.map(category => [category.id, category.label])),
        engine,
        links,
        panel: dom.panelImages,
        stage: dom.imgStage,
        filter: dom.imgFilter,
        roundSizeBox: dom.imgRoundSize,
    });
}
