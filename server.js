import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3192);

app.use(express.json({ limit: '35mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// OpenAI is asked to return this exact shape, so the browser can build tables
// without trying to parse a paragraph of AI-written text.
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['pageNumber', 'labels', 'remarks', 'notes', 'confidence'],
  properties: {
    pageNumber: { type: 'integer' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    notes: { type: 'string' },
    remarks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['level', 'message'],
        properties: {
          level: { type: 'string', enum: ['info', 'warning'] },
          message: { type: 'string' }
        }
      }
    },
    labels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quantity', 'widthMm', 'heightMm', 'evidence', 'sharedDimension', 'inferredDimension'],
        properties: {
          quantity: { type: 'integer', minimum: 1 },
          widthMm: { type: 'number', minimum: 1 },
          heightMm: { type: 'number', minimum: 1 },
          sharedDimension: { type: 'boolean' },
          inferredDimension: {
            type: 'string',
            enum: ['none', 'width', 'height', 'both']
          },
          evidence: { type: 'string' }
        }
      }
    }
  }
};

function normaliseLabels(labels) {
  const grouped = new Map();

  for (const item of labels || []) {
    const a = Number(item.widthMm);
    const b = Number(item.heightMm);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    const width = Math.max(a, b);
    const height = Math.min(a, b);
    const key = `${width}x${height}`;
    const prior = grouped.get(key) || {
      quantity: 0,
      widthMm: width,
      heightMm: height,
      evidence: [],
      sharedDimension: false,
      inferredDimension: 'none',
      inferredEvidence: []
    };

    prior.quantity += Math.max(1, Number(item.quantity || 1));
    prior.sharedDimension = prior.sharedDimension || Boolean(item.sharedDimension);
    if (item.inferredDimension && item.inferredDimension !== 'none') {
      prior.inferredDimension = prior.inferredDimension === 'none'
        ? item.inferredDimension
        : 'both';
      prior.inferredEvidence.push(String(item.inferredDimension));
    }
    if (item.evidence) prior.evidence.push(String(item.evidence));
    grouped.set(key, prior);
  }

  return [...grouped.values()]
    .sort((left, right) => right.widthMm - left.widthMm || right.heightMm - left.heightMm)
    .map((item) => ({
      ...item,
      inferredDimension: item.inferredDimension,
      evidence: item.evidence.slice(0, 3).join(' | ')
    }));
}

// CAD-exported PDFs often still contain the original rectangle lines as vector
// paths. Reading those paths lets us check the AI result against the actual box
// shapes instead of trusting nearby annotation text blindly.
async function extractVectorRectangles(pdfDataBase64, pageNumber) {
  if (!pdfDataBase64) return [];

  const bytes = Uint8Array.from(Buffer.from(pdfDataBase64, 'base64'));
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const page = await doc.getPage(Number(pageNumber || 1));
  const opList = await page.getOperatorList();
  const opNames = Object.fromEntries(Object.entries(pdfjs.OPS).map(([key, value]) => [value, key]));
  const rectangles = [];

  for (let index = 0; index < opList.fnArray.length; index += 1) {
    if (opNames[opList.fnArray[index]] !== 'constructPath') continue;

    const pathData = opList.argsArray[index]?.[1];
    if (!pathData) continue;

    const rawValues = Array.isArray(pathData) && typeof pathData[0] === 'object'
      ? pathData[0]
      : pathData;
    const values = Array.from(rawValues);
    const points = [];
    let closed = false;

    for (let cursor = 0; cursor < values.length;) {
      const command = values[cursor];
      if ((command === 0 || command === 1) && cursor + 2 < values.length) {
        points.push({ x: Number(values[cursor + 1]), y: Number(values[cursor + 2]) });
        cursor += 3;
      } else if (command === 4) {
        closed = true;
        cursor += 1;
      } else {
        break;
      }
    }

    if (!closed || points.length !== 4) continue;

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);

    if (shortSide < 150 || longSide < 900) continue;

    rectangles.push({
      x: Math.min(...xs),
      y: Math.min(...ys),
      vectorWidth: width,
      vectorHeight: height,
      ratio: longSide / shortSide
    });
  }

  await doc.destroy();
  return rectangles.sort((left, right) => left.x - right.x || left.y - right.y);
}

