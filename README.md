# RELinvoicer

RELinvoicer is a local web app for extracting switchboard label sizes from CAD label drawings.

It is built for a practical manufacturing workflow: drop in a DXF, click `Analyse`, then copy or export one clean table of label quantities and dimensions.

```text
Quantity    Width X (mm)    Height Y (mm)
1           250             30
1           250             15
1           200             120
1           160             90
2           80              20
```

## Why It Exists

Electrical switchboard label drawings often contain many small rectangles, shared dimensions, finish notes, engraving text, and quantity notes. Reading those drawings by eye is slow and easy to get wrong.

RELinvoicer treats the CAD rectangles as the source of truth. This is the key improvement over image-only extraction: if two label boxes are the same size, the app follows the geometry of the boxes, not the position of nearby words.

## Current Status

DXF is the primary and recommended workflow.

PDF remains available as a fallback for older exports. PDF analysis uses OpenAI vision, then checks CAD vector geometry when the PDF still contains usable vector rectangles.

| Input | Recommended | Uses OpenAI | Notes |
| --- | --- | --- | --- |
| DXF | Yes | No | Reads CAD entities directly. Best accuracy. |
| PDF | Fallback only | Yes | Useful when no DXF is available. Accuracy depends on drawing quality. |

## Features

- Drag-and-drop DXF or PDF upload
- Thumbnail preview for uploaded pages or drawing sheets
- One-click analysis with live status and elapsed time
- DXF rectangle extraction from closed CAD polylines
- DXF quantity extraction from nearby notes such as `2 OFF` and `QUANTITY: 4 ONLY`
- Small label support, including sizes such as `16 x 8` and `16 x 16`
- Shared-dimension handling based on rectangle geometry
- Per-page re-analysis for PDF fallback runs
- Remarks panel for inferred, corrected, or noteworthy results
- Running total across the whole upload
- Excel export with a totals row
- TSV copy for spreadsheet paste, copying only numeric result rows

## Quick Start

Install Node.js first. Then run these commands in PowerShell:

```powershell
git clone https://github.com/goodrj/RELinvoicer.git
cd RELinvoicer
npm install
npm start
```

Open:

```text
http://localhost:3192
```

For DXF-only use, no OpenAI API key is required.

For PDF fallback analysis, create `.env`:

```powershell
copy .env.example .env
notepad .env
```

Add your key:

```text
OPENAI_API_KEY=sk-your-key-here
```

Then restart the app.

On Windows, you can also start the app with:

```powershell
.\start.ps1
```

## Daily Use

1. Drag a DXF or PDF onto the upload area, or click the upload area and choose a file.
2. Check that the preview appears.
3. Click `Analyse`.
4. Watch the analysis status and elapsed timer.
5. Review the final table and remarks.
6. Click `Copy TSV` for spreadsheet paste, or `Export Excel` for an `.xlsx` file.

## DXF Extraction Rules

The DXF path reads structured CAD data:

- Closed 4-point `LWPOLYLINE` entities are treated as possible label rectangles.
- `DIMENSION` entities confirm that the rectangle sides match real labelled dimensions.
- Rectangle geometry is the authority for width and height.
- The larger dimension is always stored as `Width X`.
- The smaller dimension is always stored as `Height Y`.
- Duplicate sizes are grouped together.
- Nearby quantity notes increase the quantity for that drawn rectangle.

Supported quantity text includes:

```text
2 OFF
2 OFF EACH
2 ONLY
4 REQUIRED
QTY: 3
QUANTITY: 4 ONLY
```

## PDF Fallback Rules

The PDF path is designed for CAD-exported PDFs where text may be vector outlines rather than selectable text.

- OpenAI vision reads dimension numbers from page images.
- Text inside a label rectangle is treated as label content, not a dimension.
- Small engraving values such as `5` or `10` are ignored where possible.
- Finish notes such as `W-B`, `BLACK`, and `1 OFF` are ignored as dimensions.
- CAD vector rectangle geometry is used to correct likely AI mistakes.
- If two analysis runs disagree, the app shows both so the user can choose.

## Commands

```powershell
npm install      # install dependencies
npm start        # run the local app
npm run check    # JavaScript syntax check
npm run smoke    # start a test server and check /api/health
```

## Project Map

```text
RELinvoicer/
  public/
    index.html          Browser layout
    styles.css          App styling
    app.js              Upload flow, previews, table, copy, Excel export
  scripts/
    smoke-test.mjs      Health-check test runner
  docs/
    USER_GUIDE.md       Plain-English operating guide
    HOW_IT_WORKS.md     Beginner-friendly technical explanation
    DXF_RULES.md        DXF extraction assumptions and rules
    VALIDATION.md       Sample drawing checks and expected outputs
    TROUBLESHOOTING.md  Common problems and fixes
  server.js             Local API, DXF parser, PDF fallback, OpenAI call
  start.ps1             Windows helper script
  .env.example          Example environment settings
```

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [How It Works](docs/HOW_IT_WORKS.md)
- [DXF Rules](docs/DXF_RULES.md)
- [Validation Notes](docs/VALIDATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Privacy

DXF analysis runs locally on your machine and does not use OpenAI.

PDF fallback analysis sends rendered page images to OpenAI vision. Your OpenAI API key stays in `.env` on your machine and is never sent to the browser.

This app does not store uploaded drawings, exported spreadsheets, or analysis history.

## Limits

RELinvoicer is built around clean CAD label drawings. Results should still be reviewed before production use, especially if:

- the drawing contains non-label rectangles with matching dimensions,
- rectangles are not closed polylines in the DXF,
- dimensions are missing or not represented as DXF `DIMENSION` entities,
- the PDF is scanned, blurry, or heavily compressed,
- labels are rotated or drawn in an unusual way.

When in doubt, use DXF instead of PDF.
