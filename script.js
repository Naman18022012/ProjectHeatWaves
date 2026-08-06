/* ==========================================================================
   HEAT WAVES — DIGITAL MAGAZINE ENGINE (PDF.js + StPageFlip Integration)
   ========================================================================== */

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global Application State
const STATE = {
    pdfDoc: null,
    totalPages: 0,
    currentPage: 1,
    pageFlip: null,
    searchIndex: [], // Holds extracted page text content
    isSearching: false,
    renderedPages: new Set()
};

// DOM Elements Registry
const DOM = {
    landingScreen: document.getElementById('landing-screen'),
    readerScreen: document.getElementById('reader-screen'),
    btnOpenMagazine: document.getElementById('btn-open-magazine'),
    btnHeroToc: document.getElementById('btn-hero-toc'),
    btnExitReader: document.getElementById('btn-exit-reader'),
    btnUploadTrigger: document.getElementById('btn-upload-trigger'),
    pdfFileInput: document.getElementById('pdf-file-input'),
    
    // Stats & Cover
    heroCoverCanvas: document.getElementById('hero-cover-canvas'),
    statPages: document.getElementById('stat-pages'),
    statReadtime: document.getElementById('stat-readtime'),
    
    // Flipbook Stage
    flipbookWrapper: document.getElementById('flipbook-wrapper'),
    inputPageNumber: document.getElementById('input-page-number'),
    lblTotalPages: document.getElementById('lbl-total-pages'),
    readingProgressFill: document.getElementById('reading-progress-fill'),
    
    // Navigation Controls
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),
    btnFullscreenToggle: document.getElementById('btn-fullscreen-toggle'),
    
    // Modals & Triggers
    modalSearch: document.getElementById('modal-search'),
    modalToc: document.getElementById('modal-toc'),
    modalShortcuts: document.getElementById('modal-shortcuts'),
    btnSearchTrigger: document.getElementById('btn-search-trigger'),
    btnTocTrigger: document.getElementById('btn-toc-trigger'),
    btnShortcutsTrigger: document.getElementById('btn-shortcuts-trigger'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    btnCloseToc: document.getElementById('btn-close-toc'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
    
    // Search Elements
    searchInput: document.getElementById('search-input'),
    searchResultsContainer: document.getElementById('search-results-container'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    
    // TOC Container
    tocGridContainer: document.getElementById('toc-grid-container'),
    
    // Toast
    toastNotification: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message')
};

// Default Sample PDF Backup (Clean multi-page vector magazine document)
const DEFAULT_PDF_URL = 'https://cdn.jsdelivr.net/gh/mozilla/pdf.js@master/web/compressed.tracemonkey-pldi-09.pdf';

/* ==========================================================================
   INITIALIZATION & PDF LOADING
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadDefaultMagazine(DEFAULT_PDF_URL);
});

// Load PDF Document via URL or ArrayBuffer
async function loadDefaultMagazine(source) {
    try {
        showToast("Loading Heat Waves magazine...");
        
        const loadingTask = pdfjsLib.getDocument(source);
        STATE.pdfDoc = await loadingTask.promise;
        STATE.totalPages = STATE.pdfDoc.numPages;

        // Update Metadata UI
        DOM.statPages.textContent = STATE.totalPages;
        DOM.statReadtime.textContent = `${Math.ceil(STATE.totalPages * 1.5)} min`;
        DOM.lblTotalPages.textContent = `of ${STATE.totalPages}`;
        DOM.inputPageNumber.max = STATE.totalPages;

        // Render Hero Cover
        await renderHeroCover();

        // Index Text for Search Engine in Background
        indexPdfText();

        showToast("Magazine loaded successfully");
    } catch (error) {
        console.warn("External PDF Load Error / Fallback triggered:", error);
        generateFallbackMagazine();
    }
}

/* ==========================================================================
   COVER & FLIPBOOK CANVAS RENDERING
   ========================================================================== */

// Render Page 1 to Landing Hero Cover Canvas
async function renderHeroCover() {
    if (!STATE.pdfDoc) return;
    const page = await STATE.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = DOM.heroCoverCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;
}

// Build and Pre-render All Pages into Flipbook DOM Container
async function buildFlipbookPages() {
    DOM.flipbookWrapper.innerHTML = '';
    
    // Set optimal dimensions based on screen ratio
    const isMobile = window.innerWidth < 768;
    const bookWidth = isMobile ? window.innerWidth * 0.85 : 460;
    const bookHeight = isMobile ? bookWidth * 1.4 : 640;

    for (let i = 1; i <= STATE.totalPages; i++) {
        const pageSheet = document.createElement('div');
        pageSheet.className = 'page-sheet';
        pageSheet.setAttribute('data-page', i);

        const canvas = document.createElement('canvas');
        pageSheet.appendChild(canvas);
        DOM.flipbookWrapper.appendChild(pageSheet);

        // Render PDF page onto sheet canvas
        renderPdfPageToCanvas(i, canvas, bookWidth, bookHeight);
    }

    // Initialize StPageFlip Engine
    if (STATE.pageFlip) {
        STATE.pageFlip.destroy();
    }

    STATE.pageFlip = new St.PageFlip(DOM.flipbookWrapper, {
        width: bookWidth,
        height: bookHeight,
        size: 'fixed',
        minWidth: 300,
        maxWidth: 600,
        minHeight: 400,
        maxHeight: 800,
        showCover: true,
        useMouseEvents: true,
        maxShadowOpacity: 0.4,
        flippingTime: 800
    });

    STATE.pageFlip.loadFromHTML(document.querySelectorAll('.page-sheet'));

    // Bind PageFlip Events
    STATE.pageFlip.on('flip', (e) => {
        STATE.currentPage = e.data + 1;
        updateReaderNavigationUI();
    });
}

// Render Individual Page Canvas with High DPI Sharpness
async function renderPdfPageToCanvas(pageNo, canvas, targetWidth, targetHeight) {
    if (!STATE.pdfDoc) return;

    try {
        const page = await STATE.pdfDoc.getPage(pageNo);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        // Calculate scale to fit page to target dimensions
        const scale = Math.min(targetWidth / unscaledViewport.width, targetHeight / unscaledViewport.height) * 2; // 2x for Retina display
        const viewport = page.getViewport({ scale: scale });

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
    } catch (e) {
        console.error(`Page ${pageNo} rendering failed:`, e);
    }
}

/* ==========================================================================
   NAVIGATION & UI CONTROLS
   ========================================================================== */

function openReaderView() {
    DOM.landingScreen.classList.remove('screen-active');
    DOM.landingScreen.classList.add('screen-hidden');

    DOM.readerScreen.classList.remove('screen-hidden');
    DOM.readerScreen.classList.add('screen-active');

    // Build Flipbook if not already initialized
    if (!STATE.pageFlip) {
        buildFlipbookPages();
    }
}

function exitReaderView() {
    DOM.readerScreen.classList.remove('screen-active');
    DOM.readerScreen.classList.add('screen-hidden');

    DOM.landingScreen.classList.remove('screen-hidden');
    DOM.landingScreen.classList.add('screen-active');
}

function updateReaderNavigationUI() {
    DOM.inputPageNumber.value = STATE.currentPage;
    
    // Progress bar fill percent
    const progressPercent = (STATE.currentPage / STATE.totalPages) * 100;
    DOM.readingProgressFill.style.width = `${progressPercent}%`;
}

function jumpToPage(pageNo) {
    let target = parseInt(pageNo, 10);
    if (isNaN(target)) return;
    
    target = Math.max(1, Math.min(target, STATE.totalPages));
    STATE.currentPage = target;

    if (STATE.pageFlip) {
        STATE.pageFlip.turnToPage(target - 1);
    }
    updateReaderNavigationUI();
}

/* ==========================================================================
   SEARCH ENGINE & INDEXING
   ========================================================================== */

async function indexPdfText() {
    STATE.searchIndex = [];
    if (!STATE.pdfDoc) return;

    for (let i = 1; i <= STATE.totalPages; i++) {
        try {
            const page = await STATE.pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            STATE.searchIndex.push({
                pageNumber: i,
                text: pageText
            });
        } catch (e) {
            console.warn(`Failed to index page ${i}`, e);
        }
    }
}

function performSearch(query) {
    const cleanQuery = query.trim().toLowerCase();
    DOM.searchResultsContainer.innerHTML = '';

    if (!cleanQuery) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-compass"></i>
                <p>Type above to search across all pages of Heat Waves.</p>
            </div>`;
        return;
    }

    const matches = STATE.searchIndex.filter(item => item.text.toLowerCase().includes(cleanQuery));

    if (matches.length === 0) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-face-frown"></i>
                <p>No results found for "${escapeHtml(query)}".</p>
            </div>`;
        return;
    }

    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        // Extract snippet context
        const index = match.text.toLowerCase().indexOf(cleanQuery);
        const start = Math.max(0, index - 40);
        const end = Math.min(match.text.length, index + cleanQuery.length + 40);
        let snippet = match.text.substring(start, end);

        // Highlight matched text
        const regex = new RegExp(`(${cleanQuery})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');

        item.innerHTML = `
            <div class="result-page-tag">PAGE ${match.pageNumber}</div>
            <div class="result-snippet">"...${snippet}..."</div>
        `;

        item.addEventListener('click', () => {
            closeAllModals();
            openReaderView();
            jumpToPage(match.pageNumber);
        });

        DOM.searchResultsContainer.appendChild(item);
    });
}

/* ==========================================================================
   TABLE OF CONTENTS MODAL GENERATOR
   ========================================================================== */

async function populateTableOfContents() {
    DOM.tocGridContainer.innerHTML = '';
    if (!STATE.pdfDoc) return;

    for (let i = 1; i <= STATE.totalPages; i++) {
        const card = document.createElement('div');
        card.className = 'toc-card';

        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'toc-thumbnail-wrapper';

        const canvas = document.createElement('canvas');
        thumbWrapper.appendChild(canvas);

        const pageLabel = document.createElement('span');
        pageLabel.className = 'toc-page-label';
        pageLabel.textContent = `Page ${i}`;

        card.appendChild(thumbWrapper);
        card.appendChild(pageLabel);

        card.addEventListener('click', () => {
            closeAllModals();
            openReaderView();
            jumpToPage(i);
        });

        DOM.tocGridContainer.appendChild(card);

        // Render low-res thumbnail
        renderPdfPageToCanvas(i, canvas, 140, 200);
    }
}

/* ==========================================================================
   FALLBACK CANVAS GENERATOR (For offline testing or missing PDF)
   ========================================================================== */
function generateFallbackMagazine() {
    STATE.totalPages = 6;
    DOM.statPages.textContent = "6";
    DOM.statReadtime.textContent = "9 min";
    DOM.lblTotalPages.textContent = "of 6";
    
    // Draw dummy hero cover canvas
    const canvas = DOM.heroCoverCanvas;
    canvas.width = 400;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    
    // Luxury Paper BG
    ctx.fillStyle = '#fcfaf7';
    ctx.fillRect(0, 0, 400, 560);
    
    ctx.fillStyle = '#c25e40';
    ctx.fillRect(30, 40, 340, 6);
    
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 36px "Cormorant Garamond", serif';
    ctx.fillText('HEAT WAVES', 30, 90);
    
    ctx.fillStyle = '#78716c';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ISSUE 04 • DIGITAL EDITION', 30, 115);
    
    ctx.fillStyle = '#e2d8ce';
    ctx.fillRect(30, 150, 340, 240);
    
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 20px "Cormorant Garamond", serif';
    ctx.fillText('The Spirit of Student Journalism', 30, 430);

    showToast("Generated preview fallback issue");
}

/* ==========================================================================
   EVENT LISTENERS & KEYBOARD SHORTCUTS
   ========================================================================== */

function initEventListeners() {
    // Open Reader
    DOM.btnOpenMagazine.addEventListener('click', openReaderView);
    DOM.btnExitReader.addEventListener('click', exitReaderView);

    // Navigation Controls
    DOM.btnPrevPage.addEventListener('click', () => {
        if (STATE.pageFlip) STATE.pageFlip.flipPrev();
    });

    DOM.btnNextPage.addEventListener('click', () => {
        if (STATE.pageFlip) STATE.pageFlip.flipNext();
    });

    DOM.inputPageNumber.addEventListener('change', (e) => {
        jumpToPage(e.target.value);
    });

    // Custom PDF Upload
    DOM.btnUploadTrigger.addEventListener('click', () => DOM.pdfFileInput.click());
    DOM.pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function (evt) {
                loadDefaultMagazine(evt.target.result);
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // Fullscreen Toggle
    DOM.btnFullscreenToggle.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Modals
    DOM.btnSearchTrigger.addEventListener('click', () => {
        DOM.modalSearch.classList.remove('hidden');
        DOM.searchInput.focus();
    });

    DOM.btnTocTrigger.addEventListener('click', () => {
        DOM.modalToc.classList.remove('hidden');
        populateTableOfContents();
    });

    DOM.btnHeroToc.addEventListener('click', () => {
        DOM.modalToc.classList.remove('hidden');
        populateTableOfContents();
    });

    DOM.btnShortcutsTrigger.addEventListener('click', () => {
        DOM.modalShortcuts.classList.remove('hidden');
    });

    DOM.btnCloseSearch.addEventListener('click', closeAllModals);
    DOM.btnCloseToc.addEventListener('click', closeAllModals);
    DOM.btnCloseShortcuts.addEventListener('click', closeAllModals);

    // Search Input
    DOM.searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        performSearch('');
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }

        // If modal active or typing in input, ignore navigation shortcuts
        if (!DOM.modalSearch.classList.contains('hidden') || document.activeElement.tagName === 'INPUT') {
            return;
        }

        if (e.key === 'ArrowRight' || e.key === ' ') {
            if (STATE.pageFlip) STATE.pageFlip.flipNext();
        } else if (e.key === 'ArrowLeft') {
            if (STATE.pageFlip) STATE.pageFlip.flipPrev();
        } else if (e.key === 'f' || e.key === 'F') {
            DOM.btnFullscreenToggle.click();
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            DOM.btnSearchTrigger.click();
        } else if (e.key === 't' || e.key === 'T') {
            DOM.btnTocTrigger.click();
        }
    });
}

function closeAllModals() {
    DOM.modalSearch.classList.add('hidden');
    DOM.modalToc.classList.add('hidden');
    DOM.modalShortcuts.classList.add('hidden');
}

// Toast System
function showToast(message) {
    DOM.toastMessage.textContent = message;
    DOM.toastNotification.classList.remove('hidden');

    setTimeout(() => {
        DOM.toastNotification.classList.add('hidden');
    }, 3000);
}

// Helper: Escape HTML
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}