# Security

## API Keys

Put your OpenAI API key in `.env`.

Do not commit `.env`.

The browser never receives the API key. The local Node server reads it and sends requests to OpenAI.

## Drawing Data

This app does not save uploaded PDFs.

During analysis:

- the browser renders page images,
- the browser sends those images to the local backend,
- the backend sends page images to OpenAI,
- the backend reads PDF vector rectangles locally for geometry correction.

Only run this app with drawings you are allowed to send to OpenAI.

## Reporting Problems

If this repo is private, create a GitHub issue or contact the maintainer directly.

If this repo is public, avoid posting private drawings, API keys, customer names, or switchboard details in an issue.
