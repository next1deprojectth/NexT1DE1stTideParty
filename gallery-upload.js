document.addEventListener('DOMContentLoaded', () => {
    // --- State & Selectors ---
    const ownerNameInput = document.getElementById('owner-name');
    const imageDescInput = document.getElementById('image-desc');
    const nameCount = document.getElementById('name-count');
    const descCount = document.getElementById('desc-count');
    const fontOptions = document.querySelectorAll('.font-option');
    const fileInput = document.getElementById('file-input');
    const btnSubmit = document.getElementById('btn-submit');
    const polaroidPreview = document.getElementById('polaroid-preview');
    const previewImg = document.getElementById('preview-img');
    const previewDescText = document.getElementById('preview-desc-text');
    const previewOwnerText = document.getElementById('preview-owner-text');

    // Set initial placeholder state
    previewDescText.classList.add('placeholder');
    previewOwnerText.classList.add('placeholder');

    // Cropper
    const cropModal = document.getElementById('crop-modal');
    const cropperImg = document.getElementById('cropper-img');
    const btnConfirmCrop = document.getElementById('btn-confirm-crop');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    let cropper = null;

    // Data
    let selectedImageBase64 = null;
    let selectedFont = "'Noto Sans Thai', sans-serif";

    // --- Input Logic ---
    ownerNameInput.addEventListener('input', () => {
        const val = ownerNameInput.value;
        nameCount.innerText = `${val.length}/30`;
        previewOwnerText.innerText = val || 'ชื่อเจ้าของภาพ';
        
        if (val.trim()) {
            previewOwnerText.classList.remove('placeholder');
        } else {
            previewOwnerText.classList.add('placeholder');
        }
        
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

    fontOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            fontOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            selectedFont = opt.dataset.font;
            previewDescText.style.fontFamily = selectedFont;
            previewOwnerText.style.fontFamily = selectedFont;
        });
    });

    // --- Image Logic ---
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Check aspect ratio
                const ratio = img.width / img.height;
                if (Math.abs(ratio - 1) < 0.01) {
                    // It's 1:1, use directly
                    selectedImageBase64 = event.target.result;
                    previewImg.src = selectedImageBase64;
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
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
        });
    }

    btnConfirmCrop.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas({
            width: 800,
            height: 800,
        });
        selectedImageBase64 = canvas.toDataURL('image/jpeg', 0.9);
        previewImg.src = selectedImageBase64;
        closeCropModal();
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

    function validateForm() {
        const isNameValid = ownerNameInput.value.trim().length > 0;
        const isDescValid = imageDescInput.value.trim().length > 0;
        const isImageValid = !!selectedImageBase64;

        btnSubmit.disabled = !(isNameValid && isDescValid && isImageValid);
    }

    // --- Submit Logic (The "Flatten" part) ---
    btnSubmit.addEventListener('click', async () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        try {
            // 1. Prepare for Capture (Hide shadow for exact look)
            polaroidPreview.classList.add('no-shadow');

            // 2. Capture the polaroid element
            // Increase scale to 4 for very high quality
            const canvas = await html2canvas(polaroidPreview, {
                scale: 4, 
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedPolaroid = clonedDoc.getElementById('polaroid-preview');
                    if (clonedPolaroid) {
                        clonedPolaroid.style.boxShadow = 'none';
                        clonedPolaroid.style.borderRadius = '0';
                    }
                }
            });

            polaroidPreview.classList.remove('no-shadow');

            const finalImageData = canvas.toDataURL('image/jpeg', 1.0);

            // Extract base64 and mimeType for the new API
            const [prefix, base64Data] = finalImageData.split(',');
            const mimeType = prefix.match(/:(.*?);/)[1];

            // 3. Send to API
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
                // Success! Show Summary View
                document.getElementById('upload-form-container').style.display = 'none';
                const successContainer = document.getElementById('success-container');
                const finalImg = document.getElementById('final-polaroid-img');
                
                finalImg.src = finalImageData;
                successContainer.style.display = 'block';
                
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
