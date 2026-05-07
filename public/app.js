'use strict';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  pages: [],
  analysing: false,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const uploadZone      = document.getElementById('uploadZone');
const fileInput       = document.getElementById('fileInput');
const fileBar         = document.getElementById('fileBar');
const fileName        = document.getElementById('fileName');
const fileMeta        = document.getElementById('fileMeta');
const clearBtn        = document.getElementById('clearBtn');
const thumbnailsSect  = document.getElementById('thumbnailsSection');
const thumbnailsGrid  = document.getElementById('thumbnailsGrid');
const pageCount       = document.getElementById('pageCount');
const controlsEl      = document.getElementById('controls');
const analyzeBtn      = document.getElementById('analyzeBtn');
const analyzeBtnIcon  = document.getElementById('analyzeBtnIcon');
const analyzeBtnText  = document.getElementById('analyzeBtnText');
const progressText    = document.getElementById('progressText');
const resultsSect     = document.getElementById('resultsSection');
const resultsBody     = document.getElementById('resultsBody');
const totalValue      = document.getElementById('totalValue');
const copyBtn         = document.getElementById('copyBtn');
const exportBtn       = document.getElementById('exportBtn');

// ─── Upload handling ──────────────────────────────────────────────────────────

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file?.type === 'application/pdf') loadPDF(file);
  else showToast('Please drop a PDF file');
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadPDF(fileInput.files[0]);
});
clearBtn.addEventListener('click', resetAll);

// ─── Load PDF ─────────────────────────────────────────────────────────────────

async function loadPDF(file) {
  resetAll();
  fileName.textContent = file.name;
  fileMeta.textContent = formatBytes(file.size);
  fileBar.style.display = 'flex';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  pageCount.textContent = `${numPages} page${numPages !== 1 ? 's' : ''}`;
  thumbnailsSect.style.display = 'block';
  controlsEl.style.display = 'flex';

  const renderPromises = [];
  for (let i = 1; i <= numPages; i++) {
    const idx = i - 1;
    state.pages[idx] = { index: idx, status: 'pending', entries: null, run1: null, run2: null, error: null };
    renderPromises.push(renderPage(pdf, i, idx));
  }

  await Promise.all(renderPromises);
  analyzeBtn.disabled = false;
}

async function renderPage(pdf, pageNum, idx) {
  const page = await pdf.getPage(pageNum);

  // Hi-res canvas for AI fallback
  const hiViewport = page.getViewport({ scale: 3.0 });
  const hiCanvas = document.createElement('canvas');
  hiCanvas.width  = hiViewport.width;
  hiCanvas.height = hiViewport.height;
  await page.render({ canvasContext: hiCanvas.getContext('2d'), viewport: hiViewport }).promise;
  state.pages[idx].base64 = hiCanvas.toDataURL('image/png').split(',')[1];

  // Thumbnail
  const thumbVP = page.getViewport({ scale: 0.4 });
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width  = thumbVP.width;
  thumbCanvas.height = thumbVP.height;
  thumbCanvas.className = 'thumb-canvas';
  await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbVP }).promise;

  // Extract full geometry for algorithmic extraction
  state.pages[idx].geometry = await extractPageGeometry(page);

  // Build thumb card
  const card = document.createElement('div');
  card.className = 'thumb-card';
  card.id = `thumb-${idx}`;
  const lbl = document.createElement('div');
  lbl.className = 'thumb-label';
  lbl.innerHTML = `<span>p.${idx + 1}</span><span class="thumb-badge pending" id="badge-${idx}"></span>`;
  card.appendChild(thumbCanvas);
  card.appendChild(lbl);
  thumbnailsGrid.appendChild(card);
}

// ─── PDF Geometry Extraction ──────────────────────────────────────────────────

