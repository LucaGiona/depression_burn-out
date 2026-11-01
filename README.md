# Depression-Quiz – Datenvorbereitung (CE 11.3 „Ausweglos?“)

Stand: Teil 1 **Nervensystem**, Teil 2 **Depression**, Teil 3 **Burn-out, Helfersyndrom & Stress**, Teil 4 **Suizidalität**, Teil 5 **Rechtliche Aspekte** – damit ist CE 11.3 vollständig.
Gleiches Schema wie `Krebs-Quiz/data/krebs.json` (schemaVersion 1). Die App-Hülle stammt aus dem Krebs-Quiz
(`TOPIC_ID = "depression"`, eigene Storage-Schlüssel `depression-quiz-progress` / `depression-quiz-settings`).

## Starten

Einstieg ist `index.html`. Die Daten werden per `fetch()` geladen, deshalb über einen lokalen
Webserver öffnen (VS Code „Live Server“ oder `python3 -m http.server` im Ordner), nicht per Doppelklick.

## Aufbau

```
index.html        Einstieg, lädt js/main.js als ES-Modul (type="module", defer)
css/              fonts.css, styles.css
js/               main.js, quiz-engine.js, storage.js, … (ES-Module)
js/modes/         multiple-choice, slot-classification (Walze), cloze, image-quiz
data/             depression.json – alle Inhalte
img/              eigene SVG-Schemata
docs/             Lernhefte (PDF)
fonts/            lokale Schriften (OFL)
AGENTS.md         Projektregeln (CLAUDE.md = Kurzfassung)
```

| Modus | Datenfeld | Umfang |
|---|---|---|
| Multiple Choice | `modes.multipleChoice` | 368 |
| Walze | `modes.classification` | 199 (26 Runden) |
| Lückentext | `modes.cloze` | 66 |
| Bilder | `modes.imageQuiz` | 113 eigene SVGs in `img/` |
| Glossar | `glossary` (Themen `anatomie`, `depression`, `medikamente`, `burnout`, `suizid`, `recht`) | 199 |
| Lernhefte | `documents` → `docs/` | 5 |

Walze – Runden: ZNS/PNS · afferent/efferent · erregend/hemmend · Glia ZNS/PNS · Hirnabschnitt (4) ·
Großhirnlappen (4) · Vorder-/Hinter-/Seitenhorn (3) · Hirnhaut (3) · marklos/markhaltig ·
Haupt-/Zusatzsymptom · Antidepressiva-Gruppe (4) · Form der Depression (4) · Art der Ursache (3) · Umgang hilfreich/nicht hilfreich · problem-/emotionsorientiertes Coping · Eisenhower (4) · Burn-out oder Depression · Eustress/Disstress · Stadium der suizidalen Entwicklung (3) · Risiko-/Schutzfaktor · Medien: erhöht/senkt Nachahmung · Mythos/Fakt · BGB/PsychKG/StGB (3) · freiheitsbeschränkend/Alternative · Sicherungsmaßnahme ja/nein.

Kategorien: `nervenzelle`, `gehirn`, `rueckenmark`, `schutz`, `depression`, `medikamente`, `burnout`, `suizid`, `recht`.
Item-IDs: `dep.ana.k<Kapitel>.<name>.mc` bzw. `dep.dep.k…` für Depression, `dep.cls.<runde>.<begriff>`, `dep.img.<bild>.<teil>`, `dep.gloss.ana.<begriff>`.
`source.chapter` verweist auf die Kapitelnummer im Lernheft.

Hinweise
- Alle Inhalte `reviewed: false` – vor Einsatz fachlich prüfen.
- Quellen: I care Anatomie, Physiologie (Thieme 2020) Kap. 5.5 und 14; I-care-Arbeitsblätter; MindMap ZNS/PNS;
  Folien CE 11.3 „Depression“ (M. Pahler) für Neurotransmitter/Antidepressiva.
- Folie „Depression“ schreibt „Venlafaxin (Trefilor)“ – der Handelsname lautet Trevilor; im Quiz nur der Wirkstoff.
- Seitenhörner: Text C8–L1, Bildunterschrift im Buch C8–L1–3. Quiz fragt C8–L1.
- Abbildungen sind eigene schematische SVGs (`"license": "eigen"`).
- Depression: Quellen Folien CE 11.3 „Depression“ (M. Pahler) und NVL Unipolare Depression 3.2. Mirtazapin: Folie = tetrazyklisch, NVL = Alpha2-Antagonist – im Quiz nicht abgefragt.
- ICD-10-Zusatzsymptome nach NVL Abb. 3 (ICD-10-GM, mit psychomotorischer Hemmung/Agitiertheit).
- Burn-out: Quellen Folien „Burnout-Syndrom“ (M. Pahler), I care Kap. 2.7, NVL 2.4.3. Zuordnung der 12 Phasen zu „wann Hilfe holen“ ist ein Lösungsvorschlag zum Arbeitsauftrag Folie 16.
- Suizidalität: Quellen Folien „Suizidalität/Suizidgefahr“ (M. Pahler), NVL 3.2 Kap. 12, WHO-Bericht 2014 (dt. Kurzfassung), Medienguide Deutsche Depressionshilfe, NaSPro-Empfehlungen 2010. **Bewusst keine Fragen zu Methoden oder Orten** (Medienempfehlungen); Präsuizidales Syndrom nach Ringel ist eine Ergänzung außerhalb der Folien. Das Lernheft enthält Hilfsangebote (TelefonSeelsorge, 112).
- Recht: Quellen Folien „Rechtliche Aspekte“ (M. Pahler), BGSP/BIP-Broschüre zum Berliner PsychKG (2017), I care Pflege Kap. 7.5 (2020), BVerfG-Urteil 24.07.2018 zur Fixierung. Folien/I care nennen BGB-Paragrafen vor der Reform 2023 (§ 1906 → § 1831, § 1896 → § 1814, § 1901a → § 1827, § 1906a → § 1832); Lernheft nennt beide. Vorläufige Unterbringung: Folie „24 Stunden“, Gesetz „bis Ablauf des folgenden Tages“ – Quiz fragt die Gesetzesformulierung. Broschüre nennt für Fixierung noch 18 Stunden; maßgeblich ist das BVerfG-Urteil (über ca. 30 min richterliche Genehmigung).

