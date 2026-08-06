/* ==========================================================================
   PROJECT HEAT WAVES — DIGITAL MAGAZINE ENGINE (STANDALONE)
   ========================================================================== */

// 1. EDITORIAL CONTENT DATABASE (Zero external PDF required)
const MAGAZINE_PAGES = [
    {
        pageNumber: 1,
        title: "PROJECT HEAT WAVES",
        category: "COVER ISSUE • 2026",
        headline: "ATHLETIC VELOCITY & HYPER PERFORMANCE",
        body: "Official digital issue covering sports science, biomechanics, recovery protocols, and tactical operational analytics.",
        stats: [
            { label: "VELOCITY", value: "+38%" },
            { label: "AGILITY", value: "99.4%" },
            { label: "EFFICIENCY", value: "MAX" }
        ],
        themeColor: "#ff2a44"
    },
    {
        pageNumber: 2,
        title: "TABLE OF CONTENTS",
        category: "EDITORIAL INDEX",
        headline: "INSIDE THIS EDITION",
        body: "01. Velocity Engine Breakdown\n02. Biomechanics & Tactical Training\n03. Recovery Science & Hydration\n04. Performance Analytics & Metrics\n05. Continuous Improvement Strategy",
        stats: [
            { label: "ARTICLES", value: "05" },
            { label: "READ TIME", value: "5 MIN" },
            { label: "FORMAT", value: "HD CANVAS" }
        ],
        themeColor: "#00f0ff"
    },
    {
        pageNumber: 3,
        title: "VELOCITY ENGINE",
        category: "TACTICAL BREAKDOWN",
        headline: "EXPLOSIVE ACCELERATION DYNAMICS",
        body: "Maximum velocity is achieved through optimized ground contact time, hips extension angle, and stride frequency synchronization. Elite athletes exhibit a stride efficiency rating exceeding 94.2%.",
        stats: [
            { label: "CONTACT TIME", value: "0.08s" },
            { label: "FORCE", value: "4.2kN" },
            { label: "CADENCE", value: "260 steps/m" }
        ],
        themeColor: "#ff2a44"
    },
    {
        pageNumber: 4,
        title: "BIOMECHANICS",
        category: "HUMAN KINETICS",
        headline: "NEUROMUSCULAR EFFICIENCY",
        body: "Analyzing kinetic chain sequencing during peak deceleration and acceleration transitions. Structural alignment reduces joint shear stress while multiplying output force.",
        stats: [
            { label: "STRESS INHIBITION", value: "-24%" },
            { label: "TORQUE", value: "480 Nm" },
            { label: "LOAD BAL", value: "50/50" }
        ],
        themeColor: "#ffbe0b"
    },
    {
        pageNumber: 5,
        title: "RECOVERY SCIENCE",
        category: "PHYSIOLOGY",
        headline: "HYPERBARIC & CRYOGENIC PROTOCOLS",
        body: "Targeted cell oxygenation accelerates glycogen replenishment by 300%. Optimal sleep architecture combined with precise electrolyte balance forms the foundation of sustained performance.",
        stats: [
            { label: "RECOVERY RATE", value: "2.4x" },
            { label: "LACTATE FLUSH", value: "< 12m" },
            { label: "HRV INDEX", value: "115 ms" }
        ],
        themeColor: "#00f0ff"
    },
    {
        pageNumber: 6,
        title: "ANALYTICS SUMMARY",
        category: "FINAL REVIEW",
        headline: "CONTINUOUS IMPROVEMENT MODEL",
        body: "Thank you for reading Project Heat Waves. Apply these operational guidelines to optimize training regimens and achieve peak competitive athletic execution.",
        stats: [
            { label: "OVERALL GRADE", value: "A+" },
            { label: "STATUS", value: "VERIFIED" },
            { label: "ISSUE", value: "#24 COMPLETE" }
        ],
        themeColor: "#ff2a44"
    }
];

