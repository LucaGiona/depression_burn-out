import { loadProgress, saveProgress } from "./storage.js";

const PROGRESS_VERSION = 1;

function createEmptyProgress() {
    return { version: PROGRESS_VERSION, highscore: 0, items: {} };
}

function normalizeProgress(raw) {
    if (!raw || typeof raw !== "object") {
        return createEmptyProgress();
    }
    return {
        version: PROGRESS_VERSION,
        highscore: Number(raw.highscore) || 0,
        items: raw.items && typeof raw.items === "object" ? raw.items : {},
    };
}

export const state = {
    topic: null,
    activeMode: "mc",
    progress: normalizeProgress(loadProgress()),
};

export function persist() {
    saveProgress(state.progress);
}

// Fortschritt pro Item (über die stabile Item-ID) – Grundlage für späteres Wiederholen und Sync
export function recordAnswer({ itemId, correct, timestamp }, highscore) {
    const entry = state.progress.items[itemId] ?? { seen: 0, correct: 0, wrong: 0, lastSeen: null };
    entry.seen += 1;
    if (correct) {
        entry.correct += 1;
    } else {
        entry.wrong += 1;
    }
    entry.lastSeen = timestamp;
    state.progress.items[itemId] = entry;
    state.progress.highscore = Math.max(state.progress.highscore, highscore);
    persist();
}
