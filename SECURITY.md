# Security Notes

RELinvoicer is a local drawing-analysis tool. It should only be used with drawings the user is allowed to process.

## Sensitive Local Data

The `.env` file can contain:

- OpenAI API keys.

Do not commit or upload `.env`.

## Credentials

RELinvoicer does not ask for passwords.

For PDF fallback, the local Node server reads `OPENAI_API_KEY` from `.env` and sends requests to OpenAI.

The browser never receives the API key.

## Network Scope

The dashboard is served locally at:

```text
http://localhost:3192
```

DXF analysis runs locally.

PDF fallback sends rendered page images to OpenAI vision. Only use PDF fallback with drawings you are allowed to send to OpenAI.

## Recommended Use

- Run the app only on trusted machines.
- Keep the terminal open only while actively using the dashboard.
- Prefer DXF for local analysis.
- Review exported results before production use.
- Do not share private drawings, API keys, or customer details.

## What Not To Upload

Never upload:

```text
.env
*.log
private customer drawings
```

These can contain keys, local error details, or confidential project information.

## Reporting Security Issues

Do not post API keys, private drawings, customer names, or switchboard details in public issues.

Instead, share a minimal description of the problem and remove private details from logs or screenshots.
