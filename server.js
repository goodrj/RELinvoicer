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

const EXTRACT_PROMPT = `You are reading an engineering drawing of switchboard labels. Extract every label's dimensions by following these four steps in order.

━━━ STEP 1 — LIST EVERY DIMENSION LINE ━━━
Scan the whole page and find every dimension annotation. A dimension annotation is a line with arrows or tick marks at both ends, with a number in the middle. For each one you find, note:
  • The number value
  • Direction: horizontal arrow (↔) = this is a WIDTH measurement, vertical arrow (↕) = this is a HEIGHT measurement
  • Which rectangle(s) the arrows point to at both ends

━━━ STEP 2 — HANDLE SHARED DIMENSION LINES ━━━
This is critical: a single dimension line can span across two or more adjacent boxes simultaneously. This is called common dimensioning and is standard CAD practice. When one dimension line's arrows span the edges of multiple boxes, EVERY one of those boxes shares that measurement — even if those individual boxes have no separate dimension line of their own for that direction. Do not skip a box just because it lacks its own dedicated dimension line.

━━━ STEP 3 — ASSIGN DIMENSIONS TO EACH BOX ━━━
For every rectangle that has at least one dimension annotation (directly or via a shared line):
  • Width X (mm)  = the horizontal dimension line that covers this box
  • Height Y (mm) = the vertical dimension line that covers this box
  • Count how many identical W×H boxes appear on the page

━━━ WHAT TO IGNORE ━━━
  • All text inside boxes (warning messages, circuit labels, manufacturer data)
  • Small numbers below boxes like "5mm", "6mm", "10mm" — these are engraving text-height specs, NOT label dimensions
  • Words below boxes like "1 OFF", "2 OFF", "W-B", "R-W", "BLACK" — these are finish/quantity specs for the engraver, NOT dimensions
  • Any number without a dimension line and arrows attached

━━━ STEP 4 — OUTPUT ━━━
Return ONLY this JSON. No markdown fences. No explanation. Nothing else.
{"entries":[{"width":<number>,"height":<number>,"qty":<number>}]}

If no annotated boxes exist: {"entries":[]}`;

async function analyzeImage(base64Image) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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
