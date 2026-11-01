# Depression-Quiz

## Projekt und Technik

- HTML, CSS und Vanilla JavaScript mit ES-Modulen.
- Keine Frameworks, Build-Tools oder externen Abhaengigkeiten einfuehren, sofern
  die Aufgabe das nicht ausdruecklich verlangt.
- Keine externen Ressourcen (CDNs, Google Fonts). Schriften liegen lokal in `fonts/`.
- Lerninhalte gehoeren ausschliesslich nach `data/*.json`. Keine Fachinhalte im
  JavaScript hart codieren.
- Datenschema wie in `../QUIZ-FORMATE.md`. Neue Felder (z. B. `imageQuiz`, `documents`,
  `source`) dort und im README dokumentieren.

## Architektur

- `quiz-engine.js` waehlt Items aus und nimmt Antworten an. Modi rufen fuer jede
  Antwort `engine.submitAnswer(...)` auf und berechnen keine Punkte selbst.
- `scoring.js`, `cloze-grading.js` und `glossary-search.js` bleiben frei von DOM-Zugriffen.
- Persistenz nur ueber `storage.js`. Fortschritt wird pro stabiler Item-ID in
  `state.progress.items` gefuehrt.
- Ein neuer Modus bekommt eine Datei in `js/modes/`, einen Datenschluessel unter
  `modes` im JSON und einen Eintrag in `MODES` (und `INIT_ORDER`) in `main.js`.
- Modi kennen die Tabs nicht. Verweise ins Glossar oder in ein Lernheft laufen ueber
  das `links`-Objekt aus `main.js` (`learn-links.js`).
- Item-IDs sind stabil (`dep.<bereich>.<name>.<aspekt>`) und werden nicht
  umbenannt, wenn sich nur Texte aendern.
- Bestehende Daten im `localStorage` nach Moeglichkeit abwaertskompatibel behandeln.

## Bilder

- Nur eigene, schematische SVGs in `img/` oder Bilder mit freier Lizenz
  (`credit`, `license`, `sourceUrl` im Item). Keine Scans aus Lehrbuechern oder Folien.

## CSS-Konventionen

- Elemente ueber CSS-Klassen gestalten, nicht ueber ID-Selektoren. IDs sind fuer
  den JavaScript-Zugriff mit `document.querySelector` reserviert.
- Wiederverwendbare UI-Elemente mit identischem Aussehen erhalten eine gemeinsame
  Klasse (z. B. `.btn`, `.chip`, `.feedback`).
- Farben nur ueber die Tokens in `:root`. Neue Farben fuer Hell- und Dunkelmodus
  definieren.
- Varianten im BEM-artigen Stil: `.option--right`, `.gap--ok`.

## JavaScript-Konventionen

- Lernlogik und DOM-Darstellung voneinander trennen.
- DOM-Referenzen zentral in `js/dom.js` ablegen.
- Funktionen klein und eindeutig benennen. Kommentare nur dort, wo die Absicht
  nicht direkt aus dem Code hervorgeht.
- Inhalte aus JSON per `textContent` einsetzen, nicht per `innerHTML`.
- `prefers-reduced-motion` bei Animationen beruecksichtigen.

## Testing

- Kein automatisiertes Test-Setup. Nach Aenderungen mindestens einen Syntaxcheck
  der betroffenen JavaScript-Dateien und eine JSON-Validierung durchfuehren.
- Im Browser pruefen: richtige und falsche Antworten, Serie/Combo, Themenfilter,
  Moduswechsel, Glossar-Sprung, Lernheft-Link, erneutes Laden mit gespeichertem Rekord.

## Git-Workflow

- Nur auf ausdruecklichen Wunsch des Users einen Branch erstellen oder committen.
- Commit-Messages auf Englisch, kurz und im Imperativ.
- Branch-Namen: `feature/<short-description>` oder `fix/<short-description>`.