async function extractPageGeometry(page) {
  const vp  = page.getViewport({ scale: 1.0 });
  const H   = vp.height;
  const flipY = y => H - y;   // PDF origin is bottom-left; flip to top-left

  // ── Rectangles from operator list ──────────────────────────────────────────
  const ops  = await page.getOperatorList();
  const OPS  = pdfjsLib.OPS;
  const rects = [];

  let pathPts  = [];   // accumulated points of current open path
  let curX = 0, curY = 0;

  const tryAddPathRect = () => {
    // A rectangle drawn as 4 lineto segments (moveto + 3 or 4 lineto)
    const pts = pathPts.slice(0, 4);
    if (pts.length < 3) return;
    const isAxisAligned = pts.every((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.abs(p.x - q.x) < 1 || Math.abs(p.y - q.y) < 1;
    });
    if (!isAxisAligned) return;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w  = x1 - x0, h = y1 - y0;
    if (w > 5 && h > 5) rects.push({ x: x0, y: y0, w, h }); // already in screen coords
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn   = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === OPS.rectangle) {
      // `re` operator: args = [x, y, w, h] in PDF coords (y = bottom edge)
      let [x, y, w, h] = args;
      if (w < 0) { x += w; w = -w; }
      if (h < 0) { y += h; h = -h; }
      if (w > 5 && h > 5) {
        rects.push({ x, y: flipY(y + h), w, h });
      }
    } else if (fn === OPS.moveTo) {
      pathPts = [{ x: args[0], y: flipY(args[1]) }];
      curX = args[0]; curY = args[1];
    } else if (fn === OPS.lineTo) {
      pathPts.push({ x: args[0], y: flipY(args[1]) });
      curX = args[0]; curY = args[1];
    } else if (
      fn === OPS.stroke      || fn === OPS.fill         ||
      fn === OPS.fillStroke  || fn === OPS.eoFill       ||
      fn === OPS.eoFillStroke || fn === OPS.closePath
    ) {
      tryAddPathRect();
      pathPts = [];
    }
  }

  // De-duplicate rectangles (same coords within 2pt tolerance)
  const uniqueRects = [];
  for (const r of rects) {
    const dup = uniqueRects.some(u =>
      Math.abs(u.x - r.x) < 2 && Math.abs(u.y - r.y) < 2 &&
      Math.abs(u.w - r.w) < 2 && Math.abs(u.h - r.h) < 2
    );
    if (!dup) uniqueRects.push(r);
  }

  // ── Text items ─────────────────────────────────────────────────────────────
  const tc = await page.getTextContent();
  const textItems = tc.items
    .filter(item => item.str.trim().length > 0)
    .map(item => ({
      text: item.str.trim(),
      x:    item.transform[4],
      y:    flipY(item.transform[5]),
    }));

  return { rects: uniqueRects, textItems, pageW: vp.width, pageH: H };
}

// ─── Algorithmic dimension matching ──────────────────────────────────────────

