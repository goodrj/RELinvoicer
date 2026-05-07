# Security

## API Keys

Put your OpenAI API key in `.env`.

Do not commit `.env`.

The browser never receives the API key. The local Node server reads it and sends requests to OpenAI.

## Drawing Data

This app does not save uploaded drawings.

During analysis:

- DXF files are sent from the browser to the local backend and analysed locally,
- PDF files are rendered into page images by the browser,
- PDF page images are sent from the browser to the local backend,
- the backend sends PDF page images to OpenAI for vision analysis,
- the backend reads PDF vector rectangles locally for geometry correction.

DXF analysis does not use OpenAI.

Only use PDF fallback with drawings you are allowed to send to OpenAI.

## Reporting Problems

If this repo is private, create a GitHub issue or contact the maintainer directly.

If this repo is public, avoid posting private drawings, API keys, customer names, or switchboard details in an issue.
