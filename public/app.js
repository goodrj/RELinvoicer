'use strict';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  pages: [],      // { index, thumbnail, base64, status, entries, run1, run2, error }
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

  // Render all pages concurrently (thumbnails + extract base64)
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
  const viewport = page.getViewport({ scale: 3.0 });

  // High-res canvas for API (PNG)
  const hiCanvas = document.createElement('canvas');
  hiCanvas.width = viewport.width;
  hiCanvas.height = viewport.height;
  await page.render({ canvasContext: hiCanvas.getContext('2d'), viewport }).promise;
  const base64 = hiCanvas.toDataURL('image/png').split(',')[1];

  // Thumbnail canvas
  const thumbViewport = page.getViewport({ scale: 0.4 });
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbViewport.width;
  thumbCanvas.height = thumbViewport.height;
  thumbCanvas.className = 'thumb-canvas';
  await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport }).promise;

  state.pages[idx].base64 = base64;

  // Extract text items directly from PDF (exact numbers, no vision guessing)
  const textContent = await page.getTextContent();
  const pageViewport = page.getViewport({ scale: 1.0 });
  state.pages[idx].textItems = textContent.items
    .filter(item => item.str.trim().length > 0)
    .map(item => ({
      text: item.str.trim(),
      // Normalise to top-left origin so coordinates make intuitive sense
      x: Math.round(item.transform[4]),
      y: Math.round(pageViewport.height - item.transform[5])
    }));

  // Build thumb card
  const card = document.createElement('div');
  card.className = 'thumb-card';
  card.id = `thumb-${idx}`;

  const label = document.createElement('div');
  label.className = 'thumb-label';
  label.innerHTML = `<span>p.${idx + 1}</span><span class="thumb-badge pending" id="badge-${idx}"></span>`;

  card.appendChild(thumbCanvas);
  card.appendChild(label);
  thumbnailsGrid.appendChild(card);
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

  // Only analyse pages that are pending or errored
  const toAnalyse = state.pages.filter(p => p.status === 'pending' || p.status === 'error');

  let done = 0;
  const updateProgress = () => {
    done++;
    progressText.textContent = `${done} / ${toAnalyse.length} pages`;
  };

  // Run all pages in parallel (server batches the two AI calls per page)
  await Promise.all(toAnalyse.map(async page => {
    setPageStatus(page.index, 'analyzing');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageImage: page.base64, textItems: page.textItems, pageIndex: page.index })
      });
      const data = await res.json();
      applyPageResult(data);
    } catch (err) {
      applyPageResult({ pageIndex: page.index, status: 'error', error: err.message });
    }
    updateProgress();
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

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageImage: page.base64, textItems: page.textItems, pageIndex: idx })
    });
    const data = await res.json();
    applyPageResult(data);
  } catch (err) {
    applyPageResult({ pageIndex: idx, status: 'error', error: err.message });
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

// ─── Resolve mismatch ────────────────────────────────────────────────────────

function resolveMismatch(pageIdx, chosenEntries) {
  const page = state.pages[pageIdx];
  if (!page) return;
  page.status  = 'confirmed';
  page.entries = chosenEntries;
  setPageStatus(pageIdx, 'confirmed');
  renderTable();
}

// ─── Table rendering ─────────────────────────────────────────────────────────

function renderTable() {
  resultsBody.innerHTML = '';

  // Build merged confirmed map: key → { width, height, qty, pages }
  const confirmed = new Map(); // 'WxH' → { width, height, qty, pages }

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

  // Sort confirmed rows: qty desc, area desc
  const confirmedRows = [...confirmed.values()].sort(
    (a, b) => b.qty !== a.qty ? b.qty - a.qty : (b.width * b.height) - (a.width * a.height)
  );

  // Render confirmed rows
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
      <td>
        ${multiPage
          ? `<button class="btn-icon" disabled data-tooltip="Merged from multiple pages — re-check individual pages instead">↺</button>`
          : `<button class="btn-icon" onclick="analyseOnePage(${row.pages[0]})" title="Re-check page ${row.pages[0]+1}">↺</button>`
        }
      </td>`;
    resultsBody.appendChild(tr);
  }

  // Render mismatch rows
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

  // Render error rows
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

  // Analysing rows
  for (const page of state.pages) {
    if (page.status !== 'analyzing') continue;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-pending"><span class="spinner"></span> Analysing</span></td>
      <td colspan="3" style="color:var(--text-muted)">Running two analyses…</td>
      <td style="font-size:11px;color:var(--text-muted)">p.${page.index+1}</td>
      <td></td>`;
    resultsBody.appendChild(tr);
  }

  // Empty state
  if (resultsBody.children.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6"><div class="empty-state"><div class="empty-state-icon">📋</div>No results yet — click Analyse to start</div></td>`;
    resultsBody.appendChild(tr);
  }

  // Totals row
  const totalQty = confirmedRows.reduce((s, r) => s + r.qty, 0);
  if (confirmedRows.length > 0) {
    const tr = document.createElement('tr');
    tr.className = 'totals-row';
    tr.innerHTML = `
      <td>Total</td>
      <td class="num">${totalQty}</td>
      <td colspan="4"></td>`;
    resultsBody.appendChild(tr);
  }

  totalValue.textContent = confirmedRows.reduce((s, r) => s + r.qty, 0);

  // Enable/disable export buttons
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

  // Column widths
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
