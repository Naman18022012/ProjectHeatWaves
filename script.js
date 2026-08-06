/* ==========================================================================
   INKSPIRE — PRESIDENCY SCHOOL DIGITAL MAGAZINE ENGINE
   ========================================================================== */

// ==========================================================================
// CENTRAL CONFIGURATION OBJECT
// Edit these values to update publication details without touching core logic
// ==========================================================================
const PUBLICATION_CONFIG = {
    schoolName: "Presidency School",
    magazineTitle: "INKSPIRE",
    taglineSub1: "Official Digital Magazine",
    taglineSub2: "Presidency School",
    volume: "Volume IV",
    issueDate: "August 2026",
    motto: "Inspiring Minds. Celebrating Excellence. Building Tomorrow.",
    articlesCount: 16,
    
    // Default PDF URL (Will attempt load, with fallback if CORS/offline)
    pdfUrl: 'https://cdn.jsdelivr.net/gh/mozilla/pdf.js@master/web/compressed.tracemonkey-pldi-09.pdf'
};

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
const STATE = {
    pdfDoc: null,
    totalPages: 0,
    currentPage: 1,
    pageFlip: null,
    searchIndex: [],
    isLoaded: false
};

// DOM Registry
const DOM = {
    appLoader: document.getElementById('app-loader'),
    loaderProgressBar: document.getElementById('loader-progress-bar'),
    
    // Config Elements
    lblHeaderSchool: document.getElementById('lbl-header-school'),
    lblVolume: document.getElementById('lbl-volume'),
    lblIssueDate: document.getElementById('lbl-issue-date'),
    lblMainTitle: document.getElementById('lbl-main-title'),
    lblSub1: document.getElementById('lbl-sub-1'),
    lblSub2: document.getElementById('lbl-sub-2'),
    lblMotto: document.getElementById('lbl-motto'),
    statPages: document.getElementById('stat-pages'),
    statArticles: document.getElementById('stat-articles'),
    statReadtime: document.getElementById('stat-readtime'),
    statEdition: document.getElementById('stat-edition'),
    lblReaderSchool: document.getElementById('lbl-reader-school'),
    lblReaderTitle: document.getElementById('lbl-reader-title'),
    
    // Screens
    landingScreen: document.getElementById('landing-screen'),
    readerScreen: document.getElementById('reader-screen'),
    btnOpenMagazine: document.getElementById('btn-open-magazine'),
    btnHeroToc: document.getElementById('btn-hero-toc'),
    btnExitReader: document.getElementById('btn-exit-reader'),
    btnUploadTrigger: document.getElementById('btn-upload-trigger'),
    pdfFileInput: document.getElementById('pdf-file-input'),
    
    // Canvas & Stage
    heroCoverCanvas: document.getElementById('hero-cover-canvas'),
    flipbookWrapper: document.getElementById('flipbook-wrapper'),
    inputPageNumber: document.getElementById('input-page-number'),
    lblTotalPages: document.getElementById('lbl-total-pages'),
    readingProgressFill: document.getElementById('reading-progress-fill'),
    
    // Controls
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),
    btnFullscreenToggle: document.getElementById('btn-fullscreen-toggle'),
    
    // Modals
    modalSearch: document.getElementById('modal-search'),
    modalToc: document.getElementById('modal-toc'),
    modalShortcuts: document.getElementById('modal-shortcuts'),
    btnSearchTrigger: document.getElementById('btn-search-trigger'),
    btnTocTrigger: document.getElementById('btn-toc-trigger'),
    btnShortcutsTrigger: document.getElementById('btn-shortcuts-trigger'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    btnCloseToc: document.getElementById('btn-close-toc'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
    
    // Search
    searchInput: document.getElementById('search-input'),
    searchResultsContainer: document.getElementById('search-results-container'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    
    // TOC
    tocGridContainer: document.getElementById('toc-grid-container'),
    
    // Toast
    toastNotification: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message')
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    applyConfiguration();
    initEventListeners();
    loadMagazine(PUBLICATION_CONFIG.pdfUrl);
});

// Bind Config Values into DOM
function applyConfiguration() {
    DOM.lblHeaderSchool.textContent = PUBLICATION_CONFIG.schoolName.toUpperCase();
    DOM.lblVolume.textContent = PUBLICATION_CONFIG.volume.toUpperCase();
    DOM.lblIssueDate.textContent = PUBLICATION_CONFIG.issueDate.toUpperCase();
    DOM.lblMainTitle.textContent = PUBLICATION_CONFIG.magazineTitle;
    DOM.lblSub1.textContent = PUBLICATION_CONFIG.taglineSub1;
    DOM.lblSub2.textContent = PUBLICATION_CONFIG.taglineSub2;
    DOM.lblMotto.textContent = PUBLICATION_CONFIG.motto;
    DOM.statArticles.textContent = PUBLICATION_CONFIG.articlesCount;
    DOM.statEdition.textContent = PUBLICATION_CONFIG.volume;
    
    DOM.lblReaderSchool.textContent = PUBLICATION_CONFIG.schoolName;
    DOM.lblReaderTitle.textContent = `${PUBLICATION_CONFIG.magazineTitle} — Current Issue`;
}

// Update Loader Progress Bar
function updateLoaderProgress(percent) {
    if (DOM.loaderProgressBar) {
        DOM.loaderProgressBar.style.width = `${percent}%`;
    }
}

// Hide Loading Screen with Smooth Transition
function hideLoader() {
    updateLoaderProgress(100);
    setTimeout(() => {
        DOM.appLoader.style.opacity = '0';
        DOM.appLoader.style.visibility = 'hidden';
    }, 400);
}

/* ==========================================================================
   PDF ENGINE LOADING & INDEXING
   ========================================================================== */
async function loadMagazine(source) {
    try {
        updateLoaderProgress(20);
        
        const loadingTask = pdfjsLib.getDocument(source);
        loadingTask.onProgress = (progressData) => {
            if (progressData.total > 0) {
                const percent = Math.min(80, Math.round((progressData.loaded / progressData.total) * 100));
                updateLoaderProgress(percent);
            }
        };

        STATE.pdfDoc = await loadingTask.promise;
        STATE.totalPages = STATE.pdfDoc.numPages;

        // Metadata UI updates
        DOM.statPages.textContent = STATE.totalPages;
        DOM.statReadtime.textContent = `${Math.ceil(STATE.totalPages * 1.5)} min`;
        DOM.lblTotalPages.textContent = `of ${STATE.totalPages}`;
        DOM.inputPageNumber.max = STATE.totalPages;

        // Render Landing Page Cover
        await renderHeroCover();

        // Index Text for Search
        indexPdfText();

        hideLoader();
        showToast(`${PUBLICATION_CONFIG.magazineTitle} loaded successfully`);
    } catch (error) {
        console.warn("External PDF Load Error / Fallback triggered:", error);
        generateFallbackMagazine();
        hideLoader();
    }
}

/* ==========================================================================
   CANVAS RENDERING & PAGEFLIP INTEGRATION
   ========================================================================== */

// Render Page 1 to Landing Cover
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

// Build Flipbook Sheets
async function buildFlipbookPages() {
    DOM.flipbookWrapper.innerHTML = '';
    
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

        renderPdfPageToCanvas(i, canvas, bookWidth, bookHeight);
    }

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
        maxShadowOpacity: 0.35,
        flippingTime: 750
    });

    STATE.pageFlip.loadFromHTML(document.querySelectorAll('.page-sheet'));

    STATE.pageFlip.on('flip', (e) => {
        STATE.currentPage = e.data + 1;
        updateReaderNavigationUI();
    });
}

