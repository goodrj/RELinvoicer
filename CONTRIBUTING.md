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

3. Test with a real DXF drawing.
4. If you changed PDF fallback behavior, also test with a real CAD-exported PDF.

## Code Style

- Keep functions small enough to explain.
- Prefer clear names over clever names.
- Add comments only around non-obvious logic.
- Do not commit `.env`, API keys, logs, exported spreadsheets, or sample customer drawings.
- Keep documentation plain enough for a new apprentice to understand.
- Prefer DXF geometry as the authority when extraction rules disagree.

## Pull Request Checklist

- The app starts.
- `npm run check` passes.
- `npm run smoke` passes.
- The README or docs are updated if behavior changes.
- DXF extraction changes are tested against representative real drawings.
- Any AI prompt change is tested with at least one real PDF fallback drawing.
- New assumptions are documented in `docs/DXF_RULES.md` or `docs/HOW_IT_WORKS.md`.
