/**
 * PRESIDENCY SCHOOL BANASHANKARI - INKSPIRE PLATFORM ENGINE
 * Production JavaScript Engine handling Flipbook, Search, Navigation, and Modals.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. BRAND LOADER CONTROLLER
       ========================================================================== */
    const initLoader = () => {
        const loader = document.getElementById('loader');
        const loaderFill = document.getElementById('loaderFill');
        let progress = 0;

        const progressInterval = setInterval(() => {
            progress += 15;
            if (loaderFill) loaderFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(progressInterval);
                setTimeout(() => {
                    if (loader) loader.classList.add('fade-out');
                }, 300);
            }
        }, 90);
    };

    /* ==========================================================================
       2. STICKY NAVIGATION CONTROLLER
       ========================================================================== */
    const initHeaderScroll = () => {
        const headerNav = document.getElementById('headerNav');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                headerNav?.classList.add('scrolled');
            } else {
                headerNav?.classList.remove('scrolled');
            }
        });
    };

    /* ==========================================================================
       3. TABLE OF CONTENTS DRAWER CONTROLLER
       ========================================================================== */
    const initTocDrawer = () => {
        const tocDrawer = document.getElementById('tocDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        const openTocNav = document.getElementById('openTocNav');
        const tocDrawerBtn = document.getElementById('tocDrawerBtn');
        const closeTocBtn = document.getElementById('closeTocBtn');
        const footerTocLink = document.getElementById('footerTocLink');

        const openToc = () => {
            tocDrawer?.classList.add('open');
            drawerOverlay?.classList.add('active');
        };

        const closeToc = () => {
            tocDrawer?.classList.remove('open');
            drawerOverlay?.classList.remove('active');
        };

        openTocNav?.addEventListener('click', openToc);
        tocDrawerBtn?.addEventListener('click', openToc);
        closeTocBtn?.addEventListener('click', closeToc);
        drawerOverlay?.addEventListener('click', closeToc);
        footerTocLink?.addEventListener('click', openToc);

        return { closeToc, openToc };
    };

    /* ==========================================================================
       4. SEARCH MODAL & INDEXING ENGINE
       ========================================================================== */
    const initSearchEngine = (jumpToPageFn) => {
        const searchModal = document.getElementById('searchModal');
        const openSearchBtn = document.getElementById('openSearchBtn');
        const readerSearchBtn = document.getElementById('readerSearchBtn');
        const closeSearchBtn = document.getElementById('closeSearchBtn');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        const articlesDatabase = [
            { title: "Stepping into a New Era of Learning", page: 2, snippet: "Principal's address on wisdom, character, and innovative thought." },
            { title: "Empowering Tomorrow's Visionaries", page: 3, snippet: "Highlights from the newly elected 2026-27 Student Council." },
            { title: "Annual STEM & Innovation Expo 2026", page: 6, snippet: "Middle & senior school automated robotics and renewable energy projects." },
            { title: "Ink & Brush: Fine Arts Gallery", page: 8, snippet: "Original student paintings, digital artwork, and literature." },
            { title: "Inter-School Sports Victory", page: 10, snippet: "Presidency championship trophies in athletics, basketball, and badminton." }
        ];

        const openSearch = () => {
            searchModal?.classList.add('active');
            setTimeout(() => searchInput?.focus(), 100);
        };

        const closeSearch = () => {
            searchModal?.classList.remove('active');
        };

        openSearchBtn?.addEventListener('click', openSearch);
        readerSearchBtn?.addEventListener('click', openSearch);
        closeSearchBtn?.addEventListener('click', closeSearch);

        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!searchResults) return;
            searchResults.innerHTML = '';

            if (query.length > 1) {
                const filtered = articlesDatabase.filter(item => 
                    item.title.toLowerCase().includes(query) || 
                    item.snippet.toLowerCase().includes(query)
                );

                if (filtered.length > 0) {
                    filtered.forEach(item => {
                        const resItem = document.createElement('div');
                        resItem.className = 'search-result-item';
                        resItem.innerHTML = `
                            <div class="search-result-title">${item.title} (Page ${item.page})</div>
                            <div class="search-result-snippet">${item.snippet}</div>
                        `;
                        resItem.addEventListener('click', () => {
                            closeSearch();
                            jumpToPageFn(item.page);
                        });
                        searchResults.appendChild(resItem);
                    });
                } else {
                    searchResults.innerHTML = '<div style="padding: 16px; color: #94a3b8;">No matching articles found in this issue.</div>';
                }
            }
        });

        return { closeSearch };
    };

    /* ==========================================================================
       5. FLIPBOOK ENGINE & CONTROLLER
       ========================================================================== */
    let currentPage = 2;
    const totalPages = 12;

    const currentPageNumDisplay = document.getElementById('currentPageNum');
    const totalPagesNumDisplay = document.getElementById('totalPagesNum');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const flipbookCanvas = document.getElementById('flipbookCanvas');
    const readerViewport = document.getElementById('readerViewport');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    const updatePageDisplay = () => {
        if (currentPageNumDisplay) currentPageNumDisplay.textContent = currentPage;
        if (totalPagesNumDisplay) totalPagesNumDisplay.textContent = totalPages;
    };

    const jumpToPage = (pageNum) => {
        currentPage = pageNum;
        updatePageDisplay();
        
        if (flipbookCanvas) {
            flipbookCanvas.style.transform = 'scale(0.98)';
            setTimeout(() => {
                flipbookCanvas.style.transform = 'scale(1)';
            }, 200);
        }

        document.getElementById('reader')?.scrollIntoView({ behavior: 'smooth' });
    };

    prevPageBtn?.addEventListener('click', () => {
        if (currentPage > 2) {
            currentPage -= 2;
            updatePageDisplay();
            if (flipbookCanvas) {
                flipbookCanvas.style.transform = 'rotateY(2deg)';
                setTimeout(() => flipbookCanvas.style.transform = 'rotateY(0deg)', 200);
            }
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
            currentPage += 2;
            updatePageDisplay();
            if (flipbookCanvas) {
                flipbookCanvas.style.transform = 'rotateY(-2deg)';
                setTimeout(() => flipbookCanvas.style.transform = 'rotateY(0deg)', 200);
            }
        }
    });

    /* Zoom Functionality */
    let isZoomed = false;
    zoomInBtn?.addEventListener('click', () => {
        readerViewport?.classList.add('zoomed-in');
        isZoomed = true;
    });

    zoomOutBtn?.addEventListener('click', () => {
        readerViewport?.classList.remove('zoomed-in');
        isZoomed = false;
    });

    /* Fullscreen Controller */
    fullscreenBtn?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            readerViewport?.requestFullscreen().catch(err => {
                console.warn(`Fullscreen request error: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    /* Table of Contents Direct Navigation Links */
    const tocControls = initTocDrawer();
    const searchControls = initSearchEngine(jumpToPage);

    document.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', () => {
            const pageJump = parseInt(link.getAttribute('data-jump') || '1');
            tocControls.closeToc();
            jumpToPage(pageJump);
        });
    });

    /* ==========================================================================
       6. KEYBOARD SHORTCUTS CONTROLLER
       ========================================================================== */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevPageBtn?.click();
        } else if (e.key === 'ArrowRight') {
            nextPageBtn?.click();
        } else if (e.key === 'Escape') {
            tocControls.closeToc();
            searchControls.closeSearch();
            if (isZoomed) readerViewport?.classList.remove('zoomed-in');
        } else if (e.key === 'f' || e.key === 'F') {
            const activeModal = document.querySelector('.search-modal.active');
            if (!activeModal) {
                fullscreenBtn?.click();
            }
        }
    });

    /* Initialize Primary Subsystems */
    initLoader();
    initHeaderScroll();
    updatePageDisplay();
});