# DXF Rules

DXF is the preferred input because it lets RELinvoicer inspect the CAD drawing itself instead of guessing from an image.

## Entities The App Uses

The current DXF parser uses:

- `LWPOLYLINE` for label rectangles,
- `DIMENSION` for measured side values,
- `TEXT` and `MTEXT` for quantity notes.

## Rectangle Rules

A shape is considered a candidate label when:

- it is a closed `LWPOLYLINE`,
- it has four corner points,
- its sides are horizontal and vertical,
- its long and short sides match drawing dimension values,
- its size is within the expected label range.

The dimension match is important. It keeps the app from counting title blocks, tables, and random drawing boxes.

## Size Rules

The app stores dimensions like this:

```text
larger side  -> Width X
smaller side -> Height Y
```

So a rectangle may be drawn or returned as `15 x 250`, but the final table shows:

```text
250    15
```

Small labels are allowed when they are supported by drawing dimensions. This includes sizes such as:

```text
16 x 8
16 x 16
```

## Quantity Rules

One drawn rectangle counts as quantity `1` unless nearby quantity text says otherwise.

Supported examples:

```text
2 OFF
2 OFF EACH
2 ONLY
4 REQUIRED
QTY: 3
QUANTITY: 4 ONLY
```

Quantity is applied before grouping.

Example:

```text
one 80 x 20 rectangle with "2 OFF" = 2 labels
```

If another `80 x 20` rectangle appears elsewhere, the final quantity is added together.

## What Counts As Nearby

The app looks for quantity text close to the rectangle, with a preference for notes to the right of, below, or inside the same local label area.

This matches the current sample drawings, but it is still a drawing convention. If a future drawing puts quantity notes far away, the parser may need another rule.

## Known Limits

The parser is intentionally strict. It may skip labels when:

- rectangles are exploded into separate `LINE` entities,
- rectangles are not closed,
- labels are rotated at unusual angles,
- dimensions are missing or exploded into plain lines and text,
- a real label rectangle has no matching dimension value,
- non-label boxes are dimensioned exactly like labels.

The safest CAD export for this app is a DXF with closed label polylines and real `DIMENSION` entities.