function matchDimensions(geometry) {
  if (!geometry) return [];
  const { rects, textItems, pageW, pageH } = geometry;

  // Only pure integers in a sensible label-dimension range (10–2000 mm)
  const nums = textItems
    .filter(t => /^\d+$/.test(t.text))
    .map(t => ({ v: parseInt(t.text, 10), x: t.x, y: t.y }))
    .filter(n => n.v >= 10 && n.v <= 2000);

  // Keep rectangles of plausible label size; reject page borders and hairlines
  const MIN_DIM = 15;   // PDF points (~5 mm)
  const labelRects = rects.filter(r =>
    r.w >= MIN_DIM && r.h >= MIN_DIM &&
    r.w < pageW * 0.97 && r.h < pageH * 0.97
  );

  // How far (in PDF points) outside a rect edge a dimension number may sit.
  // 72 pt = 1 inch ≈ 25.4 mm  →  50 pt ≈ 17.6 mm — generous enough for most CAD drawings.
  const PROX = 50;

  const entries = [];

  for (const rect of labelRects) {
    const { x: rx, y: ry, w: rw, h: rh } = rect;

    // A number is a candidate for a given edge if:
    //   • its coordinate perpendicular to that edge is OUTSIDE the rect (but within PROX)
    //   • its coordinate parallel to that edge overlaps with the rect (± PROX)
    const isInsideRect = n =>
      n.x > rx && n.x < rx + rw && n.y > ry && n.y < ry + rh;

    // Width candidates: numbers above or below (y outside), x overlaps rect
    const wCands = nums.filter(n => {
      if (isInsideRect(n)) return false;
      const xOk  = n.x > rx - PROX    && n.x < rx + rw + PROX;
      const above = n.y >= ry - PROX   && n.y < ry;
      const below = n.y > ry + rh      && n.y <= ry + rh + PROX;
      return xOk && (above || below);
    });

    // Height candidates: numbers left or right (x outside), y overlaps rect
    const hCands = nums.filter(n => {
      if (isInsideRect(n)) return false;
      const yOk  = n.y > ry - PROX    && n.y < ry + rh + PROX;
      const left  = n.x >= rx - PROX  && n.x < rx;
      const right = n.x > rx + rw     && n.x <= rx + rw + PROX;
      return yOk && (left || right);
    });

    if (wCands.length === 0 && hCands.length === 0) continue;

    // Pick the number closest to the rect edge for each direction
    const closest = (cands, distFn) =>
      cands.slice().sort((a, b) => distFn(a) - distFn(b))[0];

    const wNum = closest(wCands, n =>
      Math.min(Math.abs(n.y - ry), Math.abs(n.y - ry - rh)));
    const hNum = closest(hCands, n =>
      Math.min(Math.abs(n.x - rx), Math.abs(n.x - rx - rw)));

    // Need both dimensions to produce an entry
    if (!wNum || !hNum) continue;

    // Convention: Width X = larger dimension, Height Y = smaller
    const bigger  = Math.max(wNum.v, hNum.v);
    const smaller = Math.min(wNum.v, hNum.v);
    entries.push({ width: bigger, height: smaller, qty: 1 });
  }

  // Merge identical W×H pairs and sum quantities
  const merged = new Map();
  for (const e of entries) {
    const key = `${e.width}x${e.height}`;
    if (merged.has(key)) merged.get(key).qty++;
    else merged.set(key, { ...e });
  }

  return [...merged.values()].sort(
    (a, b) => b.qty - a.qty || (b.width * b.height) - (a.width * a.height)
  );
}

// ─── Analyse ──────────────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', analyzeAll);

async function analyzeAll() {
  if (state.analysing) return;
  state.analysing = true;
  analyzeBtn.disabled = true;
  analyzeBtnIcon.innerHTML = '<span class="spinner"></span>';
  analyzeBtnText.textContent = 'Analysing…';
  resultsSect.style.display = 'block';

  const toAnalyse = state.pages.filter(p => p.status === 'pending' || p.status === 'error');
  let done = 0;
  const tick = () => { done++; progressText.textContent = `${done} / ${toAnalyse.length} pages`; };

  await Promise.all(toAnalyse.map(async page => {
    setPageStatus(page.index, 'analyzing');

    const geoEntries = matchDimensions(page.geometry);

    if (geoEntries.length > 0) {
      // Geometry extraction succeeded — mark confirmed immediately, no API call
      applyPageResult({
        pageIndex: page.index,
        status: 'confirmed',
        entries: geoEntries,
        run1: geoEntries,
        run2: geoEntries,
      });
    } else {
      // Fallback: send to AI (for scanned PDFs or unusual drawings)
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageImage:  page.base64,
            textItems:  page.geometry?.textItems,
            pageIndex:  page.index,
          }),
        });
        applyPageResult(await res.json());
      } catch (err) {
        applyPageResult({ pageIndex: page.index, status: 'error', error: err.message });
      }
    }

    tick();
    renderTable();
  }));

  state.analysing = false;
  analyzeBtn.disabled = false;
  analyzeBtnIcon.textContent = '▶';
  analyzeBtnText.textContent = 'Re-analyse Pending';
  progressText.textContent = '';
  renderTable();
}

async function analyseOnePage(idx) {
  const page = state.pages[idx];
  if (!page) return;
  setPageStatus(idx, 'analyzing');
  renderTable();

  const geoEntries = matchDimensions(page.geometry);

  if (geoEntries.length > 0) {
    applyPageResult({
      pageIndex: idx,
      status: 'confirmed',
      entries: geoEntries,
      run1: geoEntries,
      run2: geoEntries,
    });
  } else {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageImage: page.base64,
          textItems: page.geometry?.textItems,
          pageIndex: idx,
        }),
      });
      applyPageResult(await res.json());
    } catch (err) {
      applyPageResult({ pageIndex: idx, status: 'error', error: err.message });
    }
  }
  renderTable();
}

