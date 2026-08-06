/* ==========================================================================
   HEAT WAVES — SIMPLE SCHOOL MAGAZINE ENGINE
   ========================================================================== */

// 1. School Magazine Content Database
const PAGES_DATA = [
    {
        pageNumber: 1,
        title: "HEAT WAVES",
        tag: "OFFICIAL SCHOOL MAGAZINE",
        color: "#f97316",
        heading: "WELCOME TO ISSUE 24!",
        body: "Your ultimate look into school life, sports victories, student talent, and upcoming events for Term 1.",
        bullets: ["• Sports Day Highlights", "• Science Fair Winners", "• Creative Writing Showcase"]
    },
    {
        pageNumber: 2,
        title: "PRINCIPAL'S NOTE",
        tag: "CAMPUS NEWS",
        color: "#2563eb",
        heading: "A Message From Principal Davis",
        body: "Dear Students & Parents,\n\nWelcome back to another exciting school term! Our students have already accomplished so much in academics, athletics, and the arts. Let's keep this momentum going!",
        bullets: ["• School Spirit Week: Oct 12th", "• Parent-Teacher Conference: Oct 20th"]
    },
    {
        pageNumber: 3,
        title: "SPORTS HIGHLIGHTS",
        tag: "ATHLETICS",
        color: "#16a34a",
        heading: "Basketball Team Takes Championship!",
        body: "The School Wildcats won the regional finals in a dramatic 58-54 victory last Friday! MVP honors went to Marcus Vance for scoring 24 points.",
        bullets: ["• Next Track Meet: Saturday 9 AM", "• Volleyball Tryouts start Tuesday"]
    },
    {
        pageNumber: 4,
        title: "ARTS & CREATIVITY",
        tag: "STUDENT SPOTLIGHT",
        color: "#9333ea",
        heading: "Poetry & Art Contest Winners",
        body: "\"Autumn Leaves\" by Sarah Jenkins (Grade 10):\n\nThe golden leaves begin to fall,\nA crisp cool breeze across the hall.\nWe walk together, side by side,\nWith school day memories held in pride.",
        bullets: ["• Art Gallery Exhibition in the Library"]
    },
    {
        pageNumber: 5,
        title: "CLUBS & ACADEMICS",
        tag: "EXTRACURRICULAR",
        color: "#0284c7",
        heading: "Robotics Club Wins First Place",
        body: "The STEM Robotics team successfully programmed their autonomous rover to complete the maze challenge in under 45 seconds!",
        bullets: ["• Debate Club meets Wednesdays", "• Drama Club Auditions open next week"]
    },
    {
        pageNumber: 6,
        title: "BACK COVER",
        tag: "ANNOUNCEMENTS",
        color: "#f97316",
        heading: "Stay Connected!",
        body: "Thank you for reading this issue of Heat Waves!\n\nGot an article or artwork to submit for Issue 25? Drop by Room 204 or email the student editorial team.",
        bullets: ["• Instagram: @SchoolHeatWaves", "• Website: school.edu/magazine"]
    }
];

// 2. State Management
let pageFlip = null;
let currentPage = 1;
let soundEnabled = true;
let audioCtx = null;

