import { shuffle } from "./utils.js";
import { createScoring } from "./scoring.js";

// Zieht Items ohne Wiederholung, bis der Pool einmal durch ist.
// Die Darstellung (z.B. die Walze) zeigt nur, was hier bereits entschieden wurde.
export function createItemBag(initialItems) {
    let items = initialItems;
    let bag = [];
    let lastItem = null;

    function refill() {
        bag = shuffle(items);
        const nextItem = bag[bag.length - 1];
        if (bag.length > 1 && nextItem === lastItem) {
            bag.unshift(bag.pop());
        }
    }

    function next() {
        if (bag.length === 0) {
            refill();
        }
        lastItem = bag.pop();
        return lastItem;
    }

    function setItems(newItems) {
        items = newItems;
        bag = [];
    }

    return { next, setItems };
}

export function createQuizEngine({ highscore = 0, onAnswer = () => {} } = {}) {
    const scoring = createScoring(highscore);

    function submitAnswer(answer) {
        const result = scoring.registerAnswer(answer);
        const snapshot = scoring.getSnapshot();
        onAnswer(result, snapshot);
        return result;
    }

    return {
        submitAnswer,
        getSnapshot: scoring.getSnapshot,
        getLog: scoring.getLog,
    };
}
