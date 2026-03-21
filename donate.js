document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentState = 1;
    let slipData = null;
    let selectedSocial = 'x';
    let selectedMethod = 'pickup'; // Default is onsite
    let mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null };
    let nickname = '';
    let currentTotalOriginal = 0;
    let isChangingReception = false; // Flag to show normal selection instead of past box

    let slipImageBase64 = '';
    let slipMimeType = '';

    const RECEIVER_NAME_TARGET = "ธัญดา";
    const WEBHOOK_URL = "https://next1de.app.n8n.cloud/webhook/6e4a539b-5580-40f9-a85f-47a488a2e842";
    const API_ENDPOINT = API_CONFIG.BASE_URL;
    const GET_API_URL = API_ENDPOINT;
    const SAVE_API_URL = API_ENDPOINT;
    const UPLOAD_API_URL = API_ENDPOINT;

    // --- Selectors ---
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const stepLabelText = document.getElementById('step-label-text');

    const globalLoading = document.getElementById('global-loading');
    const globalLoadingText = document.getElementById('global-loading-text');

    // Step 1
    const socialTabs = document.querySelectorAll('.social-tab');
    const socialInput = document.getElementById('social-username');
    const btnConfirmStep1 = document.getElementById('btn-confirm-step1');

    // Step 2
    const uploadZone = document.getElementById('upload-zone');
    const slipFileInput = document.getElementById('slip-file-input');
    const uploadPreviewWrapper = document.getElementById('upload-preview-wrapper');
    const uploadZoneContent = document.getElementById('upload-zone-content');
    const slipPreviewImg = document.getElementById('slip-preview-img');
    const uploadErrorMsg = document.getElementById('upload-error-msg');
    const aiLoading = document.getElementById('api-loading');
    const donateGiveawayImg = document.getElementById('donate-giveaway-img-wrapper');
    const verifiedSuccessSection = document.getElementById('step2-success-container');
    const nicknameInput = document.getElementById('nickname-input');

    // Step 3
    const summarySocial = document.getElementById('summary-social');
    const summaryNickname = document.getElementById('summary-nickname');
    const summaryCurrentAmount = document.getElementById('summary-current-amount');
    const summaryTotalAmount = document.getElementById('summary-total-amount');
    const summaryDeliveryContainer = document.getElementById('summary-delivery-container');
    const summaryDeliveryFee = document.getElementById('summary-delivery-fee');
    const receptionSectionWrapper = document.getElementById('reception-section-wrapper');
    const confirmReceptionBox = document.getElementById('confirm-reception-box');
    const receptionInputForm = document.getElementById('reception-input-form');


    const showLoading = (text = "กำลังประมวลผล...") => {
        globalLoadingText.innerText = text;
        globalLoading.style.display = 'flex';
    };

    const hideLoading = () => {
        globalLoading.style.display = 'none';
    };

    const calculateGifts = (totalAmount) => {
        const SET_4_PRICE = 1277;
        const fullSets = Math.floor(Math.max(0, totalAmount) / SET_4_PRICE);
        const remainder = Math.max(0, totalAmount) % SET_4_PRICE;

        const gifts = {
            stickers: fullSets + (remainder >= 177 ? 1 : 0),
            photoFrame: fullSets + (remainder >= 477 ? 1 : 0),
            foodFrame: fullSets + (remainder >= 777 ? 1 : 0),
            lightSign: fullSets,
            workshop: fullSets
        };

        let nextGoal = 0;
        let diff = 0;
        if (totalAmount < 177) { nextGoal = 177; diff = 177 - totalAmount; }
        else if (remainder < 177) { nextGoal = 177; diff = 177 - remainder; }
        else if (remainder < 477) { nextGoal = 477; diff = 477 - remainder; }
        else if (remainder < 777) { nextGoal = 777; diff = 777 - remainder; }
        else if (remainder < 1277) { nextGoal = 1277; diff = 1277 - remainder; }

        return { gifts, diff, hasAny: totalAmount >= 177 };
    };

    const formatAmount = (num) => `฿${num.toLocaleString('th-TH', {
        minimumFractionDigits: num % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    })}`;

    const getNetAmount = () => {
        let finalMethod = selectedMethod;
        if (mergedDonationData.receive && !isChangingReception) {
            finalMethod = mergedDonationData.receive.delivery_type;
        }

        if (finalMethod === 'delivery') {
            return Math.max(0, currentTotalOriginal - 50);
        }
        return currentTotalOriginal;
    };

    const resetStep2UI = () => {
        const uploadContainer = document.getElementById('upload-slip-container');
        const summaryContainer = document.getElementById('step2-success-container');
        const verificationDetails = document.getElementById('slip-verification-details');
        const previewWrapper = document.getElementById('upload-preview-wrapper');
        const zoneContent = document.getElementById('upload-zone-content');
        const uploadLoading = document.getElementById('api-loading');
        const fileInput = document.getElementById('slip-file-input');
        const feeNotice = document.getElementById('step2-fee-notice');
        const giveawayImg = document.getElementById('donate-giveaway-img-wrapper');
        const nicknameInput = document.getElementById('nickname-input');
        const accountBox = document.getElementById('account-info-box-step2');
        const uploadZone = document.getElementById('upload-zone');

        if (uploadContainer) uploadContainer.style.display = 'block';
        if (summaryContainer) summaryContainer.style.display = 'none';
        if (verificationDetails) verificationDetails.style.display = 'none';
        if (previewWrapper) previewWrapper.style.display = 'none';
        if (zoneContent) zoneContent.style.display = 'flex';
        if (uploadLoading) uploadLoading.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (feeNotice) feeNotice.style.display = 'block';
        if (giveawayImg) giveawayImg.style.display = 'block';
        if (nicknameInput) nicknameInput.value = '';
        if (accountBox) accountBox.style.display = 'block';
        if (uploadZone) uploadZone.style.display = 'block';

        slipData = { amount: 0, date: '', bankCode: '' };
        nickname = '';
    };

    const setStepUI = (step) => {
        currentState = step;
        step1.style.display = 'none';
        step2.style.display = 'none';
        step3.style.display = 'none';

        const bars = [document.getElementById('bar-1'), document.getElementById('bar-2'), document.getElementById('bar-3')];
        bars.forEach(b => b.className = 'progress-bar-item');

        if (step === 1) {
            step1.style.display = 'block';
            bars[0].classList.add('step-1-active');
            stepLabelText.innerText = 'ระบุตัวตน (1/3)';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // RESET Step 1 UI
            const socialLoading = document.getElementById('api-loading-social');
            if (socialLoading) socialLoading.style.display = 'none';
            const socialConfirm = document.getElementById('social-confirm-box');
            if (socialConfirm) socialConfirm.style.display = 'none';

            // Also clear Step 2 state when going back to Step 1
            resetStep2UI();
        } else if (step === 2) {
            step2.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            stepLabelText.innerText = 'ข้อมูลการโดเนท (2/3)';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (step === 3) {
            step3.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            bars[2].classList.add('step-3-active');
            stepLabelText.innerText = 'ข้อมูล Giveaway (3/3)';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            prepareStep3Data();
        }
    };

    // --- Step 1 ---
    socialInput.addEventListener('input', () => {
        let val = socialInput.value.replace(/\s/g, '');
        if (val.startsWith('@')) val = val.substring(1);
        socialInput.value = val;
    });

    socialTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            socialTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedSocial = tab.dataset.social;
            socialInput.placeholder = 'Username';
        });
    });

    // --- Lightbox / Image Zoom ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
            document.body.style.overflow = 'auto';
            lightboxImg.classList.remove('zoomed');
        });

        lightboxImg.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxImg.classList.toggle('zoomed');
        });

        const closeBtn = document.querySelector('.lightbox-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                lightbox.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }
    }

    if (slipPreviewImg) {
        slipPreviewImg.addEventListener('click', () => {
            if (slipPreviewImg.src) {
                lightboxImg.src = slipPreviewImg.src;
                lightbox.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    btnConfirmStep1.addEventListener('click', async () => {
        const val = socialInput.value.trim();
        if (!val) {
            alert('กรุณากรอกชื่อบัญชีโซเชียลของคุณ');
            return;
        }
        showLoading('กำลังตรวจสอบข้อมูลรับสิทธิ์...');
        try {
            console.log('GetDonate API Data socialName:', encodeURIComponent(val));
            console.log('GetDonate API Data socialType:', encodeURIComponent(selectedSocial));
            const res = await fetch(`${GET_API_URL}?action=getDonate&socialName=${encodeURIComponent(val)}&socialType=${encodeURIComponent(selectedSocial)}`);
            let data = await res.json();
            console.log('GetDonate API Result:', data);
            if (data.status !== 'ok') {
                // Not found, treat as new
                mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null };
            } else {
                mergedDonationData = data;
                // Calculate total_amount from donations array if not present
                if (!mergedDonationData.total_amount) {
                    mergedDonationData.total_amount = data.donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                }
                // Pre-fill slipData with user's default bank if available (as fallback)
                if (data.banks && data.banks.length > 0) {
                    const b = data.banks[0];
                    if (!slipData) slipData = { amount: 0, sender_name: '', is_slip: false, date: '' };
                    slipData.sender_name = slipData.sender_name || b.name;
                    slipData.sender_account = slipData.sender_account || b.bank_no;
                    slipData.bank_code = slipData.bank_code || b.bank;
                }
                // If they have old receive data, figure out their previous default social (just keeping val is fine though)
            }
            hideLoading();
            resetStep2UI();
            setStepUI(2);
        } catch (e) {
            console.error(e);
            hideLoading();
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
        }
    });

    // --- Step 2 ---
    window.triggerFileInput = () => slipFileInput.click();

    window.handleFileSelected = (input) => {
        const file = input.files ? input.files[0] : (input.target ? input.target.files[0] : null);
        if (!file) return;

        // Reset input value to allow re-uploading the same file
        input.value = '';

        uploadErrorMsg.style.display = 'none';
        document.getElementById('slip-verification-details').style.display = 'none';
        donateGiveawayImg.style.display = 'none';
        const reader = new FileReader();
        reader.onload = (e) => {
            slipPreviewImg.src = e.target.result;
            uploadPreviewWrapper.style.display = 'block';
            uploadZoneContent.style.display = 'none';
            // Store base64 for later upload
            slipImageBase64 = e.target.result.split(',')[1];
            slipMimeType = file.type || 'image/jpeg';
        };
        reader.readAsDataURL(file);

        processSlipWithAI(file);
    };

    const processSlipWithAI = async (file) => {
        aiLoading.style.display = 'block';
        document.getElementById('slip-verification-details').style.display = 'none'; // Hide previous details

        // Disable upload interactions during analysis
        const uploadZone = document.getElementById('upload-zone');
        const btnReUpload = document.getElementById('btn-re-upload');
        if (uploadZone) uploadZone.style.pointerEvents = 'none';
        if (btnReUpload) {
            btnReUpload.disabled = true;
            btnReUpload.style.opacity = '0.5';
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            const aiResponse = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
            if (!aiResponse.ok) throw new Error('AI analysis failed');
            const aiData = await aiResponse.json();

            aiLoading.style.display = 'none';
            document.getElementById('slip-verification-details').style.display = 'block';

            if (!aiData || !aiData.is_slip) {
                document.getElementById('verification-error-text').innerText = 'ไม่สามารถอ่านสลิปได้ กรุณาลองใหม่อีกครั้ง';
                document.getElementById('verification-error-text').style.display = 'block';
                document.getElementById('verification-success-data').style.display = 'none';
                document.getElementById('slip-verification-buttons').style.display = 'none';
                slipData = { is_slip: false, amount: 0, sender_name: '', date: '' };
            } else {
                let rName = aiData.receiver_name || '';
                if (!rName.includes(RECEIVER_NAME_TARGET)) {
                    document.getElementById('verification-error-text').innerText = 'อ่านบัญชีปลายทางไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
                    document.getElementById('verification-error-text').style.display = 'block';
                    document.getElementById('verification-success-data').style.display = 'none';
                    document.getElementById('slip-verification-buttons').style.display = 'none';
                    slipData = aiData;
                } else {
                    const refNum = aiData.ref_number || aiData.transaction_ref;
                    let isDuplicate = false;
                    if (refNum && mergedDonationData && mergedDonationData.donations) {
                        isDuplicate = mergedDonationData.donations.some(d => d.transaction_ref === refNum || d.ref_number === refNum);
                    }

                    if (isDuplicate) {
                        document.getElementById('verification-error-text').innerText = 'สลิปถูกใช้โอนโดเนทไปแล้ว ไม่สามารถใช้งานซ้ำได้';
                        document.getElementById('verification-error-text').style.display = 'block';
                        document.getElementById('verification-success-data').style.display = 'none';
                        document.getElementById('slip-verification-buttons').style.display = 'none';
                        slipData = { is_slip: false, amount: 0, sender_name: '', date: '' };
                    } else {
                        document.getElementById('verification-error-text').style.display = 'none';
                        document.getElementById('verification-success-data').style.display = 'block';
                        document.getElementById('slip-verification-buttons').style.display = 'flex';
                        slipData = aiData;

                        document.getElementById('verify-sender-name').innerText = slipData.sender_name || '-';
                        document.getElementById('verify-amount').innerText = slipData.amount ? slipData.amount + ' ฿' : '-';
                        document.getElementById('verify-date').innerText = slipData.date ? formatFromDatetimeLocal(formatToDatetimeLocal(slipData.date)) : '-';
                    }
                }
            }

        } catch (error) {
            console.error(error);
            aiLoading.style.display = 'none';
            uploadErrorMsg.innerText = 'เกิดข้อผิดพลาดทางเทคนิค, กรุณาลองใหม่อีกครั้ง';
            uploadErrorMsg.style.display = 'block';
            document.getElementById('slip-verification-details').style.display = 'none';
        } finally {
            // Re-enable interactions
            if (uploadZone) uploadZone.style.pointerEvents = 'auto';
            if (btnReUpload) {
                btnReUpload.disabled = false;
                btnReUpload.style.opacity = '1';
            }
        }
    };

    const getGiftHtml = (gifts) => {
        let h = '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:10px;">';
        const badgeStyle = `style="background:#404040; color:white; padding:6px 18px; border-radius:50px; font-size:0.7rem; font-weight:700; white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border:none;"`;

        if (gifts.stickers > 0) h += `<span ${badgeStyle}>สติกเกอร์ X ${gifts.stickers}</span>`;
        if (gifts.photoFrame > 0) h += `<span ${badgeStyle}>เฟรมใส่การ์ด X ${gifts.photoFrame}</span>`;
        if (gifts.foodFrame > 0) h += `<span ${badgeStyle}>กรอบส่องอาหาร X ${gifts.foodFrame}</span>`;
        if (gifts.lightSign > 0) h += `<span ${badgeStyle}>ป้ายไฟ X ${gifts.lightSign}</span>`;
        if (gifts.workshop > 0) h += `<span ${badgeStyle}>WORKSHOP X ${gifts.workshop}</span>`;

        h += '</div>';
        return h;
    };

    const updateStep2Summary = () => {
        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const netAmt = (hasPastDelivery) ? currentTotalOriginal - 50 : currentTotalOriginal;

        // Show net donation amount (total minus fee if applicable)
        document.getElementById('cumulative-amount').innerText = formatAmount(netAmt);

        // Show/Hide delivery fee label below the amount
        const deliveryFeeEl = document.getElementById('cumulative-delivery-fee');
        if (deliveryFeeEl) {
            if (hasPastDelivery) {
                deliveryFeeEl.style.display = 'block';
                deliveryFeeEl.style.color = '#91A3FF';
                deliveryFeeEl.style.fontSize = '1.2rem';
                deliveryFeeEl.style.fontWeight = '700';
                deliveryFeeEl.style.marginTop = '-5px';
                deliveryFeeEl.style.marginBottom = '10px';
                deliveryFeeEl.innerText = '+ 50 บาทค่าส่ง';
            } else {
                deliveryFeeEl.style.display = 'none';
            }
        }

        const giftBox = document.getElementById('step2-giveaway-box');
        if (giftBox) giftBox.style.display = 'none';

        const giveawayMore = document.getElementById('giveaway-more');
        if (giveawayMore) giveawayMore.style.display = 'none';

        const potentialFeeEl = document.getElementById('cumulative-potential-fee');
        if (potentialFeeEl) potentialFeeEl.style.display = 'none';

        const socialUsername = mergedDonationData.socialName || document.getElementById('social-username').value || selectedSocial;

        let timelineHtml = `
            <div style="background: white; border-radius: 32px; padding: 45px 25px 25px; border: 1px solid #E2E8F0; margin-top: 50px; text-align: left; position: relative;">
                <div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); background: white; border: 1.5px solid #E2E8F0; padding: 8px 30px; border-radius: 50px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <h4 style="margin:0; font-size:1rem; color:#000000; font-weight:800; letter-spacing:-0.4px;">ประวัติการโดเนทของ <span style="font-weight:400;">${socialUsername}</span></h4>
                </div>
                <div class="history-list">
        `;

        timelineHtml += `
            <div class="history-item">
                <div class="history-dot current"></div>
                <div class="history-content">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p class="history-label">สนับสนุนโปรเจกต์ <span style="font-weight:400; color:#718096;">(รอบนี้)</span></p>
                        <p class="history-amount">${formatAmount(slipData.amount)}</p>
                    </div>
                    <p class="history-date" style="margin-top:2px;">${formatThaiDate(slipData.date)}</p>
                </div>
            </div>
        `;

        if (mergedDonationData.donations && mergedDonationData.donations.length > 0) {
            mergedDonationData.donations.forEach(don => {
                const donDate = don.transaction_date || don.date || don['วันเวลาโอน'] || don.timestamp || '-';
                timelineHtml += `
                    <div class="history-item">
                        <div class="history-dot past"></div>
                        <div class="history-content">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <p class="history-label">สนับสนุนโปรเจกต์</p>
                                <p class="history-amount">${formatAmount(don.amount)}</p>
                            </div>
                            <p class="history-date" style="margin-top:2px;">${formatThaiDate(donDate)}</p>
                        </div>
                    </div>
                `;
            });
        }

        if (hasPastDelivery) {
            timelineHtml += `
            <div style="display:flex; justify-content:center; margin-top:25px; margin-bottom:5px;">
                <div style="display:inline-flex; align-items:center; gap:8px; background:#FFF5F5; border:1px solid #FEB2B2; padding:8px 20px; border-radius:15px; box-shadow:0 4px 10px rgba(229, 62, 62, 0.05);">
                    <p style="color:#E53E3E; font-size:0.9rem; margin:0; font-weight:800; letter-spacing:-0.2px;">คุณมีค่าส่ง Giveaway 50 บาท</p>
                </div>
            </div>`;
        }

        timelineHtml += `</div></div>`;
        document.getElementById('history-section').innerHTML = timelineHtml;
    };

    document.getElementById('btn-confirm-step2').addEventListener('click', () => {
        nickname = nicknameInput.value.trim();
        if (!nickname) {
            alert('กรุณากรอก นามแฝงสำหรับโดเนทครั้งนี้ ก่อนไปขั้นตอนถัดไป');
            return;
        }
        setStepUI(3);
    });

    // --- Step 3 ---
    const prepareStep3Data = () => {
        // Prepare data state
        const r = mergedDonationData.receive;

        // If they have past data and haven't clicked "Change", show the past box
        if (r && !isChangingReception) {
            // updateStep3UI handles the pastBox display
        } else {
            // Default to onsite if new or changing
            if (!selectedMethod) selectedMethod = 'onsite';
            selectMethod(selectedMethod);
        }

        updateStep3UI();
    };

    window.selectMethod = (method) => {
        selectedMethod = method;
        document.querySelectorAll('.delivery-method-card').forEach(card => {
            const isActive = card.dataset.method === method;
            card.classList.toggle('active', isActive);

            // Visual feedback - synced with CSS class but keeping inline as backup/override
            card.style.borderColor = isActive ? '#286ACD' : '#E2E8F0';
            card.style.background = isActive ? 'linear-gradient(135deg, #E6F0FF 0%, #D1E4FF 100%)' : 'white';

            const iconCircle = card.querySelector('.method-icon-circle');
            const svg = card.querySelector('.icon-svg');
            const label = card.querySelector('.method-label');

            if (iconCircle) iconCircle.style.background = isActive ? '#286ACD' : '#F7FAFC';
            if (svg) svg.style.stroke = isActive ? 'white' : '#718096';
            if (label) label.style.color = isActive ? '#286ACD' : '#718096';
        });

        const addrFields = document.getElementById('new-delivery-address-fields');
        if (addrFields) {
            addrFields.style.display = (method === 'delivery') ? 'block' : 'none';
        }

        // Prefill if changing from past data
        if (method === 'delivery' && mergedDonationData.receive) {
            const r = mergedDonationData.receive;
            const phoneEl = document.getElementById('phone-number');
            const nameEl = document.getElementById('ship-name');
            const addrEl = document.getElementById('shipping-address');
            const postEl = document.getElementById('postal-code');

            if (phoneEl) phoneEl.value = r.shipping_phone || '';
            if (nameEl) nameEl.value = r.recipient_name || '';
            if (addrEl) addrEl.value = r.shipping_address || '';
            if (postEl) postEl.value = r.shipping_postal || '';
        }

        updateStep3UI();
    };

    document.getElementById('btn-change-reception').addEventListener('click', () => {
        isChangingReception = true;
        // Also ensure the icons/colors are synced for the manual selection box
        if (!selectedMethod) selectedMethod = 'onsite';
        selectMethod(selectedMethod);
        updateStep3UI();
    });

    // document.getElementById('btn-use-old-reception').addEventListener('click', function () {
    //     const rec = mergedDonationData.receive;
    //     if (!rec) return;

    //     selectedMethod = rec.delivery_type;
    //     if (rec.delivery_type === 'delivery') {
    //         document.getElementById('ship-name').value = rec.recipient_name || '';
    //         document.getElementById('phone-number').value = rec.shipping_phone || '';
    //         document.getElementById('shipping-address').value = rec.shipping_address || '';
    //         document.getElementById('postal-code').value = rec.shipping_postal || '';
    //     }

    //     this.innerText = 'เลือกแล้ว';
    //     this.style.background = '#38A169';

    //     // Minor delay to show feedback then show confirmed state in summary or just proceed
    //     updateStep3UI();
    // });

    // --- Date Formatting Functions ---
    function formatToDatetimeLocal(str) {
        if (!str) return '';
        // Check if already in 'YYYY-MM-DDTHH:MM' format
        if (str.includes('T') && str.length >= 16) {
            return str.substring(0, 16);
        }

        // Handle 'DD/MM/YYYY HH:MM:SS' or 'DD/MM/YYYY HH:MM'
        const parts = str.split(/[\s/:.-]/);
        if (parts.length >= 5) {
            // Assuming DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            const hour = parts[3];
            const minute = parts[4];
            return `${year}-${month}-${day}T${hour}:${minute}`;
        }
        return '';
    }

    function formatFromDatetimeLocal(str) {
        if (!str) return '';
        // Expects 'YYYY-MM-DDTHH:MM'
        if (!str.includes('T')) return str; // If it's not datetime-local format, return as is
        const [d, t] = str.split('T');
        if (!d || !t) return str;
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y} ${t}:00`; // Convert to DD/MM/YYYY HH:MM:SS
    }

    const formatThaiDate = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';

        let date;
        if (dateStr.includes('T') || dateStr.includes('-')) {
            // ISO format or YYYY-MM-DD
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
            // DD/MM/YYYY
            const parts = dateStr.split(/[\s/:]/);
            if (parts.length >= 3) {
                const day = parseInt(parts[0], 10);
                const monthIdx = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const hours = parts[3] || '00';
                const minutes = parts[4] || '00';
                date = new Date(year, monthIdx, day, hours, minutes);
            }
        }

        if (date && !isNaN(date)) {
            const day = date.getDate();
            const monthIdx = date.getMonth();
            const year = date.getFullYear() + 543;
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            return `${day} ${thaiMonths[monthIdx]} ${year.toString().slice(-2)}, ${hours}:${minutes}`;
        }

        return dateStr;
    };
    // --- End Date Formatting Functions ---

    const updateStep3UI = () => {
        const netAmt = getNetAmount();
        const giftInfo = calculateGifts(netAmt);

        document.getElementById('summary-social').innerText = socialInput.value || selectedSocial || '-';
        document.getElementById('summary-nickname').innerText = nickname || '-';
        document.getElementById('summary-current-amount').innerText = formatAmount(slipData.amount);
        document.getElementById('summary-total-amount').innerText = formatAmount(netAmt);

        const feeRow = document.getElementById('summary-fee-row');
        const deliveryFeeEl = document.getElementById('summary-delivery-fee');

        let finalMethod = selectedMethod;
        if (mergedDonationData.receive && !isChangingReception) {
            finalMethod = mergedDonationData.receive.delivery_type;
        }

        if (finalMethod === 'delivery') {
            feeRow.style.display = 'flex';
            deliveryFeeEl.innerText = '50';
        } else {
            feeRow.style.display = 'none';
        }

        // Past Data Selection Logic
        const pastBox = document.getElementById('past-reception-box');
        const normalSelection = document.getElementById('reception-methods-selection');
        const addrFields = document.getElementById('new-delivery-address-fields');

        if (mergedDonationData.receive && !isChangingReception) {
            pastBox.style.display = 'block';
            normalSelection.style.display = 'none';
            if (addrFields) addrFields.style.display = 'none';

            const rec = mergedDonationData.receive;
            document.getElementById('past-type-text').innerText = rec.delivery_type === 'delivery' ? 'จัดส่งตามที่อยู่' : 'รับหน้างาน';

            if (rec.delivery_type === 'delivery') {
                document.getElementById('past-details').style.display = 'block';
                document.getElementById('past-ship-name').innerText = rec.recipient_name || '-';
                document.getElementById('past-ship-address').innerText = rec.shipping_address || '-';
                document.getElementById('past-ship-postal').innerText = rec.shipping_postal || '';
                document.getElementById('past-ship-phone').innerText = rec.shipping_phone || '-';
                document.getElementById('past-fee-note').style.display = 'block';
            } else {
                document.getElementById('past-details').style.display = 'none';
                document.getElementById('past-fee-note').style.display = 'none';
            }
        } else {
            if (pastBox) pastBox.style.display = 'none';
            if (normalSelection) normalSelection.style.display = 'block';
            if (addrFields) addrFields.style.display = selectedMethod === 'delivery' ? 'block' : 'none';
        }

        // Giveaway Status
        const giftStatusBox = document.getElementById('step3-giveaway-status');
        const giftMoreEl = document.getElementById('step3-giveaway-more');
        const giftImg = document.getElementById('step3-giveaway-img');

        const pillText = document.getElementById('step3-giveaway-pill-text');

        if (!giftInfo.hasAny) {
            if (pillText) {
                pillText.innerText = 'Giveaway ที่คุณได้รับ';
                pillText.style.color = '#3487ff';
            }
            giftStatusBox.innerHTML = '<p style="margin:0; font-weight:700; color:#ff67a3; font-size:1rem;">คุณไม่ได้รับ Giveaway</p>';
            giftMoreEl.innerText = `(โดเนทเพิ่ม ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway มากขึ้น)`;
            giftImg.style.display = 'block';
        } else {
            if (pillText) {
                pillText.innerText = 'Giveaway ที่คุณได้รับ';
                pillText.style.color = '#3487ff';
            }
            let giftStr = getGiftHtml(giftInfo.gifts);
            giftStr += `<p style="margin:0; font-size:0.85rem; color:#718096; margin-top:15px; font-weight:500;">( อาจมีการเปลี่ยนแปลง หลังคำนวณค่าจัดส่ง )</p>`;
            giftStatusBox.innerHTML = giftStr;
            giftMoreEl.innerText = '';
            giftImg.style.display = 'none';
        }

        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const deliveryNotice = document.getElementById('delivery-notice');
        const deliveryFields = document.getElementById('new-delivery-address-fields');

        if (finalMethod === 'delivery' && !hasPastDelivery) {
            if (deliveryNotice) deliveryNotice.style.display = 'block';
            if (!giftInfo.hasAny) {
                if (deliveryNotice) {
                    deliveryNotice.innerHTML =
                        '<p style="color:#FF0000; font-weight:800; font-size:1.05rem; margin-bottom:8px; line-height:1.4;">หักค่าส่ง 50 บาท จากยอดโดเนทสะสม<br>พบว่าคุณไม่ได้รับ Giveaway</p>' +
                        '<p style="color:#4A5568; font-size:0.95rem; margin:0; font-weight:500;">(เปลี่ยนเป็นรับหน้างาน ไม่เพิ่มค่าใช้จ่ายก่อน แล้วค่อยโอนค่าส่ง 50 บาททีหลัง)</p>';
                }
                if (deliveryFields) deliveryFields.style.display = 'none';
                document.getElementById('btn-submit-final').style.display = 'none';
            } else {
                if (deliveryNotice) {
                    deliveryNotice.innerHTML = '<p style="color:#E53E3E; font-weight:700; font-size:0.95rem; margin-bottom:5px;">หักค่าส่ง 50 บาท จากยอดโดเนทสะสม</p>' +
                        '<p id="delivery-notice-sub" style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin:0; display:none;"></p>' +
                        '<p id="delivery-notice-math" style="color:#718096; font-size:0.85rem; margin-top:5px; margin-bottom:0; display:block;"></p>';
                    const mathEl = document.getElementById('delivery-notice-math');
                    if (mathEl) {
                        const effectiveDonation = slipData.amount - 50;
                        mathEl.innerText = `(รอบนี้คุณโดเนท ${effectiveDonation.toLocaleString()} บาท + ค่าส่ง 50 บาท)`;
                    }
                }
                if (deliveryFields) deliveryFields.style.display = 'block';
                document.getElementById('btn-submit-final').style.display = 'block';
            }
        } else {
            if (deliveryNotice) deliveryNotice.style.display = 'none';
            document.getElementById('btn-submit-final').style.display = 'block';
            if (finalMethod === 'delivery') {
                if (hasPastDelivery && !isChangingReception) {
                    if (deliveryFields) deliveryFields.style.display = 'none';
                } else {
                    if (deliveryFields) deliveryFields.style.display = 'block';
                }
            } else {
                if (deliveryFields) deliveryFields.style.display = 'none';
            }
        }

        if (currentTotalOriginal < 177) {
            receptionSectionWrapper.style.display = 'none';
        } else {
            receptionSectionWrapper.style.display = 'block';
        }
    };

    // --- Final Submit ---
    document.getElementById('btn-submit-final').addEventListener('click', async () => {
        let finalMethod = selectedMethod;
        if (mergedDonationData.receive && !isChangingReception) {
            finalMethod = mergedDonationData.receive.delivery_type;
        }

        const rec = mergedDonationData.receive;
        let shipName = document.getElementById('ship-name').value.trim();
        let phone = document.getElementById('phone-number').value.trim();
        let address = document.getElementById('shipping-address').value.trim();
        let postal = document.getElementById('postal-code').value.trim();

        if (rec && !isChangingReception && finalMethod === 'delivery') {
            shipName = rec.recipient_name || '';
            phone = rec.shipping_phone || '';
            address = rec.shipping_address || '';
            postal = rec.shipping_postal || '';
        }

        if (currentTotalOriginal >= 177 && finalMethod === 'delivery') {
            if (!shipName || !phone || !address || !postal) {
                alert('กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน');
                return;
            }
            if (!/^0\d{8,9}$/.test(phone)) {
                alert('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
                return;
            }
        }

        showLoading('กำลังบันทึกข้อมูล...');

        try {
            // 1. Upload Image first
            let uploadedImageUrl = "";
            if (slipImageBase64) {
                const uploadBody = {
                    action: "uploadImage",
                    mimeType: slipMimeType,
                    base64: slipImageBase64
                };
                const uploadRes = await fetch(UPLOAD_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(uploadBody)
                });
                const uploadData = await uploadRes.json();
                if (uploadData.status === 'ok') {
                    uploadedImageUrl = uploadData.view_url;
                } else {
                    throw new Error('ไม่สามารถอัปโหลดรูปภาพได้');
                }
            }

            // 2. Save Donation Data
            const isStep3Reached = currentTotalOriginal >= 177;
            const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
            const body = {
                action: "saveDonate",
                social_name: socialInput.value,
                social_type: selectedSocial,
                name: slipData.sender_name,
                bank_no: slipData.sender_account,
                bank: slipData.bank_code,
                transaction_date: slipData.date.replace(/\//g, '/'),
                transaction_ref: slipData.ref_number,
                receive_name: slipData.receiver_name,
                amount: slipData.amount,
                image: uploadedImageUrl,
                username: nickname,
                event_type: isStep3Reached ? "donate" : "",
                delivery_type: isStep3Reached ? (finalMethod === 'delivery' ? 'delivery' : 'onsite') : "",
                include_shipping: finalMethod === 'delivery' && !hasPastDelivery,
                recipient_name: isStep3Reached ? (finalMethod === 'delivery' ? shipName : "") : "",
                shipping_phone: isStep3Reached ? (finalMethod === 'delivery' ? phone : "") : "",
                shipping_address: isStep3Reached ? (finalMethod === 'delivery' ? address : "") : "",
                shipping_postal: isStep3Reached ? (finalMethod === 'delivery' ? postal : "") : "",
                quote: document.getElementById('donate-quote').value || ""
            };

            await fetch(SAVE_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(body)
            });

            hideLoading();
            showSuccessScreen();

        } catch (error) {
            console.error("Save Error:", error);
            hideLoading();
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    });



    document.getElementById('btn-confirm-slip-data').addEventListener('click', () => {
        if (!slipData || !slipData.is_slip || !slipData.amount) {
            alert('กรุณาแก้ไขข้อมูลให้ครบถ้วนก่อนยืนยัน');
            return;
        }

        uploadZone.style.display = 'none';
        donateGiveawayImg.style.display = 'none';
        document.getElementById('slip-verification-details').style.display = 'none';

        const accountBox = document.getElementById('account-info-box-step2');
        if (accountBox) accountBox.style.display = 'none';

        const feeNotice = document.getElementById('step2-fee-notice');
        if (feeNotice) feeNotice.style.display = 'none';
        currentTotalOriginal = (mergedDonationData.total_amount || 0) + slipData.amount;
        verifiedSuccessSection.style.display = 'block';
        updateStep2Summary();
    });

    // --- End Verification Flow ---

    const showSuccessScreen = () => {
        const screen = document.getElementById('success-screen');
        const netAmt = getNetAmount();
        document.getElementById('success-total-amount').innerText = formatAmount(netAmt);

        // Hide fee on final screen per user request
        const successFeeEl = document.getElementById('success-delivery-fee');
        if (successFeeEl) successFeeEl.style.display = 'none';

        // Add Hashtags
        const hashtagsEl = document.getElementById('success-hashtags');
        if (hashtagsEl) {
            hashtagsEl.innerText = '#NextT1DE1stTideParty #NexT1DEProjectTH #NexT1DE';
        }

        const giftInfo = calculateGifts(netAmt);
        const listEl = document.getElementById('success-gift-list');

        const giftWrapper = document.querySelector('.success-gift-list-wrapper');
        const nextGoal = document.getElementById('success-next-goal');

        if (giftInfo.hasAny) {
            giftWrapper.style.display = 'block';
            nextGoal.style.display = 'block';
            nextGoal.innerText = `บริจาคอีก ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway เพิ่มมากขึ้น`;

            const list = document.getElementById('success-gift-list');
            list.innerHTML = getGiftHtml(giftInfo.gifts);

            const qrBox = document.getElementById('success-qr-code-box');
            const qrImg = document.getElementById('success-qr-img');
            if (qrBox && qrImg) {
                const profileUrl = "https://next1deprojectth.github.io/NexT1DE1stTideParty/profile.html?socialName=" + encodeURIComponent(socialInput.value || mergedDonationData.socialName) + "&socialType=" + encodeURIComponent(selectedSocial);
                qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(profileUrl);
                qrBox.style.display = 'block';
            }
        } else {
            giftWrapper.style.display = 'none';
            nextGoal.style.display = 'none';
            const qrBox = document.getElementById('success-qr-code-box');
            if (qrBox) qrBox.style.display = 'none';
        }
        screen.style.display = 'flex';

        // Hide Step content to prevent bleed-through
        document.querySelector('.donate-main').style.display = 'none';
        document.querySelector('.step-indicator-container').style.display = 'none';
    };

    document.getElementById('nav-back').addEventListener('click', () => {
        if (currentState === 3) {
            // Reset Step 3
            isChangingReception = false;
            selectedMethod = null;
            document.querySelectorAll('.method-option').forEach(el => {
                el.classList.remove('active');
                el.style.borderColor = '#E2E8F0';
                el.style.background = 'white';
            });
            // document.getElementById('btn-use-old-reception').innerText = 'ใช้ที่อยู่รับของแบบเดิม';
            // document.getElementById('btn-use-old-reception').style.background = '#286ACD';

            setStepUI(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentState === 2) {
            resetStep2UI(); // Ensure fresh start next time
            setStepUI(1);
        } else {
            window.location.href = 'index.html';
        }
    });
    const shareBtn = document.querySelector('.btn-success-share');
    if (shareBtn) {
        shareBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            แชร์
        `;
        shareBtn.addEventListener('click', () => {
            const shareUrl = 'https://next1deprojectth.github.io/NexT1DE1stTideParty';
            if (navigator.share) {
                navigator.share({
                    title: 'NexT1DE1stTideParty',
                    text: 'ร่วมสนับสนุนโปรเจกต์ครบรอบ 1 ปี NexT1DE!',
                    url: shareUrl
                }).catch(e => console.log('Share failed', e));
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('คัดลอกลิงก์เรียบร้อยแล้ว');
                });
            }
        });
    }

    // Quote Char Counter
    const quoteInput = document.getElementById('donate-quote');
    const quoteCount = document.getElementById('quote-char-count');
    if (quoteInput && quoteCount) {
        quoteInput.addEventListener('input', () => {
            const length = quoteInput.value.length;
            quoteCount.innerText = `${length}/255`;
            if (length >= 255) {
                quoteCount.style.color = '#E53E3E';
            } else {
                quoteCount.style.color = '#718096';
            }
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
            copyBtn.innerHTML = 'คัดลอกแล้ว';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
