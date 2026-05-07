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

const EXTRACT_PROMPT = `You are analyzing an engineering drawing of switchboard labels used in electrical switchboard manufacturing.

The page shows rectangular label outlines arranged on the page. Each rectangle is a label to be manufactured.

═══ HOW DIMENSIONS ARE ANNOTATED ═══
Dimension lines in these drawings follow standard engineering drafting convention:
- A dimension line runs PARALLEL to the edge it is measuring, positioned OUTSIDE the box
- It has arrows or tick marks at BOTH ends pointing to the edges being measured
- The measurement number sits in the MIDDLE of that line
- A horizontal dimension line (above or below the box) = WIDTH of that box in mm
- A vertical dimension line (left or right of the box) = HEIGHT of that box in mm
- Two labels that share the same dimension line have the same measurement for that dimension

═══ WHAT TO COMPLETELY IGNORE ═══
These appear on every drawing and must NOT be read as dimensions:
- Text INSIDE the box (label content, warning text, circuit descriptions)
- Small numbers BELOW the box such as "5mm", "6mm", "10mm" — these are the engraving/text height specs
- Words below the box such as "1 OFF", "2 OFF", "W-B", "R-W", "BLACK", "WHITE" — these are finish/quantity specs for the engraver
- Any number that does not have a dimension line with arrows attached to it

═══ HOW TO COUNT ═══
- Each distinct rectangle on the page is one label
- If two or more rectangles have the same Width × Height, count them as one entry with combined quantity
- A shared dimension line means both labels share that measurement

═══ OUTPUT FORMAT ═══
Return ONLY this JSON with no markdown, no explanation, nothing else:
{"entries":[{"width":<number>,"height":<number>,"qty":<number>}]}

If no annotated boxes are found: {"entries":[]}`;

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
