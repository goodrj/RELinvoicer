# Quick Start

This guide is for someone who just wants to run RELinvoicer.

## Step 1: Install The App

Open PowerShell and run:

```powershell
cd "C:\path\to\where\you\want\the\app"
git clone https://github.com/goodrj/RELinvoicer.git
cd ".\RELinvoicer"
npm install
```

Replace `C:\path\to\where\you\want\the\app` with the folder where you want to download RELinvoicer. If your terminal is already inside the `RELinvoicer` folder, skip the `cd ".\RELinvoicer"` line.

## Step 2: Start RELinvoicer

Run:

```powershell
cd "C:\path\to\RELinvoicer"
npm start
```

Do not close this terminal while using RELinvoicer.

## Step 3: Open The Dashboard

Open Chrome, Edge, or another browser and go to:

```text
http://localhost:3192
```

## Step 4: Analyse A DXF

1. Drop a DXF file onto the upload box.
2. Click **Analyse**.
3. Wait for the status to finish.
4. Review the table.
5. Click **Copy TSV** or **Export Excel**.

DXF analysis does not need an OpenAI API key.

## Step 5: Optional PDF Setup

PDF fallback analysis needs an OpenAI API key.

Create `.env`:

```powershell
copy .env.example .env
notepad .env
```

Add:

```text
OPENAI_API_KEY=sk-your-real-key
```

Save the file, close Notepad, and restart RELinvoicer.

## Step 6: Stop When Finished

Close the browser tab.

Then press `Ctrl + C` in the terminal.