// Render Individual Page Canvas
async function renderPdfPageToCanvas(pageNo, canvas, targetWidth, targetHeight) {
    if (!STATE.pdfDoc) return;

    try {
        const page = await STATE.pdfDoc.getPage(pageNo);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        const scale = Math.min(targetWidth / unscaledViewport.width, targetHeight / unscaledViewport.height) * 2;
        const viewport = page.getViewport({ scale: scale });

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
    } catch (e) {
        console.error(`Page ${pageNo} render error:`, e);
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
   SEARCH ENGINE
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
            console.warn(`Text indexing error on page ${i}`, e);
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
                <p>Type above to search across all pages of ${PUBLICATION_CONFIG.magazineTitle}.</p>
            </div>`;
        return;
    }

    const matches = STATE.searchIndex.filter(item => item.text.toLowerCase().includes(cleanQuery));

    if (matches.length === 0) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-face-frown"></i>
                <p>No matches found for "${escapeHtml(query)}".</p>
            </div>`;
        return;
    }

    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const index = match.text.toLowerCase().indexOf(cleanQuery);
        const start = Math.max(0, index - 40);
        const end = Math.min(match.text.length, index + cleanQuery.length + 40);
        let snippet = match.text.substring(start, end);

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
   TABLE OF CONTENTS GRID
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

        renderPdfPageToCanvas(i, canvas, 140, 200);
    }
}

