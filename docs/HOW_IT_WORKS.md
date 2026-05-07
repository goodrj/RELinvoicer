# How RELinvoicer Works

This explanation is written for a beginner. No electrical or AI background is assumed.

## The Big Idea

The app is trying to answer one question:

```text
What rectangle sizes are on this drawing?
```

For DXF files, it does that with CAD data:

1. Closed rectangle polylines.
2. Dimension entities.
3. Drawing units.

For PDF files, it does that with two kinds of evidence:

1. The numbers printed on the drawing.
2. The actual rectangle shapes inside the PDF.

Using CAD data is better than reading a picture. That is why DXF is preferred.

## DXF Path

DXF files are structured CAD files. They can contain real entities such as:

- `LWPOLYLINE` for rectangles,
- `DIMENSION` for measurements,
- `TEXT` and `MTEXT` for label content.

RELinvoicer reads closed 4-point `LWPOLYLINE` shapes, checks them against `DIMENSION` values, and converts them into label sizes.

For DXF, no AI vision is needed.

## PDF Fallback Path

PDF is harder because it is a drawing output, not the original CAD data.

## Step 1: The Browser Renders The PDF

PDF drawings are hard for AI to read directly. So the browser turns each PDF page into an image.

That image is what you see as a thumbnail.

The app also makes a higher-resolution hidden image for analysis, because small dimension numbers need more detail.

Main file:

```text
public/app.js
```

## Step 2: OpenAI Reads The Image

The backend sends the page image to OpenAI vision.

The AI is told:

- Read dimensions outside rectangles.
- Ignore text inside rectangles.
- Ignore engraving specs like `5 mm`.
- Ignore finish specs like `W-B`.
- Return JSON, not a paragraph.

Main file:

```text
server.js
```

## Step 3: The App Normalises The Answer

The app always stores:

```text
larger number  = Width X
smaller number = Height Y
```

So `15 x 250` becomes `250 x 15`.

It also combines duplicates. Two `80 x 20` labels become:

```text
2    80    20
```

## Step 4: A Special Audit Checks Thin Labels

Thin labels are easy to misread because they may only show one small dimension, like `15`.

The app asks a second AI pass to check these cases more carefully.

This catches many mistakes, but AI can still be biased by nearby text.

## Step 5: CAD Geometry Checks The Rectangles

This is the strongest correction layer.

CAD PDFs often contain the actual rectangle lines as vector paths. RELinvoicer reads those rectangle paths and checks their proportions.

Example:

```text
250 / 15 = 16.67
```

If the rectangle in the PDF has almost the same long-side-to-short-side proportion, the app knows that `250 x 15` is a better match than `200 x 15`.

The app also checks page scale so it does not confuse shapes with the same ratio, such as:

```text
80 / 20  = 4
120 / 30 = 4
```

Same ratio, different size. Page scale helps choose the right one.

## Why Geometry Matters

AI may look at nearby annotation text and pick the wrong number.

Geometry asks a simpler question:

```text
What shape is the rectangle?
```

For switchboard label drawings, the rectangle shape is usually the best clue.

## Data Flow

```text
PDF upload
  -> browser renders page images
  -> backend sends image to OpenAI
  -> backend extracts CAD rectangles from PDF vectors
  -> backend compares AI dimensions with rectangle geometry
  -> browser shows final table and remarks
```

## What The App Does Not Do Yet

- It does not store projects or history.
- It does not edit PDFs.
- It does not guarantee perfect results on scanned or low-quality drawings.
- It does not replace human checking for production-critical labels.