function dimensionCandidates(labels) {
  const values = new Set();
  for (const label of labels || []) {
    const width = Number(label.widthMm);
    const height = Number(label.heightMm);
    if (Number.isFinite(width)) values.add(Math.round(width * 100) / 100);
    if (Number.isFinite(height)) values.add(Math.round(height * 100) / 100);
  }

  const dims = [...values].filter((value) => value > 0);
  const pairs = [];
  for (let i = 0; i < dims.length; i += 1) {
    for (let j = 0; j < dims.length; j += 1) {
      if (dims[i] <= dims[j]) continue;
      pairs.push({
        widthMm: dims[i],
        heightMm: dims[j],
        ratio: dims[i] / dims[j]
      });
    }
  }
  return pairs;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function estimatePageScale(candidateMatches) {
  if (!candidateMatches.length) return 0;

  let bestCluster = [];
  for (const match of candidateMatches) {
    const cluster = candidateMatches.filter((candidate) => (
      Math.abs(candidate.scale - match.scale) / match.scale <= 0.08
    ));
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }

  return median(bestCluster.map((match) => match.scale));
}

function snapMillimetres(value) {
  const snapped = Math.round(value / 5) * 5;
  return snapped > 0 ? snapped : Math.round(value);
}

function geometrySizeFromScale(rectangle, pageScale) {
  const longSide = Math.max(rectangle.vectorWidth, rectangle.vectorHeight);
  const shortSide = Math.min(rectangle.vectorWidth, rectangle.vectorHeight);
  const rawWidth = longSide / pageScale;
  const rawHeight = shortSide / pageScale;
  const widthMm = snapMillimetres(rawWidth);
  const heightMm = snapMillimetres(rawHeight);

  const widthError = Math.abs(widthMm - rawWidth) / rawWidth;
  const heightError = Math.abs(heightMm - rawHeight) / rawHeight;
  if (widthError > 0.06 || heightError > 0.06) return null;

  return { widthMm, heightMm };
}

// Geometry correction is deliberately conservative. It uses AI-read dimensions
// to estimate the CAD page scale, then calculates each rectangle size from the
// actual vector box. This lets the app recover sizes the AI missed, such as
// 200 x 120, when the rectangle geometry clearly shows them.
function geometryCorrectPayload(payload, rectangles) {
  if (!rectangles.length || !(payload.labels || []).length) return payload;

  const pairs = dimensionCandidates(payload.labels);
  if (!pairs.length) return payload;

  const candidateMatches = rectangles.flatMap((rectangle) => {
    const longSide = Math.max(rectangle.vectorWidth, rectangle.vectorHeight);
    const shortSide = Math.min(rectangle.vectorWidth, rectangle.vectorHeight);

    return pairs.map((pair) => {
      const ratioError = Math.abs(pair.ratio - rectangle.ratio) / rectangle.ratio;
      const longScale = longSide / pair.widthMm;
      const shortScale = shortSide / pair.heightMm;
      const scale = (longScale + shortScale) / 2;
      const scaleError = Math.abs(longScale - shortScale) / scale;
      return { rectangle, pair, ratioError, scaleError, scale };
    }).filter((match) => match.ratioError <= 0.07 && match.scaleError <= 0.08);
  });

  if (!candidateMatches.length) return payload;

  const globalScale = estimatePageScale(candidateMatches);
  if (!globalScale) return payload;

  const matched = [];

  for (const rectangle of rectangles) {
    let best = null;
    for (const match of candidateMatches.filter((candidate) => candidate.rectangle === rectangle)) {
      const pageScaleError = Math.abs(match.scale - globalScale) / globalScale;
      const score = match.ratioError + match.scaleError + pageScaleError;
      if (!best || score < best.score) best = { ...match.pair, score, scale: match.scale };
    }

    const geometrySize = geometrySizeFromScale(rectangle, globalScale);
    if (geometrySize) {
      matched.push({
        quantity: 1,
        widthMm: geometrySize.widthMm,
        heightMm: geometrySize.heightMm,
        sharedDimension: false,
        inferredDimension: 'none',
        evidence: `Calculated from CAD rectangle using page scale ${globalScale.toFixed(2)}.`
      });
    } else if (best) {
      matched.push({
        quantity: 1,
        widthMm: best.widthMm,
        heightMm: best.heightMm,
        sharedDimension: false,
        inferredDimension: 'none',
        evidence: `Matched CAD rectangle proportion ${rectangle.ratio.toFixed(2)} and page scale ${best.scale.toFixed(2)} to ${best.widthMm} x ${best.heightMm}.`
      });
    }
  }

  if (!matched.length) return payload;

  const originalSignature = normaliseLabels(payload.labels)
    .map((label) => `${label.quantity}:${label.widthMm}x${label.heightMm}`)
    .sort()
    .join('|');
  const corrected = normaliseLabels(matched);
  const correctedSignature = corrected
    .map((label) => `${label.quantity}:${label.widthMm}x${label.heightMm}`)
    .sort()
    .join('|');

  if (corrected.length === rectangles.length && correctedSignature !== originalSignature) {
    payload.labels = corrected;
    payload.remarks = payload.remarks || [];
    payload.remarks.unshift({
      level: 'info',
      message: 'Geometry correction used CAD rectangle proportions as the authority for shared/common dimensions.'
    });
  }

  return payload;
}

function shouldAudit(payload) {
  const labels = payload.labels || [];
  if (labels.length < 2) return false;

  return labels.some((item) => {
    const width = Math.max(Number(item.widthMm), Number(item.heightMm));
    const height = Math.min(Number(item.widthMm), Number(item.heightMm));
    return Number.isFinite(width) && Number.isFinite(height) && height <= 20 && width >= 120;
  });
}

// First pass: ask vision to read dimensions from the rendered page image.
async function extractPage(client, model, pageNumber, imageDataUrl) {
  return client.responses.create({
    model,
    reasoning: { effort: 'medium' },
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              'You extract switchboard label dimensions from CAD drawing page images.',
              'Read dimension numbers drawn outside rectangular label borders only.',
              'Ignore all text inside label rectangles.',
              'Ignore small engraving/spec numbers below boxes such as 5 or 10 unless they are clearly attached to a dimension line.',
              'Ignore finish/spec words such as 1 OFF, W-B, BLACK, WHITE, TRAFFOLYTE, and material notes.',
              'Associate each dimension number with the dimension line and extension ticks physically attached to its label box or aligned label group.',
              'Do not borrow a dimension from a nearby unrelated larger label just because it is close.',
              'One external dimension line may span two or more adjacent label boxes; apply that value to every covered box.',
              'Also handle common CAD dimensioning by alignment: if a label box has only one clear dimension, infer the missing dimension from a neighbouring label only when their relevant edges are perfectly aligned or visibly collinear.',
              'For vertically stacked labels with perfectly aligned left and right edges, a width dimension shown for one label can apply to the aligned neighbouring labels.',
              'For side-by-side labels with perfectly aligned top and bottom edges, a long dimension shown beside the group can apply to each aligned label in that group.',
              'A pair of narrow/tall labels marked 15 and 30 side by side can both share the same long outside dimension, such as 250. In that case return 250 x 15 and 250 x 30.',
              'Do not infer shared size from boxes that are merely nearby, roughly aligned, offset, staggered, or crowded with ambiguous dimension lines.',
              'If you infer a width or height from an aligned neighbour, set inferredDimension and add a remark explaining which dimension was inherited and why.',
              'Return one item per detected label size on the page. Combine identical sizes.',
              'Always store the larger dimension as widthMm and the smaller as heightMm.',
              'If a value is uncertain, include the uncertainty in evidence and lower confidence.'
            ].join(' ')
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              `Analyse page ${pageNumber}. Return only dimensions for label rectangles, in millimetres.`,
              'Be especially careful with thin labels that show only a small dimension such as 15 mm while sharing the same long dimension as a perfectly aligned neighbouring label.',
              'If a 250 x 30 label and a 15 mm label are perfectly aligned in the same side-by-side or stacked CAD group, report the second label as 250 x 15 and add a remark that the 250 was shared or inferred from common CAD dimensioning.',
              'If a nearby 200 dimension belongs to a separate large rectangle, do not apply that 200 to the 15 mm label.'
            ].join(' ')
          },
          {
            type: 'input_image',
            image_url: imageDataUrl,
            detail: 'high'
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'label_dimension_page',
        strict: true,
        schema
      }
    }
  });
}

