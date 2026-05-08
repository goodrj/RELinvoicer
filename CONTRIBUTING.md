# Contributing

Thanks for improving RELinvoicer.

This project tries to stay simple enough for a beginner to understand and useful enough for a real manufacturing workflow.

## Development Setup

```powershell
git clone https://github.com/goodrj/RELinvoicer.git
cd "C:\path\to\RELinvoicer"
npm install
```

## Run Locally

```powershell
cd "C:\path\to\RELinvoicer"
npm start
```

Open:

```text
http://localhost:3192
```

## Code Style

- Keep the app local-first and dependency-light.
- Prefer plain names over clever names.
- Make dashboard text short and clear.
- Prefer DXF geometry as the authority when extraction rules disagree.
- Keep extraction rules conservative and readable.
- Do not commit `.env`, API keys, logs, exported spreadsheets, or sample customer drawings.

## Documentation Style

- Write for a smart beginner.
- Explain what a control does before explaining how it works.
- Use complete PowerShell commands.
- Avoid unexplained acronyms.
- Update `CHANGELOG.md` when behavior changes.
- Update `docs/USER_GUIDE.md` when dashboard controls change.
- Update `docs/DXF_RULES.md` when DXF extraction assumptions change.
- Update `docs/TROUBLESHOOTING.md` when new errors are discovered.

## Validation

Before committing:

```powershell
cd "C:\path\to\RELinvoicer"
npm run check
npm run smoke
```

For extraction changes, test with representative real DXF drawings.

## Pull Request Checklist

- The app starts.
- `npm run check` passes.
- `npm run smoke` passes.
- Docs match the UI.
- DXF extraction changes are tested against representative real drawings.
- Any AI prompt change is tested with at least one real PDF fallback drawing.
- No local data or customer drawings are committed.
- The change is explained in plain language.
