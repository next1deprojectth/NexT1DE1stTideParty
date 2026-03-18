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

    // --- Report Button Mock ---
    const reportBtn = document.querySelector('.btn-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    alert('กำลังอัปโหลดสลิปและประมวลผลด้วย AI... (Mockup)');
                    setTimeout(() => {
                        alert('ยืนยันยอดโดเนทเรียบร้อยแล้ว! ขอบคุณสำหรับการสนับสนุนครับ');
                    }, 2000);
                }
            };
            fileInput.click();
        });
    }
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
