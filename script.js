/* ==========================================================================
   PROJECT HEAT WAVES (NEWSLETTER) — ENGINE & INTERACTIVE CONTROLLER
   ========================================================================== */

// Global State
const STATE = {
    pdfDoc: null,
    pdfPath: 'EYP Rubrix.pdf', // Default loaded sample rubric newsletter PDF
    pageFlip: null,
    currentPage: 1,
    totalPages: 0,
    zoomScale: 1.0,
    renderScale: 2.2, // High-DPI render multiplier for crystal-clear readable text
    soundEnabled: true,
    isDarkMode: true,
    searchIndex: [],
    audioCtx: null
};

// DOM References
const DOM = {
    loadingScreen: document.getElementById('loading-screen'),
    loadingProgress: document.getElementById('loading-progress'),
    loadingStatus: document.getElementById('loading-status'),
    heroScreen: document.getElementById('hero-screen'),
    readerScreen: document.getElementById('reader-screen'),
    btnOpenReader: document.getElementById('btn-open-reader'),
    btnHeroContents: document.getElementById('btn-hero-contents'),
    btnBackHero: document.getElementById('btn-back-hero'),
    pdfUploadInput: document.getElementById('pdf-upload-input'),
    flipbookViewport: document.getElementById('flipbook-viewport'),
    flipbookWrapper: document.getElementById('flipbook'),
    tbPageStatus: document.getElementById('tb-page-status'),
    tbCurrentPageInput: document.getElementById('tb-current-page-input'),
    tbTotalPagesLabel: document.getElementById('tb-total-pages-label'),
    tbPrevPage: document.getElementById('tb-prev-page'),
    tbNextPage: document.getElementById('tb-next-page'),
    tbZoomIn: document.getElementById('tb-zoom-in'),
    tbZoomOut: document.getElementById('tb-zoom-out'),
    tbZoomReset: document.getElementById('tb-zoom-reset'),
    tbZoomLevel: document.getElementById('tb-zoom-level'),
    tbToggleToc: document.getElementById('tb-toggle-toc'),
    tbToggleSearch: document.getElementById('tb-toggle-search'),
    tbToggleSound: document.getElementById('tb-toggle-sound'),
    tbToggleTheme: document.getElementById('tb-toggle-theme'),
    tbToggleFullscreen: document.getElementById('tb-toggle-fullscreen'),
    progressBar: document.getElementById('reading-progress-bar'),
    hero3dCard: document.getElementById('hero-3d-card'),
    heroReadTime: document.getElementById('hero-read-time'),
    tocModal: document.getElementById('toc-modal'),
    tocBackdrop: document.getElementById('toc-backdrop'),
    btnCloseToc: document.getElementById('btn-close-toc'),
    tocGrid: document.getElementById('toc-grid'),
    searchModal: document.getElementById('search-modal'),
    searchInput: document.getElementById('search-input'),
    searchResultsContainer: document.getElementById('search-results-container'),
    searchResultsCount: document.getElementById('search-results-count'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    btnClearSearch: document.getElementById('btn-clear-search')
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initAudioEngine();
    initHeroParallax();
    initEventListeners();
    loadPdfDocument(STATE.pdfPath);
});

// ==========================================================================
// REALISTIC PAGE FLIP AUDIO SYNTHESIZER (Web Audio API)
// Creates an authentic paper rustle without relying on external media files.
// ==========================================================================
function initAudioEngine() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
}

function playPageFlipSound() {
    if (!STATE.soundEnabled) return;
    
    try {
        if (!STATE.audioCtx) {
            STATE.audioCtx = new AudioContext();
        }
        if (STATE.audioCtx.state === 'suspended') {
            STATE.audioCtx.resume();
        }

        const ctx = STATE.audioCtx;
        const bufferSize = ctx.sampleRate * 0.18; // 180ms paper flip audio duration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);

        // Generate white/pink noise burst representing paper friction
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        // Bandpass filter to model authentic paper friction resonance
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        filter.Q.value = 1.8;

        // Envelope Gain
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.17);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
    } catch (e) {
        console.warn('Audio playback error:', e);
    }
}

