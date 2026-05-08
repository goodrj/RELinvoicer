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

Replace `12345` with the number at the end of the `LISTENING` line.

## Missing API Key

DXF analysis does not need an OpenAI API key.

PDF fallback analysis does need one.

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

## DXF Upload Has Missing Labels

Check:

- Are the label boxes closed `LWPOLYLINE` rectangles?
- Do the rectangle sides match `DIMENSION` values?
- Are the labels rotated?
- Are the labels drawn as separate `LINE` entities?
- Are very small labels dimensioned?

The app is conservative so it does not count title blocks or tables as labels.

## DXF Quantity Looks Wrong

The app reads nearby quantity text such as:

```text
2 OFF
2 OFF EACH
2 ONLY
4 REQUIRED
QTY: 3
QUANTITY: 4 ONLY
```

If the note is far away or written in another format, the app may leave the rectangle as quantity `1`.

## PDF Upload Works But Analyse Fails

Check:

- Is `OPENAI_API_KEY` present in `.env`?
- Is the internet connected?
- Is the PDF very large?
- Did the terminal show an OpenAI or network error?

Run:

```powershell
npm run smoke
```

## PDF Result Is Wrong

Try:

1. Click **Re-analyse** on the page.
2. Read the analysis remarks.
3. Check whether the PDF is scanned or vector-based.
4. Use the DXF version of the drawing if available.

PDF correction works best on CAD-exported PDFs with real vector rectangles.

## Excel Export Does Not Download

Check whether the browser blocked downloads.

Try another browser if needed.

## Clipboard Copy Does Nothing

Some browsers block clipboard access unless the page is focused.

Click inside the app, then click **Copy TSV** again.
