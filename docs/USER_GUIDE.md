# User Guide

This guide is for someone who knows the drawing, but does not want to think about code.

## Start The App

Open PowerShell in the project folder and run:

```powershell
npm start
```

Then open:

```text
http://localhost:3192
```

If the app says the API key is missing, open `.env` and add your OpenAI API key.

## Analyse A PDF

1. Drop the PDF onto the upload box.
2. Wait for the page thumbnails to appear.
3. Click `Analyse`.
4. Watch the analysis status. It will say analysis is ongoing and show elapsed time.
5. Read the result table.
6. Check the remarks if they appear.

## Understand The Result

Each row means:

```text
Quantity    Width X (mm)    Height Y (mm)
```

Example:

```text
1           250             15
```

This means one label is `250 mm` wide and `15 mm` high.

## What Remarks Mean

Remarks are not errors. They are the app saying, “I used extra judgement here.”

For example:

```text
Geometry correction used CAD rectangle proportions as the authority.
```

That means the app checked the actual rectangle shape in the PDF and used that to fix or confirm the result.

## Understand The Timer

While the app is analysing, the status box shows:

```text
Analysis ongoing
Elapsed time 00:12
```

When the analysis finishes, it keeps the final time on screen so you can see how long the run took.

## Export Results

Use `Copy TSV` when you want to paste straight into Excel or Google Sheets. It copies only the numeric result rows, without the table header or total row.

Use `Export Excel` when you want an `.xlsx` file with a totals row.

## Re-Analyse One Page

If one page looks wrong:

1. Find the page thumbnail.
2. Click `Re-analyse`.
3. If the new result differs from the old one, choose which version to keep.

## When To Double-Check Manually

Always double-check if:

- The drawing is very crowded.
- The PDF is blurry or scanned.
- A label rectangle is not a clean CAD rectangle.
- The remarks mention uncertainty.
- The total quantity looks too high or too low.