// ==========================================================================
// PDF ENGINE & HIGH-DPI RENDERER
// ==========================================================================
async function loadPdfDocument(src) {
    updateLoadingProgress(10, "LOADING PDF DOCUMENT...");
    
    try {
        const loadingTask = pdfjsLib.getDocument(src);
        loadingTask.onProgress = (data) => {
            if (data.total > 0) {
                const percent = Math.round((data.loaded / data.total) * 60);
                updateLoadingProgress(10 + percent, `LOADING CONTENT... ${percent}%`);
            }
        };

        STATE.pdfDoc = await loadingTask.promise;
        STATE.totalPages = STATE.pdfDoc.numPages;

        DOM.tbTotalPagesLabel.textContent = `/ ${STATE.totalPages}`;
        DOM.tbCurrentPageInput.max = STATE.totalPages;

        updateLoadingProgress(75, "INDEXING SEARCH TEXT...");
        await indexPdfText();

        updateLoadingProgress(85, "GENERATING RENDER PAGES...");
        await buildPageFlipElements();

        updateLoadingProgress(100, "READY!");
        setTimeout(() => {
            DOM.loadingScreen.classList.add('fade-out');
        }, 400);

    } catch (error) {
        console.error('Error loading PDF:', error);
        DOM.loadingStatus.textContent = 'ERROR LOADING PDF DOCUMENT';
        DOM.loadingStatus.style.color = 'var(--accent-fire)';
    }
}

function updateLoadingProgress(percent, text) {
    DOM.loadingProgress.style.width = `${percent}%`;
    if (text) DOM.loadingStatus.textContent = text;
}

// Build crisp render canvas elements for each page
async function buildPageFlipElements() {
    DOM.flipbookWrapper.innerHTML = '';
    
    // First Page dimensions establish reader ratio
    const samplePage = await STATE.pdfDoc.getPage(1);
    const viewport = samplePage.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    for (let pageNum = 1; pageNum <= STATE.totalPages; pageNum++) {
        const pageSheet = document.createElement('div');
        pageSheet.className = 'page-sheet';
        pageSheet.setAttribute('data-page-num', pageNum);

        const canvas = document.createElement('canvas');
        pageSheet.appendChild(canvas);
        DOM.flipbookWrapper.appendChild(pageSheet);

        // High DPI Crisp Rendering
        await renderPageCanvas(pageNum, canvas);
    }

    // Initialize PageFlip.js with realistic paper settings
    if (STATE.pageFlip) {
        STATE.pageFlip.destroy();
    }

    STATE.pageFlip = new St.PageFlip(DOM.flipbookWrapper, {
        width: pageWidth,
        height: pageHeight,
        size: 'stretch',
        minWidth: 320,
        maxWidth: 1000,
        minHeight: 420,
        maxHeight: 1350,
        maxShadowOpacity: 0.6,
        showCover: true,
        mobileScrollSupport: false,
        useMouseEvents: true,
        flippingTime: 800
    });

    STATE.pageFlip.loadFromHTML(document.querySelectorAll('.page-sheet'));

    // Flip Event Handlers
    STATE.pageFlip.on('flip', (e) => {
        STATE.currentPage = e.data + 1;
        updateUIState();
        playPageFlipSound();
    });
}

// High-DPI Crisp Canvas Rendering Engine
async function renderPageCanvas(pageNum, canvas) {
    const page = await STATE.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: STATE.renderScale });
    
    const context = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    await page.render(renderContext).promise;
}

// Full Text Search Indexer
async function indexPdfText() {
    STATE.searchIndex = [];
    let totalWords = 0;

    for (let i = 1; i <= STATE.totalPages; i++) {
        const page = await STATE.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        
        totalWords += text.split(/\s+/).length;
        STATE.searchIndex.push({
            pageNum: i,
            text: text
        });
    }

    // Calculate Reading Time (Avg 200 wpm)
    const readTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));
    DOM.heroReadTime.textContent = `${readTimeMinutes} MIN`;
}

