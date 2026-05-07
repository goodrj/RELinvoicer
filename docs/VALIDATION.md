# Validation Notes

This project is validated against real switchboard label DXF samples supplied during development.

The goal of these notes is not to expose customer drawings. It is to document the kinds of cases the app is expected to handle.

## Covered Cases

The current parser has been checked against drawings containing:

- standard rectangular labels,
- shared dimensions,
- thin labels such as `250 x 15`,
- small labels such as `16 x 8` and `16 x 16`,
- quantity notes such as `2 OFF`,
- quantity notes such as `QUANTITY: 1 ONLY`,
- grouped duplicate label sizes,
- mixed label sizes on the same drawing.

## Example Expected Outputs

For a drawing with a shared `250 mm` long side and a quantity note on the `80 x 20` label:

```text
Quantity    Width X (mm)    Height Y (mm)
1           250             30
1           250             15
1           200             120
1           160             90
2           80              20
```

For drawings with very small labels, expected rows include:

```text
2           16              16
7           16              8
```

## Local Checks

Before pushing changes, run:

```powershell
npm run check
npm run smoke
```

For extraction logic changes, also test with representative DXF files and compare the app table against the drawing manually.

## Accuracy Principle

DXF geometry is the authority.

For DXF files, the app should prefer the actual rectangle dimensions over nearby text placement. Quantity text changes how many labels are counted, but it does not change the rectangle size.
