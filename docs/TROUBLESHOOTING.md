# Troubleshooting

## Port Already In Use

Error:

```text
EADDRINUSE: address already in use :::3192
```

Something is already running on port `3192`.

Find it:

```powershell
netstat -ano | findstr :3192
```

Stop it:

```powershell
Stop-Process -Id 12345
```

Replace `12345` with the number shown at the end of the `LISTENING` line.

## Missing API Key

If the app says:

```text
Add OPENAI_API_KEY to .env
```

Create `.env`:

```powershell
copy .env.example .env
notepad .env
```

Then add your real key:

```text
OPENAI_API_KEY=sk-your-real-key
```

Restart the app after editing `.env`.

## Browser Still Shows The Old App

Use a hard refresh:

```text
Ctrl + F5
```

Browsers sometimes keep old JavaScript files in memory.

## PDF Upload Works But Analyse Fails

Check these:

- Is the OpenAI API key correct?
- Is the internet connected?
- Is the PDF very large?
- Did the terminal show an error?

Run this to check the server:

```powershell
npm run smoke
```

## Result Is Wrong

Try:

1. Click `Re-analyse` on the page.
2. Read the analysis remarks.
3. Check if the drawing is scanned or vector-based.
4. Check if the rectangle edges are clean and aligned.

The geometry correction works best on CAD-exported PDFs with real vector rectangles.

## Excel Export Does Not Download

Check if the browser blocked downloads. Try another browser if needed.

## Clipboard Copy Does Nothing

Some browsers block clipboard access unless the page is focused. Click inside the app, then click `Copy TSV` again.
