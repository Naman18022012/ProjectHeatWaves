document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        pdfPath: './pages/document.pdf',
        pageDimensions: { width: 550, height: 733 },
        singlePageModeWidthCutoff: 768
    };

    let pageFlip = null;
    let pdfDoc = null;
    let zoomLevel = 1;
    let textContentCache = [];

    const loader = document.getElementById('loader');
    const loaderStatus = document.getElementById('loader-status');
    const pageIndicator = document.getElementById('page-indicator');
    const flipbookElem = document.getElementById('flipbook');
    const zoomStage = document.getElementById('zoom-stage');

    initApplication();

    async function initApplication() {
        try {
            const response = await fetch(CONFIG.pdfPath, { method: 'HEAD' });
            if (response.ok) {
                await loadPDF(CONFIG.pdfPath);
            } else {
                await loadFallbackImages();
            }
            setupEventListeners();
        } catch (error) {
            await loadFallbackImages();
            setupEventListeners();
        }
    }

    async function loadPDF(url) {
        loaderStatus.innerText = "Loading newsletter PDF...";
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        const totalPages = pdfDoc.numPages;

        flipbookElem.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.dataset.pageNumber = i;
            
            const canvas = document.createElement('canvas');
            pageDiv.appendChild(canvas);
            flipbookElem.appendChild(pageDiv);

            await renderPDFPage(i, canvas);
            loaderStatus.innerText = `Rendered page ${i} of ${totalPages}`;
        }

        buildFlipbook();
        cachePDFText(totalPages);
    }

    async function renderPDFPage(pageNum, canvas) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
    }

    async function cachePDFText(totalPages) {
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const textString = textContent.items.map(item => item.str).join(' ');
            textContentCache.push({ page: i, text: textString });
        }
        buildTableOfContents(totalPages);
    }

    async function loadFallbackImages() {
        loaderStatus.innerText = "Loading image pages...";
        flipbookElem.innerHTML = '';
        let pageNum = 1;
        let active = true;

        while (active && pageNum <= 100) {
            const imgPath = `./pages/page-${pageNum}.png`;
            const exists = await checkImageExists(imgPath);
            
            if (exists) {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                const img = document.createElement('img');
                img.src = imgPath;
                pageDiv.appendChild(img);
                flipbookElem.appendChild(pageDiv);
                pageNum++;
            } else {
                active = false;
            }
        }

        if (pageNum === 1) renderDummyCover();
        else buildFlipbook();
    }

    function checkImageExists(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    function renderDummyCover() {
        flipbookElem.innerHTML = `
            <div class="page" style="display:flex;align-items:center;justify-content:center;background:#003366;color:white;">
                <div style="text-align:center;padding:20px;">
                    <h2>School Newsletter</h2>
                    <p style="margin-top:10px;">Issue #1</p>
                    <small style="margin-top:20px;display:block;opacity:0.7">Upload document.pdf into /pages folder</small>
                </div>
            </div>
            <div class="page" style="display:flex;align-items:center;justify-content:center;background:#fff;">
                <p>Welcome to our digital newsletter reader!</p>
            </div>
        `;
        buildFlipbook();
    }

    function buildFlipbook() {
        const isMobile = window.innerWidth < CONFIG.singlePageModeWidthCutoff;

        pageFlip = new St.PageFlip(flipbookElem, {
            width: CONFIG.pageDimensions.width,
            height: CONFIG.pageDimensions.height,
            size: "stretch",
            minWidth: 300,
            maxWidth: 1000,
            minHeight: 400,
            maxHeight: 1400,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false,
            usePortrait: isMobile
        });

        pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));

        pageFlip.on('flip', () => updatePageIndicator());

        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);

        updatePageIndicator();
    }

    function updatePageIndicator() {
        if (!pageFlip) return;
        pageIndicator.innerText = `Page ${pageFlip.getCurrentPageIndex() + 1} of ${pageFlip.getPageCount()}`;
    }

    function setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') pageFlip.flipNext();
            if (e.key === 'ArrowLeft') pageFlip.flipPrev();
            if (e.key === 'Escape') resetZoom();
        });

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
        });

        zoomStage.addEventListener('dblclick', () => {
            if (zoomLevel === 1) {
                zoomLevel = 2;
                zoomStage.querySelector('.flipbook-wrapper').style.transform = `scale(${zoomLevel})`;
            } else resetZoom();
        });

        const searchModal = document.getElementById('search-modal');
        const tocModal = document.getElementById('toc-modal');

        document.getElementById('btn-search').addEventListener('click', () => searchModal.classList.add('active'));
        document.getElementById('close-search').addEventListener('click', () => searchModal.classList.remove('active'));
        document.getElementById('btn-toc').addEventListener('click', () => tocModal.classList.add('active'));
        document.getElementById('close-toc').addEventListener('click', () => tocModal.classList.remove('active'));

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch(e.target.value.toLowerCase().trim());
        });
    }

    function resetZoom() {
        zoomLevel = 1;
        zoomStage.querySelector('.flipbook-wrapper').style.transform = `scale(1)`;
    }

    function executeSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '';
        if (!query) return;

        const matches = textContentCache.filter(item => item.text.toLowerCase().includes(query));

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<p class="search-item">No matches found.</p>';
            return;
        }

        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerText = `Page ${match.page}: "...${snippet(match.text, query)}..."`;
            div.addEventListener('click', () => {
                pageFlip.flip(match.page - 1);
                document.getElementById('search-modal').classList.remove('active');
            });
            resultsContainer.appendChild(div);
        });
    }

    function snippet(text, query) {
        const index = text.toLowerCase().indexOf(query);
        const start = Math.max(0, index - 20);
        const end = Math.min(text.length, index + query.length + 20);
        return text.substring(start, end);
    }

    function buildTableOfContents(total) {
        const tocList = document.getElementById('toc-list');
        tocList.innerHTML = '';
        for (let i = 1; i <= total; i++) {
            const item = document.createElement('li');
            item.className = 'toc-item';
            item.innerText = `Page ${i}`;
            item.addEventListener('click', () => {
                pageFlip.turnToPage(i - 1);
                document.getElementById('toc-modal').classList.remove('active');
            });
            tocList.appendChild(item);
        }
    }
});