// 2. APPLICATION STATE
const STATE = {
    pageFlip: null,
    currentPage: 1,
    totalPages: MAGAZINE_PAGES.length,
    soundEnabled: true,
    audioCtx: null,
    isDarkMode: true
};

// 3. DOM ELEMENTS
const DOM = {
    heroScreen: document.getElementById('hero-screen'),
    readerScreen: document.getElementById('reader-screen'),
    btnOpenReader: document.getElementById('btn-open-reader'),
    btnHeroContents: document.getElementById('btn-hero-contents'),
    btnBackHero: document.getElementById('btn-back-hero'),
    flipbookWrapper: document.getElementById('flipbook'),
    tbPageStatus: document.getElementById('tb-page-status'),
    tbCurrentPageInput: document.getElementById('tb-current-page-input'),
    tbTotalPagesLabel: document.getElementById('tb-total-pages-label'),
    tbPrevPage: document.getElementById('tb-prev-page'),
    tbNextPage: document.getElementById('tb-next-page'),
    tbToggleToc: document.getElementById('tb-toggle-toc'),
    tbToggleSearch: document.getElementById('tb-toggle-search'),
    tbToggleSound: document.getElementById('tb-toggle-sound'),
    tbToggleTheme: document.getElementById('tb-toggle-theme'),
    tbToggleFullscreen: document.getElementById('tb-toggle-fullscreen'),
    progressBar: document.getElementById('reading-progress-bar'),
    hero3dCard: document.getElementById('hero-3d-card'),
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
    init3dParallax();
    initMagazinePages();
    initEventListeners();
});

// Real-time Web Audio Synthesizer for Paper Turning Sound
function playPageFlipSound() {
    if (!STATE.soundEnabled) return;
    try {
        if (!STATE.audioCtx) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            STATE.audioCtx = new AudioContext();
        }
        if (STATE.audioCtx.state === 'suspended') STATE.audioCtx.resume();

        const ctx = STATE.audioCtx;
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
    } catch (e) {
        console.warn("Audio blocked or unsupported:", e);
    }
}

// ==========================================================================
// CANVAS EDITORIAL PAGE GENERATOR (Ultra High Readability)
// ==========================================================================
function drawMagazinePageCanvas(canvas, pageData) {
    const width = 600;
    const height = 820;

    canvas.width = width * 2; // HD Retina resolution
    canvas.height = height * 2;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Top Accent Stripe
    ctx.fillStyle = pageData.themeColor;
    ctx.fillRect(40, 35, width - 80, 6);

    // Category Tag
    ctx.fillStyle = pageData.themeColor;
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillText(pageData.category, 40, 65);

    // Main Header Title
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 28px "Space Grotesk", sans-serif';
    ctx.fillText(pageData.title, 40, 100);

    // Editorial Content Box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 125, width - 80, 480);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 125, width - 80, 480);

    // Article Headline
    ctx.fillStyle = '#1e293b';
    ctx.font = '700 18px "Space Grotesk", sans-serif';
    ctx.fillText(pageData.headline, 60, 165);

    // Divider Line
    ctx.strokeStyle = pageData.themeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(160, 180);
    ctx.stroke();

    // Body Copy (Word Wrap)
    ctx.fillStyle = '#334155';
    ctx.font = '14px "Inter", sans-serif';
    
    const words = pageData.body.split(' ');
    let line = '';
    let y = 215;
    const maxWidth = width - 120;
    const lineHeight = 22;

    for (let i = 0; i < words.length; i++) {
        if (words[i].includes('\n')) {
            const parts = words[i].split('\n');
            line += parts[0];
            ctx.fillText(line, 60, y);
            line = parts[1] + ' ';
            y += lineHeight * 1.5;
            continue;
        }
        
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, 60, y);
            line = words[i] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, 60, y);

    // Stats Grid Box
    const statBoxY = 625;
    const statBoxWidth = (width - 80 - 20) / 3;

    pageData.stats.forEach((stat, idx) => {
        const x = 40 + idx * (statBoxWidth + 10);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, statBoxY, statBoxWidth, 110);

        ctx.fillStyle = pageData.themeColor;
        ctx.font = '800 20px "Syncopate", sans-serif';
        ctx.fillText(stat.value, x + 15, statBoxY + 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 9px "Space Grotesk", sans-serif';
        ctx.fillText(stat.label, x + 15, statBoxY + 80);
    });

    // Page Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillText('PROJECT HEAT WAVES • OFFICIAL EDITION', 40, height - 35);
    ctx.fillText(`PAGE 0${pageData.pageNumber}`, width - 100, height - 35);
}

