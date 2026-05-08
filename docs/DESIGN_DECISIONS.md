# Design Decisions

This document explains why RELinvoicer is built the way it is.

## Local-First

RELinvoicer runs on the user's computer instead of a shared server.

Why:

- Setup is simpler for one user.
- DXF drawings can be analysed locally.
- The OpenAI API key can stay in `.env` on the user's machine.

Tradeoff:

- The terminal must stay open while the app is running.

## DXF-First

DXF is preferred over PDF.

Why:

- DXF contains real CAD geometry.
- Rectangles can be measured directly.
- Quantity notes can be read as drawing text.
- Accuracy is better than image-only extraction.

Tradeoff:

- The parser depends on useful CAD entities such as `LWPOLYLINE` and `DIMENSION`.

## PDF As Fallback

PDF support remains available for older drawing exports.

Why:

- Sometimes the user only has a PDF.
- OpenAI vision can read dimension numbers that are not selectable text.
- PDF vector geometry can still help correct some mistakes.

Tradeoff:

- PDF accuracy depends on drawing quality and AI interpretation.

## No Database

RELinvoicer does not store analysis history.

Why:

- The workflow is one upload, one answer.
- There is no account system.
- There is less private data to manage.

Tradeoff:

- The user must export or copy results before closing the page.

## Conservative DXF Filtering

The DXF parser checks rectangles against dimension values.

Why:

- CAD drawings may contain title blocks and tables.
- Not every rectangle is a label.
- Dimension matching reduces false positives.

Tradeoff:

- A real label may be skipped if it is not dimensioned in the DXF.

## Remarks Instead Of Silent Guessing

The app shows remarks when it uses extra judgement.

Why:

- The user can review inferred or corrected results.
- It keeps the app honest about uncertain cases.

Tradeoff:

- The user should read remarks on unusual drawings.