function applyPageResult(data) {
  const page = state.pages[data.pageIndex];
  if (!page) return;
  page.status  = data.status;
  page.entries = data.entries || null;
  page.run1    = data.run1   || null;
  page.run2    = data.run2   || null;
  page.error   = data.error  || null;
  setPageStatus(data.pageIndex, data.status);
}

function setPageStatus(idx, status) {
  state.pages[idx].status = status;
  const badge = document.getElementById(`badge-${idx}`);
  if (badge) badge.className = `thumb-badge ${status}`;
}

// ─── Resolve mismatch ─────────────────────────────────────────────────────────

function resolveMismatch(pageIdx, chosenEntries) {
  const page = state.pages[pageIdx];
  if (!page) return;
  page.status  = 'confirmed';
  page.entries = chosenEntries;
  setPageStatus(pageIdx, 'confirmed');
  renderTable();
}

// ─── Table rendering ──────────────────────────────────────────────────────────

function renderTable() {
  resultsBody.innerHTML = '';

  const confirmed = new Map();
  for (const page of state.pages) {
    if (page.status === 'confirmed' && page.entries) {
      for (const e of page.entries) {
        const key = `${e.width}x${e.height}`;
        if (confirmed.has(key)) {
          confirmed.get(key).qty += e.qty;
          confirmed.get(key).pages.push(page.index);
        } else {
          confirmed.set(key, { width: e.width, height: e.height, qty: e.qty, pages: [page.index] });
        }
      }
    }
  }

  const confirmedRows = [...confirmed.values()].sort(
    (a, b) => b.qty !== a.qty ? b.qty - a.qty : (b.width * b.height) - (a.width * a.height)
  );

  for (const row of confirmedRows) {
    const multiPage = row.pages.length > 1;
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.innerHTML = `
      <td><span class="badge badge-confirmed">✓ Confirmed</span></td>
      <td class="num">${row.qty}</td>
      <td class="num">${row.width}</td>
      <td class="num">${row.height}</td>
      <td style="font-size:11px;color:var(--text-muted)">${row.pages.map(i => `p.${i+1}`).join(', ')}</td>
      <td>${multiPage
        ? `<button class="btn-icon" disabled data-tooltip="Merged from multiple pages — re-check individual pages instead">↺</button>`
        : `<button class="btn-icon" onclick="analyseOnePage(${row.pages[0]})" title="Re-check page ${row.pages[0]+1}">↺</button>`
      }</td>`;
    resultsBody.appendChild(tr);
  }

  for (const page of state.pages) {
    if (page.status !== 'mismatch') continue;
    const tr = document.createElement('tr');
    tr.className = 'mismatch-row fade-in';
    tr.innerHTML = `
      <td colspan="6">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <div style="margin-bottom:8px">
              <span class="badge badge-mismatch">⚠ Mismatch</span>
              <span style="font-size:12px;color:var(--text-muted);margin-left:10px">Page ${page.index+1} — two analyses disagreed. Pick the correct result:</span>
            </div>
            <div class="mismatch-options">
              ${renderOptionCard(page.run1, 'Run 1', page.index)}
              ${renderOptionCard(page.run2, 'Run 2', page.index)}
            </div>
          </div>
          <button class="btn-icon" onclick="analyseOnePage(${page.index})" title="Re-analyse page ${page.index+1}" style="margin-top:4px">↺</button>
        </div>
      </td>`;
    resultsBody.appendChild(tr);
  }

  for (const page of state.pages) {
    if (page.status !== 'error') continue;
    const tr = document.createElement('tr');
    tr.className = 'fade-in';
    tr.innerHTML = `
      <td><span class="badge badge-error">✕ Error</span></td>
      <td colspan="3" style="font-size:12px;color:var(--text-muted)">${escHtml(page.error || 'Analysis failed')}</td>
      <td style="font-size:11px;color:var(--text-muted)">p.${page.index+1}</td>
      <td><button class="btn-icon" onclick="analyseOnePage(${page.index})">↺ Retry</button></td>`;
    resultsBody.appendChild(tr);
  }

  for (const page of state.pages) {
    if (page.status !== 'analyzing') continue;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-pending"><span class="spinner"></span> Analysing</span></td>
      <td colspan="3" style="color:var(--text-muted)">Extracting dimensions…</td>
      <td style="font-size:11px;color:var(--text-muted)">p.${page.index+1}</td>
      <td></td>`;
    resultsBody.appendChild(tr);
  }

  if (resultsBody.children.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6"><div class="empty-state"><div class="empty-state-icon">📋</div>No results yet — click Analyse to start</div></td>`;
    resultsBody.appendChild(tr);
  }

  const totalQty = confirmedRows.reduce((s, r) => s + r.qty, 0);
  if (confirmedRows.length > 0) {
    const tr = document.createElement('tr');
    tr.className = 'totals-row';
    tr.innerHTML = `<td>Total</td><td class="num">${totalQty}</td><td colspan="4"></td>`;
    resultsBody.appendChild(tr);
  }

  totalValue.textContent = confirmedRows.reduce((s, r) => s + r.qty, 0);
  const hasConfirmed = confirmedRows.length > 0;
  copyBtn.disabled   = !hasConfirmed;
  exportBtn.disabled = !hasConfirmed;
}