// Build Flipbook Elements
function initMagazinePages() {
    DOM.flipbookWrapper.innerHTML = '';
    DOM.tocGrid.innerHTML = '';

    MAGAZINE_PAGES.forEach((pageData) => {
        // Build Page Element
        const pageSheet = document.createElement('div');
        pageSheet.className = 'page-sheet';
        pageSheet.setAttribute('data-page-num', pageData.pageNumber);

        const canvas = document.createElement('canvas');
        drawMagazinePageCanvas(canvas, pageData);
        pageSheet.appendChild(canvas);
        DOM.flipbookWrapper.appendChild(pageSheet);

        // Build TOC Thumbnail
        const thumbCard = document.createElement('div');
        thumbCard.className = 'thumb-card';
        thumbCard.addEventListener('click', () => {
            closeTocModal();
            if (STATE.pageFlip) {
                STATE.pageFlip.turnToPage(pageData.pageNumber - 1);
            }
        });

        const thumbCanvas = document.createElement('canvas');
        drawMagazinePageCanvas(thumbCanvas, pageData);

        const thumbMeta = document.createElement('div');
        thumbMeta.className = 'thumb-meta';
        thumbMeta.innerHTML = `<span>Page ${pageData.pageNumber}</span><span style="color:${pageData.themeColor}">${pageData.title}</span>`;

        thumbCard.appendChild(thumbCanvas);
        thumbCard.appendChild(thumbMeta);
        DOM.tocGrid.appendChild(thumbCard);
    });

    // Initialize St.PageFlip
    if (STATE.pageFlip) STATE.pageFlip.destroy();

    STATE.pageFlip = new St.PageFlip(DOM.flipbookWrapper, {
        width: 600,
        height: 820,
        size: 'stretch',
        minWidth: 320,
        maxWidth: 900,
        minHeight: 420,
        maxHeight: 1250,
        maxShadowOpacity: 0.5,
        showCover: true,
        useMouseEvents: true,
        flippingTime: 700
    });

    STATE.pageFlip.loadFromHTML(document.querySelectorAll('.page-sheet'));

    STATE.pageFlip.on('flip', (e) => {
        STATE.currentPage = e.data + 1;
        updateUI();
        playPageFlipSound();
    });
}

function updateUI() {
    DOM.tbPageStatus.textContent = `PAGE ${STATE.currentPage} OF ${STATE.totalPages}`;
    DOM.tbCurrentPageInput.value = STATE.currentPage;

    const progress = (STATE.currentPage / STATE.totalPages) * 100;
    DOM.progressBar.style.width = `${progress}%`;
}

// Navigation & Screen Control
function openReader() {
    DOM.heroScreen.classList.add('hidden');
    DOM.readerScreen.classList.remove('hidden');
    updateUI();
}

function closeReader() {
    DOM.readerScreen.classList.add('hidden');
    DOM.heroScreen.classList.remove('hidden');
}

function openTocModal() {
    DOM.tocModal.classList.remove('hidden');
}

function closeTocModal() {
    DOM.tocModal.classList.add('hidden');
}

function openSearchModal() {
    DOM.searchModal.showModal();
    DOM.searchInput.focus();
}

function closeSearchModal() {
    DOM.searchModal.close();
}

