document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_UPLOADS = 3;
    const STORAGE_KEY = 'gallery_upload_count';

    // --- State & Selectors ---
    const ownerNameInput = document.getElementById('owner-name');
    const imageDescInput = document.getElementById('image-desc');
    const nameCount = document.getElementById('name-count');
    const descCount = document.getElementById('desc-count');
    const fileInput = document.getElementById('file-input');
    const btnSubmit = document.getElementById('btn-submit');
    const polaroidPreview = document.getElementById('polaroid-preview');
    const previewImg = document.getElementById('preview-img');
    const previewDescText = document.getElementById('preview-desc-text');
    const previewOwnerText = document.getElementById('preview-owner-text');

    // Set initial placeholder state
    previewDescText.classList.add('placeholder');

    // Cropper
    const cropModal = document.getElementById('crop-modal');
    const cropperImg = document.getElementById('cropper-img');
    const btnConfirmCrop = document.getElementById('btn-confirm-crop');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    let cropper = null;

    // Data
    let selectedImageBase64 = null;
    // Store the original high-res image for final rendering
    let originalCroppedImage = null;

    // --- Upload Quota Logic ---
    function getUploadCount() {
        return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    }

    function setUploadCount(count) {
        localStorage.setItem(STORAGE_KEY, count.toString());
    }

    function getRemainingUploads() {
        return Math.max(0, MAX_UPLOADS - getUploadCount());
    }

    function updateQuotaDisplay() {
        const remaining = getRemainingUploads();
        const quotaBadge = document.getElementById('quota-badge');
        const quotaRemaining = document.getElementById('quota-remaining');

        if (quotaRemaining) quotaRemaining.textContent = remaining;

        if (remaining === 0) {
            quotaBadge.classList.add('quota-exhausted');
            document.getElementById('quota-text').innerHTML =
                '❌ คุณใช้สิทธิ์ส่งรูปครบ <strong>' + MAX_UPLOADS + '</strong> ครั้งแล้ว';
            // Disable entire form
            disableForm();
        }
    }

    function disableForm() {
        ownerNameInput.disabled = true;
        imageDescInput.disabled = true;
        fileInput.disabled = true;
        btnSubmit.disabled = true;
        document.getElementById('upload-area').style.pointerEvents = 'none';
        document.getElementById('upload-area').style.opacity = '0.5';
    }

    // Initialize quota display
    updateQuotaDisplay();

    // --- Input Logic ---
    ownerNameInput.addEventListener('input', () => {
        const val = ownerNameInput.value;
        nameCount.innerText = `${val.length}/30`;
        previewOwnerText.innerText = val.trim() ? `~ ${val.trim()} ~` : '~ ไม่เปิดเผยตัวตน ~';

        validateForm();
    });

    imageDescInput.addEventListener('input', () => {
        const val = imageDescInput.value;
        descCount.innerText = `${val.length}/50`;
        previewDescText.innerText = val || 'รายละเอียดภาพของคุณ';

        if (val.trim()) {
            previewDescText.classList.remove('placeholder');
        } else {
            previewDescText.classList.add('placeholder');
        }

        validateForm();
    });

    // --- Image Logic ---
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Check aspect ratio (4:6 = 0.667)
                const ratio = img.width / img.height;
                if (Math.abs(ratio - (4 / 6)) < 0.02) {
                    // It's roughly 3:4, use directly
                    originalCroppedImage = event.target.result;
                    selectedImageBase64 = event.target.result;
                    previewImg.src = selectedImageBase64;
                    markImageSelected();
                    validateForm();
                } else {
                    // Show crop modal
                    openCropModal(event.target.result);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    function openCropModal(imageSrc) {
        cropperImg.src = imageSrc;
        cropModal.classList.add('active');

        if (cropper) cropper.destroy();

        cropper = new Cropper(cropperImg, {
            aspectRatio: 3 / 4,
            viewMode: 1,
            autoCropArea: 1,
        });
    }

    btnConfirmCrop.addEventListener('click', () => {
        // Get high-resolution cropped canvas for final output
        const hiResCanvas = cropper.getCroppedCanvas({
            width: 1080,
            height: 1440,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        // Store original high-res as PNG for maximum quality
        originalCroppedImage = hiResCanvas.toDataURL('image/png', 1.0);

        // Also create a preview version
        selectedImageBase64 = originalCroppedImage;
        previewImg.src = selectedImageBase64;
        closeCropModal();
        markImageSelected();
        validateForm();
    });

    btnCancelCrop.addEventListener('click', () => {
        closeCropModal();
        fileInput.value = '';
    });

    function closeCropModal() {
        cropModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    function markImageSelected() {
        const uploadArea = document.getElementById('upload-area');
        const uploadText = document.getElementById('upload-area-text');
        uploadArea.classList.add('has-image');
        uploadText.textContent = '✏️ แก้ไขรูปภาพ';
    }

    function validateForm() {
        const isDescValid = imageDescInput.value.trim().length > 0;
        const isImageValid = !!selectedImageBase64;
        const hasQuota = getRemainingUploads() > 0;

        btnSubmit.disabled = !(isDescValid && isImageValid && hasQuota);
    }

    // --- High-Resolution Image Helper ---
    async function generateHighResPolaroid() {
        if (!selectedImageBase64) return null;

        const TOTAL_W = 1200;
        const TOTAL_H = 1800;
        const PADDING = 60; // Left, Right, Top padding
        const IMG_W = TOTAL_W - (PADDING * 2); // 1080
        const IMG_H = 1440; // 3:4 ratio (1080 / 3 * 4 = 1440)
        const TEXT_AREA_START = PADDING + IMG_H; // 1500

        const canvas = document.createElement('canvas');
        canvas.width = TOTAL_W;
        canvas.height = TOTAL_H;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

        // Draw the cropped image at full resolution
        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
            imgEl.onload = resolve;
            imgEl.onerror = (e) => reject(new Error('Image failed to load for canvas rendering'));
            imgEl.src = selectedImageBase64;
        });

        // Draw the main image
        ctx.drawImage(imgEl, PADDING, PADDING, IMG_W, IMG_H);

        // --- Text Rendering ---
        const descText = imageDescInput.value.trim() || '';
        const ownerName = ownerNameInput.value.trim();
        const ownerDisplay = ownerName ? `~ ${ownerName} ~` : '~ ไม่เปิดเผยตัวตน ~';

        const descFontSize = 58;
        const ownerFontSize = 45;
        const fontName = 'CS Prajad';

        // Prepare Description Lines - Improved for Thai (Pixel-based wrapping)
        function wrapText(text, maxWidth, ctx) {
            if (!text) return [];
            let result = [];
            let currentLine = '';
            
            for (let char of text) {
                let testLine = currentLine + char;
                let metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine !== '') {
                    result.push(currentLine);
                    currentLine = char;
                    if (result.length >= 2) break; // Limit to 2 lines
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine !== '' && result.length < 2) {
                result.push(currentLine);
            }
            return result;
        }

        // Measure with the correct font before wrapping
        ctx.font = `bold ${descFontSize}px ${fontName}`;
        const lines = wrapText(descText, 900, ctx); // 900px wide for generous padding (1200 total)

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const descZoneHeight = 180; // Area for 2 lines
        const descZoneCenterY = TEXT_AREA_START + (descZoneHeight / 2) + 20;

        if (lines.length === 1) {
            // Draw 1 line centered vertically in the zone
            ctx.fillText(lines[0], TOTAL_W / 2, descZoneCenterY - (descFontSize / 2));
        } else if (lines.length >= 2) {
            // Draw 2 lines
            const lineSpacing = 15;
            ctx.fillText(lines[0], TOTAL_W / 2, descZoneCenterY - descFontSize - (lineSpacing / 2));
            ctx.fillText(lines[1], TOTAL_W / 2, descZoneCenterY + (lineSpacing / 2));
        }

        // Owner text - Fixed at bottom
        ctx.font = `bold ${ownerFontSize}px ${fontName}`;
        ctx.fillText(ownerDisplay, TOTAL_W / 2, TOTAL_H - 100);

        return canvas.toDataURL('image/jpeg', 1.0);
    }

    // --- Zoom Preview Logic ---
    const btnZoom = document.getElementById('btn-zoom-preview');
    const zoomModal = document.getElementById('zoom-modal');
    const zoomModalImg = document.getElementById('zoom-modal-img');
    const btnZoomClose = document.getElementById('btn-zoom-close');

    btnZoom.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!selectedImageBase64) return;

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            const highResDataURL = await generateHighResPolaroid();
            if (highResDataURL) {
                zoomModalImg.src = highResDataURL;
                zoomModal.classList.add('active');
            }
        } catch (err) {
            console.error('Preview error:', err);
            alert('ไม่สามารถสร้างพรีวิวได้ในขณะนี้');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    btnZoomClose.addEventListener('click', () => {
        zoomModal.classList.remove('active');
    });

    zoomModal.addEventListener('click', (e) => {
        if (e.target === zoomModal) {
            zoomModal.classList.remove('active');
        }
    });

    // --- Submit Logic (The "Flatten" part) ---
    btnSubmit.addEventListener('click', async () => {
        // Double-check quota
        if (getRemainingUploads() <= 0) {
            alert('คุณใช้สิทธิ์ส่งรูปครบ ' + MAX_UPLOADS + ' ครั้งแล้ว');
            return;
        }

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            const finalImageData = await generateHighResPolaroid();
            if (!finalImageData) throw new Error('Failed to generate image');

            // Extract base64 and mimeType for the API
            const [prefix, base64Data] = finalImageData.split(',');
            const mimeType = prefix.match(/:(.*?);/)[1];

            // Send to API
            const payload = {
                action: 'uploadImageGallery',
                base64: base64Data,
                mimeType: mimeType
            };

            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'ok') {
                // Increment upload count
                const newCount = getUploadCount() + 1;
                setUploadCount(newCount);
                const remaining = Math.max(0, MAX_UPLOADS - newCount);

                // Success! Show Summary View
                document.getElementById('upload-form-container').style.display = 'none';
                const successContainer = document.getElementById('success-container');
                const finalImg = document.getElementById('final-polaroid-img');

                finalImg.src = finalImageData;
                successContainer.style.display = 'block';

                // Update success quota display
                const successQuotaRemaining = document.getElementById('success-quota-remaining');
                const successQuotaBadge = document.getElementById('success-quota-badge');
                if (successQuotaRemaining) successQuotaRemaining.textContent = remaining;

                if (remaining === 0) {
                    successQuotaBadge.classList.add('quota-exhausted');
                    document.getElementById('success-quota-text').innerHTML =
                        '❌ คุณใช้สิทธิ์ส่งรูปครบ <strong>' + MAX_UPLOADS + '</strong> ครั้งแล้ว';
                    // Hide "ส่งภาพใหม่" button
                    const btnUploadAgain = document.getElementById('btn-upload-again');
                    if (btnUploadAgain) btnUploadAgain.style.display = 'none';
                }

                // Scroll to top to see success message
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(result.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
            }

        } catch (error) {
            console.error('Upload error:', error);
            alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + error.message);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });
});