// ==========================================================================
// USER INTERFACE CONTROLLER & INTERACTION HANDLERS
// ==========================================================================
function updateUIState() {
    DOM.tbPageStatus.textContent = `PAGE ${STATE.currentPage} OF ${STATE.totalPages}`;
    DOM.tbCurrentPageInput.value = STATE.currentPage;

    // Update Progress Indicator
    const progressPercent = (STATE.currentPage / STATE.totalPages) * 100;
    DOM.progressBar.style.width = `${progressPercent}%`;
}

function initEventListeners() {
    // Reader Navigation Transitions
    DOM.btnOpenReader.addEventListener('click', openReader);
    DOM.btnHeroContents.addEventListener('click', () => {
        openReader();
        openTocModal();
    });
    DOM.btnBackHero.addEventListener('click', closeReader);

    // Custom PDF Upload
    DOM.pdfUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            DOM.loadingScreen.classList.remove('fade-out');
            const fileUrl = URL.createObjectURL(file);
            loadPdfDocument(fileUrl);
        }
    });

    // Navigation Controls
    DOM.tbPrevPage.addEventListener('click', () => STATE.pageFlip.flipPrev());
    DOM.tbNextPage.addEventListener('click', () => STATE.pageFlip.flipNext());
    
    DOM.tbCurrentPageInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val >= 1 && val <= STATE.totalPages) {
            STATE.pageFlip.turnToPage(val - 1);
        }
    });

    // Zoom Controls
    DOM.tbZoomIn.addEventListener('click', () => setZoom(STATE.zoomScale + 0.15));
    DOM.tbZoomOut.addEventListener('click', () => setZoom(STATE.zoomScale - 0.15));
    DOM.tbZoomReset.addEventListener('click', () => setZoom(1.0));

    // Drawer / TOC Modals
    DOM.tbToggleToc.addEventListener('click', openTocModal);
    DOM.btnCloseToc.addEventListener('click', closeTocModal);
    DOM.tocBackdrop.addEventListener('click', closeTocModal);

    // Search Dialog
    DOM.tbToggleSearch.addEventListener('click', openSearchModal);
    DOM.btnCloseSearch.addEventListener('click', closeSearchModal);
    DOM.searchInput.addEventListener('input', handleSearchInput);
    DOM.btnClearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        handleSearchInput();
    });

    // Toggles
    DOM.tbToggleSound.addEventListener('click', () => {
        STATE.soundEnabled = !STATE.soundEnabled;
        DOM.tbToggleSound.classList.toggle('active', STATE.soundEnabled);
    });

    DOM.tbToggleTheme.addEventListener('click', toggleTheme);

    DOM.tbToggleFullscreen.addEventListener('click', toggleFullscreen);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (DOM.readerScreen.classList.contains('hidden')) return;

        if (e.key === 'ArrowRight' || e.key === ' ') {
            STATE.pageFlip.flipNext();
        } else if (e.key === 'ArrowLeft') {
            STATE.pageFlip.flipPrev();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            openSearchModal();
        } else if (e.key === 'Escape') {
            closeSearchModal();
            closeTocModal();
        }
    });
}

// Mode Transitions
function openReader() {
    DOM.heroScreen.style.display = 'none';
    DOM.readerScreen.classList.remove('hidden');
    updateUIState();
}

function closeReader() {
    DOM.readerScreen.classList.add('hidden');
    DOM.heroScreen.style.display = 'flex';
}

function setZoom(scale) {
    STATE.zoomScale = Math.min(Math.max(scale, 0.75), 2.0);
    DOM.flipbookViewport.style.transform = `scale(${STATE.zoomScale})`;
    DOM.tbZoomLevel.textContent = `${Math.round(STATE.zoomScale * 100)}%`;
}