function handleSearch(query) {
    const q = query.trim().toLowerCase();
    DOM.searchResultsContainer.innerHTML = '';

    if (!q) {
        DOM.searchResultsCount.textContent = '0 matches found';
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-newspaper"></i>
                <p>Type keywords to search through the issue.</p>
            </div>`;
        return;
    }

    const matches = MAGAZINE_PAGES.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.body.toLowerCase().includes(q) || 
        p.headline.toLowerCase().includes(q)
    );

    DOM.searchResultsCount.textContent = `${matches.length} matches found`;

    if (matches.length === 0) {
        DOM.searchResultsContainer.innerHTML = `
            <div class="search-empty-state">
                <i class="fa-solid fa-face-frown"></i>
                <p>No results matching "${query}"</p>
            </div>`;
        return;
    }

    matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-header">
                <span>PAGE ${match.pageNumber} • ${match.title}</span>
                <i class="fa-solid fa-chevron-right"></i>
            </div>
            <div class="search-result-snippet">${match.headline}</div>
        `;
        item.addEventListener('click', () => {
            closeSearchModal();
            STATE.pageFlip.turnToPage(match.pageNumber - 1);
        });
        DOM.searchResultsContainer.appendChild(item);
    });
}

// 3D Tilt Effect on Hero Screen
function init3dParallax() {
    const card = DOM.hero3dCard;
    if (!card) return;

    document.addEventListener('mousemove', (e) => {
        if (DOM.heroScreen.classList.contains('hidden')) return;

        const x = (window.innerWidth / 2 - e.pageX) / 30;
        const y = (window.innerHeight / 2 - e.pageY) / 30;

        card.style.transform = `rotateY(${x - 18}deg) rotateX(${y + 8}deg)`;
    });
}

// Event Listeners Binding
function initEventListeners() {
    DOM.btnOpenReader.addEventListener('click', openReader);
    DOM.btnHeroContents.addEventListener('click', () => {
        openReader();
        openTocModal();
    });
    DOM.btnBackHero.addEventListener('click', closeReader);

    // Controls
    DOM.tbPrevPage.addEventListener('click', () => STATE.pageFlip.flipPrev());
    DOM.tbNextPage.addEventListener('click', () => STATE.pageFlip.flipNext());

    DOM.tbCurrentPageInput.addEventListener('change', (e) => {
        const page = parseInt(e.target.value);
        if (page >= 1 && page <= STATE.totalPages) {
            STATE.pageFlip.turnToPage(page - 1);
        }
    });

    // Modals
    DOM.tbToggleToc.addEventListener('click', openTocModal);
    DOM.btnCloseToc.addEventListener('click', closeTocModal);
    DOM.tocBackdrop.addEventListener('click', closeTocModal);

    DOM.tbToggleSearch.addEventListener('click', openSearchModal);
    DOM.btnCloseSearch.addEventListener('click', closeSearchModal);
    DOM.searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    // Audio & Theme Toggles
    DOM.tbToggleSound.addEventListener('click', () => {
        STATE.soundEnabled = !STATE.soundEnabled;
        DOM.tbToggleSound.classList.toggle('active', STATE.soundEnabled);
    });

    DOM.tbToggleTheme.addEventListener('click', () => {
        STATE.isDarkMode = !STATE.isDarkMode;
        document.documentElement.setAttribute('data-theme', STATE.isDarkMode ? 'dark' : 'light');
        DOM.tbToggleTheme.querySelector('i').className = STATE.isDarkMode ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });

    DOM.tbToggleFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    // Keyboard Hotkeys
    document.addEventListener('keydown', (e) => {
        if (!DOM.readerScreen.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') STATE.pageFlip.flipPrev();
            if (e.key === 'ArrowRight') STATE.pageFlip.flipNext();
            if (e.key === 'Escape') {
                closeTocModal();
                closeSearchModal();
            }
        }
    });
}