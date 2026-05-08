# How It Works

This page explains the idea behind RELinvoicer in plain language.

## The Big Idea

The app is trying to answer:

```text
What label sizes and quantities are in this drawing?
```

For DXF files, the app reads the CAD drawing directly.

For PDF files, the app uses AI vision and geometry checks.

## DXF

DXF is the best input because it can contain the actual label rectangles.

RELinvoicer looks for:

- closed rectangles,
- dimension values,
- nearby quantity notes.

The rectangle shape is the main evidence.

## PDF

PDF is a fallback.

PDF is harder because it is usually made for viewing or printing, not for extracting data.

For PDF, RELinvoicer:

1. turns each page into an image,
2. sends the image to OpenAI vision,
3. asks for dimension numbers outside rectangles,
4. checks vector rectangle geometry when possible,
5. groups the final sizes.

## Normalising Sizes

The app always stores the larger number as width.

Example:

```text
15 x 250
```

becomes:

```text
250 x 15
```

## Grouping

If the same size appears more than once, the app combines the rows.

Example:

```text
1 x 80 x 20
1 x 80 x 20
```

becomes:

```text
2 x 80 x 20
```

## Quantity Notes

If a drawing has `2 OFF` near one rectangle, that rectangle counts as two labels.

The size still comes from the rectangle. The note only changes quantity.
