# RELinvoicer

A local single-user web app for extracting switchboard label dimensions from CAD-exported PDF drawings.

The browser renders each PDF page to an image for OpenAI vision analysis. The backend also reads CAD vector rectangles from the PDF and uses their geometry to correct shared/common dimensioning cases, such as adjacent `250 x 30` and `250 x 15` labels where only one long dimension is annotated.

## Setup

```powershell
git clone https://github.com/goodrj/RELinvoicer.git
cd RELinvoicer
copy .env.example .env
notepad .env
npm install
npm start
```

Put your OpenAI API key in `.env`:

```text
OPENAI_API_KEY=sk-your-key-here
```

Then open:

```text
http://localhost:3192
```

## Features

- Drag and drop a PDF.
- Preview each page as a thumbnail.
- Analyse all pages using OpenAI vision.
- Re-analyse a single page.
- Consolidate all pages into one unique-size answer.
- Correct shared/common dimensioning using CAD rectangle geometry.
- Show remarks when shared or inferred dimensions are used.
- Copy tab-separated results for spreadsheets.
- Export an Excel file with a totals row.

## Notes

- The OpenAI API key stays on the local server and is not sent to browser JavaScript.
- Results are consolidated into one table per PDF upload.
- If a re-analysis disagrees with the previous result for a page, both candidates are shown so you can choose the correct one.
- Excel export contains one sheet with the unique label sizes and a totals row.
