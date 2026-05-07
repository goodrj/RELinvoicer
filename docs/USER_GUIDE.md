# User Guide

This guide is for the person using the app on real label drawings. No coding knowledge is needed.

## Start The App

Open PowerShell in the project folder and run:

```powershell
npm start
```

Then open:

```text
http://localhost:3192
```

If port `3192` is already in use, see [Troubleshooting](TROUBLESHOOTING.md).

## Best File To Upload

Use DXF whenever possible.

DXF contains the actual CAD rectangles and dimensions, so it is more reliable than asking AI to read a picture. PDF is still supported when a DXF is not available.

For DXF files, you do not need an OpenAI API key.

For PDF files, the app needs `OPENAI_API_KEY` in `.env`.

## Analyse A Drawing

1. Drag the DXF or PDF onto the upload box, or click the box and choose a file.
2. Wait for the preview to appear.
3. Click `Analyse`.
4. Watch the status area. It will show that analysis is ongoing and display elapsed time.
5. Read the result table.
6. Check the remarks area if it appears.

## Understand The Result

Each row means:

```text
Quantity    Width X (mm)    Height Y (mm)
```

Example:

```text
2           80              20
```

This means two labels are `80 mm` wide and `20 mm` high.

The app always stores the larger value as `Width X` and the smaller value as `Height Y`.

## Quantity Notes

If a DXF has quantity text near a rectangle, the app applies that quantity to the rectangle before grouping the final answer.

Examples the app understands:

```text
2 OFF
2 OFF EACH
2 ONLY
4 REQUIRED
QTY: 3
QUANTITY: 4 ONLY
```

If the same label size appears in several places, the final table adds them together.

## What Remarks Mean

Remarks are not errors. They are the app saying, "I used extra judgement here."

Examples:

```text
DXF analysis used 5 closed label rectangles and 10 dimension values.
Geometry correction used CAD rectangle proportions as the authority.
```

Always read remarks when the drawing is crowded, uses shared dimensions, or contains unusual labels.

## Understand The Timer

While the app is analysing, the status box shows the ongoing run and elapsed time.

When analysis finishes, the final time stays on screen so you can see how long the run took.

## Export Results

Use `Copy TSV` when you want to paste straight into Excel or Google Sheets.

`Copy TSV` copies only the numeric result rows:

```text
1    250    30
1    250    15
2    80     20
```

It does not copy the table header or total row.

Use `Export Excel` when you want an `.xlsx` file. The Excel export includes a totals row.

## Re-Analyse One PDF Page

PDF fallback analysis can be re-run per page.

If one PDF page looks wrong:

1. Find the page thumbnail.
2. Click `Re-analyse`.
3. If the new result differs from the old one, choose which version to keep.

DXF analysis normally does not need this because it reads CAD entities directly.

## When To Double-Check Manually

Always double-check if:

- the drawing is very crowded,
- a rectangle is not a clean closed CAD shape,
- a dimension is missing,
- the remarks mention uncertainty,
- the total quantity looks too high or too low,
- the file is a PDF rather than a DXF.
