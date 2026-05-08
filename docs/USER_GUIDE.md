# User Guide

This guide explains the RELinvoicer dashboard.

## Upload Area

Drop a DXF or PDF file onto the upload area.

You can also click the upload area and choose a file.

Use DXF whenever possible. DXF contains CAD geometry, so it is more reliable than PDF.

## Preview

After upload, the app shows a preview.

For DXF, the preview confirms the file was accepted.

For PDF, the preview shows page thumbnails.

## Analyse Button

Click **Analyse** after the file is loaded.

While analysis is running, the status area shows that analysis is ongoing and displays elapsed time.

Do not refresh the page while analysis is running.

## Result Table

The result table has three columns:

```text
Quantity    Width X (mm)    Height Y (mm)
```

Example:

```text
2           80              20
```

This means two labels are `80 mm` wide and `20 mm` high.

The larger number is always shown as `Width X`. The smaller number is always shown as `Height Y`.

## Total Row

The table shows a total label count at the bottom.

The total is the sum of the quantity column.

## Remarks

Remarks are notes from the app.

They may explain:

- how many DXF rectangles were used,
- whether quantity notes were found,
- whether PDF geometry correction was used,
- whether the result needs extra attention.

Remarks are not always errors. They are there so you can see what judgement the app used.

## Copy TSV

Click **Copy TSV** when you want to paste into Excel or Google Sheets.

It copies only the numeric rows:

```text
1    250    30
1    250    15
2    80     20
```

It does not copy the header row or total row.

## Export Excel

Click **Export Excel** when you want an `.xlsx` file.

The Excel export includes:

- quantity,
- width,
- height,
- totals row.

## Re-Analyse

PDF pages can be re-analysed if a result looks wrong.

If a re-analysis result disagrees with the first result, the app lets you choose which result to keep.

DXF analysis normally does not need re-analysis because it reads CAD entities directly.

## When To Double-Check Manually

Always double-check before production if:

- the file is a PDF,
- the drawing is crowded,
- a rectangle is not closed,
- a quantity note is far from the label,
- dimensions are missing,
- the total quantity looks wrong.