// 3. DOM Elements
const DOM = {
    heroScreen: document.getElementById('hero-screen'),
    readerScreen: document.getElementById('reader-screen'),
    btnLaunch: document.getElementById('btn-launch'),
    btnTocHero: document.getElementById('btn-toc-hero'),
    btnBack: document.getElementById('btn-back'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnToggleToc: document.getElementById('btn-toggle-toc'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),
    pageCounter: document.getElementById('page-counter'),
    flipbookWrapper: document.getElementById('flipbook'),
    tocModal: document.getElementById('toc-modal'),
    btnCloseToc: document.getElementById('btn-close-toc'),
    tocGrid: document.getElementById('toc-grid')
};

// ==========================================================================
// DRAW SIMPLE CANVAS SCHOOL PAGES
// ==========================================================================
function drawSchoolPage(canvas, data) {
    const width = 500;
    const height = 700;

    canvas.width = width * 2; // Crisp rendering
    canvas.height = height * 2;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Page Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Top Header Banner
    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, width, 70);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px "Fredoka", sans-serif';
    ctx.fillText(data.title, 30, 42);

    // Tag Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(width - 180, 20, 150, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 10px "Poppins", sans-serif';
    ctx.fillText(data.tag, width - 170, 39);

    // Content Heading
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 18px "Poppins", sans-serif';
    ctx.fillText(data.heading, 30, 115);

    // Divider Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 130);
    ctx.lineTo(width - 30, 130);
    ctx.stroke();

    // Body Text (Multi-line)
    ctx.fillStyle = '#334155';
    ctx.font = '13px "Poppins", sans-serif';

    const lines = data.body.split('\n');
    let y = 160;

    lines.forEach(lineStr => {
        const words = lineStr.split(' ');
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > width - 60) {
                ctx.fillText(currentLine, 30, y);
                currentLine = word + ' ';
                y += 20;
            } else {
                currentLine = testLine;
            }
        });
        ctx.fillText(currentLine, 30, y);
        y += 24;
    });

    // Bullets Section
    if (data.bullets) {
        y += 10;
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 13px "Poppins", sans-serif';
        data.bullets.forEach(bullet => {
            ctx.fillText(bullet, 30, y);
            y += 24;
        });
    }

    // Page Number Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px "Poppins", sans-serif';
    ctx.fillText(`Heat Waves School Magazine • Page ${data.pageNumber}`, 30, height - 25);
}

// ==========================================================================
// FLIPBOOK SETUP
// ==========================================================================
function buildMagazine() {
    DOM.flipbookWrapper.innerHTML = '';
    DOM.tocGrid.innerHTML = '';

    PAGES_DATA.forEach((data) => {
        // Build Page Sheet
        const sheet = document.createElement('div');
        sheet.className = 'page-sheet';

        const canvas = document.createElement('canvas');
        drawSchoolPage(canvas, data);
        sheet.appendChild(canvas);
        DOM.flipbookWrapper.appendChild(sheet);

        // Build TOC Item
        const tocItem = document.createElement('div');
        tocItem.className = 'toc-item';
        
        const thumbCanvas = document.createElement('canvas');
        drawSchoolPage(thumbCanvas, data);

        const label = document.createElement('span');
        label.textContent = `Page ${data.pageNumber}`;

        tocItem.appendChild(thumbCanvas);
        tocItem.appendChild(label);
        tocItem.addEventListener('click', () => {
            closeToc();
            pageFlip.turnToPage(data.pageNumber - 1);
        });

        DOM.tocGrid.appendChild(tocItem);
    });

    // Initialize PageFlip library
    pageFlip = new St.PageFlip(DOM.flipbookWrapper, {
        width: 480,
        height: 680,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 700,
        minHeight: 400,
        maxHeight: 900,
        showCover: true,
        useMouseEvents: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page-sheet'));

    pageFlip.on('flip', (e) => {
        currentPage = e.data + 1;
        DOM.pageCounter.textContent = `Page ${currentPage} of ${PAGES_DATA.length}`;
        playPageSound();
    });
}

// Sound Effect
function playPageSound() {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        console.warn('Audio blocked:', e);
    }
}

// Navigation Actions
function openReader() {
    DOM.heroScreen.classList.add('hidden');
    DOM.readerScreen.classList.remove('hidden');
    if (!pageFlip) {
        buildMagazine();
    }
}

function closeReader() {
    DOM.readerScreen.classList.add('hidden');
    DOM.heroScreen.classList.remove('hidden');
}

function openToc() {
    DOM.tocModal.classList.remove('hidden');
}

function closeToc() {
    DOM.tocModal.classList.add('hidden');
}

// Event Listeners
DOM.btnLaunch.addEventListener('click', openReader);
DOM.btnTocHero.addEventListener('click', () => {
    openReader();
    openToc();
});
DOM.btnBack.addEventListener('click', closeReader);

DOM.btnPrev.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
DOM.btnNext.addEventListener('click', () => pageFlip && pageFlip.flipNext());

DOM.btnToggleToc.addEventListener('click', openToc);
DOM.btnCloseToc.addEventListener('click', closeToc);

DOM.btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    DOM.btnToggleSound.classList.toggle('active', soundEnabled);
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (!DOM.readerScreen.classList.contains('hidden') && pageFlip) {
        if (e.key === 'ArrowLeft') pageFlip.flipPrev();
        if (e.key === 'ArrowRight') pageFlip.flipNext();
        if (e.key === 'Escape') closeToc();
    }
});