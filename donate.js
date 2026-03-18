document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentState = 1; // 1 or 2
    let slipData = null; // Stored after AI analysis
    let selectedSocial = 'twitter';
    let selectedMethod = 'delivery';
    const RECEIVER_NAME_TARGET = "ธัญดา"; // Partial match for "น.ส.ธัญดา" or "น.ส. ธัญดา"

    const API_KEY = "AIzaSyCkyNdXPlZFjb6BiV0D5vNZV-bYDvkhVrU";
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    const BANKS = [
        { code: "SCB", name: "ธนาคารไทยพาณิชย์" },
        { code: "KBANK", name: "ธนาคารกสิกรไทย" },
        { code: "KTB", name: "ธนาคารกรุงไทย" },
        { code: "BBL", name: "ธนาคารกรุงเทพ" },
        { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา" },
        { code: "TTB", name: "ธนาคารทีเอ็มบีธนชาต" },
        { code: "GSB", name: "ธนาคารออมสิน" },
        { code: "BAAC", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร" },
        { code: "GHB", name: "ธนาคารอาคารสงเคราะห์" },
        { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร" },
        { code: "CIMBT", name: "ธนาคารซีไอเอ็มบี ไทย" },
        { code: "TISCO", name: "ธนาคารทิสโก้" },
        { code: "UOB", name: "ธนาคารยูโอบี" },
        { code: "LHBANK", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์" },
        { code: "ICBC", name: "ธนาคารไอซีบีซี (ไทย)" },
        { code: "SCBT", name: "ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)" },
        { code: "EXIM", name: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย" },
        { code: "SMEBANK", name: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย" },
        { code: "ISBT", name: "ธนาคารอิสลามแห่งประเทศไทย" }
    ];

    // --- Selectors ---
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const stepPill1 = document.getElementById('step-pill-1');
    const stepPill2 = document.getElementById('step-pill-2');
    const stepLabelText = document.getElementById('step-label-text');

    const accountBox = document.querySelector('.donate-account-box');
    const uploadSectionLabel = document.querySelector('.upload-section-label');
    const uploadZone = document.getElementById('upload-zone');
    const slipFileInput = document.getElementById('slip-file-input');
    const uploadPreviewWrapper = document.getElementById('upload-preview-wrapper');
    const uploadZoneContent = document.getElementById('upload-zone-content');
    const slipPreviewImg = document.getElementById('slip-preview-img');
    const uploadErrorMsg = document.getElementById('upload-error-msg');
    const aiLoading = document.getElementById('ai-loading');
    const verifiedResultCard = document.getElementById('verified-result-card');
    const summarySection = document.getElementById('summary-section');

    const vrSender = document.getElementById('vr-sender');
    const vrAmount = document.getElementById('vr-amount');
    const vrDate = document.getElementById('vr-date');

    const projectModal = document.getElementById('project-modal');
    const projectModalClose = document.getElementById('project-modal-close');
    const projectBtn = document.getElementById('btn-project-info');

    // --- Navigation ---
    const goToStep = (step) => {
        currentState = step;
        if (step === 1) {
            step1.style.display = 'block';
            step2.style.display = 'none';
            stepPill1.classList.add('active');
            stepPill2.classList.remove('active');
            stepLabelText.innerText = 'ขั้นตอนที่ 1 จาก 2';
        } else {
            step1.style.display = 'none';
            step2.style.display = 'block';
            stepPill1.classList.add('active');
            stepPill2.classList.add('active');
            stepLabelText.innerText = 'ขั้นตอนที่ 2 จาก 2';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            prepareStep2Data();
        }
    };

    // --- Step 1: File Upload & AI ---
    window.triggerFileInput = () => {
        slipFileInput.click();
    };

    window.handleFileSelected = (input) => {
        const file = input.files[0];
        if (!file) return;

        // Reset UI
        uploadErrorMsg.style.display = 'none';
        verifiedResultCard.style.display = 'none';
        summarySection.style.display = 'none';

        // Ensure inputs are visible for re-upload
        accountBox.style.display = 'block';
        uploadSectionLabel.style.display = 'block';
        uploadZone.style.display = 'flex';

        // Show Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            slipPreviewImg.src = e.target.result;
            uploadPreviewWrapper.style.display = 'block';
            uploadZoneContent.style.display = 'none';
        };
        reader.readAsDataURL(file);

        processSlipWithAI(file);
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const processSlipWithAI = async (file) => {
        aiLoading.style.display = 'block';
        uploadErrorMsg.style.display = 'none';

        try {
            const base64Data = await fileToBase64(file);

            const prompt = `Analyze this bank transfer slip image and extract the following details in JSON format:
{
  "is_slip": boolean,
  "date": "DD/mm/YYYY HH:MM:SS",
  "bank_code": "Code from known Thai banks (e.g. SCB, KBANK)",
  "sender_name": "Full name",
  "sender_account": "Account number",
  "receiver_name": "Full name",
  "ref_number": "Reference number",
  "amount": number,
  "currency": "THB"
}
If it is NOT a bank slip, set is_slip to false. Identify the bank code clearly.`;

            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: file.type, data: base64Data } }
                        ]
                    }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            console.log("Gemini Raw Response:", result);

            const aiText = result.candidates[0].content.parts[0].text;
            console.log("AI Extracted Text:", aiText);

            const data = JSON.parse(aiText);
            console.log("Parsed Slip Data:", data);

            aiLoading.style.display = 'none';

            if (!data.is_slip) {
                uploadErrorMsg.innerText = 'เกิดข้อผิดพลาด, ไม่สามารถอ่านสลิปได้';
                uploadErrorMsg.style.display = 'block';
                return;
            }

            // Check Receiver Name
            if (!data.receiver_name.includes(RECEIVER_NAME_TARGET)) {
                uploadErrorMsg.innerText = 'เกิดข้อผิดพลาด, สลิปคุณโอนไปปลายทางไม่ถูกต้อง';
                uploadErrorMsg.style.display = 'block';
                return;
            }

            // SUCCESS logic
            slipData = data;

            // Hide account box and upload components
            accountBox.style.display = 'none';
            uploadSectionLabel.style.display = 'none';
            uploadZone.style.display = 'none';

            showVerifiedResult(data);

        } catch (error) {
            console.error("Gemini Error:", error);
            aiLoading.style.display = 'none';
            uploadErrorMsg.innerText = 'เกิดข้อผิดพลาดทางเทคนิค, กรุณาลองใหม่อีกครั้ง';
            uploadErrorMsg.style.display = 'block';
        }
    };

    const showVerifiedResult = (data) => {
        vrSender.innerText = data.sender_name || '-';
        vrAmount.innerText = `฿ ${data.amount.toLocaleString()}`;
        vrDate.innerText = data.date || '-';

        verifiedResultCard.style.display = 'block';
        verifiedResultCard.style.textAlign = 'center'; // Center internal content
        summarySection.style.display = 'block';

        const historySenderName = document.getElementById('history-sender-name');
        const cumulativeAmount = document.getElementById('cumulative-amount');
        const historyList = document.getElementById('history-list');

        historySenderName.innerText = data.sender_name || '-';
        cumulativeAmount.innerText = `฿${data.amount.toLocaleString()}`;

        historyList.innerHTML = `
            <div class="history-item">
                <div class="history-item-content">
                    <p class="history-item-text">สนับสนุนโปรเจค (รอบนี้)</p>
                    <p class="history-item-date">${data.date ? data.date.split(' ')[0] : '-'}</p>
                </div>
                <span class="history-item-amount">฿${data.amount.toLocaleString()}</span>
            </div>
        `;

        const target = 1000;
        const diff = target - data.amount;
        document.getElementById('giftaway-more').innerText = diff > 0
            ? `บริจาคอีก ฿${diff.toLocaleString()} เพื่อรับ Giftaway`
            : `คุณได้รับสิทธิ์ Giftaway แล้ว!`;
    };

    document.getElementById('btn-confirm-step1').addEventListener('click', () => {
        goToStep(2);
    });

    // --- Step 2: Form Handling ---
    const socialTabs = document.querySelectorAll('.social-tab');
    socialTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            socialTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedSocial = tab.dataset.social;
            document.getElementById('social-username').placeholder =
                selectedSocial === 'twitter' ? '@Username' : `@Account_${selectedSocial}`;
        });
    });

    window.selectMethod = (method) => {
        selectedMethod = method;
        document.getElementById('method-pickup').classList.toggle('selected', method === 'pickup');
        document.getElementById('method-delivery').classList.toggle('selected', method === 'delivery');

        // Toggle forms & notice
        document.getElementById('delivery-notice').style.display = method === 'delivery' ? 'block' : 'none';
        document.getElementById('delivery-form-fields').style.display = method === 'delivery' ? 'block' : 'none';

        updateNoticeValues();
    };

    const updateNoticeValues = () => {
        if (!slipData) return;
        const total = slipData.amount;
        document.getElementById('transfer-amount-notice').innerText = `${total.toLocaleString()} บาท`;
        document.getElementById('project-support-amount').innerText = (total - 50).toLocaleString();
    };

    const prepareStep2Data = () => {
        if (!slipData) return;
        document.getElementById('step2-sender-name').innerText = slipData.sender;
        document.getElementById('step2-cumulative').innerText = `฿${slipData.amount.toLocaleString()}`;
        updateNoticeValues();
    };

    // --- Project Modal Logic ---
    let currentProjectIdx = 0;
    const projectImgs = document.querySelectorAll('.project-modal-img');
    const pDots = document.querySelectorAll('.project-dot');

    let touchStartX = 0;
    let touchEndX = 0;

    const updateProjectGallery = () => {
        projectImgs.forEach((img, i) => {
            img.style.opacity = i === currentProjectIdx ? '1' : '0';
            img.classList.toggle('active', i === currentProjectIdx);
        });
        pDots.forEach((dot, i) => dot.classList.toggle('active', i === currentProjectIdx));
    };

    const nextProject = () => {
        currentProjectIdx = (currentProjectIdx + 1) % projectImgs.length;
        updateProjectGallery();
    };

    const prevProject = () => {
        currentProjectIdx = (currentProjectIdx - 1 + projectImgs.length) % projectImgs.length;
        updateProjectGallery();
    };

    projectBtn.addEventListener('click', () => {
        projectModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        currentProjectIdx = 0;
        updateProjectGallery();
    });

    projectModalClose.addEventListener('click', () => {
        projectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    document.getElementById('project-modal-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        prevProject();
    });

    document.getElementById('project-modal-next').addEventListener('click', (e) => {
        e.stopPropagation();
        nextProject();
    });

    // Swipe Handler
    projectModal.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    projectModal.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) nextProject();
        if (touchEndX > touchStartX + 50) prevProject();
    }, { passive: true });

    // Close on backdrop click
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal || e.target.classList.contains('project-modal-slides')) {
            projectModalClose.click();
        }
    });

    // --- Global Copies ---
    window.copyDonateAccount = () => {
        const text = document.getElementById('donate-account-number').innerText;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('btn-copy-account');
            const original = btn.innerHTML;
            btn.innerHTML = `<span class="copy-icon"></span> คัดลอกแล้ว`;
            setTimeout(() => btn.innerHTML = original, 2000);
        });
    };

    // --- Final Submit ---
    document.getElementById('btn-submit-final').addEventListener('click', () => {
        const username = document.getElementById('social-username').value;
        if (!username) {
            alert('กรุณากรอก Username โซเชียลของคุณ');
            return;
        }

        if (selectedMethod === 'delivery') {
            const phone = document.getElementById('phone-number').value;
            const address = document.getElementById('shipping-address').value;
            const zip = document.getElementById('postal-code').value;
            if (!phone || !address || !zip) {
                alert('กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน');
                return;
            }
        }

        alert('ส่งข้อมูลสำเร็จ! ขอบคุณสำหรับการร่วมเป็นส่วนหนึ่งของโปรเจค');
        window.location.href = 'index.html';
    });

});
