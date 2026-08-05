/**
 * ÉLÉGANCE — LUXURY DIGITAL PUBLICATION ENGINE
 * Engineered with PDF.js & PageFlip.js
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. AUDIO ENGINE (Web Audio API Synthesizer - Zero External Files Required)
     ========================================================================== */
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
    }

    playPageFlipSound() {
      if (!this.enabled) return;
      this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();

      // Synthesize realistic paper rustle sound using filtered white noise
      const bufferSize = this.ctx.sampleRate * 0.15; // 150ms duration
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    }

    playClickSound() {
      if (!this.enabled) return;
      this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    }
  }

  /* ==========================================================================
     2. AMBIENT PARTICLES CANVAS ENGINE
     ========================================================================== */
  class ParticleEngine {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.numParticles = 40;
      this.resize();
      this.initParticles();
      this.animate();

      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
    }

    initParticles() {
      this.particles = [];
      for (let i = 0; i < this.numParticles; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: Math.random() * 0.5 + 0.2
        });
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const isDark = document.documentElement.classList.contains('dark');
      this.ctx.fillStyle = isDark ? 'rgba(212, 175, 55, ' : 'rgba(100, 100, 100, ';

      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `${isDark ? '212, 175, 55' : '120, 120, 120'}, ${p.alpha})`;
        this.ctx.fill();
      });

      requestAnimationFrame(() => this.animate());
    }
  }

  /* ==========================================================================
     3. MAIN PUBLICATION APPLICATION CONTROLLER
     ========================================================================== */
  class PublicationApp {
    constructor() {
      this.pdfDoc = null;
      this.pageFlip = null;
      this.currentPage = 1;
      this.totalPages = 0;
      this.currentZoom = 1.0;
      this.extractedTextPages = [];

      this.audio = new AudioEngine();
      this.particles = new ParticleEngine('ambient-canvas');

      this.initDOMElements();
      this.setupEventListeners();
      this.setup3DCoverTilt();
      this.loadPDF(window.DEFAULT_PDF_URL);
    }

    initDOMElements() {
      // Screens & Containers
      this.loadingScreen = document.getElementById('loading-screen');
      this.loadingProgressBar = document.getElementById('loading-progress-bar');
      this.loadingStatusText = document.getElementById('loading-status-text');
      this.heroSection = document.getElementById('hero-section');
      this.readerWorkspace = document.getElementById('reader-workspace');
      this.pageFlipContainer = document.getElementById('pageflip-container');
      this.flipbookWrapper = document.getElementById('flipbook-wrapper');

      // Buttons
      this.btnOpenReader = document.getElementById('btn-open-reader');
      this.btnExploreTOC = document.getElementById('btn-explore-toc');
      this.btnBackHero = document.getElementById('btn-back-hero');
      this.btnPrevPage = document.getElementById('btn-prev-page');
      this.btnNextPage = document.getElementById('btn-next-page');
      this.btnZoomIn = document.getElementById('btn-zoom-in');
      this.btnZoomOut = document.getElementById('btn-zoom-out');
      this.btnZoomReset = document.getElementById('btn-zoom-reset');
      this.btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
      this.btnToggleTOC = document.getElementById('btn-toggle-toc');
      this.btnCloseTOC = document.getElementById('btn-close-toc');
      this.btnToggleSearch = document.getElementById('btn-toggle-search');
      this.btnClearSearch = document.getElementById('btn-clear-search');

      // Inputs & Displays
      this.pageInput = document.getElementById('page-number-input');
      this.pageTotalSpan = document.getElementById('page-count-total');
      this.zoomIndicator = document.getElementById('zoom-level-indicator');
      this.readingProgressFill = document.getElementById('reading-progress-fill');

      // Modals & Drawers
      this.tocDrawer = document.getElementById('toc-drawer');
      this.tocBackdrop = document.getElementById('toc-backdrop');
      this.tocGrid = document.getElementById('toc-gallery-grid');
      this.searchModal = document.getElementById('search-modal');
      this.searchBackdrop = document.getElementById('search-backdrop');
      this.searchInput = document.getElementById('search-input');
      this.searchResultsList = document.getElementById('search-results-list');
      this.searchResultsCount = document.getElementById('search-results-count');
      this.searchSpinner = document.getElementById('search-spinner');
    }

    setupEventListeners() {
      // Hero CTAs
      this.btnOpenReader.addEventListener('click', () => {
        this.audio.playClickSound();
        this.openReaderWorkspace();
      });

      this.btnExploreTOC.addEventListener('click', () => {
        this.audio.playClickSound();
        this.openReaderWorkspace();
        this.openTOCDrawer();
      });

      this.btnBackHero.addEventListener('click', () => {
        this.audio.playClickSound();
        this.closeReaderWorkspace();
      });

      // Page Navigation
      this.btnPrevPage.addEventListener('click', () => {
        this.audio.playClickSound();
        if (this.pageFlip) this.pageFlip.flipPrev();
      });

      this.btnNextPage.addEventListener('click', () => {
        this.audio.playClickSound();
        if (this.pageFlip) this.pageFlip.flipNext();
      });

      this.pageInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 1;
        val = Math.max(1, Math.min(this.totalPages, val));
        if (this.pageFlip) this.pageFlip.turnToPage(val - 1);
      });

      // Zoom Controls
      this.btnZoomIn.addEventListener('click', () => this.setZoom(this.currentZoom + 0.15));
      this.btnZoomOut.addEventListener('click', () => this.setZoom(this.currentZoom - 0.15));
      this.btnZoomReset.addEventListener('click', () => this.setZoom(1.0));

      // Fullscreen Toggle
      this.btnToggleFullscreen.addEventListener('click', () => this.toggleFullscreen());

      // Theme Toggles
      const toggleTheme = () => {
        this.audio.playClickSound();
        document.documentElement.classList.toggle('dark');
      };
      document.getElementById('theme-toggle-hero').addEventListener('click', toggleTheme);
      document.getElementById('theme-toggle-reader').addEventListener('click', toggleTheme);

      // Sound Toggles
      const toggleSound = () => {
        this.audio.enabled = !this.audio.enabled;
        const soundOnIcons = document.querySelectorAll('.icon-sound-on');
        const soundOffIcons = document.querySelectorAll('.icon-sound-off');

        soundOnIcons.forEach(el => el.classList.toggle('hide', !this.audio.enabled));
        soundOffIcons.forEach(el => el.classList.toggle('hide', this.audio.enabled));
      };
      document.getElementById('sound-toggle-hero').addEventListener('click', toggleSound);
      document.getElementById('sound-toggle-reader').addEventListener('click', toggleSound);

      // TOC Modal
      this.btnToggleTOC.addEventListener('click', () => this.openTOCDrawer());
      this.btnCloseTOC.addEventListener('click', () => this.closeTOCDrawer());
      this.tocBackdrop.addEventListener('click', () => this.closeTOCDrawer());

      // Search Modal
      this.btnToggleSearch.addEventListener('click', () => this.openSearchModal());
      this.searchBackdrop.addEventListener('click', () => this.closeSearchModal());
      this.searchInput.addEventListener('input', (e) => this.handleSearchQuery(e.target.value));
      this.btnClearSearch.addEventListener('click', () => {
        this.searchInput.value = '';
        this.handleSearchQuery('');
        this.searchInput.focus();
      });

      // Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeTOCDrawer();
          this.closeSearchModal();
          if (!this.readerWorkspace.classList.contains('hide-reader')) {
            this.closeReaderWorkspace();
          }
        } else if (e.key === 'ArrowRight' && !this.isModalOpen()) {
          if (this.pageFlip) this.pageFlip.flipNext();
        } else if (e.key === 'ArrowLeft' && !this.isModalOpen()) {
          if (this.pageFlip) this.pageFlip.flipPrev();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          this.openSearchModal();
        } else if (e.key === 'f' || e.key === 'F') {
          if (!this.isModalOpen() && e.target.tagName !== 'INPUT') {
            this.toggleFullscreen();
          }
        }
      });

      // Initialize Lucide Icons
      lucide.createIcons();
    }

    isModalOpen() {
      return this.tocDrawer.classList.contains('active') || this.searchModal.hasAttribute('open');
    }

    /* ==========================================================================
       4. PDF LOADING & RENDERING ENGINE
       ========================================================================== */
    async loadPDF(url) {
      try {
        this.updateLoadingProgress(15, 'Downloading Publication Data…');
        
        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.onProgress = (progressData) => {
          if (progressData.total > 0) {
            const pct = Math.round((progressData.loaded / progressData.total) * 50);
            this.updateLoadingProgress(15 + pct, `Loading PDF Pages (${pct * 2}%)...`);
          }
        };

        this.pdfDoc = await loadingTask.promise;
        this.totalPages = this.pdfDoc.numPages;
        this.pageTotalSpan.textContent = this.totalPages;
        document.getElementById('hero-total-pages').textContent = `${this.totalPages} Pages`;

        this.updateLoadingProgress(70, 'Rendering High-Resolution Cover…');
        await this.renderHeroCover();

        this.updateLoadingProgress(85, 'Initializing Interactive Flipbook…');
        await this.buildFlipbookDOM();
        this.initPageFlipEngine();

        this.updateLoadingProgress(95, 'Extracting Text for Search…');
        this.extractTextInBackground();

        this.updateLoadingProgress(100, 'Ready');
        setTimeout(() => {
          this.loadingScreen.classList.add('fade-out');
        }, 400);

      } catch (err) {
        console.error('Failed to load PDF:', err);
        this.loadingStatusText.textContent = 'Error loading publication. Check console.';
      }
    }

    updateLoadingProgress(pct, statusMsg) {
      this.loadingProgressBar.style.width = `${pct}%`;
      if (statusMsg) this.loadingStatusText.textContent = statusMsg;
    }

    async renderHeroCover() {
      const page = await this.pdfDoc.getPage(1);
      const canvas = document.getElementById('hero-cover-canvas');
      const ctx = canvas.getContext('2d');

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    async buildFlipbookDOM() {
      this.pageFlipContainer.innerHTML = '';
      
      // Determine page size from page 1
      const page1 = await this.pdfDoc.getPage(1);
      const viewport = page1.getViewport({ scale: 1.0 });
      this.pageWidth = viewport.width;
      this.pageHeight = viewport.height;

      // Render skeleton containers for PageFlip
      for (let i = 1; i <= this.totalPages; i++) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'stpageflip--page';
        pageDiv.setAttribute('data-density', i === 1 || i === this.totalPages ? 'hard' : 'soft');

        const wrapper = document.createElement('div');
        wrapper.className = 'page-content-wrapper';

        const canvas = document.createElement('canvas');
        canvas.id = `pdf-canvas-page-${i}`;
        
        wrapper.appendChild(canvas);
        pageDiv.appendChild(wrapper);
        this.pageFlipContainer.appendChild(pageDiv);
      }
    }

    initPageFlipEngine() {
      // Initialize StPageFlip
      this.pageFlip = new St.PageFlip(this.pageFlipContainer, {
        width: this.pageWidth,
        height: this.pageHeight,
        size: 'stretch',
        minWidth: 320,
        maxWidth: 1000,
        minHeight: 400,
        maxHeight: 1400,
        maxShadowOpacity: 0.7,
        showCover: true,
        mobileScrollSupport: false,
        usePortrait: window.innerWidth < 768
      });

      this.pageFlip.loadFromHTML(document.querySelectorAll('.stpageflip--page'));

      // Events
      this.pageFlip.on('flip', (e) => {
        this.currentPage = e.data + 1;
        this.pageInput.value = this.currentPage;
        this.updateReadingProgress();
        this.audio.playPageFlipSound();
        this.renderVisiblePages();
      });

      // Initial page render
      this.renderVisiblePages();
    }

    async renderVisiblePages() {
      // Render current and adjacent pages for peak performance
      const pagesToRender = [this.currentPage - 1, this.currentPage, this.currentPage + 1, this.currentPage + 2]
        .filter(p => p >= 1 && p <= this.totalPages);

      for (const pageNum of pagesToRender) {
        const canvas = document.getElementById(`pdf-canvas-page-${pageNum}`);
        if (canvas && !canvas.getAttribute('data-rendered')) {
          canvas.setAttribute('data-rendered', 'true');
          const page = await this.pdfDoc.getPage(pageNum);
          const dpr = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: 1.5 * dpr });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');

          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      }
    }

    async extractTextInBackground() {
      for (let i = 1; i <= this.totalPages; i++) {
        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        this.extractedTextPages.push({ pageNum: i, text: text });
      }
    }

    /* ==========================================================================
       5. INTERACTIVE WORKSPACE TRANSITIONS & MODALS
       ========================================================================== */
    openReaderWorkspace() {
      this.heroSection.classList.add('zoom-out-exit');
      this.readerWorkspace.classList.remove('hide-reader');
      this.readerWorkspace.focus();
    }

    closeReaderWorkspace() {
      this.heroSection.classList.remove('zoom-out-exit');
      this.readerWorkspace.classList.add('hide-reader');
    }

    setZoom(level) {
      this.currentZoom = Math.max(0.7, Math.min(2.0, level));
      this.zoomIndicator.textContent = `${Math.round(this.currentZoom * 100)}%`;
      this.flipbookWrapper.style.transform = `scale(${this.currentZoom})`;
    }

    updateReadingProgress() {
      const pct = (this.currentPage / this.totalPages) * 100;
      this.readingProgressFill.style.width = `${pct}%`;
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    /* 3D Cover Tilt Physics */
    setup3DCoverTilt() {
      const card = document.getElementById('3d-cover-card');
      const wrapper = document.getElementById('3d-cover-wrapper');
      if (!card || !wrapper) return;

      wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      wrapper.addEventListener('mouseleave', () => {
        card.style.transform = `rotateX(0deg) rotateY(0deg)`;
      });
    }

    /* ==========================================================================
       6. TABLE OF CONTENTS DRAWER & THUMBNAIL GALLERY
       ========================================================================== */
    async openTOCDrawer() {
      this.tocDrawer.classList.add('active');
      this.tocDrawer.setAttribute('aria-hidden', 'false');

      if (!this.tocGrid.getAttribute('data-loaded')) {
        this.tocGrid.setAttribute('data-loaded', 'true');
        this.tocGrid.innerHTML = '';

        for (let i = 1; i <= this.totalPages; i++) {
          const card = document.createElement('div');
          card.className = 'toc-card';

          const preview = document.createElement('div');
          preview.className = 'toc-card-preview';

          const canvas = document.createElement('canvas');
          preview.appendChild(canvas);

          const label = document.createElement('div');
          label.className = 'toc-card-number';
          label.textContent = `PAGE ${i}`;

          card.appendChild(preview);
          card.appendChild(label);

          card.addEventListener('click', () => {
            this.audio.playClickSound();
            if (this.pageFlip) this.pageFlip.turnToPage(i - 1);
            this.closeTOCDrawer();
          });

          this.tocGrid.appendChild(card);

          // Render thumbnail async
          this.pdfDoc.getPage(i).then(page => {
            const viewport = page.getViewport({ scale: 0.3 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            page.render({ canvasContext: ctx, viewport });
          });
        }
      }
    }

    closeTOCDrawer() {
      this.tocDrawer.classList.remove('active');
      this.tocDrawer.setAttribute('aria-hidden', 'true');
    }

    /* ==========================================================================
       7. DEEP SEARCH ENGINE
       ========================================================================== */
    openSearchModal() {
      this.searchModal.showModal();
      this.searchInput.focus();
    }

    closeSearchModal() {
      this.searchModal.close();
    }

    handleSearchQuery(query) {
      const q = query.trim().toLowerCase();
      this.btnClearSearch.classList.toggle('hide', q.length === 0);

      if (q.length < 2) {
        this.searchResultsCount.textContent = 'Type at least 2 characters to search';
        this.searchResultsList.innerHTML = `
          <div class="search-empty-state">
            <i data-lucide="file-text" class="empty-icon"></i>
            <p>Search across the full text of all pages instantly.</p>
          </div>`;
        lucide.createIcons();
        return;
      }

      this.searchSpinner.classList.remove('hide');
      
      const results = [];
      this.extractedTextPages.forEach(item => {
        const idx = item.text.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(item.text.length, idx + q.length + 40);
          let snippet = item.text.substring(start, end);

          // Highlight matching keyword
          const regex = new RegExp(`(${q})`, 'gi');
          snippet = snippet.replace(regex, '<mark>$1</mark>');

          results.push({
            pageNum: item.pageNum,
            snippet: `…${snippet}…`
          });
        }
      });

      this.searchSpinner.classList.add('hide');
      this.searchResultsCount.textContent = `Found ${results.length} result(s)`;

      if (results.length === 0) {
        this.searchResultsList.innerHTML = `
          <div class="search-empty-state">
            <i data-lucide="search-x" class="empty-icon"></i>
            <p>No matches found for "${query}"</p>
          </div>`;
      } else {
        this.searchResultsList.innerHTML = '';
        results.forEach(res => {
          const card = document.createElement('div');
          card.className = 'search-result-card';
          card.innerHTML = `
            <div class="search-result-header">
              <span class="search-result-page">PAGE ${res.pageNum}</span>
            </div>
            <div class="search-result-snippet">${res.snippet}</div>
          `;

          card.addEventListener('click', () => {
            this.audio.playClickSound();
            if (this.pageFlip) this.pageFlip.turnToPage(res.pageNum - 1);
            this.closeSearchModal();
          });

          this.searchResultsList.appendChild(card);
        });
      }

      lucide.createIcons();
    }
  }

  // Initialize Application on DOM Ready
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new PublicationApp();
  });

})();