// Second pass: ask vision to re-check cases that are historically easy to get
// wrong, especially very thin labels that borrow a long shared dimension.
async function auditPage(client, model, pageNumber, imageDataUrl, initialPayload) {
  return client.responses.create({
    model,
    reasoning: { effort: 'medium' },
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              'You are auditing extracted switchboard label dimensions against the drawing image.',
              'Correct only dimension association mistakes. Keep correct rows unchanged.',
              'The most important error to catch is a thin label such as 15 mm being paired with the wrong long dimension from a nearby unrelated box.',
              'If a 15 mm and 30 mm narrow label are side by side or stacked and share the same long dimension line, both must use that long dimension.',
              'For example, if the drawing shows adjacent labels dimensioned 15 and 30 with a shared 250 long dimension, the correct sizes are 250 x 15 and 250 x 30, not 200 x 15.',
              'Only use shared/common dimensioning when the label boxes are perfectly aligned by their relevant edges. Add remarks for every correction or inferred/shared dimension.',
              'Return the complete corrected page result using the schema.'
            ].join(' ')
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Audit page ${pageNumber}. Initial extraction JSON: ${JSON.stringify(initialPayload)}`
          },
          {
            type: 'input_image',
            image_url: imageDataUrl,
            detail: 'high'
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'label_dimension_page',
        strict: true,
        schema
      }
    }
  });
}

app.post('/api/analyse-page', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'OPENAI_API_KEY is missing. Create a .env file first.' });
    }

    const { pageNumber, imageDataUrl, pdfDataBase64 } = req.body || {};
    if (!imageDataUrl || !String(imageDataUrl).startsWith('data:image/')) {
      return res.status(400).json({ error: 'A rendered page image is required.' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-5.4';

    const response = await extractPage(client, model, pageNumber, imageDataUrl);
    const rectangles = await extractVectorRectangles(pdfDataBase64, pageNumber).catch(() => []);
    let payload = JSON.parse(response.output_text);
    payload.labels = normaliseLabels(payload.labels);
    payload.pageNumber = Number(pageNumber || payload.pageNumber || 1);
    payload.remarks = payload.remarks || [];

    if (shouldAudit(payload)) {
      const auditResponse = await auditPage(client, model, pageNumber, imageDataUrl, payload);
      const audited = JSON.parse(auditResponse.output_text);
      audited.labels = normaliseLabels(audited.labels);
      audited.pageNumber = Number(pageNumber || audited.pageNumber || 1);
      audited.remarks = audited.remarks || [];
      audited.remarks.unshift({
        level: 'info',
        message: 'Automatic audit pass checked thin-label/common-dimension association.'
      });
      payload = audited;
    }

    payload = geometryCorrectPayload(payload, rectangles);
    res.json(payload);
  } catch (error) {
    const message = error?.response?.data?.error?.message || error?.message || 'Analysis failed.';
    res.status(500).json({ error: message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: process.env.OPENAI_MODEL || 'gpt-5.4',
    hasKey: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.listen(port, () => {
  console.log(`Label dimension extractor running at http://localhost:${port}`);
});
