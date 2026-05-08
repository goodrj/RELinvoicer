# Glossary

Short explanations for words used in this repo.

## Dashboard

The local web page you use to run RELinvoicer.

You open it at:

```text
http://localhost:3192
```

## Localhost

`localhost` means your own computer.

When you open `http://localhost:3192`, you are opening the RELinvoicer app running on your PC.

## DXF

A CAD drawing file format.

DXF is the best input for RELinvoicer because it can contain real rectangles, dimensions, and text entities.

## PDF

A document export format.

PDF is useful for viewing drawings, but it is harder for software to understand than DXF.

## Label Rectangle

The drawn box that represents one switchboard label.

RELinvoicer tries to measure these boxes.

## LWPOLYLINE

A DXF entity often used to draw rectangles.

RELinvoicer looks for closed 4-point `LWPOLYLINE` shapes.

## DIMENSION

A DXF entity that stores a measured value on a drawing.

RELinvoicer uses `DIMENSION` values to confirm that a rectangle is likely to be a label.

## TEXT And MTEXT

DXF entities for written notes.

RELinvoicer reads these when looking for quantity notes such as `2 OFF`.

## Quantity Note

Text near a label that says how many of that label are required.

Examples:

```text
2 OFF
QUANTITY: 4 ONLY
```

## TSV

Tab-separated values.

TSV is useful because you can paste it directly into a spreadsheet.

## Geometry

The actual shape and size of the rectangles in the drawing.

For DXF files, geometry is the most important evidence.
