// Reine Punkte-Logik ohne DOM: für alle Modi gleich und später serverseitig nachrechenbar.
const MULTIPLIER_STEPS = [
    { minStreak: 8, factor: 3 },
    { minStreak: 5, factor: 2 },
    { minStreak: 3, factor: 1.5 },
];

export const DEFAULT_BASE_POINTS = 100;

export function getMultiplier(streak) {
    const step = MULTIPLIER_STEPS.find(entry => streak >= entry.minStreak);
    return step ? step.factor : 1;
}

export function createScoring(initialHighscore = 0) {
    const session = {
        points: 0,
        streak: 0,
        bestStreak: 0,
        highscore: initialHighscore,
        log: [],
    };

    function registerAnswer({ itemId, mode, correct, basePoints = DEFAULT_BASE_POINTS, partialPoints = 0 }) {
        let gained = partialPoints;
        if (correct) {
            session.streak += 1;
            session.bestStreak = Math.max(session.bestStreak, session.streak);
            gained = Math.round(basePoints * getMultiplier(session.streak));
        } else {
            session.streak = 0;
        }

        session.points += gained;
        const isNewHighscore = session.points > session.highscore;
        if (isNewHighscore) {
            session.highscore = session.points;
        }

        const entry = { itemId, mode, correct, gained, timestamp: Date.now() };
        session.log.push(entry);
        return { ...entry, isNewHighscore };
    }

    function getSnapshot() {
        return {
            points: session.points,
            streak: session.streak,
            bestStreak: session.bestStreak,
            highscore: session.highscore,
            multiplier: getMultiplier(session.streak),
        };
    }

    function getLog() {
        return [...session.log];
    }

    return { registerAnswer, getSnapshot, getLog };
}
