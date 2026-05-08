# Architecture

RELinvoicer is intentionally small and local-first. The application is a single Node.js service that serves the dashboard and analyses uploaded drawings.

## Components

### Dashboard

Files:

- `public/index.html`
- `public/styles.css`
- `public/app.js`

The dashboard is a plain browser UI served from Express. It handles upload, preview, analysis requests, result tables, TSV copy, and Excel export.

The dashboard does not contain the DXF parser. It sends uploaded file data to the backend API.

### API Server

File:

- `server.js`

Responsibilities:

- Serve static dashboard files.
- Expose health status.
- Receive DXF and PDF analysis requests.
- Route DXF files to the local DXF parser.
- Route PDF page images to OpenAI vision when needed.
- Return grouped label sizes and remarks.

Key endpoints:

- `GET /api/health`
- `POST /api/analyse`
- `POST /api/analyse-dxf`

### DXF Parser

File:

- `server.js`

The DXF parser reads the drawing as group-code pairs. It extracts:

- closed `LWPOLYLINE` rectangles,
- `DIMENSION` values,
- `TEXT` and `MTEXT` quantity notes.

It then filters candidate rectangles, applies nearby quantity text, normalises width and height, and groups duplicate sizes.

### PDF Fallback

Files:

- `public/app.js`
- `server.js`

The browser renders PDF pages into images. The backend sends those images to OpenAI vision.

When possible, the backend also reads PDF vector rectangle geometry and uses it to correct likely AI mistakes.

## Control Flow

DXF:

1. User uploads a DXF.
2. Dashboard sends file text to the backend.
3. Backend parses CAD entities.
4. Backend returns grouped label sizes and remarks.
5. Dashboard renders the result table.

PDF:

1. User uploads a PDF.
2. Dashboard renders page images.
3. Dashboard sends page images to the backend.
4. Backend calls OpenAI vision.
5. Backend applies geometry correction when possible.
6. Dashboard renders the result table.

## Result Shape

The app returns label rows like:

```json
{
  "quantity": 2,
  "width": 80,
  "height": 20
}
```

The larger dimension is always `width`. The smaller dimension is always `height`.

## Why There Is No Database

RELinvoicer is designed for one upload at a time.

It does not need accounts, saved jobs, or history. Keeping it stateless makes it easier to run locally and easier to understand.
