// Reine Glossar-Logik ohne DOM: Suchen, Filtern, nach Anfangsbuchstaben gruppieren.

const OTHER_LETTER = "#";

export function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ß/g, "ss");
}

export function getLetter(term) {
    const first = normalizeText(term).replace(/[^a-z]/g, "").charAt(0).toUpperCase();
    return first || OTHER_LETTER;
}

function buildHaystack(entry) {
    return normalizeText([entry.term, ...(entry.aliases ?? []), entry.meaning, entry.explanation].join(" "));
}

// Alle Suchwörter müssen vorkommen; Reihenfolge egal
export function filterEntries(entries, { query = "", topicId = null } = {}) {
    const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
    return entries.filter(entry => {
        if (topicId && entry.topic !== topicId && !entry.extraTopics?.includes(topicId)) {
            return false;
        }
        const haystack = buildHaystack(entry);
        return tokens.every(token => haystack.includes(token));
    });
}

export function groupByLetter(entries) {
    const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term, "de", { sensitivity: "base" }));
    const groups = new Map();
    sorted.forEach(entry => {
        const letter = getLetter(entry.term);
        if (!groups.has(letter)) {
            groups.set(letter, []);
        }
        groups.get(letter).push(entry);
    });
    return [...groups].map(([letter, groupEntries]) => ({ letter, entries: groupEntries }));
}

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
