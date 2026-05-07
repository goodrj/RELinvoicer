const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set.');
  process.exit(1);
}

const openai = new OpenAI();

const EXTRACT_PROMPT = `You are analyzing a page from an engineering drawing of switchboard label layouts.

The page contains rectangular boxes arranged in a grid or scattered layout. Each box represents a physical label to be manufactured.

YOUR TASK: Find every rectangular box that has dimension annotations showing its width and/or height in millimetres.

HOW TO IDENTIFY DIMENSIONS:
- Dimension annotations appear as lines or arrows along the OUTSIDE edges of boxes
- A number beside a horizontal arrow (top or bottom of box) = Width X in mm
- A number beside a vertical arrow (left or right side of box) = Height Y in mm
- The numbers are the ONLY thing you should read — ignore all other text

WHAT TO IGNORE:
- Any text INSIDE boxes (part numbers, material codes, circuit labels, wiring descriptions)
- Labels appearing BELOW boxes (e.g. "W-B", "5mm", "1 OFF", "BLACK", colour specs, material codes)
- Only read the dimension arrows/numbers on the outside edges of boxes

FOR EACH UNIQUE W×H COMBINATION:
- Count exactly how many boxes of that size appear on this page
- If the same W×H appears multiple times, sum all into one entry with total quantity

RETURN ONLY this JSON — no markdown fences, no explanation, nothing else:
{"entries":[{"width":<number>,"height":<number>,"qty":<number>}]}

If no dimension annotations are found anywhere on the page, return:
{"entries":[]}`;

async function analyzeImage(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${base64Image}`, detail: 'high' }
        },
        { type: 'text', text: EXTRACT_PROMPT }
      ]
    }]
  });

  const raw = response.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.entries)) throw new Error('Unexpected response shape');
  return parsed.entries;
}

function normaliseEntries(entries) {
  return [...entries]
    .sort((a, b) => a.width !== b.width ? a.width - b.width : a.height - b.height)
    .map(({ width, height, qty }) => ({ width: Number(width), height: Number(height), qty: Number(qty) }));
}

function entriesEqual(a, b) {
  const na = normaliseEntries(a);
  const nb = normaliseEntries(b);
  if (na.length !== nb.length) return false;
  return na.every((e, i) => e.width === nb[i].width && e.height === nb[i].height && e.qty === nb[i].qty);
}

function sortByQtyThenArea(entries) {
  return [...entries].sort((a, b) =>
    b.qty !== a.qty ? b.qty - a.qty : (b.width * b.height) - (a.width * a.height)
  );
}

app.post('/api/analyze', async (req, res) => {
  const { pageImage, pageIndex } = req.body;
  if (!pageImage) return res.status(400).json({ error: 'pageImage required' });

  try {
    const [run1, run2] = await Promise.all([
      analyzeImage(pageImage),
      analyzeImage(pageImage)
    ]);

    const match = entriesEqual(run1, run2);

    res.json({
      pageIndex,
      status: match ? 'confirmed' : 'mismatch',
      entries: match ? sortByQtyThenArea(run1) : null,
      run1: sortByQtyThenArea(run1),
      run2: sortByQtyThenArea(run2)
    });
  } catch (err) {
    console.error(`Page ${pageIndex} error:`, err.message);
    res.json({
      pageIndex,
      status: 'error',
      error: err.message || 'Analysis failed'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Relec Invoicer running at http://localhost:${PORT}`));
