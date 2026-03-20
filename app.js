document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar Scroll Logic ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Hero Slider ---
    const slider = document.getElementById('hero-slider');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');

    let currentSlide = 0;
    const slideIntervalTime = 5000;
    let slideInterval;

    function updateSlider() {
        // Update main slider
        if (slider) {
            slider.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });

        // Sync with Lightbox if open
        const lightboxImg = document.getElementById('lightbox-img');
        if (lightboxImg && slides[currentSlide]) {
            lightboxImg.src = slides[currentSlide].src;
            // Reset zoom when sliding
            lightboxImg.classList.remove('zoomed');
        }
    }

    function goToSlide(index) {
        currentSlide = (index + slides.length) % slides.length;
        updateSlider();
    }

    function nextSlide() { goToSlide(currentSlide + 1); }
    function prevSlide() { goToSlide(currentSlide - 1); }

    function startAutoSlide() { slideInterval = setInterval(nextSlide, slideIntervalTime); }
    function resetAutoSlide() { clearInterval(slideInterval); startAutoSlide(); }

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); resetAutoSlide(); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); resetAutoSlide(); });

    dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(index);
            resetAutoSlide();
        });
    });

    // Start auto-sliding
    startAutoSlide();

    // --- Advanced Lightbox Slider ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lBoxPrev = document.querySelector('.lightbox-prev');
    const lBoxNext = document.querySelector('.lightbox-next');
    const lBoxClose = document.querySelector('.lightbox-close');
    const heroSliderArea = document.querySelector('.hero-slider');
    const giveawayImg = document.querySelector('.poster-card img');
    const qrImg = document.querySelector('.qr-image-large');

    function openLightbox(src, showNav = false) {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = src;
        lightboxImg.classList.remove('zoomed');

        // Show/Hide slider navigation in lightbox
        if (lBoxPrev) lBoxPrev.style.display = showNav ? 'flex' : 'none';
        if (lBoxNext) lBoxNext.style.display = showNav ? 'flex' : 'none';

        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Open Lightbox on slider click
    if (heroSliderArea) {
        heroSliderArea.addEventListener('click', () => {
            if (slides[currentSlide]) {
                openLightbox(slides[currentSlide].src, true);
            }
        });
    }

    // Open Lightbox for other images
    if (giveawayImg) {
        giveawayImg.addEventListener('click', (e) => {
            e.stopPropagation();
            openLightbox(giveawayImg.src, false);
        });
    }

    if (qrImg) {
        qrImg.addEventListener('click', (e) => {
            e.stopPropagation();
            openLightbox(qrImg.src, false);
        });
    }

    // Lightbox Controls
    if (lBoxPrev) lBoxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        prevSlide();
        resetAutoSlide();
        // Sync lightbox image after slide
        if (slides[currentSlide]) lightboxImg.src = slides[currentSlide].src;
    });

    if (lBoxNext) lBoxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextSlide();
        resetAutoSlide();
        // Sync lightbox image after slide
        if (slides[currentSlide]) lightboxImg.src = slides[currentSlide].src;
    });

    // Zoom Toggle
    if (lightboxImg) {
        lightboxImg.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxImg.classList.toggle('zoomed');
        });
    }

    // Close Lightbox
    const closeLBox = () => {
        if (lightbox) {
            lightbox.style.display = 'none';
        }
        document.body.style.overflow = 'auto';
        if (lightboxImg) lightboxImg.classList.remove('zoomed');
    };

    if (lBoxClose) lBoxClose.addEventListener('click', closeLBox);
    if (lightbox) lightbox.addEventListener('click', closeLBox);

    // --- Countdown Timer ---
    const targetDateElement = document.getElementById('days');
    if (targetDateElement) {
        const targetDate = new Date('2026-04-16T23:59:59').getTime();

        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                document.getElementById('days').innerText = '00';
                document.getElementById('hours').innerText = '00';
                document.getElementById('mins').innerText = '00';
                document.getElementById('secs').innerText = '00';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((distance % (1000 * 60)) / 1000);

            if (document.getElementById('days')) document.getElementById('days').innerText = String(days).padStart(2, '0');
            if (document.getElementById('hours')) document.getElementById('hours').innerText = String(hours).padStart(2, '0');
            if (document.getElementById('mins')) document.getElementById('mins').innerText = String(mins).padStart(2, '0');
            if (document.getElementById('secs')) document.getElementById('secs').innerText = String(secs).padStart(2, '0');
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // --- Data Fetching from Google Sheets ---
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzefzB778DG9FFOIkZXYlZ4IAYNgHYrPccCB_R2gBL4YYTdt2yfRezKkD0OC3S-hH5CaA/exec?action=getSummary';

    let allDonations = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    function formatNumber(num) {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    function formatThaiDate(dateStr) {
        const date = new Date(dateStr);
        const day = date.getDate();
        const monthNamesShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const month = monthNamesShort[date.getMonth()];
        const yearBE = (date.getFullYear() + 543).toString().slice(-2);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${yearBE} ${hours}:${minutes}`;
    }

    function showLoading() {
        const tbody = document.getElementById('donation-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 40px;">
                        <div class="loading-container">
                            <span class="loading-text">กำลังโหลดข้อมูล...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    async function fetchDonationData() {
        if (allDonations.length === 0) {
            showLoading();
            const currentAmountEl = document.getElementById('current-amount');
            if (currentAmountEl) currentAmountEl.innerText = 'กำลังโหลด...';
        }
        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            const result = await response.json();

            if (result.status === 'ok') {
                allDonations = [...result.data];
                updateStats(result.total, result.count);
                renderDonationPage(currentPage);
            }
        } catch (error) {
            console.error('Error fetching donation data:', error);
            const totalDonationsEl = document.getElementById('total-donations');
            if (totalDonationsEl) totalDonationsEl.innerText = 'โหลดข้อมูลล้มเหลว';
            const currentAmountEl = document.getElementById('current-amount');
            if (currentAmountEl) currentAmountEl.innerText = '฿0.00';
        }
    }

    function updateStats(total, count) {
        const targetAmount = 47777;
        const currentAmountEl = document.getElementById('current-amount');
        const progressFillEl = document.getElementById('progress-fill');
        const totalDonationsEl = document.getElementById('total-donations');
        const statusMsgEl = document.getElementById('donation-status-msg');

        if (currentAmountEl) currentAmountEl.innerText = `฿${formatNumber(total)}`;
        if (progressFillEl) {
            const percentage = Math.min((total / targetAmount) * 100, 100);
            progressFillEl.style.width = `${percentage}%`;
        }
        if (totalDonationsEl) totalDonationsEl.innerText = `มี ${count} รายการ`;

        if (statusMsgEl) {
            const diff = total - targetAmount;
            if (diff < 0) {
                statusMsgEl.innerText = `ขาดอีก ${formatNumber(Math.abs(diff))} บาท`;
                statusMsgEl.className = 'donation-status-msg status-short';
            } else {
                statusMsgEl.innerText = `ยอดเกินมา ${formatNumber(diff)} บาท`;
                statusMsgEl.className = 'donation-status-msg status-over';
            }
        }
    }

    function renderDonationPage(page) {
        currentPage = page;
        const tbody = document.getElementById('donation-table-body');
        const pagination = document.getElementById('donation-pagination');
        if (!tbody || !pagination) return;

        // Calculate slice
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = allDonations.slice(startIndex, endIndex);

        // Render Table
        tbody.innerHTML = '';
        if (pageData.length === 0 && allDonations.length > 0) {
            // Fallback to page 1 if current page is empty after update
            renderDonationPage(1);
            return;
        }

        pageData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.username}</td>
                <td class="amount">฿${formatNumber(item.amount)}</td>
                <td class="date">${formatThaiDate(item.transaction_date)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Render Pagination
        renderPaginationUI(pagination);
    }

    function renderPaginationUI(container) {
        const numPages = Math.ceil(allDonations.length / itemsPerPage);
        container.innerHTML = '';
        if (numPages <= 1) return;

        for (let i = 1; i <= numPages; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            if (i === currentPage) btn.classList.add('active');
            btn.addEventListener('click', () => {
                renderDonationPage(i);
                // Optional: Scroll to top of table
                document.querySelector('.latest-donations-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            container.appendChild(btn);
        }
    }

    fetchDonationData();
    setInterval(fetchDonationData, 30000);
});

// --- Copy Function ---
function copyAccountNumber() {
    const accNumber = document.getElementById('account-number').innerText;
    navigator.clipboard.writeText(accNumber).then(() => {
        const copyBtn = document.querySelector('.btn-copy');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span></span> คัดลอกแล้ว';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
