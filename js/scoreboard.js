import * as dom from "./dom.js";
import { createElement, prefersReducedMotion } from "./utils.js";

const FLOAT_DURATION_MS = 1200;

export function renderScore(snapshot, gained = 0) {
    dom.scorePoints.textContent = snapshot.points;
    dom.scoreStreak.textContent = snapshot.streak;
    dom.scoreHighscore.textContent = snapshot.highscore;
    dom.scoreCombo.textContent = `×${snapshot.multiplier}`;
    dom.scoreComboBox.classList.toggle("stat--hot", snapshot.multiplier > 1);

    if (gained > 0 && !prefersReducedMotion) {
        const float = createElement("span", "score-float", `+${gained}`);
        dom.scoreBoard.append(float);
        window.setTimeout(() => float.remove(), FLOAT_DURATION_MS);
    }
}
