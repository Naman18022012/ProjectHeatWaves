/**
 * HEAT WAVES — Digital Publication Platform Engine
 * Fully Redesigned UI/UX Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Multi-Issue Archive Database Support
    const ISSUES_DATABASE = [
        {
            id: 'august-2026',
            vol: 'VOL. 04',
            title: 'The Summer Reflection',
            subtitle: 'An exploration of student perspectives, contemporary art, and creative discourse.',
            date: 'August 2026',
            pdfPath: './pages/document.pdf'
        },
        {
            id: 'september-2026',
            vol: 'VOL. 05',
            title: 'Autumn Horizons',
            subtitle: 'Navigating campus innovations, architecture, and technology.',
            date: 'September 2026',
            pdfPath: './pages/september-2026.pdf'
        }
    ];

    let currentIssue = ISSUES_DATABASE[0];
    let pageFlip = null;
    let pdfDoc = null;
    let textContentCache = [];

    // DOM Elements
    const landingScreen = document.getElementById('landing-screen');
    const btnOpenIssue = document.getElementById('btn-open-issue');
    const loader = document.getElementById('loader');
    const loaderProgress = document.getElementById('loader-progress');
    const loaderStatus = document.getElementById('loader-status');
    const flipbookElem = document.getElementById('flipbook');
    const pageCurrent = document.getElementById('page-current');
    const pageTotal = document.getElementById('page-total');
    const pageScrubber = document.getElementById('page-scrubber');

    // Modals
    const searchModal = document.getElementById('search-modal');
    const archiveModal = document.getElementById('archive-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const archiveGrid = document.getElementById('archive-grid');

    // Initial Setup
    initLandingPreview();
    setupEventListeners();
    buildArchiveUI();

    /**
     * Pre-renders cover artwork on Landing Screen hero preview
     */
    async function initLandingPreview() {
        try {
            pdfDoc = await pdfjsLib.getDocument(currentIssue.pdfPath).promise;
            const page = await pdfDoc.getPage(1);
            const canvas = document.getElementById('cover-canvas');
            const viewport = page.getViewport({ scale: 1.0 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        } catch (e) {
            console.warn('Cover preview pre-render failed. Will render upon issue opening.', e);
        }
    }

    /**
     * Transition from Landing Experience to Reader Stage
     */
    btnOpenIssue.addEventListener('click', async () => {
        landingScreen.classList.add('dismissed');
        await loadPublication(currentIssue.pdfPath);
    });

    /**
     * PDF Loading & Page Rendering Engine
     */
    async function loadPublication(pdfPath) {
        loader.style.opacity = '1';
        loader.style.display = 'flex';
        updateLoader(10, 'Fetching publication document...');

        try {
            pdfDoc = await pdfjsLib.getDocument(pdfPath).promise;
            const totalPages = pdfDoc.numPages;
            flipbookElem.innerHTML = '';
            textContentCache = [];

            for (let i = 1; i <= totalPages; i++) {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                
                const canvas = document.createElement('canvas');
                pageDiv.appendChild(canvas);
                flipbookElem.appendChild(pageDiv);

                await renderPage(i, canvas);
                updateLoader(10 + Math.floor((i / totalPages) * 70), `Rendering page ${i} of ${totalPages}`);
            }

            updateLoader(90, 'Initializing 3D paper physics...');
            initStPageFlip();
            cachePDFText(totalPages);

            updateLoader(100, 'Complete');
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 600);
            }, 300);

        } catch (err) {
            console.error('Failed to load publication PDF:', err);
            loaderStatus.innerText = 'Unable to load PDF document.';
        }
    }

    async function renderPage(pageNum, canvas) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
    }

    function updateLoader(percentage, text) {
        loaderProgress.style.width = `${percentage}%`;
        loaderStatus.innerText = text;
    }

    /**
     * StPageFlip Physics Initialization
     */
    function initStPageFlip() {
        if (pageFlip) pageFlip.destroy();

        const isMobile = window.innerWidth < 768;

        pageFlip = new St.PageFlip(flipbookElem, {
            width: 550,
            height: 733,
            size: "stretch",
            minWidth: 320,
            maxWidth: 900,
            minHeight: 420,
            maxHeight: 1200,
            maxShadowOpacity: 0.4,
            showCover: true,
            usePortrait: isMobile,
            flippingTime: 800
        });

        pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));

        const total = pageFlip.getPageCount();
        pageTotal.innerText = total;
        pageScrubber.max = total;

        pageFlip.on('flip', (e) => {
            const current = e.data + 1;
            pageCurrent.innerText = current;
            pageScrubber.value = current;
        });
    }

    /**
     * Search & Text Indexing
     */
    async function cachePDFText(totalPages) {
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            textContentCache.push({ page: i, text });
        }
    }

    function executeSearch(query) {
        searchResults.innerHTML = '';
        if (!query.trim()) {
            searchResults.innerHTML = '<div class="empty-state">Type a keyword to search this issue...</div>';
            return;
        }

        const matches = textContentCache.filter(item => item.text.toLowerCase().includes(query.toLowerCase()));

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="empty-state">No matching text found.</div>';
            return;
        }

        matches.forEach(match => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const idx = match.text.toLowerCase().indexOf(query.toLowerCase());
            const snippet = match.text.substring(Math.max(0, idx - 25), Math.min(match.text.length, idx + 35));

            item.innerHTML = `
                <span>"...${snippet}..."</span>
                <span class="result-page-tag">Page ${match.page}</span>
            `;

            item.addEventListener('click', () => {
                pageFlip.turnToPage(match.page - 1);
                searchModal.classList.remove('active');
            });

            searchResults.appendChild(item);
        });
    }

    /**
     * Archive UI Builder
     */
    function buildArchiveUI() {
        archiveGrid.innerHTML = '';
        ISSUES_DATABASE.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.innerHTML = `
                <h4>${issue.title}</h4>
                <p>${issue.date} &bull; ${issue.vol}</p>
            `;
            card.addEventListener('click', () => {
                currentIssue = issue;
                archiveModal.classList.remove('active');
                loadPublication(issue.pdfPath);
            });
            archiveGrid.appendChild(card);
        });
    }

    /**
     * Keyboard Shortcuts & Event Handlers
     */
    function setupEventListeners() {
        // Search trigger keyboard shortcut (Cmd+K / Ctrl+K)
        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchModal.classList.add('active');
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                searchModal.classList.remove('active');
                archiveModal.classList.remove('active');
            }
            if (pageFlip) {
                if (e.key === 'ArrowRight') pageFlip.flipNext();
                if (e.key === 'ArrowLeft') pageFlip.flipPrev();
            }
        });

        document.getElementById('btn-search-trigger').addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
        });

        document.getElementById('btn-archive-trigger').addEventListener('click', () => {
            archiveModal.classList.add('active');
        });

        document.getElementById('close-archive').addEventListener('click', () => {
            archiveModal.classList.remove('active');
        });

        searchInput.addEventListener('input', (e) => {
            executeSearch(e.target.value);
        });

        // Floating Reader Bar Arrow Controls
        document.getElementById('btn-prev-page').addEventListener('click', () => pageFlip && pageFlip.flipPrev());
        document.getElementById('btn-next-page').addEventListener('click', () => pageFlip && pageFlip.flipNext());
        
        pageScrubber.addEventListener('input', (e) => {
            if (pageFlip) pageFlip.turnToPage(parseInt(e.target.value) - 1);
        });

        // Fullscreen Toggle
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
        });
    }
});