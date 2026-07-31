/**
 * HEAT WAVES — Student Publication Engine
 * Bulletproof Loader with Automatic Failsafe Demo Generator
 */

document.addEventListener('DOMContentLoaded', () => {

    // Configure PDF.js Worker safely
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Magazine Issues Database
    const ISSUES = [
        {
            id: 'aug-2026',
            title: 'Issue 04 — Summer Reflection',
            date: 'August 2026',
            pdfPath: './pages/document.pdf' // Target PDF path
        },
        {
            id: 'sep-2026',
            title: 'Issue 05 — Autumn Horizons',
            date: 'September 2026',
            pdfPath: './pages/september-2026.pdf'
        }
    ];

    let currentIssue = ISSUES[0];
    let pageFlip = null;
    let pdfDoc = null;
    let textCache = [];

    // DOM References
    const landingHero = document.getElementById('landing-hero');
    const btnOpenMag = document.getElementById('btn-open-mag');
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');
    const loaderStatus = document.getElementById('loader-status');
    const flipbookElem = document.getElementById('flipbook');
    const pageNumCur = document.getElementById('page-num-cur');
    const pageNumTotal = document.getElementById('page-num-total');
    const pageScrubber = document.getElementById('page-scrubber');

    // Modals
    const searchModal = document.getElementById('search-modal');
    const archiveModal = document.getElementById('archive-modal');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const archiveList = document.getElementById('archive-list');

    // Startup
    initCoverPreview();
    setupEventListeners();
    buildArchiveList();

    /**
     * Attempts preview on landing page card
     */
    async function initCoverPreview() {
        const box = document.getElementById('cover-preview-box');
        try {
            const pdf = await pdfjsLib.getDocument(currentIssue.pdfPath).promise;
            const page = await pdf.getPage(1);
            const canvas = document.createElement('canvas');
            const viewport = page.getViewport({ scale: 0.8 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            box.innerHTML = '';
            box.appendChild(canvas);
        } catch (e) {
            // Keep default hero placeholder card
        }
    }

    /**
     * Transition from Hero to Reader
     */
    btnOpenMag.addEventListener('click', async () => {
        landingHero.classList.add('dismissed');
        await startPublicationEngine(currentIssue.pdfPath);
    });

    /**
     * Master Load Routine (PDF attempt -> Fallback Sample Generator)
     */
    async function startPublicationEngine(pdfPath) {
        showLoader(10, 'Fetching publication document...');

        try {
            // Try fetching real PDF
            const loadingTask = pdfjsLib.getDocument(pdfPath);
            pdfDoc = await loadingTask.promise;
            
            const total = pdfDoc.numPages;
            flipbookElem.innerHTML = '';
            textCache = [];

            for (let i = 1; i <= total; i++) {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                const canvas = document.createElement('canvas');
                pageDiv.appendChild(canvas);
                flipbookElem.appendChild(pageDiv);

                await renderPdfPage(i, canvas);
                showLoader(10 + Math.floor((i / total) * 75), `Rendering page ${i} of ${total}`);
            }

            cachePdfText(total);
            mountPageFlip();

        } catch (err) {
            console.warn('PDF not found at path:', pdfPath, '— Activating Failsafe Interactive Engine.');
            showLoader(60, 'Generating interactive publication...');
            generateFailsafeMagazine();
            mountPageFlip();
        }

        showLoader(100, 'Ready');
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 400);
        }, 300);
    }

    async function renderPdfPage(pageNum, canvas) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
    }

    /**
     * FAILSAFE ENGINE: Generates a sample 6-page student publication
     * Guaranteeing the flipbook ALWAYS works out of the box!
     */
    function generateFailsafeMagazine() {
        flipbookElem.innerHTML = '';
        textCache = [];

        const samplePages = [
            {
                title: "HEAT WAVES",
                sub: "AUGUST 2026 EDITION",
                body: "Welcome to the official student newsletter platform. Flip through to explore this month's stories, art, and campus highlights."
            },
            {
                title: "Campus Debate: AI in Classrooms",
                sub: "OPINION & ANALYSIS",
                body: "Students and faculty weigh in on the integration of generative AI tools in daily coursework. Is it an assistant or a distraction?"
            },
            {
                title: "Creative Showcase",
                sub: "ART & POETRY",
                body: "A collection of award-winning digital illustration, photography, and short creative writing submissions from Grade 11 & 12."
            },
            {
                title: "Sports & Athletics Digest",
                sub: "SEASON HIGHLIGHTS",
                body: "Recap of the summer athletics tournament, breaking school records in track and field, and upcoming autumn schedules."
            },
            {
                title: "Student Spotlight",
                sub: "INTERVIEW",
                body: "An exclusive interview with the Robotics Team following their national finals victory."
            },
            {
                title: "Back Cover",
                sub: "HEAT WAVES VOL. 04",
                body: "Thank you for reading Heat Waves. Submissions for the September issue open next Monday!"
            }
        ];

        samplePages.forEach((data, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.innerHTML = `
                <div class="sample-page-content">
                    <div class="sample-header">
                        <span>HEAT WAVES</span>
                        <span>PAGE 0${index + 1}</span>
                    </div>
                    <div class="sample-body">
                        <h2>${data.title}</h2>
                        <p><strong>${data.sub}</strong></p>
                        <p>${data.body}</p>
                    </div>
                    <div class="sample-footer">AUGUST 2026 ISSUE</div>
                </div>
            `;
            flipbookElem.appendChild(pageDiv);
            textCache.push({ page: index + 1, text: `${data.title} ${data.sub} ${data.body}` });
        });
    }

    /**
     * PageFlip Engine Mount
     */
    function mountPageFlip() {
        if (pageFlip) {
            try { pageFlip.destroy(); } catch(e){}
        }

        const isMobile = window.innerWidth < 768;

        pageFlip = new St.PageFlip(flipbookElem, {
            width: 480,
            height: 640,
            size: "stretch",
            minWidth: 280,
            maxWidth: 750,
            minHeight: 380,
            maxHeight: 950,
            maxShadowOpacity: 0.35,
            showCover: true,
            usePortrait: isMobile,
            flippingTime: 700
        });

        pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));

        const count = pageFlip.getPageCount();
        pageNumTotal.innerText = count;
        pageScrubber.max = count;

        pageFlip.on('flip', (e) => {
            const cur = e.data + 1;
            pageNumCur.innerText = cur;
            pageScrubber.value = cur;
        });
    }

    /**
     * Helpers & Search
     */
    function showLoader(pct, status) {
        loaderBar.style.width = `${pct}%`;
        loaderStatus.innerText = status;
    }

    async function cachePdfText(totalPages) {
        for (let i = 1; i <= totalPages; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const content = await page.getTextContent();
                textCache.push({ page: i, text: content.items.map(item => item.str).join(' ') });
            } catch(e){}
        }
    }

    function searchIssue(q) {
        searchResults.innerHTML = '';
        if (!q.trim()) {
            searchResults.innerHTML = '<div class="empty-msg">Start typing to search inside this issue...</div>';
            return;
        }

        const matches = textCache.filter(item => item.text.toLowerCase().includes(q.toLowerCase()));

        if (!matches.length) {
            searchResults.innerHTML = '<div class="empty-msg">No matching articles or text found.</div>';
            return;
        }

        matches.forEach(m => {
            const row = document.createElement('div');
            row.className = 'search-item';
            row.innerHTML = `
                <span>Found keyword on page ${m.page}</span>
                <span class="page-badge">Page ${m.page}</span>
            `;
            row.addEventListener('click', () => {
                if (pageFlip) pageFlip.turnToPage(m.page - 1);
                searchModal.classList.remove('active');
            });
            searchResults.appendChild(row);
        });
    }

    function buildArchiveList() {
        archiveList.innerHTML = '';
        ISSUES.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.innerHTML = `<h5>${issue.title}</h5><p>${issue.date}</p>`;
            card.addEventListener('click', () => {
                currentIssue = issue;
                archiveModal.classList.remove('active');
                startPublicationEngine(issue.pdfPath);
            });
            archiveList.appendChild(card);
        });
    }

    function setupEventListeners() {
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

        document.getElementById('btn-close-archive').addEventListener('click', () => {
            archiveModal.classList.remove('active');
        });

        searchInput.addEventListener('input', (e) => searchIssue(e.target.value));

        document.getElementById('btn-prev').addEventListener('click', () => pageFlip && pageFlip.flipPrev());
        document.getElementById('btn-next').addEventListener('click', () => pageFlip && pageFlip.flipNext());

        pageScrubber.addEventListener('input', (e) => {
            if (pageFlip) pageFlip.turnToPage(parseInt(e.target.value) - 1);
        });

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
        });
    }
});