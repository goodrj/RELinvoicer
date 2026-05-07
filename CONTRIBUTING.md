# Contributing

Thanks for improving RELinvoicer.

This project is intentionally small and practical. A good change should make the app easier to trust, easier to run, or easier to understand.

## Before You Change Code

Run:

```powershell
npm install
npm run check
npm run smoke
```

## Development Loop

1. Start the app:

```powershell
npm start
```

2. Open:

```text
http://localhost:3192
```

3. Test with a real CAD-exported PDF.

## Code Style

- Keep functions small enough to explain.
- Prefer clear names over clever names.
- Add comments only around non-obvious logic.
- Do not commit `.env`, API keys, logs, exported spreadsheets, or sample customer drawings.

## Pull Request Checklist

- The app starts.
- `npm run check` passes.
- `npm run smoke` passes.
- The README or docs are updated if behavior changes.
- Any AI prompt change is tested with at least one real drawing.
