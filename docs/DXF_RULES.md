# DXF Rules

This document explains how RELinvoicer reads DXF files.

## Main Rule

DXF geometry is the authority.

The app should trust the drawn label rectangle more than nearby annotation placement.

## Entities Used

RELinvoicer reads:

- `LWPOLYLINE` for label rectangles,
- `DIMENSION` for measured side values,
- `TEXT` and `MTEXT` for quantity notes.

## Rectangle Detection

A rectangle is considered a label candidate when:

- it is a closed `LWPOLYLINE`,
- it has four corner points,
- its sides are horizontal and vertical,
- its side lengths match dimension values,
- its size is within the expected label range.

Dimension matching helps avoid counting title blocks, tables, and unrelated boxes.

## Width And Height

The larger side becomes `Width X`.

The smaller side becomes `Height Y`.

Example:

```text
15 x 250 -> 250 x 15
```

## Shared Dimensions

Some CAD drawings show one dimension line for two nearby labels.

RELinvoicer handles this by measuring the rectangles themselves.

If two rectangles are truly the same width, the geometry can show that even when only one printed dimension is nearby.

## Small Labels

Small labels are allowed when the drawing supports them with dimensions.

Examples:

```text
16 x 8
16 x 16
```

## Quantity Notes

One drawn rectangle counts as quantity `1` unless nearby text says otherwise.

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

## Known Limits

The parser may skip labels when:

- rectangles are exploded into separate `LINE` entities,
- rectangles are not closed,
- labels are rotated at unusual angles,
- dimensions are missing,
- dimensions are exploded into plain lines and text,
- a real label rectangle has no matching dimension value.

The safest export is a DXF with closed label polylines and real `DIMENSION` entities.
