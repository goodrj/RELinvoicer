# How RELinvoicer Works

This explanation is written for a beginner. The app is small, but the problem is not: engineering drawings mix geometry, dimensions, label text, finish notes, and quantity notes.

The app's job is to answer one question:

```text
What label sizes and quantities are in this drawing?
```

## The Main Idea

The safest evidence is the CAD rectangle itself.

If a label box is drawn as `250 mm` wide and `15 mm` high, that geometry matters more than nearby words or the position of dimension text.

That is why DXF is the preferred workflow.

## DXF Path

DXF files are structured CAD files. They can contain real entities such as:

- `LWPOLYLINE` for rectangles,
- `DIMENSION` for measurements,
- `TEXT` and `MTEXT` for notes.

The backend reads the DXF directly:

1. It finds closed 4-point `LWPOLYLINE` shapes.
2. It checks whether their sides match nearby drawing `DIMENSION` values.
3. It keeps rectangles that look like real label boxes.
4. It reads nearby quantity notes such as `2 OFF` or `QUANTITY: 4 ONLY`.
5. It groups identical sizes into one final table.

No AI vision is needed for DXF files.

## Why Dimension Matching Exists

CAD drawings can contain borders, tables, title blocks, and construction lines. The app should not count those as labels.

Dimension matching is a filter. A rectangle is trusted when its sides match values that the drawing itself marks as dimensions.

This helps the app include small real labels, such as `16 x 8`, while ignoring unrelated boxes.

## Quantity Handling

A drawn rectangle normally counts as quantity `1`.

If nearby text says something like `2 OFF`, the rectangle counts as quantity `2`.

Then grouping happens:

```text
one drawn 80 x 20 rectangle with "2 OFF" -> 2 x 80 x 20
two separate 80 x 20 rectangles with no note -> 2 x 80 x 20
```

Both cases produce the same final quantity.

## PDF Fallback Path

PDF is harder because it is an output format, not the original CAD file.

Some CAD PDFs contain no selectable text. Dimension numbers may be drawn as vector outlines, so normal text extraction does not work.

For PDF fallback, the app uses three layers.

## PDF Step 1: Render Page Images

The browser turns each PDF page into an image.

That image is used for:

- thumbnail preview,
- OpenAI vision analysis.

Main browser file:

```text
public/app.js
```

## PDF Step 2: OpenAI Reads The Image

The backend sends the rendered page image to OpenAI vision.

The prompt tells the model to:

- read dimension numbers outside rectangles,
- ignore label text inside rectangles,
- ignore engraving specs such as `5` or `10`,
- ignore finish notes such as `W-B` and `BLACK`,
- return structured JSON.

Main backend file:

```text
server.js
```

## PDF Step 3: Geometry Correction

Many CAD PDFs still contain vector rectangle paths.

The backend reads those paths and compares actual rectangle proportions against the AI result.

Example:

```text
250 / 15 = 16.67
```

If the PDF contains a rectangle with the same long-side-to-short-side proportion, the app can correct a likely AI mistake such as `200 x 15` to `250 x 15`.

## Normalising Results

Before showing the final table, the app normalises every label:

```text
larger number  = Width X
smaller number = Height Y
```

Then it groups matching sizes.

So these all become the same row:

```text
250 x 15
15 x 250
Width 250, Height 15
Height 15, Width 250
```

## Data Flow

DXF:

```text
DXF upload
  -> backend reads CAD entities
  -> backend finds label rectangles
  -> backend applies quantity notes
  -> browser shows final table and remarks
```

PDF:

```text
PDF upload
  -> browser renders page images
  -> backend sends images to OpenAI
  -> backend extracts CAD rectangles from PDF vectors
  -> backend corrects likely AI mistakes
  -> browser shows final table and remarks
```

## What The App Does Not Do Yet

- It does not store projects or history.
- It does not edit CAD files.
- It does not read every possible DXF drawing style.
- It does not guarantee perfect PDF results on scanned or low-quality drawings.
- It does not replace human checking for production-critical labels.
