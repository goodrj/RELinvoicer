# RELinvoicer

RELinvoicer is a local web app that reads switchboard label drawings from DXF or PDF files and turns them into a clean spreadsheet-ready size list.

DXF is the preferred workflow because it contains real CAD geometry. PDF is kept as a fallback for older drawing exports.

## What It Does

Drop in a DXF drawing like an electrical switchboard label layout. RELinvoicer gives you one combined answer:

```text
Quantity    Width X (mm)    Height Y (mm)
1           250             30
1           250             15
1           200             120
1           160             90
1           80              20
```

The goal is simple: save time, reduce retyping, and catch tricky shared-dimension cases.

## Quick Start

You need Node.js and an OpenAI API key.

```powershell
git clone https://github.com/goodrj/RELinvoicer.git
cd RELinvoicer
copy .env.example .env
notepad .env
npm install
npm start
```

In `.env`, replace the example key:

```text
OPENAI_API_KEY=sk-your-key-here
```

Then open:

```text
http://localhost:3192
```

On Windows, you can also run:

```powershell
.\start.ps1
```

## How To Use It

1. Drag a DXF or PDF onto the page, or click the upload box.
2. Check the page thumbnails.
3. Click `Analyse`.
4. Watch the live status and elapsed timer.
5. Review the table of unique sizes.
6. Check any analysis remarks.
7. Copy the TSV results or export Excel.

If a page looks wrong, click `Re-analyse` on that page.

## How It Thinks

For DXF files, the app reads real CAD entities directly:

1. Closed `LWPOLYLINE` rectangles become label boxes.
2. `DIMENSION` entities confirm the drawing is dimensioned in millimetres.
3. The rectangle geometry becomes the source of truth.

For PDF files, the app uses three checks, like three people checking the same drawing:

1. Vision reads the page image.
   It looks for dimension numbers outside the label rectangles.

2. A second AI audit checks suspicious thin-label cases.
   This helps catch cases like a `15 mm` label accidentally borrowing the wrong long dimension.

3. Geometry checks the actual CAD rectangles.
   This is the important safety net. If the PDF contains vector rectangles, the backend compares their proportions and page scale against the AI result.

That is why a thin label beside a `250 x 30` label can correctly become `250 x 15`, even if only `15` is printed above it.

## Important Reading Rules

- Text inside a rectangle is label content, not a dimension.
- Dimension numbers outside rectangles are the important numbers.
- Small values like `5 mm` or `10 mm` below labels are usually engraving specs.
- Finish words like `1 OFF`, `W-B`, and `BLACK` are ignored.
- The larger size is stored as `Width X`.
- The smaller size is stored as `Height Y`.
- Shared CAD dimensions are allowed when the rectangles line up.
- Rectangle geometry wins over nearby annotation text when they disagree.

## Project Map

```text
RELinvoicer/
  public/
    index.html       Browser layout
    styles.css       Visual design
    app.js           Upload, PDF preview, table, Excel export
  scripts/
    smoke-test.mjs   Starts the server on a test port and checks /api/health
  docs/
    USER_GUIDE.md       Plain-English user guide
    HOW_IT_WORKS.md     Beginner-friendly technical explanation
    TROUBLESHOOTING.md  Common problems and fixes
  server.js         Local API, DXF parser, OpenAI call, CAD geometry correction
  start.ps1         Windows helper script
  .env.example      Example settings
```

## Useful Commands

```powershell
npm install      # install dependencies
npm start        # run the app
npm run check    # check JavaScript syntax
npm run smoke    # start a test server and check it responds
```

## Privacy

Your OpenAI API key stays in `.env` on your machine. The browser does not receive the key.

DXF files are analysed locally by the backend. No OpenAI call is used for DXF analysis.

PDF page images are sent to OpenAI for analysis. The original PDF bytes are also sent from the browser to the local backend so the backend can read CAD vector rectangles. They are not stored by this app.

## More Help

- User steps: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- Technical explanation: [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)
- Problems and fixes: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security notes: [SECURITY.md](SECURITY.md)
