const pdfInput = document.getElementById('pdfInput');
const dropZone = document.getElementById('dropZone');
const fileMeta = document.getElementById('fileMeta');
const analyseAllBtn = document.getElementById('analyseAllBtn');
const clearBtn = document.getElementById('clearBtn');
const thumbList = document.getElementById('thumbList');
const resultsBody = document.getElementById('resultsBody');
const totalCount = document.getElementById('totalCount');
const footerQty = document.getElementById('footerQty');
const copyBtn = document.getElementById('copyBtn');
const exportBtn = document.getElementById('exportBtn');
const reviewPanel = document.getElementById('reviewPanel');
const reviewContent = document.getElementById('reviewContent');
const remarksPanel = document.getElementById('remarksPanel');
const remarksList = document.getElementById('remarksList');
const analysisProgress = document.getElementById('analysisProgress');
const analysisStatus = document.getElementById('analysisStatus');
const analysisTimer = document.getElementById('analysisTimer');
const serverStatus = document.getElementById('serverStatus');

let pdfjsLib;
let loadedFileName = '';
let loadedPdfDataBase64 = '';
let pages = [];
let activeResults = new Map();
let priorResults = new Map();
let analysisStartedAt = 0;
let analysisTimerId = 0;

async function initPdfJs() {
  pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
}

// The browser only asks whether the local server is ready. The OpenAI API key
// stays in .env on the server and is never sent to this frontend file.
async function checkServer() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    serverStatus.textContent = data.hasKey ? `API ready - ${data.model}` : 'Add OPENAI_API_KEY to .env';
    serverStatus.className = `status-pill ${data.hasKey ? 'ready' : 'missing'}`;
  } catch {
    serverStatus.textContent = 'Server unavailable';
    serverStatus.className = 'status-pill missing';
  }
}

function setBusy(pageNumber, busy, text) {
  const card = document.querySelector(`[data-page-card="${pageNumber}"]`);
  if (!card) return;
  const button = card.querySelector('button');
  const status = card.querySelector('.thumb-status');
  button.disabled = busy;
  status.textContent = text;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateAnalysisTimer() {
  if (!analysisStartedAt) return;
  analysisTimer.textContent = formatDuration(Date.now() - analysisStartedAt);
}

function beginAnalysis(message) {
  analysisStartedAt = Date.now();
  analysisProgress.hidden = false;
  analysisProgress.classList.add('running');
  analysisStatus.textContent = message;
  analysisTimer.textContent = '00:00';
  clearInterval(analysisTimerId);
  analysisTimerId = setInterval(updateAnalysisTimer, 1000);
}

function updateAnalysisStatus(message) {
  analysisStatus.textContent = message;
  updateAnalysisTimer();
}

function finishAnalysis(message) {
  updateAnalysisTimer();
  clearInterval(analysisTimerId);
  analysisTimerId = 0;
  analysisProgress.classList.remove('running');
  analysisStatus.textContent = `${message} in ${analysisTimer.textContent}`;
}

function resultSignature(result) {
  return (result.labels || [])
    .map((item) => `${item.quantity}:${formatNumber(item.widthMm)}x${formatNumber(item.heightMm)}`)
    .sort()
    .join('|');
}

function mergeAllResults() {
  const grouped = new Map();

  for (const result of activeResults.values()) {
    for (const item of result.labels || []) {
      const width = Math.max(Number(item.widthMm), Number(item.heightMm));
      const height = Math.min(Number(item.widthMm), Number(item.heightMm));
      const key = `${formatNumber(width)}x${formatNumber(height)}`;
      const existing = grouped.get(key) || { quantity: 0, widthMm: width, heightMm: height };
      existing.quantity += Number(item.quantity || 1);
      grouped.set(key, existing);
    }
  }

  return [...grouped.values()].sort((a, b) => b.widthMm - a.widthMm || b.heightMm - a.heightMm);
}

// Remarks are the app's way of saying, "I used extra judgement here."
// They are shown to the user, but they are not included in the spreadsheet.
function getRemarks() {
  const remarks = [];

  for (const result of activeResults.values()) {
    const page = result.pageNumber || '?';
    for (const remark of result.remarks || []) {
      if (remark.message) remarks.push({ page, level: remark.level || 'info', message: remark.message });
    }

    for (const item of result.labels || []) {
      if (item.inferredDimension && item.inferredDimension !== 'none') {
        remarks.push({
          page,
          level: 'info',
          message: `${formatNumber(item.widthMm)} x ${formatNumber(item.heightMm)} used inferred ${item.inferredDimension} from aligned common CAD dimensioning. ${item.evidence || ''}`.trim()
        });
      } else if (item.sharedDimension) {
        remarks.push({
          page,
          level: 'info',
          message: `${formatNumber(item.widthMm)} x ${formatNumber(item.heightMm)} used a shared dimension line. ${item.evidence || ''}`.trim()
        });
      }
    }
  }

  const seen = new Set();
  return remarks.filter((remark) => {
    const key = `${remark.page}:${remark.level}:${remark.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderRemarks() {
  const remarks = getRemarks();
  remarksPanel.hidden = remarks.length === 0;
  remarksList.innerHTML = remarks.map((remark) => `
    <li class="${remark.level === 'warning' ? 'warn' : ''}">
      <strong>Page ${remark.page}:</strong> ${remark.message}
    </li>
  `).join('');
}

function renderResults() {
  const rows = mergeAllResults();
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  totalCount.textContent = total;
  footerQty.textContent = total;
  copyBtn.disabled = rows.length === 0;
  exportBtn.disabled = rows.length === 0;

  if (!rows.length) {
    resultsBody.innerHTML = '<tr><td colspan="3" class="empty">No dimensions extracted yet.</td></tr>';
    renderRemarks();
    return;
  }

  resultsBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.quantity}</td>
      <td>${formatNumber(row.widthMm)}</td>
      <td>${formatNumber(row.heightMm)}</td>
    </tr>
  `).join('');
  renderRemarks();
}

function renderReview() {
  const disagreements = [];
  for (const [pageNumber, prior] of priorResults.entries()) {
    const current = activeResults.get(pageNumber);
    if (current && resultSignature(prior) !== resultSignature(current)) {
      disagreements.push({ pageNumber, prior, current });
    }
  }

  reviewPanel.hidden = disagreements.length === 0;
  reviewContent.innerHTML = disagreements.map(({ pageNumber, prior, current }) => `
    <div class="review-option">
      <div class="review-choice">
        <strong>Page ${pageNumber}</strong>
        <span>Choose the result to keep</span>
      </div>
      ${renderChoice(pageNumber, 'prior', prior)}
      ${renderChoice(pageNumber, 'current', current)}
    </div>
  `).join('');

  reviewContent.querySelectorAll('button[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const pageNumber = Number(button.dataset.page);
      const choice = button.dataset.choice;
      if (choice === 'prior') activeResults.set(pageNumber, priorResults.get(pageNumber));
      priorResults.delete(pageNumber);
      renderResults();
      renderReview();
      setPageStatus(pageNumber, 'Chosen', false);
    });
  });
}

