"""Ergänzt source.page an allen Quiz-Items: die Lernheft-Seite, auf der die Antwort steht.

Aufruf im Ordner Depression-Quiz:  python3 tools/seitenzahlen.py
Benötigt pdftotext/pdfinfo (poppler). Nach neuen Fragen einfach erneut ausführen.
Suche: nur innerhalb des Kapitels (source.chapter); die Seite mit den meisten
seltenen Wörtern aus Antwort, Erklärung, Begriff und Lücken gewinnt. Kein Treffer → Kapitelanfang.
"""
import json, math, re, subprocess, unicodedata
from collections import Counter

DATA = "data/depression.json"
HEADING = re.compile(r"^ {2,14}(\d{1,2}) {3,}[A-ZÄÖÜ]", re.M)
WORD = re.compile(r"[a-zäöüß0-9]{4,}")
STOP = set("eine einer einem einen nicht oder auch sind wird werden wurde dass durch nach beim beim über unter zwischen sowie diese dieser dieses kann können muss haben hat wenn dann mehr sehr immer schon noch ohne gegen zum zur vom laut etwa bzw".split())

def norm(text):
    text = unicodedata.normalize("NFC", text.lower()).replace("­", "")
    return re.sub(r"-\s*\n\s*", "", text)

def words(text):
    return [w for w in WORD.findall(norm(text)) if w not in STOP]

def pdf_pages(path):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", path], capture_output=True, text=True).stdout).group(1))
    return [subprocess.run(["pdftotext", "-layout", "-f", str(p), "-l", str(p), path, "-"], capture_output=True, text=True).stdout for p in range(1, n + 1)]

def chapter_ranges(pages):
    starts = {}
    for p, text in enumerate(pages, 1):
        for m in HEADING.finditer(text):
            starts.setdefault(int(m.group(1)), p)
    chapters = sorted(starts)
    return {c: (starts[c], starts[chapters[i + 1]] if i + 1 < len(chapters) else len(pages)) for i, c in enumerate(chapters)}

def answer_text(item):
    parts = [item.get("explanation", ""), item.get("term", ""), item.get("merke", "")]
    if "options" in item and "answerIndex" in item:
        parts.append(item["options"][item["answerIndex"]])
    for gap in item.get("gaps", []):
        parts.extend(gap.get("answers", [])[:1])
    text = item.get("text", "")
    parts.append(re.sub(r"\{\{\d+\}\}", " ", text))
    return " ".join(parts), item.get("prompt", "")

def best_page(item, doc):
    chapter = item["source"].get("chapter")
    if chapter not in doc["ranges"]:
        return None
    first, last = doc["ranges"][chapter]
    main, prompt = answer_text(item)
    wanted = Counter(words(main) * 2 + words(prompt))
    scores = {}
    for p in range(first, last + 1):
        page_words = doc["words"][p - 1]
        scores[p] = sum(count * doc["idf"].get(w, 0) for w, count in wanted.items() if w in page_words)
    page = max(scores, key=lambda p: (scores[p], -p))
    return page if scores[page] > 0 else first

def main():
    data = json.load(open(DATA, encoding="utf-8"))
    docs = {}
    for d in data["documents"]:
        pages = pdf_pages(d["file"])
        page_words = [set(words(t)) for t in pages]
        df = Counter(w for s in page_words for w in s)
        docs[d["id"]] = {"ranges": chapter_ranges(pages), "words": page_words,
                         "idf": {w: math.log((len(pages) + 1) / c) for w, c in df.items()}}
    stats = Counter()
    for mode in data["modes"].values():
        for item in mode["items"]:
            src = item.get("source") or {}
            doc = docs.get(src.get("doc"))
            if not doc:
                stats["ohne Lernheft"] += 1
                continue
            page = best_page(item, doc)
            if page:
                src["page"] = page
                stats["mit Seite"] += 1
            else:
                stats["Kapitel nicht gefunden"] += 1
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(dict(stats))

if __name__ == "__main__":
    main()
