# RELinvoicer

**AI-powered label dimension extractor for switchboard engineering drawings.**

Drop in a PDF, click Analyse — the app reads every dimension annotation on every page and gives you a clean, merged table of label sizes and quantities, ready to export or paste straight into a spreadsheet.

---

## How it works

1. **Upload** a PDF of engineering/switchboard label drawings (drag-and-drop or file picker)
2. **Thumbnails** of every page are rendered client-side with PDF.js
3. **Analyse** — each page image is sent to Claude's vision model **twice independently**
4. The two results are **compared automatically**:
   - ✅ Both agree → **Confirmed**
   - ⚠️ They disagree → **Mismatch** — both versions shown side-by-side so you can pick the right one
   - ✕ Something went wrong → **Error** with a per-page retry button
5. Confirmed entries are **merged across pages** — if the same `W×H` appears on multiple pages the quantities are summed into one row
6. **Export** as `.xlsx` (with a totals row) or **copy** tab-separated numbers straight to clipboard

---

## What the AI extracts

The AI looks for rectangular boxes with **dimension arrow annotations** on their edges:

- **Width X (mm)** — number on a horizontal arrow (top or bottom of the box)
- **Height Y (mm)** — number on a vertical arrow (left or right side)
- **Qty** — how many boxes of that exact size appear on the page

It ignores all text *inside* boxes (part codes, wiring labels, colour specs) and only reads the dimension arrows on the outside edges.

Output is ordered by quantity descending, then by area descending.

---

## Tech stack

| Layer | What |
|-------|------|
| Backend | Node.js + Express |
| AI | Claude Opus 4.7 (vision) via Anthropic SDK |
| PDF rendering | PDF.js (client-side, CDN) |
| Excel export | SheetJS / xlsx (client-side, CDN) |
| Frontend | Vanilla JS — no framework |

---

## Prerequisites

- **Node.js** v18 or later
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)

---

## Getting started

```bash
# 1. Clone
git clone https://github.com/your-username/RELinvoicer.git
cd RELinvoicer

# 2. Install dependencies
npm install

# 3. Set your API key
cp .env.example .env
# then edit .env and paste your key

# 4. Start
node server.js
```

Open **http://localhost:3001** in your browser.

### Windows (PowerShell)

A convenience script is included that checks for the API key before starting:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
.\start.ps1
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | — | Your Anthropic API key |
| `PORT` | No | `3001` | Port the server listens on |

---

## API

### `POST /api/analyze`

Analyses a single page image with two independent AI runs and returns the comparison result.

**Request body**

```json
{
  "pageImage": "<base64-encoded PNG>",
  "pageIndex": 0
}
```

**Response — confirmed**

```json
{
  "pageIndex": 0,
  "status": "confirmed",
  "entries": [
    { "width": 140, "height": 20, "qty": 6 },
    { "width": 100, "height": 30, "qty": 2 }
  ],
  "run1": [ ... ],
  "run2": [ ... ]
}
```

**Response — mismatch**

```json
{
  "pageIndex": 0,
  "status": "mismatch",
  "entries": null,
  "run1": [ ... ],
  "run2": [ ... ]
}
```

**Response — error**

```json
{
  "pageIndex": 0,
  "status": "error",
  "error": "Could not parse model response"
}
```

---

## UI overview

- **Dark theme** — minimal, built for daily use
- Page thumbnails show a live status indicator (pending / analysing / confirmed / mismatch / error)
- Mismatch rows show two clickable option cards — clicking one resolves to Confirmed
- The ↺ re-check button is disabled on rows merged from multiple pages (tooltip explains why)
- Running confirmed-quantity total shown below the table
- Copy to clipboard pastes tab-separated `Qty\tWidth\tHeight` rows — no headers — paste-ready for Excel or Google Sheets

---

## License

MIT — see [LICENSE](LICENSE)