function renderOptionCard(entries, label, pageIdx) {
  if (!entries || entries.length === 0) {
    return `<div class="option-card" onclick="resolveMismatch(${pageIdx}, [])">
      <div class="option-card-title">${label}</div>
      <div class="option-entry" style="color:var(--text-muted)">No entries found</div>
    </div>`;
  }
  const rows = entries.map(e => `${e.qty} × ${e.width}×${e.height} mm`).join('<br>');
  const json = escHtml(JSON.stringify(entries));
  return `<div class="option-card" onclick="resolveMismatch(${pageIdx}, JSON.parse(this.dataset.entries))" data-entries="${json}">
    <div class="option-card-title">${label}</div>
    <div class="option-entry">${rows}</div>
  </div>`;
}

// ─── Export ───────────────────────────────────────────────────────────────────

copyBtn.addEventListener('click', () => {
  const rows = getConfirmedRows();
  const text = rows.map(r => `${r.qty}\t${r.width}\t${r.height}`).join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
});

exportBtn.addEventListener('click', () => {
  const rows = getConfirmedRows();
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const data = [
    ['Qty', 'Width X (mm)', 'Height Y (mm)'],
    ...rows.map(r => [r.qty, r.width, r.height]),
    ['TOTAL', totalQty, ''],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Label Dimensions');
  XLSX.writeFile(wb, 'label-dimensions.xlsx');
  showToast('Exported label-dimensions.xlsx');
});

function getConfirmedRows() {
  const confirmed = new Map();
  for (const page of state.pages) {
    if (page.status === 'confirmed' && page.entries) {
      for (const e of page.entries) {
        const key = `${e.width}x${e.height}`;
        if (confirmed.has(key)) confirmed.get(key).qty += e.qty;
        else confirmed.set(key, { ...e });
      }
    }
  }
  return [...confirmed.values()].sort(
    (a, b) => b.qty !== a.qty ? b.qty - a.qty : (b.width * b.height) - (a.width * a.height)
  );
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetAll() {
  state.pages = [];
  state.analysing = false;
  fileInput.value = '';
  fileBar.style.display = 'none';
  thumbnailsSect.style.display = 'none';
  thumbnailsGrid.innerHTML = '';
  controlsEl.style.display = 'none';
  resultsSect.style.display = 'none';
  resultsBody.innerHTML = '';
  analyzeBtn.disabled = true;
  analyzeBtnIcon.textContent = '▶';
  analyzeBtnText.textContent = 'Analyze All Pages';
  progressText.textContent = '';
  totalValue.textContent = '0';
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
