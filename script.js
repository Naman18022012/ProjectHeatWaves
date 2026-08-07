/**
 * INKSPIRE DIGITAL NEWSLETTER - 3D FLIPBOOK ENGINE
 * Handles real dynamic 3D page turns and auto-flipping loops.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Dynamic Database of Pages
    const pagesData = [
        { title: "INKSPIRE Cover", body: "Official Digital Newsletter of Presidency School Banashankari.", tag: "Volume 12" },
        { title: "Principal's Message", body: "Welcome to this edition. Education is not merely acquiring knowledge, but honing character, creativity, and foresight.", tag: "Leadership" },
        { title: "Student Council 2026", body: "Meet the dynamic student leaders sworn in for the academic session, poised to drive house activities and school pride.", tag: "Campus Life" },
        { title: "STEM & Robotics Expo", body: "Innovative prototypes ranging from automated climate monitoring to renewable energy generation models built by students.", tag: "Academics" },
        { title: "Fine Arts & Literary Corner", body: "An exquisite gallery displaying student original oil paintings, digital artwork, creative poetry, and essays.", tag: "Creative Arts" },
        { title: "Sports Championship", body: "Celebrating our inter-school trophies in basketball, badminton, and field athletics this term.", tag: "Sports Bulletin" },
        { title: "Primary Section Chronicles", body: "Young minds exploring nature, hands-on science experiments, and foundational learning workshops.", tag: "Junior Wing" },
        { title: "Editorial Epilogue", body: "Thank you for reading INKSPIRE. Join us in shaping continuous learning and excellence.", tag: "Closing Notes" }
    ];

    let currentLeftPageIndex = 0;
    let autoFlipInterval = null;
    let isAutoFlipping = false;

    const bookContainer = document.getElementById('flipbookCanvas');
    const currentPageNumDisplay = document.getElementById('currentPageNum');
    const totalPagesNumDisplay = document.getElementById('totalPagesNum');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const autoFlipBtn = document.getElementById('autoFlipBtn');

    if (totalPagesNumDisplay) {
        totalPagesNumDisplay.textContent = pagesData.length;
    }

    // Render Page Content Helper
    const renderPageContent = (pageObj, pageNum) => {
        if (!pageObj) return `<div class="page-body-text">End of Publication</div>`;
        return `
            <div class="page-header">
                <span>INKSPIRE • PRESIDENCY SCHOOL</span>
                <span>${pageObj.tag}</span>
            </div>
            <div class="page-main">
                <h3 class="page-title">${pageObj.title}</h3>
                <p class="page-body-text">${pageObj.body}</p>
            </div>
            <div class="page-footer">
                <span>Banashankari</span>
                <span>${pageNum}</span>
            </div>
        `;
    };

    // Initial Viewport Render
    const renderSpread = () => {
        const leftData = pagesData[currentLeftPageIndex];
        const rightData = pagesData[currentLeftPageIndex + 1];

        bookContainer.innerHTML = `
            <div class="book-page page-left" id="staticLeft">
                ${renderPageContent(leftData, currentLeftPageIndex + 1)}
            </div>
            <div class="book-page page-right" id="staticRight">
                ${renderPageContent(rightData, currentLeftPageIndex + 2)}
            </div>
        `;

        if (currentPageNumDisplay) {
            currentPageNumDisplay.textContent = `${currentLeftPageIndex + 1}-${Math.min(currentLeftPageIndex + 2, pagesData.length)}`;
        }
    };

    // Execute 3D Forward Flip Animation
    const flipForward = () => {
        if (currentLeftPageIndex + 2 >= pagesData.length) {
            if (isAutoFlipping) toggleAutoFlip(); // Stop auto-flip on reaching end
            return;
        }

        const currentRightData = pagesData[currentLeftPageIndex + 1];
        const nextLeftData = pagesData[currentLeftPageIndex + 2];

        // Create Animated 3D Sheet
        const flipSheet = document.createElement('div');
        flipSheet.className = 'flip-sheet';
        flipSheet.innerHTML = `
            <div class="sheet-face sheet-front">
                ${renderPageContent(currentRightData, currentLeftPageIndex + 2)}
            </div>
            <div class="sheet-face sheet-back">
                ${renderPageContent(nextLeftData, currentLeftPageIndex + 3)}
            </div>
        `;

        bookContainer.appendChild(flipSheet);

        // Force browser reflow to trigger CSS transition
        void flipSheet.offsetWidth;

        // Perform Flip Transformation
        flipSheet.classList.add('flipped');

        // Update state halfway through or on transition completion
        setTimeout(() => {
            currentLeftPageIndex += 2;
            renderSpread();
        }, 750);
    };

    // Execute 3D Backward Flip Animation
    const flipBackward = () => {
        if (currentLeftPageIndex - 2 < 0) return;

        const currentLeftData = pagesData[currentLeftPageIndex];
        const prevRightData = pagesData[currentLeftPageIndex - 1];

        const flipSheet = document.createElement('div');
        flipSheet.className = 'flip-sheet flipped';
        flipSheet.style.transformOrigin = 'right center';
        flipSheet.style.left = '0';
        flipSheet.style.right = 'auto';

        flipSheet.innerHTML = `
            <div class="sheet-face sheet-front" style="transform: rotateY(180deg);">
                ${renderPageContent(currentLeftData, currentLeftPageIndex + 1)}
            </div>
            <div class="sheet-face sheet-back" style="transform: rotateY(0deg);">
                ${renderPageContent(prevRightData, currentLeftPageIndex)}
            </div>
        `;

        bookContainer.appendChild(flipSheet);

        void flipSheet.offsetWidth;

        flipSheet.style.transform = 'rotateY(0deg)';

        setTimeout(() => {
            currentLeftPageIndex -= 2;
            renderSpread();
        }, 750);
    };

    // Auto-Flip Timer Toggle logic
    const toggleAutoFlip = () => {
        if (isAutoFlipping) {
            clearInterval(autoFlipInterval);
            isAutoFlipping = false;
            if (autoFlipBtn) {
                autoFlipBtn.classList.remove('active');
                autoFlipBtn.innerHTML = `<span>▶</span> Auto-Flip`;
            }
        } else {
            isAutoFlipping = true;
            if (autoFlipBtn) {
                autoFlipBtn.classList.add('active');
                autoFlipBtn.innerHTML = `<span>❚❚</span> Pause`;
            }
            // Automatically flip every 4 seconds
            autoFlipInterval = setInterval(() => {
                if (currentLeftPageIndex + 2 < pagesData.length) {
                    flipForward();
                } else {
                    currentLeftPageIndex = 0; // Loop back to start
                    renderSpread();
                }
            }, 4000);
        }
    };

    // Event Listeners
    nextPageBtn?.addEventListener('click', flipForward);
    prevPageBtn?.addEventListener('click', flipBackward);
    autoFlipBtn?.addEventListener('click', toggleAutoFlip);

    // Initial render call
    renderSpread();
});