## Änderungen gegenüber Krebs-/Atmung-Quiz (zum Übertragen)

### Themenfilter: Klick wählt statt abzuwählen (01.11.2026)

Problem: Am Anfang waren alle Themen aktiv, ein Klick auf ein Thema hat es *abgewählt*.
Neu in `js/category-filter.js` (nur diese Datei, die Modi bleiben unverändert):

- Erster Chip **„Alle“**, beim Start aktiv.
- Erster Klick auf ein Thema → nur dieses Thema.
- Weitere Klicks → Thema hinzufügen oder herausnehmen.
- Letztes Thema abgewählt oder alle Themen gewählt → wieder „Alle“.

Übertragen: `js/category-filter.js` aus diesem Ordner in `Krebs-Quiz/js/` und
`Atmung-Quiz/js/` kopieren. Die Schnittstelle (`createCategoryFilter` → `{ getPool }`) ist gleich.

### Thema „Medikamente“ quer durch alle Lernhefte (01.11.2026)

Neues Feld **`extraCategories`** (Array) an Items: Ein Item gehört zu seiner `category` und
zusätzlich zu diesen Themen. Analog **`extraTopics`** an Glossareinträgen.

- Code: `js/category-filter.js` (berücksichtigt `extraCategories`) und
  `js/glossary-search.js` (berücksichtigt `extraTopics`). Ohne die Felder verhält sich alles wie vorher.
- Daten: Kategorie `medikamente` („Medikamente“) und Glossar-Thema `medikamente`.
  - 41 vorhandene Items zusätzlich mit `medikamente` markiert (Antidepressiva, Wirklatenz, Johanniskraut,
    auslösende Medikamente, Einnahme beobachten bei Suizidgefahr, medikamentöse Fixierung).
  - Neu (IDs `dep.med.*`, `dep.cls.nw_mittel.*`): 14 MC, 13 Walze (neue Runde „Typisch für welches
    Mittel?“: TZA / MAO-Hemmer / Johanniskraut, plus Escitalopram), 5 Lückentexte.
  - 12 Glossarbegriffe mit `extraTopics: ["medikamente"]`.
- Stand vorher: `data/depression.vor-medikamente.json.bak`.

Übertragen auf andere Quizze: die beiden JS-Dateien kopieren, dann im JSON eine Kategorie anlegen
und Items per `extraCategories` zuordnen.

### Schwebender Button „Zurück zur Frage“ im Glossar (01.11.2026)

Springt man aus einer Frage ins Glossar („Im Glossar: …“), erscheint links neben den Begriffen
auf halber Höhe ein großer Button, der zurück zur Frage und zur alten Scrollposition führt.
Auf schmalen Fenstern (≤ 1060 px) schwebt er unten links. Bei normalem Tab-Wechsel verschwindet er.

- `index.html`: Button `#backToQuiz` vor dem `<script>`
- `js/dom.js`: `backToQuiz`
- `js/main.js`: `returnPoint`, `setReturnPoint`, `initBackToQuiz`, `openGlossary` merkt sich den Modus
- `css/styles.css`: Abschnitt `.back-float` am Ende

### Lernheft-Link springt auf die richtige Seite (01.11.2026)

Jedes Item mit `source` hat jetzt zusätzlich **`source.page`** – die Lernheft-Seite, auf der die
Antwort steht. Der Link „Nachlesen“ öffnet das PDF mit `#page=N` direkt dort und zeigt
„(Kapitel X, S. N)“ an.

- `tools/seitenzahlen.py` berechnet die Seiten (sucht Antwort-/Erklärungswörter innerhalb des
  Kapitels). **Nach neuen Fragen erneut ausführen:** `python3 tools/seitenzahlen.py`
- `js/learn-links.js` baut den Link mit `#page=`.
- `#page=` funktioniert in Chrome, Edge, Firefox und Safari. Auf eine einzelne Zeile springen
  kann der eingebaute PDF-Viewer nicht.
- Stand vorher: `data/depression.vor-seitenzahlen.json.bak`.

Übertragen: `tools/seitenzahlen.py` (Datenpfad anpassen) und `js/learn-links.js` kopieren.