function toggleTheme() {
    STATE.isDarkMode = !STATE.isDarkMode;
    document.documentElement.setAttribute('data-theme', STATE.isDarkMode ? 'dark' : 'light');
    DOM.tbToggleTheme.querySelector('i').className = STATE.isDarkMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// ==========================================================================
// TOC DRAWER & THUMBNAIL RENDERER
// ==========================================================================
async function openTocModal() {
    DOM.tocModal.classList.remove('hidden');
    if (DOM.tocGrid.children.length === 0) {
        await generateThumbnails();
    }
}

function closeTocModal() {
    DOM.tocModal.classList.add('hidden');
}

async function generateThumbnails() {
    DOM.tocGrid.innerHTML = '';

    for (let pageNum = 1; pageNum <= STATE.totalPages; pageNum++) {
        const thumbCard = document.createElement('div');
        thumbCard.className = 'thumb-card';
        
        const canvas = document.createElement('canvas');
        thumbCard.appendChild(canvas);

        const meta = document.createElement('div');
        meta.className = 'thumb-meta';
        meta.innerHTML = `<span>Page ${pageNum}</span><i class="fa-solid fa-chevron-right"></i>`;
        thumbCard.appendChild(meta);

        thumbCard.addEventListener('click', () => {
            STATE.pageFlip.turnToPage(pageNum - 1);
            closeTocModal();
        });

        DOM.tocGrid.appendChild(thumbCard);

        // Render scaled down crisp preview
        const page = await STATE.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.3 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
}

// ==========================================================================
// HIGH-PERFORMANCE SEARCH ENGINE
// ==========================================================================
function openSearchModal() {
    DOM.searchModal.showModal();
    DOM.searchInput.focus();
}

function closeSearchModal() {
    DOM.searchModal.close();
}

function handleSearchInput() {
    const query = DOM.searchInput.value.trim().toLowerCase();
    DOM.btnClearSearch.classList.toggle('hidden', query.length === 0);

    if (query.length < 2) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-newspaper"></i>
                <p>Type keywords to search through Project Heat Waves newsletter content.</p>
            </div>`;
        DOM.searchResultsCount.textContent = '0 matches found';
        return;
    }

    const matches = [];
    STATE.searchIndex.forEach(item => {
        const idx = item.text.toLowerCase().indexOf(query);
        if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(item.text.length, idx + 80);
            const snippet = item.text.substring(start, end);
            matches.push({ pageNum: item.pageNum, snippet: snippet, query: query });
        }
    });

    DOM.searchResultsCount.textContent = `${matches.length} matches found`;

    if (matches.length === 0) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-face-frown"></i>
                <p>No results found for "${query}"</p>
            </div>`;
        return;
    }

    DOM.searchResultsContainer.innerHTML = matches.map(m => {
        const highlighted = m.snippet.replace(
            new RegExp(m.query, 'gi'),
            match => `<mark>${match}</mark>`
        );
        return `
            <div class="search-result-item" onclick="jumpToPage(${m.pageNum})">
                <div class="search-result-header">
                    <span>PAGE ${m.pageNum}</span>
                    <i class="fa-solid fa-arrow-right-long"></i>
                </div>
                <div class="search-result-snippet">"...${highlighted}..."</div>
            </div>`;
    }).join('');
}

window.jumpToPage = function(pageNum) {
    STATE.pageFlip.turnToPage(pageNum - 1);
    closeSearchModal();
};

// ==========================================================================
// HERO 3D PARALLAX INTERACTION
// ==========================================================================
function initHeroParallax() {
    const card = DOM.hero3dCard;
    if (!card) return;

    document.addEventListener('mousemove', (e) => {
        if (DOM.heroScreen.style.display === 'none') return;

        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
        
        card.style.transform = `rotateY(${xAxis - 15}deg) rotateX(${yAxis + 8}deg)`;
    });
}