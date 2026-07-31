/**
 * HEAT WAVES — Digital Publication Controller
 * Robust Page Flip + Automatic Fallback Rendering
 */

document.addEventListener('DOMContentLoaded', () => {

    // Configure PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const CONFIG = {
        pdfPath: './pages/document.pdf',
        issues: [
            { id: 'aug-2026', title: 'Summer Edition', date: 'August 2026', path: './pages/document.pdf' },
            { id: 'sep-2026', title: 'Campus & Tech', date: 'September 2026', path: './pages/september-2026.pdf' }
        ]
    };

    let pageFlip = null;
    let pdfDoc = null;
    let textIndex = [];

    // Elements
    const landingView = document.getElementById('landing-view');
    const readerView = document.getElementById('reader-view');
    const loader = document.getElementById('loader');
    const loaderStatus = document.getElementById('loader-status');
    const flipbookElem = document.getElementById('flipbook');
    const currPageElem = document.getElementById('curr-page');
    const totalPagesElem = document.getElementById('total-pages');
    const pageSlider = document.getElementById('page-slider');

    // Modals
    const searchModal = document.getElementById('search-modal');
    const archiveModal = document.getElementById('archive-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const archiveList = document.getElementById('archive-list');

    // Init landing cover preview
    tryRenderLandingCover();
    setupEvents();
    buildArchiveList();

    // CTA Click -> Open Issue
    document.getElementById('btn-read-now').addEventListener('click', async () => {
        landingView.classList.add('dismissed');
        setTimeout(() => {
            landingView.style.display = 'none';
            readerView.classList.remove('hidden');
            initPublication(CONFIG.pdfPath);
        }, 400);
    });

    /**
     * Try rendering PDF. If missing/blocked, build beautiful interactive HTML fallback!
     */
    async function initPublication(pdfUrl) {
        loader.style.display = 'flex';
        loaderStatus.innerText = 'Loading pages...';

        let success = false;

        try {
            if (typeof pdfjsLib !== 'undefined') {
                pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                await renderPdfPages(pdfDoc);
                success = true;
            }
        } catch (e) {
            console.warn('PDF load skipped or file missing. Loading fallback demo issue.', e);
        }

        if (!success) {
            renderFallbackPages();
        }

        initFlipEngine();
        loader.style.display = 'none';
    }

    /**
     * Render PDF Canvases into DOM
     */
    async function renderPdfPages(pdf) {
        flipbookElem.innerHTML = '';
        textIndex = [];
        const count = pdf.numPages;

        for (let i = 1; i <= count; i++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            
            const canvas = document.createElement('canvas');
            pageDiv.appendChild(canvas);
            flipbookElem.appendChild(pageDiv);

            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            // Cache text for search
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            textIndex.push({ page: i, text });
        }
    }

    /**
     * Interactive Fallback Pages Generator (Ensures UI ALWAYS works)
     */
    function renderFallbackPages() {
        flipbookElem.innerHTML = '';
        textIndex = [];

        const samplePages = [
            { title: "HEAT WAVES", body: "Welcome to the Summer 2026 Edition. Flip through to read student articles, interviews, and features.", tag: "COVER" },
            { title: "Editor's Note", body: "This issue celebrates creativity across campus. From digital art to student research, we cover it all.", tag: "EDITORIAL" },
            { title: "Campus Spotlight", body: "An inside look at the new innovation lab and student-led robotics project.", tag: "FEATURE" },
            { title: "Creative Writing", body: "'Sunlight through the library blinds...' — Read selected poetry and short stories from our summer contest.", tag: "ARTS" },
            { title: "Student Gallery", body: "A showcase of photography and digital illustrations created by the Class of 2026.", tag: "GALLERY" },
            { title: "Back Cover", body: "Heat Waves Magazine &bull; Published quarterly by the Student Editorial Board.", tag: "END" }
        ];

        samplePages.forEach((p, idx) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page demo-page';
            pageDiv.innerHTML = `
                <div>
                    <div class="demo-header">${p.title}</div>
                    <p class="demo-body" style="margin-top:20px;">${p.body}</p>
                </div>
                <div class="demo-footer">${p.tag} &bull; PAGE ${idx + 1}</div>
            `;
            flipbookElem.appendChild(pageDiv);
            textIndex.push({ page: idx + 1, text: `${p.title} ${p.body}` });
        });
    }

    /**
     * Initialize PageFlip.js
     */
    function initFlipEngine() {
        if (pageFlip) {
            try { pageFlip.destroy(); } catch(e){}
        }

        const isMobile = window.innerWidth < 768;

        pageFlip = new St.PageFlip(flipbookElem, {
            width: 460,
            height: 620,
            size: "stretch",
            minWidth: 280,
            maxWidth: 700,
            minHeight: 380,
            maxHeight: 900,
            maxShadowOpacity: 0.25,
            showCover: true,
            usePortrait: isMobile,
            flippingTime: 600
        });

        pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));

        const total = pageFlip.getPageCount();
        totalPagesElem.innerText = total;
        pageSlider.max = total;

        pageFlip.on('flip', (e) => {
            const current = e.data + 1;
            currPageElem.innerText = current;
            pageSlider.value = current;
        });
    }

    /**
     * Try pre-rendering cover on landing screen
     */
    async function tryRenderLandingCover() {
        const fallbackUI = document.getElementById('cover-fallback');
        try {
            if (typeof pdfjsLib !== 'undefined') {
                const pdf = await pdfjsLib.getDocument(CONFIG.pdfPath).promise;
                const page = await pdf.getPage(1);
                const canvas = document.getElementById('landing-cover-canvas');
                const viewport = page.getViewport({ scale: 0.8 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                fallbackUI.style.display = 'none';
            }
        } catch(e) {
            // Keep CSS fallback cover visible if PDF isn't loaded
            fallbackUI.style.display = 'flex';
        }
    }

    /**
     * Event Listeners & Modals
     */
    function setupEvents() {
        // Keyboard Shortcuts
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

        document.getElementById('btn-search').addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
        });

        document.getElementById('btn-archive').addEventListener('click', () => {
            archiveModal.classList.add('active');
        });

        document.getElementById('close-archive').addEventListener('click', () => {
            archiveModal.classList.remove('active');
        });

        // Search logic
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            searchResults.innerHTML = '';

            if (!query) {
                searchResults.innerHTML = '<div class="hint">Type something to search...</div>';
                return;
            }

            const matches = textIndex.filter(item => item.text.toLowerCase().includes(query));

            if (matches.length === 0) {
                searchResults.innerHTML = '<div class="hint">No matches found.</div>';
                return;
            }

            matches.forEach(m => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <span>Found text match on page ${m.page}</span>
                    <span class="search-item-page">Page ${m.page}</span>
                `;
                item.addEventListener('click', () => {
                    if (pageFlip) pageFlip.turnToPage(m.page - 1);
                    searchModal.classList.remove('active');
                });
                searchResults.appendChild(item);
            });
        });

        // Controls
        document.getElementById('btn-prev').addEventListener('click', () => pageFlip && pageFlip.flipPrev());
        document.getElementById('btn-next').addEventListener('click', () => pageFlip && pageFlip.flipNext());
        pageSlider.addEventListener('input', (e) => pageFlip && pageFlip.turnToPage(parseInt(e.target.value) - 1));

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
        });
    }

    function buildArchiveList() {
        archiveList.innerHTML = '';
        CONFIG.issues.forEach(iss => {
            const div = document.createElement('div');
            div.className = 'archive-item';
            div.innerHTML = `<strong>${iss.title}</strong><br><small>${iss.date}</small>`;
            div.addEventListener('click', () => {
                archiveModal.classList.remove('active');
                initPublication(iss.path);
            });
            archiveList.appendChild(div);
        });
    }
});