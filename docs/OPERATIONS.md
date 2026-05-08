# Operations

## First-Time Setup

```powershell
cd "C:\path\to\RELinvoicer"
npm install
```

Start the dashboard:

```powershell
cd "C:\path\to\RELinvoicer"
npm start
```

Open:

```text
http://localhost:3192
```

## PDF API Key Setup

DXF analysis does not need an OpenAI API key.

PDF fallback analysis does.

Create `.env`:

```powershell
copy .env.example .env
notepad .env
```

Add:

```text
OPENAI_API_KEY=sk-your-real-key
```

Restart the app after changing `.env`.

## Daily Workflow

1. Start the app with `npm start`.
2. Open `http://localhost:3192`.
3. Upload a DXF whenever possible.
4. Click **Analyse**.
5. Review results and remarks.
6. Export Excel or copy TSV.
7. Stop the terminal with `Ctrl + C` when finished.

## Updating From GitHub

```powershell
cd "C:\path\to\RELinvoicer"
git pull
npm install
```

Then run:

```powershell
npm start
```

## Checking The App

Run:

```powershell
npm run check
npm run smoke
```

`npm run check` checks JavaScript syntax.

`npm run smoke` starts a temporary test server and confirms `/api/health` responds.

## Local Files

Do not upload:

```text
.env
*.log
node_modules/
```

Exported Excel files are created by your browser. Keep or delete them like normal downloaded files.
