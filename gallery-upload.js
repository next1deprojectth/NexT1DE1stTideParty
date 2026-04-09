document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_UPLOADS = 8;
    const STORAGE_KEY = 'gallery_upload_count';

    // --- State & Selectors ---
    const ownerNameInput = document.getElementById('owner-name');
    const imageDescInput = document.getElementById('image-desc');
    const nameCount = document.getElementById('name-count');
    const descCount = document.getElementById('desc-count');
    const fileInput = document.getElementById('file-input');
    const btnSubmit = document.getElementById('btn-submit');

    // Video/Cropper Selectors
    const cropModal = document.getElementById('crop-modal');
    const cropperImg = document.getElementById('cropper-img');
    const btnConfirmCrop = document.getElementById('btn-confirm-crop');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');

    // Intro Selectors
    const introSection = document.getElementById('intro-section');
    const layoutSelectionSection = document.getElementById('layout-selection-section');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const btnAcknowledge = document.getElementById('btn-acknowledge');

    // Data State
    let currentLayout = 'single'; // 'single' or 'stacked'
    let selectedImageBase64 = null;
    let selectedImageTopBase64 = null;
    let selectedImageBottomBase64 = null;
    let activeCropTarget = 'single'; // 'single', 'top', 'bottom'

    let cropper = null;
    let previewDebounceTimer = null;

    // --- Quota Helpers ---
    function getUploadCount() {
        return parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    }
    function setUploadCount(count) {
        localStorage.setItem(STORAGE_KEY, count);
        updateQuotaUI();
    }
    function getRemainingUploads() {
        return Math.max(0, MAX_UPLOADS - getUploadCount());
    }

    // --- Intro & Flow Logic ---
    if (btnAcknowledge && introSection && layoutSelectionSection) {
        btnAcknowledge.addEventListener('click', () => {
            introSection.style.display = 'none';
            layoutSelectionSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const btnGoToForm = document.getElementById('btn-go-to-form');
    if (btnGoToForm && layoutSelectionSection && uploadFormContainer) {
        btnGoToForm.addEventListener('click', () => {
            layoutSelectionSection.style.display = 'none';
            uploadFormContainer.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const btnBackToLayout = document.getElementById('btn-back-to-layout');
    if (btnBackToLayout && layoutSelectionSection && uploadFormContainer) {
        btnBackToLayout.addEventListener('click', () => {
            uploadFormContainer.style.display = 'none';
            layoutSelectionSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    function updateQuotaUI() {
        const remaining = getRemainingUploads();

        const btnSubmit = document.getElementById('btn-submit');
        if (btnSubmit) {
            if (remaining === 0) {
                btnSubmit.innerHTML = `❌ คุณใช้สิทธิ์ส่งรูปครบ ${MAX_UPLOADS} ครั้งแล้ว`;
            } else {
                btnSubmit.innerHTML = `ส่งภาพ (เหลือสิทธิ์อีก ${remaining} ครั้ง)`;
            }
        }
    }

    async function renderUnifiedPolaroid() {
        const TOTAL_W = 1200;
        const TOTAL_H = 1800;
        const PADDING = 60;
        const IMG_W = TOTAL_W - (PADDING * 2);
        const IMG_H = 1440; // 3:4 ratio for the image part
        const TEXT_AREA_START = PADDING + IMG_H;

        const canvas = document.createElement('canvas');
        canvas.width = TOTAL_W;
        canvas.height = TOTAL_H;
        const ctx = canvas.getContext('2d');

        // 1. White Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

        // 2. Image Area or Placeholder
        if (currentLayout === 'single') {
            if (selectedImageBase64) {
                try {
                    const imgEl = new Image();
                    imgEl.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        imgEl.onload = resolve;
                        imgEl.onerror = reject;
                        imgEl.src = selectedImageBase64;
                    });
                    ctx.drawImage(imgEl, PADDING, PADDING, IMG_W, IMG_H);
                } catch (err) {
                    console.error("Image render error:", err);
                }
            } else {
                // Blue Placeholder
                ctx.fillStyle = '#EBF8FF';
                ctx.fillRect(PADDING, PADDING, IMG_W, IMG_H);

                ctx.fillStyle = '#2B6CB0';
                ctx.font = `bold 60px 'Noto Sans Thai', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('เลือกรูปภาพของคุณ', TOTAL_W / 2, PADDING + (IMG_H / 2));
            }
        } else {
            // Stacked Layout: Two 3:2 images
            const HALF_H = IMG_H / 2;
            const GAP = 10; // Small gap between images

            // Top Image
            if (selectedImageTopBase64) {
                try {
                    const imgTop = new Image();
                    imgTop.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        imgTop.onload = resolve;
                        imgTop.onerror = reject;
                        imgTop.src = selectedImageTopBase64;
                    });
                    ctx.drawImage(imgTop, PADDING, PADDING, IMG_W, HALF_H);
                } catch (err) { console.error(err); }
            } else {
                ctx.fillStyle = '#EBF8FF';
                ctx.fillRect(PADDING, PADDING, IMG_W, HALF_H);
                ctx.fillStyle = '#2B6CB0';
                ctx.font = `bold 40px 'Noto Sans Thai', sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('รูปที่ 1 (บน)', TOTAL_W / 2, PADDING + (HALF_H / 2));
            }

            // Bottom Image
            if (selectedImageBottomBase64) {
                try {
                    const imgBottom = new Image();
                    imgBottom.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        imgBottom.onload = resolve;
                        imgBottom.onerror = reject;
                        imgBottom.src = selectedImageBottomBase64;
                    });
                    ctx.drawImage(imgBottom, PADDING, PADDING + HALF_H, IMG_W, HALF_H);
                } catch (err) { console.error(err); }
            } else {
                ctx.fillStyle = '#EDF2F7';
                ctx.fillRect(PADDING, PADDING + HALF_H, IMG_W, HALF_H);
                ctx.fillStyle = '#4A5568';
                ctx.font = `bold 40px 'Noto Sans Thai', sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('รูปที่ 2 (ล่าง)', TOTAL_W / 2, PADDING + HALF_H + (HALF_H / 2));
            }
        }

        // 3. Text Rendering (Manual Line Breaks)
        const descText = imageDescInput.value.trim();
        const ownerName = ownerNameInput.value.trim();
        const ownerDisplay = ownerName ? `~ ${ownerName} ~` : '~ ไม่เปิดเผยตัวตน ~';
        const fontName = 'CS Prajad';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Description - Respect \n and limit to 2 lines
        const descFontSize = 58;
        const descZoneHeight = 180;
        const descZoneCenterY = TEXT_AREA_START + (descZoneHeight / 2) + 20;

        if (!descText) {
            // Prompt text when empty
            ctx.fillStyle = '#CBD5E0';
            ctx.font = `bold ${descFontSize}px ${fontName}`;
            ctx.fillText('คำบรรยายภาพ (สูงสุด 2 บรรทัด)', TOTAL_W / 2, descZoneCenterY - (descFontSize / 2));
        } else {
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${descFontSize}px ${fontName}`;

            // Logic: Split by \n, take first 2. If no \n, just draw 1 line (user controlled)
            const manualLines = imageDescInput.value.split('\n').filter(l => l.length > 0).slice(0, 2);

            if (manualLines.length === 1) {
                ctx.fillText(manualLines[0], TOTAL_W / 2, descZoneCenterY - (descFontSize / 2));
            } else if (manualLines.length >= 2) {
                const lineSpacing = 15;
                ctx.fillText(manualLines[0], TOTAL_W / 2, descZoneCenterY - descFontSize - (lineSpacing / 2));
                ctx.fillText(manualLines[1], TOTAL_W / 2, descZoneCenterY + (lineSpacing / 2));
            }
        }

        // Owner Name - Fixed at bottom
        ctx.fillStyle = '#000000';
        ctx.font = `bold 45px ${fontName}`;
        ctx.fillText(ownerDisplay, TOTAL_W / 2, TOTAL_H - 100);

        // 4. Update Preview Result
        try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            const viewImg = document.getElementById('generated-polaroid-view');
            if (viewImg) {
                viewImg.src = dataURL;
                // Success log
                if (dataURL.length < 100) console.warn("Canvas Render produced unexpectedly small dataURL");
            }
        } catch (e) {
            console.error("Canvas toDataURL Error:", e);
        }
        return canvas.toDataURL('image/jpeg', 0.9);
    }

    function updatePreviewWithDebounce() {
        if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(async () => {
            await renderUnifiedPolaroid();
            validateForm();
        }, 500); // 500ms delay as requested
    }

    // --- Input & Event Listeners ---
    imageDescInput.addEventListener('input', () => {
        descCount.innerText = `${imageDescInput.value.length}/50`;
        updatePreviewWithDebounce();
    });

    ownerNameInput.addEventListener('input', () => {
        nameCount.innerText = `${ownerNameInput.value.length}/30`;
        updatePreviewWithDebounce();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            openCropModal(event.target.result);
        };
        reader.readAsDataURL(file);
        
        // Reset file input to allow same file re-upload
        e.target.value = '';
    });

    function openCropModal(imageSrc) {
        cropperImg.src = imageSrc;
        cropModal.classList.add('active');
        if (cropper) cropper.destroy();

        // Dynamic aspect ratio based on layout and slot
        const ratio = (currentLayout === 'single') ? (3 / 4) : (3 / 2);
        const modalTitle = document.querySelector('#crop-modal h3');
        if (modalTitle) {
            modalTitle.innerText = `ปรับแต่งรูปภาพ (สัดส่วน ${currentLayout === 'single' ? '3:4' : '3:2'})`;
        }

        cropper = new Cropper(cropperImg, {
            aspectRatio: ratio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
        });
    }

    btnConfirmCrop.addEventListener('click', () => {
        const hiResCanvas = cropper.getCroppedCanvas({
            imageSmoothingQuality: 'high',
        });
        const croppedData = hiResCanvas.toDataURL('image/png', 1.0);

        if (currentLayout === 'single') {
            selectedImageBase64 = croppedData;
        } else if (activeCropTarget === 'top') {
            selectedImageTopBase64 = croppedData;
        } else if (activeCropTarget === 'bottom') {
            selectedImageBottomBase64 = croppedData;
        }

        closeCropModal();
        renderUnifiedPolaroid();
        validateForm();
    });

    // --- Layout Selector Logic ---
    const layoutSingleStep = document.getElementById('layout-single-step');
    const layoutStackedStep = document.getElementById('layout-stacked-step');
    const overlaySingle = document.getElementById('overlay-single');
    const overlayStacked = document.getElementById('overlay-stacked');

    function switchLayout(layout) {
        currentLayout = layout;
        if (layout === 'single') {
            layoutSingleStep.classList.add('active');
            layoutStackedStep.classList.remove('active');
            overlaySingle.style.display = 'flex';
            overlayStacked.style.display = 'none';
        } else {
            layoutStackedStep.classList.add('active');
            layoutSingleStep.classList.remove('active');
            overlaySingle.style.display = 'none';
            overlayStacked.style.display = 'flex';
        }
        renderUnifiedPolaroid();
        validateForm();
    }

    if (layoutSingleStep) layoutSingleStep.addEventListener('click', () => switchLayout('single'));
    if (layoutStackedStep) layoutStackedStep.addEventListener('click', () => switchLayout('stacked'));

    // --- Upload Slot Click Handlers ---
    if (overlaySingle) {
        overlaySingle.addEventListener('click', () => {
            activeCropTarget = 'single';
            fileInput.click();
        });
    }
    const slotTop = document.getElementById('slot-top');
    const slotBottom = document.getElementById('slot-bottom');

    if (slotTop) {
        slotTop.addEventListener('click', (e) => {
            e.stopPropagation();
            activeCropTarget = 'top';
            fileInput.click();
        });
    }
    if (slotBottom) {
        slotBottom.addEventListener('click', (e) => {
            e.stopPropagation();
            activeCropTarget = 'bottom';
            fileInput.click();
        });
    }

    function validateForm() {
        const isDescValid = imageDescInput.value.trim().length > 0;
        let isImageValid = false;

        if (currentLayout === 'single') {
            isImageValid = !!selectedImageBase64;
        } else {
            isImageValid = !!selectedImageTopBase64 && !!selectedImageBottomBase64;
        }

        const hasQuota = getRemainingUploads() > 0;

        const btnSubmitNavbar = document.getElementById('btn-submit');
        if (btnSubmitNavbar) {
            btnSubmitNavbar.disabled = !(isDescValid && isImageValid && hasQuota);
        }
    }

    // --- Initialization ---
    // Ensure UI is updated on load
    updateQuotaUI();

    // --- Sticky Navbar Scroll Logic ---
    // const navbar = document.querySelector('.navbar');
    // window.addEventListener('scroll', () => {
    //     if (window.scrollY > 50) {
    //         navbar.classList.add('scrolled');
    //     } else {
    //         navbar.classList.remove('scrolled');
    //     }
    // });

    // Initial Render - Bulletproof Sequence
    const triggerInitialRenders = () => {
        renderUnifiedPolaroid();
        validateForm();
    };

    // 1. Immediate (Fallback font likely)
    triggerInitialRenders();

    // 2. When fonts are ready
    if (document.fonts) {
        document.fonts.ready.then(() => {
            triggerInitialRenders();
        });
    }

    // 3. Last chance delay for slow assets/reflows
    setTimeout(triggerInitialRenders, 500);
    setTimeout(triggerInitialRenders, 1500); // 1.5s as ultimate fallback

    // --- Submit Logic Flow ---
    const reviewFormContainer = document.getElementById('review-form-container');
    const reviewFinalImg = document.getElementById('review-final-img');
    const btnConfirmSubmit = document.getElementById('btn-confirm-submit');
    const btnCancelReview = document.getElementById('btn-cancel-review');


    btnSubmit.addEventListener('click', () => {
        if (getRemainingUploads() <= 0) {
            alert('คุณใช้สิทธิ์ส่งรูปครบ ' + MAX_UPLOADS + ' ครั้งแล้ว');
            return;
        }

        // Show review section
        const finalImgData = document.getElementById('generated-polaroid-view').src;
        if (!finalImgData || finalImgData.length < 100) {
            alert('กรุณารอโหลดรูปภาพสักครู่...');
            return;
        }

        reviewFinalImg.src = finalImgData;
        uploadFormContainer.style.display = 'none';
        reviewFormContainer.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btnCancelReview.addEventListener('click', () => {
        reviewFormContainer.style.display = 'none';
        uploadFormContainer.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btnConfirmSubmit.addEventListener('click', async () => {
        reviewFormContainer.style.display = 'none';
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            // The image displayed in the preview IS the final image
            const finalImageData = document.getElementById('generated-polaroid-view').src;
            if (!finalImageData || finalImageData.startsWith('data:image/gif')) {
                throw new Error('Image not ready');
            }

            const [prefix, base64Data] = finalImageData.split(',');
            const mimeType = prefix.match(/:(.*?);/)[1];

            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadImageGallery',
                    base64: base64Data,
                    mimeType: mimeType
                })
            });

            const result = await response.json();

            if (result.status === 'ok') {
                setUploadCount(getUploadCount() + 1);
                document.getElementById('upload-form-container').style.display = 'none';
                const successContainer = document.getElementById('success-container');
                document.getElementById('final-polaroid-img').src = finalImageData;
                successContainer.style.display = 'block';

                const remaining = getRemainingUploads();
                const successQuotaRemaining = document.getElementById('success-quota-remaining');
                if (successQuotaRemaining) successQuotaRemaining.textContent = remaining;

                if (remaining === 0) {
                    document.getElementById('success-quota-badge').classList.add('quota-exhausted');
                    document.getElementById('success-quota-text').innerHTML =
                        '❌ คุณใช้สิทธิ์ส่งรูปครบ <strong>' + MAX_UPLOADS + '</strong> ครั้งแล้ว';
                    const btnUploadAgain = document.getElementById('btn-upload-again');
                    if (btnUploadAgain) btnUploadAgain.style.display = 'none';
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(result.message || 'Server error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + error.message);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // Cleanup redundant modal logic
    btnCancelCrop.addEventListener('click', () => closeCropModal());
    function closeCropModal() {
        if (!cropModal) return;
        cropModal.classList.remove('active');
        if (cropper) cropper.destroy();
        cropper = null;
    }
});