/* ==========================================================================
   FALLBACK CANVAS GENERATOR
   ========================================================================== */
function generateFallbackMagazine() {
    STATE.totalPages = 6;
    DOM.statPages.textContent = "6";
    DOM.statReadtime.textContent = "9 min";
    DOM.lblTotalPages.textContent = "of 6";
    
    const canvas = DOM.heroCoverCanvas;
    canvas.width = 400;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');
    
    // Presidency Green Background
    ctx.fillStyle = '#0c3125';
    ctx.fillRect(0, 0, 400, 560);
    
    // Gold Accent Bar
    ctx.fillStyle = '#c39b4e';
    ctx.fillRect(35, 50, 330, 4);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Cormorant Garamond", serif';
    ctx.fillText(PUBLICATION_CONFIG.magazineTitle, 35, 100);
    
    ctx.fillStyle = '#c39b4e';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${PUBLICATION_CONFIG.schoolName.toUpperCase()} • ${PUBLICATION_CONFIG.volume.toUpperCase()}`, 35, 125);
    
    ctx.fillStyle = '#154737';
    ctx.fillRect(35, 160, 330, 240);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 18px "Cormorant Garamond", serif';
    ctx.fillText(PUBLICATION_CONFIG.motto, 35, 430);

    showToast("Generated preview fallback issue");
}

/* ==========================================================================
   EVENT LISTENERS & KEYBOARD SHORTCUTS
   ========================================================================== */

function initEventListeners() {
    // Open/Close Reader
    DOM.btnOpenMagazine.addEventListener('click', openReaderView);
    DOM.btnExitReader.addEventListener('click', exitReaderView);

    // Page Flipping Controls
    DOM.btnPrevPage.addEventListener('click', () => {
        if (STATE.pageFlip) STATE.pageFlip.flipPrev();
    });

    DOM.btnNextPage.addEventListener('click', () => {
        if (STATE.pageFlip) STATE.pageFlip.flipNext();
    });

    DOM.inputPageNumber.addEventListener('change', (e) => {
        jumpToPage(e.target.value);
    });

    // File Upload Handler
    DOM.btnUploadTrigger.addEventListener('click', () => DOM.pdfFileInput.click());
    DOM.pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function (evt) {
                loadMagazine(evt.target.result);
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

    // Search
    DOM.searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        performSearch('');
    });

    // Global Key Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }

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

// Toast Feedback System
function showToast(message) {
    DOM.toastMessage.textContent = message;
    DOM.toastNotification.classList.remove('hidden');

    setTimeout(() => {
        DOM.toastNotification.classList.add('hidden');
    }, 3200);
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