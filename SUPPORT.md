# Support

Use this guide when you need help with RELinvoicer.

## Before Asking For Help

Run:

```powershell
cd "C:\path\to\RELinvoicer"
npm run check
npm run smoke
```

Also check:

- [Quick Start](docs/QUICKSTART.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [FAQ](docs/FAQ.md)

## Helpful Details To Include

When reporting a problem, include:

- What command you ran.
- What you expected to happen.
- What actually happened.
- The dashboard status message.
- Any terminal error text.
- Whether `http://localhost:3192` loaded.
- Whether the file was DXF or PDF.
- Whether the result was missing a size, quantity, or both.

## Useful Commands

Check current Git branch:

```powershell
git branch --show-current
```

Check changed files:

```powershell
git status --short
```

Run validation:

```powershell
npm run check
npm run smoke
```

Start RELinvoicer:

```powershell
npm start
```

Find a busy port:

```powershell
netstat -ano | findstr :3192
```

## Security Reminder

Do not share:

- `.env`
- OpenAI API keys
- private customer drawings
- screenshots showing private switchboard details
