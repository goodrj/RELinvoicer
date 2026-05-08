# RELinvoicer

RELinvoicer is a local switchboard label extractor with a simple browser dashboard. It reads CAD label drawings, finds the label rectangles, and turns them into a spreadsheet-ready quantity and size list.

It runs on your own computer. DXF analysis is local. PDF fallback uses your own OpenAI API key only when you choose to analyse a PDF.

> Use RELinvoicer as a production helper, not as a replacement for final label checking.

## At A Glance

| Item | Details |
| --- | --- |
| Runs on | Windows with PowerShell |
| Dashboard | `http://localhost:3192` |
| Best input | DXF |
| Fallback input | CAD-exported PDF |
| DXF analysis | Local CAD geometry |
| PDF analysis | OpenAI vision plus geometry checks |
| Main command | `npm start` |

## Documentation Map

| I want to... | Read this |
| --- | --- |
| Run RELinvoicer for the first time | [Quick Start](docs/QUICKSTART.md) |
| Understand every screen and button | [User Guide](docs/USER_GUIDE.md) |
| Fix a problem | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| Learn unfamiliar terms | [Glossary](docs/GLOSSARY.md) |
| See common questions | [FAQ](docs/FAQ.md) |
| Understand the code | [Architecture](docs/ARCHITECTURE.md) |
| Understand DXF extraction rules | [DXF Rules](docs/DXF_RULES.md) |
| Operate and update the app | [Operations](docs/OPERATIONS.md) |
| Check expected sample behavior | [Validation Notes](docs/VALIDATION.md) |
| Report a bug or ask for help | [Support](SUPPORT.md) |
| Contribute changes | [Contributing](CONTRIBUTING.md) |

## What RELinvoicer Does

- Accepts DXF and PDF label drawings.
- Shows a preview after upload.
- Finds label rectangles and dimensions.
- Reads nearby quantity notes such as `2 OFF` and `QUANTITY: 4 ONLY`.
- Groups matching sizes into one table.
- Shows a live analysis status and elapsed timer.
- Shows remarks when the app used extra judgement.
- Copies TSV rows for spreadsheet paste.
- Exports an Excel file with a totals row.

Example output:

```text
Quantity    Width X (mm)    Height Y (mm)
1           250             30
1           250             15
1           200             120
1           160             90
2           80              20
```

## Why This Repo Exists

This repo is meant to be understandable by a beginner and maintainable by a developer.

If you are new:

- Start with [Quick Start](docs/QUICKSTART.md).
- Read [Glossary](docs/GLOSSARY.md) if a word feels unfamiliar.
- Use [Troubleshooting](docs/TROUBLESHOOTING.md) when something breaks.

If you are improving the app:

- Read [Architecture](docs/ARCHITECTURE.md).
- Read [Design Decisions](docs/DESIGN_DECISIONS.md).
- Read [Operations](docs/OPERATIONS.md).
- Read [Contributing](CONTRIBUTING.md).

## Why DXF Is Best

DXF contains real CAD geometry. RELinvoicer can inspect the label rectangles directly instead of guessing from an image.

PDF is harder. Many CAD PDFs draw text as vector outlines, so there is no selectable text layer. PDF fallback uses OpenAI vision to read the page image, then checks vector rectangle geometry when possible.

In short:

- Use DXF when you have it.
- Use PDF only when DXF is not available.

## Quick Start

Install:

```powershell
cd "C:\path\to\where\you\want\the\app"
git clone https://github.com/goodrj/RELinvoicer.git
cd ".\RELinvoicer"
npm install
```

Replace `C:\path\to\where\you\want\the\app` with the folder where you want to download RELinvoicer. If your terminal is already inside the `RELinvoicer` folder, skip the `cd ".\RELinvoicer"` line.

Run:

```powershell
cd "C:\path\to\RELinvoicer"
npm start
```

Keep that terminal open, then open:

```text
http://localhost:3192
```

For DXF files, that is all you need.

For PDF files, create `.env` and add your OpenAI API key:

```powershell
copy .env.example .env
notepad .env
```

Then restart the app.

## Dashboard Workflow

1. Drop a DXF or PDF onto the upload area.
2. Click **Analyse**.
3. Wait while the status says analysis is ongoing.
4. Review the results table.
5. Read the remarks if they appear.
6. Click **Copy TSV** or **Export Excel**.

## Commands

From the project folder:

```powershell
npm start
```

Starts the local dashboard.

```powershell
npm run check
```

Runs JavaScript syntax checks.

```powershell
npm run smoke
```

Starts a temporary test server and confirms the health endpoint responds.

```powershell
.\start.ps1
```

Starts the app through the Windows helper script.

## Local Data

RELinvoicer does not keep a project database.

Important local files:

- `.env`: your OpenAI API key for PDF fallback.
- exported Excel files: created by your browser when you click **Export Excel**.

Do not upload `.env`.

## Project Map

```text
RELinvoicer/
  public/                 Dashboard files
  scripts/                Smoke-test helper
  docs/                   Beginner and developer docs
  server.js               API server, DXF parser, PDF fallback
  start.ps1               Windows start helper
```

## More Docs

- [Docs Index](docs/README.md)
- [Quick Start](docs/QUICKSTART.md)
- [User Guide](docs/USER_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Glossary](docs/GLOSSARY.md)
- [FAQ](docs/FAQ.md)
- [Architecture](docs/ARCHITECTURE.md)
- [DXF Rules](docs/DXF_RULES.md)
- [Operations](docs/OPERATIONS.md)
- [Design Decisions](docs/DESIGN_DECISIONS.md)
- [Validation Notes](docs/VALIDATION.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Security Notes](SECURITY.md)
- [Support](SUPPORT.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
