// Reine Bewertung und Mischlogik für den Lückentext – ohne DOM.

export function normalizeAnswer(text) {
    return text.toLowerCase().normalize("NFC")
        .replace(/₂/g, "2").replace(/₁/g, "1")
        .replace(/ß/g, "ss").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
        .replace(/\s*(–|—|bis)\s*/g, "-")
        .replace(/[„“"'.;:!?()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function levenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= b.length; j += 1) {
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        previous = current;
    }
    return previous[b.length];
}

// "ok" = richtig, "near" = ein Tippfehler (ab 5 Zeichen), "bad" = falsch oder leer
export function gradeGap(value, gap) {
    const answer = normalizeAnswer(value ?? "");
    if (!answer) return "bad";
    const accepted = gap.answers.map(normalizeAnswer);
    if (accepted.includes(answer)) return "ok";
    if (accepted.some(option => option.length >= 5 && levenshtein(answer, option) <= 1)) return "near";
    return "bad";
}

// Gleicher Seed → gleiche Reihenfolge (Wortbank springt nicht bei jedem Neuzeichnen)
function seededRandom(seed) {
    let state = 0;
    for (const char of seed) state = (state * 31 + char.charCodeAt(0)) >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

export function seededShuffle(list, seed) {
    const random = seededRandom(seed);
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Auswahl: richtige Antwort + bis zu 3 plausible falsche
export function selectOptions(item, gapIndex) {
    const correct = item.gaps[gapIndex].answers[0];
    const pool = [...item.distractors, ...item.gaps.filter((_, k) => k !== gapIndex).map(gap => gap.answers[0])]
        .filter(word => normalizeAnswer(word) !== normalizeAnswer(correct));
    const unique = [...new Set(pool)];
    return seededShuffle([correct, ...seededShuffle(unique, `${item.id}${gapIndex}`).slice(0, 3)], `${item.id}o${gapIndex}`);
}

// Wortbank: alle richtigen Wörter + Distraktoren
export function bankWords(item) {
    return seededShuffle([...item.gaps.map(gap => gap.answers[0]), ...item.distractors], `${item.id}bank`);
}