function renderChoice(pageNumber, choice, result) {
  const rows = (result.labels || []).map((item) => `
    <tr><td>${item.quantity}</td><td>${formatNumber(item.widthMm)}</td><td>${formatNumber(item.heightMm)}</td></tr>
  `).join('');

  return `
    <div class="review-option">
      <div class="review-choice">
        <span>${choice === 'prior' ? 'Previous run' : 'Latest run'} - confidence ${Math.round((result.confidence || 0) * 100)}%</span>
        <button data-page="${pageNumber}" data-choice="${choice}">Use this</button>
      </div>
      <table class="mini-table">
        <thead><tr><th>Qty</th><th>Width</th><th>Height</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3">No labels</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function setPageStatus(pageNumber, text, warn = false) {
  const card = document.querySelector(`[data-page-card="${pageNumber}"]`);
  if (!card) return;
  const status = card.querySelector('.thumb-status');
  status.textContent = text;
  status.classList.toggle('warn', warn);
}

async function analysePage(page) {
  const previous = activeResults.get(page.pageNumber);
  if (previous) priorResults.set(page.pageNumber, previous);

  const standaloneRun = !analysisTimerId;
  if (standaloneRun) beginAnalysis(`Analysis ongoing - page ${page.pageNumber}`);
  else updateAnalysisStatus(`Analysis ongoing - page ${page.pageNumber}`);

  setBusy(page.pageNumber, true, 'Analysing');
  try {
    const response = await fetch('/api/analyse-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageNumber: page.pageNumber,
        imageDataUrl: page.analysisCanvas.toDataURL('image/png'),
        pdfDataBase64: loadedPdfDataBase64
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed');

    activeResults.set(page.pageNumber, data);
    const changed = previous && resultSignature(previous) !== resultSignature(data);
    const pageDuration = formatDuration(Date.now() - analysisStartedAt);
    setBusy(page.pageNumber, false, changed ? 'Different result' : `Done - ${Math.round((data.confidence || 0) * 100)}% - ${pageDuration}`);
    setPageStatus(page.pageNumber, changed ? 'Different result' : `Done - ${Math.round((data.confidence || 0) * 100)}% - ${pageDuration}`, changed);
  } catch (error) {
    setBusy(page.pageNumber, false, 'Failed');
    setPageStatus(page.pageNumber, error.message, true);
  }

  renderResults();
  renderReview();
  if (standaloneRun) finishAnalysis(`Page ${page.pageNumber} analysis finished`);
}

async function analyseAll() {
  beginAnalysis(`Analysis ongoing - 0 of ${pages.length} pages complete`);
  analyseAllBtn.disabled = true;
  for (let index = 0; index < pages.length; index += 1) {
    updateAnalysisStatus(`Analysis ongoing - page ${index + 1} of ${pages.length}`);
    const page = pages[index];
    await analysePage(page);
    updateAnalysisStatus(`Analysis ongoing - ${index + 1} of ${pages.length} pages complete`);
  }
  analyseAllBtn.disabled = pages.length === 0;
  finishAnalysis(`Analysis finished for ${pages.length} page${pages.length === 1 ? '' : 's'}`);
}

// Each page is rendered twice: a small canvas for the visible thumbnail and a
// larger hidden canvas for AI vision, where tiny dimension text is easier to read.
async function renderPdf(file) {
  const bytes = await file.arrayBuffer();
  const copyForServer = bytes.slice(0);
  loadedPdfDataBase64 = arrayBufferToBase64(copyForServer);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

  loadedFileName = file.name;
  pages = [];
  activeResults.clear();
  priorResults.clear();
  thumbList.innerHTML = '';
  analysisProgress.hidden = true;
  clearInterval(analysisTimerId);
  analysisTimerId = 0;
  analysisStartedAt = 0;

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const thumbViewport = page.getViewport({ scale: 0.34 });
    const analysisViewport = page.getViewport({ scale: 2.6 });

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.ceil(thumbViewport.width);
    thumbCanvas.height = Math.ceil(thumbViewport.height);
    await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport }).promise;

    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = Math.ceil(analysisViewport.width);
    analysisCanvas.height = Math.ceil(analysisViewport.height);
    await page.render({ canvasContext: analysisCanvas.getContext('2d'), viewport: analysisViewport }).promise;

    const card = document.createElement('div');
    card.className = 'thumb-card';
    card.dataset.pageCard = index;
    card.appendChild(thumbCanvas);
    card.insertAdjacentHTML('beforeend', `
      <div class="thumb-footer">
        <div class="thumb-row">
          <strong>Page ${index}</strong>
          <button type="button">Re-analyse</button>
        </div>
        <div class="thumb-status">Ready</div>
      </div>
    `);
    card.querySelector('button').addEventListener('click', () => analysePage(pages[index - 1]));
    thumbList.appendChild(card);
    pages.push({ pageNumber: index, analysisCanvas });
  }

  fileMeta.textContent = `${file.name} - ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}`;
  analyseAllBtn.disabled = false;
  clearBtn.disabled = false;
  renderResults();
  renderReview();
}

function clearAll() {
  loadedFileName = '';
  loadedPdfDataBase64 = '';
  pages = [];
  activeResults.clear();
  priorResults.clear();
  thumbList.innerHTML = '';
  fileMeta.textContent = 'No PDF loaded';
  analyseAllBtn.disabled = true;
  clearBtn.disabled = true;
  pdfInput.value = '';
  renderResults();
  renderReview();
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function getExportRows() {
  const rows = mergeAllResults();
  return rows.map((row) => ({
    Quantity: row.quantity,
    'Width X (mm)': Number(formatNumber(row.widthMm)),
    'Height Y (mm)': Number(formatNumber(row.heightMm))
  }));
}

async function copyTsv() {
  const rows = getExportRows();
  const lines = rows.map((row) => [row.Quantity, row['Width X (mm)'], row['Height Y (mm)']].join('\t'));
  await navigator.clipboard.writeText(lines.join('\n'));
  copyBtn.textContent = 'Copied';
  setTimeout(() => { copyBtn.textContent = 'Copy TSV'; }, 1200);
}

function exportExcel() {
  const rows = getExportRows();
  const total = rows.reduce((sum, row) => sum + row.Quantity, 0);
  const worksheet = XLSX.utils.json_to_sheet([...rows, {
    Quantity: total,
    'Width X (mm)': 'Total labels',
    'Height Y (mm)': ''
  }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Label Sizes');
  XLSX.writeFile(workbook, `${loadedFileName.replace(/\.pdf$/i, '') || 'label-dimensions'}.xlsx`);
}

dropZone.addEventListener('click', () => pdfInput.click());
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragging');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragging');
  const [file] = event.dataTransfer.files;
  if (file) await renderPdf(file);
});

pdfInput.addEventListener('change', async () => {
  const [file] = pdfInput.files;
  if (file) await renderPdf(file);
});

analyseAllBtn.addEventListener('click', analyseAll);
clearBtn.addEventListener('click', clearAll);
copyBtn.addEventListener('click', copyTsv);
exportBtn.addEventListener('click', exportExcel);

await initPdfJs();
await checkServer();
