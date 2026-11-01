// Einzige Stelle mit localStorage-Zugriff. Später gegen eine API austauschbar.
const STORAGE_KEY = "depression-quiz-progress";
const SETTINGS_KEY = "depression-quiz-settings";

function readJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // z.B. Privatmodus oder Speicher voll – dann wird nicht gespeichert
    }
}

export function loadProgress() {
    return readJson(STORAGE_KEY);
}

export function saveProgress(progress) {
    writeJson(STORAGE_KEY, progress);
}

// Kleine Bedienvorlieben, z. B. die Schwierigkeit im Lückentext
export function loadSetting(name, fallback) {
    const settings = readJson(SETTINGS_KEY) ?? {};
    return settings[name] ?? fallback;
}

export function saveSetting(name, value) {
    const settings = readJson(SETTINGS_KEY) ?? {};
    settings[name] = value;
    writeJson(SETTINGS_KEY, settings);
}
