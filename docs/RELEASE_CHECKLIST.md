# Release Checklist

Use this before merging or publishing important changes.

## Code Checks

Run:

```powershell
cd "C:\path\to\RELinvoicer"
npm run check
npm run smoke
```

Expected result:

```text
No syntax errors, and smoke test passed
```

## Manual Smoke Test

1. Start RELinvoicer:

```powershell
cd "C:\path\to\RELinvoicer"
npm start
```

2. Open:

```text
http://localhost:3192
```

3. Confirm the dashboard loads.
4. Upload a known-good DXF.
5. Click **Analyse**.
6. Confirm the result table matches the drawing.
7. Click **Copy TSV**.
8. Confirm only numeric rows are copied.
9. Click **Export Excel**.

## Documentation Check

Confirm these docs still match the app:

- `README.md`
- `docs/QUICKSTART.md`
- `docs/USER_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/DXF_RULES.md`
- `docs/OPERATIONS.md`
- `CHANGELOG.md`

## Local Data Check

Confirm none of these are staged:

```text
.env
*.log
node_modules/
```

Run:

```powershell
git status --short
```

## GitHub Push

Commit:

```powershell
git add .
git commit -m "Describe the change"
```

Push:

```powershell
git push
```
