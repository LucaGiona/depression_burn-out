import { createElement } from "./utils.js";

// Themen-Chips für einen Modus. Zeigt nur Kategorien, zu denen der Modus Items hat.
// Start: „Alle“. Der erste Klick auf ein Thema wählt nur dieses Thema,
// weitere Klicks fügen Themen hinzu oder nehmen sie heraus.
// Wird das letzte Thema abgewählt oder sind alle gewählt, gilt wieder „Alle“.
// Ein Item kann über `extraCategories` zusätzlich in weiteren Themen erscheinen
// (z. B. eine Antidepressiva-Frage unter „Depression“ und „Medikamente“).
const categoriesOf = item => [item.category, ...(item.extraCategories ?? [])];

export function createCategoryFilter({ container, categories, items, onChange }) {
    const usedIds = new Set(items.flatMap(categoriesOf));
    const shown = categories.filter(category => usedIds.has(category.id));
    const active = new Set();

    const isAll = () => active.size === 0;

    function createChip(label, pressed, onClick) {
        const chip = createElement("button", "chip", label);
        chip.type = "button";
        chip.setAttribute("aria-pressed", String(pressed));
        chip.addEventListener("click", onClick);
        return chip;
    }

    function render() {
        container.replaceChildren(
            createChip("Alle", isAll(), selectAll),
            ...shown.map(category =>
                createChip(category.label, active.has(category.id), () => toggle(category.id))
            )
        );
    }

    function selectAll() {
        if (isAll()) {
            return;
        }
        active.clear();
        update();
    }

    function toggle(categoryId) {
        if (active.has(categoryId)) {
            active.delete(categoryId);
        } else {
            active.add(categoryId);
        }
        if (active.size === shown.length) {
            active.clear();
        }
        update();
    }

    function update() {
        render();
        onChange(getPool());
    }

    function getPool() {
        return isAll() ? items.slice() : items.filter(item => categoriesOf(item).some(id => active.has(id)));
    }

    container.hidden = shown.length < 2;
    render();
    return { getPool };
}
