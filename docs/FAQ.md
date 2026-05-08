# FAQ

## Should I upload DXF or PDF?

Use DXF whenever you have it.

DXF contains CAD geometry, so the app can measure the rectangles directly.

## Do DXF files use my OpenAI API key?

No.

DXF analysis runs locally.

## When do I need an OpenAI API key?

Only for PDF fallback analysis.

PDF analysis sends rendered page images to OpenAI vision.

## Does RELinvoicer store my drawings?

No.

The app does not keep a drawing database or analysis history.

## Why does Copy TSV skip the header and total row?

Because it is meant for pasting only the usable size rows into another spreadsheet or system.

The dashboard still shows the header and total row.

## Why was a tiny label skipped?

The DXF parser keeps small labels when their sides match dimension values.

If a tiny label is skipped, check whether it is a closed `LWPOLYLINE` and whether the drawing has matching `DIMENSION` values.

## Why did quantity become more than one?

The app found nearby quantity text such as:

```text
2 OFF
QUANTITY: 4 ONLY
```

That quantity is applied to the drawn rectangle before grouping.

## Can I close the terminal?

Not while using RELinvoicer.

The terminal is running the local server. If you close it, the dashboard stops.

## How do I update the app?

Run:

```powershell
cd "C:\path\to\RELinvoicer"
git pull
npm install
```

Then start it again:

```powershell
npm start
```
