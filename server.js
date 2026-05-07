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

const EXTRACT_PROMPT_BASE = `You are reading an engineering drawing of switchboard labels.

━━━ YOUR GROUND-TRUTH NUMBERS ━━━
A list of every number extracted directly from the PDF text layer is provided below. These are exact — do NOT read numbers from the image pixels. Only use the image to understand the spatial layout (which box each number belongs to, and whether a line is horizontal or vertical).

{TEXT_ITEMS}

━━━ HOW TO USE THESE NUMBERS ━━━
Each number in the list has an (x, y) coordinate (origin = top-left of page, y increases downward).
- Numbers positioned OUTSIDE rectangle borders are dimension annotations
- Numbers positioned INSIDE rectangles are label content — ignore them
- Small standalone numbers like 5, 6, 10 positioned below boxes are engraving text-height specs — ignore them
- Words like "1 OFF", "W-B", "R-W", "BLACK" are finish specs — ignore them

━━━ DIMENSION LINE RULES ━━━
- A horizontal dimension line (left-right) outside a box = WIDTH of that box
- A vertical dimension line (up-down) outside a box = HEIGHT of that box
- ONE dimension line can span multiple adjacent boxes simultaneously (common/shared dimensioning). If a single dimension line covers two or more boxes, ALL of those boxes share that value — even if they have no separate line of their own for that direction.

━━━ TASK ━━━
For every rectangle that has at least one dimension annotation (directly or via a shared line):
  • Width X (mm)  = value of the horizontal dimension covering this box
  • Height Y (mm) = value of the vertical dimension covering this box
  • Qty = how many identical W×H boxes appear on the page

━━━ OUTPUT ━━━
Return ONLY this JSON. No markdown. No explanation.
{"entries":[{"width":<number>,"height":<number>,"qty":<number>}]}

If no annotated boxes: {"entries":[]}`;

function buildPrompt(textItems) {
  // Only pass numeric-looking tokens — strips all label content and noise
  const numbers = (textItems || [])
    .filter(item => /^\d+(\.\d+)?$/.test(item.text))
    .map(item => `  "${item.text}" at (${item.x}, ${item.y})`)
    .join('\n');

  const textBlock = numbers.length > 0
    ? `Numeric text items found in PDF (exact values, with page coordinates):\n${numbers}`
    : 'No text extracted — rely on image only.';

  return EXTRACT_PROMPT_BASE.replace('{TEXT_ITEMS}', textBlock);
}

async function analyzeImage(base64Image, textItems) {
  const prompt = buildPrompt(textItems);

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
        { type: 'text', text: prompt }
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
  const { pageImage, textItems, pageIndex } = req.body;
  if (!pageImage) return res.status(400).json({ error: 'pageImage required' });

  try {
    const [run1, run2] = await Promise.all([
      analyzeImage(pageImage, textItems),
      analyzeImage(pageImage, textItems)
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
