document.addEventListener('DOMContentLoaded', () => {
    // Check if system is open
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.IS_DONATE_OPEN === false) {
        window.location.href = 'https://forms.gle/zDtENR1ryZWJPD9z9';
        return;
    }

    // --- State Management ---
    let currentState = 1;
    let slipData = null;
    let selectedSocial = 'x';
    let selectedMethod = 'onsite'; // Default is onsite
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
    const accountInfoBoxStep2 = document.getElementById('account-info-box-step2');

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
        const gifts = {
            a6Sticker: (totalAmount >= 177) ? 1 : 0,
            uvSticker: (totalAmount >= 477) ? 1 : 0,
            clearPurse: (totalAmount >= 477) ? 1 : 0,
            acrylicFrame: (totalAmount >= 777) ? 1 : 0,
            lightSignStrap: (totalAmount >= 1277) ? 1 : 0,
            workshop: (totalAmount >= 1277) ? 1 : 0
        };

        let nextGoal = 0;
        let diff = 0;
        if (totalAmount < 177) { nextGoal = 177; diff = 177 - totalAmount; }
        else if (totalAmount < 477) { nextGoal = 477; diff = 477 - totalAmount; }
        else if (totalAmount < 777) { nextGoal = 777; diff = 777 - totalAmount; }
        else if (totalAmount < 1277) { nextGoal = 1277; diff = 1277 - totalAmount; }

        return { gifts, diff, hasAny: totalAmount >= 177 };
    };

    const getLevelTitle = (amount) => {
        if (amount >= 1277) return "คุณได้รับ Giveaway Level 4";
        if (amount >= 777) return "คุณได้รับ Giveaway Level 3";
        if (amount >= 477) return "คุณได้รับ Giveaway Level 2";
        if (amount >= 177) return "คุณได้รับ Giveaway Level 1";
        return "Giveaway ที่คุณได้รับ";
    };

    const formatAmount = (num) => `฿${num.toLocaleString('th-TH', {
        minimumFractionDigits: num % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    })}`;

    const getNetAmount = () => {
        const pastTotal = mergedDonationData ? (mergedDonationData.total_amount || 0) : 0;
        const currentAmount = slipData ? (slipData.amount || 0) : 0;
        let baseTotal = pastTotal + currentAmount;

        let finalMethod = selectedMethod;
        if (mergedDonationData.receive && !isChangingReception) {
            finalMethod = mergedDonationData.receive.delivery_type;
        }

        const pastMethod = mergedDonationData.receive ? mergedDonationData.receive.delivery_type : null;

        // Adjustment Logic
        if (pastMethod === 'delivery' && finalMethod === 'onsite') {
            return baseTotal + 50;
        } else if ((!pastMethod || pastMethod === 'onsite') && finalMethod === 'delivery') {
            return Math.max(0, baseTotal - 50);
        }

        return baseTotal;
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
        const uploadZone = document.getElementById('upload-zone');

        const checkNotice = document.getElementById('user-check-notice');

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
        if (accountInfoBoxStep2) accountInfoBoxStep2.style.display = 'block';
        if (uploadZone) uploadZone.style.display = 'block';
        if (checkNotice) checkNotice.style.display = 'none';

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
            stepLabelText.innerText = 'ข้อมูลผู้โดเนท (1/3)';
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
                hideLoading();
                resetStep2UI();
                setStepUI(2);
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

                // Show Verification Modal only if they have actual donation history
                const verifyModal = document.getElementById('user-verify-modal');
                const verifyText = document.getElementById('user-verify-text');
                const hasDonations = mergedDonationData.total_amount > 0;

                if (verifyModal && verifyText && hasDonations) {
                    console.log(mergedDonationData.donations);
                    const socialLabel = (selectedSocial === 'twitter' ? 'X' : (selectedSocial === 'tiktok' ? 'TikTok' : selectedSocial.toUpperCase()));
                    verifyText.innerHTML = `พบข้อมูลบัญชี <b>${socialLabel}</b> ที่ตรงกับข้อมูลของคุณ <b></b><br>มีการแจ้งโดเนทเมื่อ <b>${formatThaiDate(mergedDonationData.donations[0].issue_date)} น.</b > `;
                    hideLoading();
                    verifyModal.style.display = 'flex';
                } else {
                    hideLoading();
                    resetStep2UI();
                    setStepUI(2);
                }
            }
        } catch (e) {
            console.error(e);
            hideLoading();
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
        }
    });

    document.getElementById('btn-is-me').addEventListener('click', () => {
        document.getElementById('user-verify-modal').style.display = 'none';
        resetStep2UI();
        setStepUI(2);
    });

    document.getElementById('btn-not-me-modal').addEventListener('click', () => {
        document.getElementById('user-verify-modal').style.display = 'none';
        socialInput.value = '';
        mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null };
    });

    // Helper for number formatting
    function formatNumber(num) {
        return Number(num).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

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

    const getGiftHtml = (gifts, justify = 'center') => {
        let h = `<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:${justify}; margin-top:10px; justify-content:center">`;
        const badgeStyle = `style="background:#404040; color:white; padding:6px 18px; border-radius:50px; font-size:0.7rem; font-weight:700; white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border:none;"`;

        if (gifts.a6Sticker > 0) h += `<span ${badgeStyle}>A6 Sticker</span>`;
        if (gifts.uvSticker > 0) h += `<span ${badgeStyle}>UV Sticker</span>`;
        if (gifts.clearPurse > 0) h += `<span ${badgeStyle}>Clear Plastic Purse</span>`;
        if (gifts.acrylicFrame > 0) h += `<span ${badgeStyle}>Acrylic Frame</span>`;
        if (gifts.lightSignStrap > 0) h += `<span ${badgeStyle}>Light Sign Strap</span>`;
        if (gifts.workshop > 0) h += `<span ${badgeStyle}>Work Shop</span>`;

        h += '</div>';
        return h;
    };

    const updateStep2Summary = () => {
        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const paidShippingInDonation = mergedDonationData.donations && mergedDonationData.donations.some(d => d.include_shipping === true);
        const currentAmount = slipData ? (slipData.amount || 0) : 0;
        const netAmt = mergedDonationData.total_amount + currentAmount

        // Show net donation amount (total minus fee if applicable)
        document.getElementById('cumulative-amount').innerText = formatAmount(netAmt);

        // Show/Hide delivery fee label below the amount
        const deliveryFeeEl = document.getElementById('cumulative-delivery-fee');
        if (deliveryFeeEl) {
            if (paidShippingInDonation) {
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

        const getStatusBadgeHtml = (status) => {
            let bg = "#F59E0B", color = "#FFF", text = "รอตรวจสอบ";
            if (status === "ตรวจผ่านแล้ว" || status === "approved") { bg = "#059669"; text = "ตรวจผ่านแล้ว"; }
            if (status === "ตรวจไม่ผ่าน" || status === "rejected") { bg = "#DC2626"; text = "ตรวจไม่ผ่าน"; }
            return `<div style="background:${bg}; color:white; padding:2px 8px; border-radius:6px; font-size:0.6rem; font-weight:800; display:inline-block; margin-top:4px;">${text}</div>`;
        };

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
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <p class="history-label">สนับสนุนโปรเจกต์ <span style="font-weight:400; color:#718096;">(รอบนี้)</span></p>
                        <div style="text-align: right;">
                            <p class="history-amount">${formatAmount(slipData.amount)}</p>
                            ${getStatusBadgeHtml("รอตรวจสอบ")}
                        </div>
                    </div>
                    <p class="history-date" style="margin-top:-10px;">${formatThaiDate(slipData.date)}</p>
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
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <p class="history-label">สนับสนุนโปรเจกต์</p>
                                <div style="text-align: right;">
                                    <p class="history-amount">${formatAmount(don.amount)}</p>
                                    ${getStatusBadgeHtml(don.donate_status || "ผ่าน")}
                                </div>
                            </div>
                            <p class="history-date" style="margin-top:-10px;">${formatThaiDate(donDate)}</p>
                        </div>
                    </div>
                `;
            });
        }

        if (paidShippingInDonation) {
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

        // Update shipping fee text status
        const feeTextEl = document.getElementById('shipping-fee-text');
        if (feeTextEl) {
            const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
            if (hasPastDelivery) {
                feeTextEl.innerText = 'ชำระค่าส่งแล้ว';
                feeTextEl.style.color = '#38A169'; // Green
            } else {
                feeTextEl.innerText = 'หักค่าส่ง 50 บาท';
                feeTextEl.style.color = '#F871B4'; // Pink
            }
        }

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
            if (label) {
                label.style.color = isActive ? '#4A5568' : '#718096';
                // Adjust subtext span color if it's not the shipping-fee-text
                const subSpan = label.querySelector('span:not(#shipping-fee-text)');
                if (subSpan) subSpan.style.color = isActive ? '#A0AEC0' : '#A0AEC0';
            }
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
        const r = mergedDonationData.receive;
        // Only require phone verification if the past method was delivery (contains sensitive address)
        if (r && r.delivery_type === 'delivery' && r.shipping_phone) {
            const inputPhone = prompt("กรุณาระบุเบอร์โทรศัพท์ที่เคยใช้ลงทะเบียนเพื่อระบุตัวตนของคุณ:");
            if (!inputPhone) return;

            const cleanInput = inputPhone.replace(/[^0-9]/g, '');
            const cleanTarget = String(r.shipping_phone).replace(/[^0-9]/g, '');

            if (cleanInput !== cleanTarget) {
                alert("เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
                return;
            }
        }

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
            return `${year} -${month} -${day}T${hour}:${minute} `;
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
        return `${day} /${m}/${y} ${t}:00`; // Convert to DD/MM/YYYY HH:MM:SS
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
            return `${day} ${thaiMonths[monthIdx]} ${year.toString().slice(-2)}, ${hours}:${minutes} `;
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

        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const paidShippingInDonation = mergedDonationData.donations && mergedDonationData.donations.some(d => d.include_shipping === true);

        let shouldDeduct = (finalMethod === 'delivery');

        if (shouldDeduct) {
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
            document.getElementById('past-type-text').innerText = rec.delivery_type === 'delivery' ? 'จัดส่งตามที่อยู่' : 'รับที่งานจามจุรีสแควร์ วันที่ 25-26 เม.ย. 69';

            if (rec.delivery_type === 'delivery') {
                const maskText = (str, maxLen = 15) => {
                    if (!str || str === '-') return '-';
                    const s = String(str).trim();
                    if (s.length <= 2) return s;
                    const hiddenCount = s.length - 2;
                    const xCount = Math.min(hiddenCount, maxLen - 2);
                    return s[0] + 'x'.repeat(xCount) + s[s.length - 1];
                };

                const maskPhone = (str) => {
                    if (!str || str === '-') return '-';
                    const s = String(str).trim();
                    if (s.length <= 2) return s;
                    return 'x'.repeat(s.length - 2) + s.slice(-2);
                };

                const maskPostal = (str) => {
                    if (!str || str === '-') return '-';
                    const s = String(str).trim();
                    if (s.length <= 2) return s;
                    return 'x'.repeat(s.length - 2) + s.slice(-2);
                };

                document.getElementById('past-details').style.display = 'block';
                document.getElementById('past-ship-name').innerText = maskText(rec.recipient_name);
                document.getElementById('past-ship-address').innerText = maskText(rec.shipping_address);
                document.getElementById('past-ship-postal').innerText = maskPostal(rec.shipping_postal);
                document.getElementById('past-ship-phone').innerText = maskPhone(rec.shipping_phone);
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
                pillText.innerText = getLevelTitle(netAmt);
                pillText.style.color = '#3487ff';
            }
            giftStatusBox.innerHTML = '<p style="margin:0; font-weight:700; color:#ff67a3; font-size:1rem;">คุณไม่ได้รับ Giveaway</p>';
            giftMoreEl.innerText = `(โดเนทเพิ่ม ${formatAmount(giftInfo.diff)
                } เพื่อรับ Giveaway มากขึ้น)`;
            giftImg.style.display = 'block';
        } else {
            if (pillText) {
                pillText.innerText = getLevelTitle(netAmt);
                pillText.style.color = '#3487ff';
            }
            let giftStr = getGiftHtml(giftInfo.gifts);
            giftStr += `<p style="margin:0; font-size:0.85rem; color:#718096; margin-top:15px; font-weight:500;">( อาจมีการเปลี่ยนแปลง หลังคำนวณค่าจัดส่ง )</p>`;
            giftStatusBox.innerHTML = giftStr;
            giftMoreEl.innerText = (giftInfo.diff > 0) ? `(โดเนทเพิ่ม ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway มากขึ้น)` : '';
            giftImg.style.display = 'none';
        }

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
                    deliveryNotice.innerHTML = '<p style="color:#E53E3E; font-weight:700; font-size:0.95rem; margin-bottom:5px;">ระบบจะหักค่าจัดส่งจำนวน 50 บาท จากยอดโดเนทสะสม</p>' +
                        '<p id="delivery-notice-sub" style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin:0; display:none;"></p>' +
                        '<p id="delivery-notice-math" style="color:#718096; font-size:0.85rem; margin-top:5px; margin-bottom:0; display:block;"></p>';
                    const mathEl = document.getElementById('delivery-notice-math');
                    if (mathEl) {
                        const effectiveDonation = slipData.amount - 50;
                        mathEl.innerText = `(ยอดรวมโดเนทรอบนี้คือ ${effectiveDonation.toLocaleString()} บาท / ค่าจัดส่ง 50 บาท`;
                    }
                }
                if (deliveryFields) deliveryFields.style.display = 'block';
                document.getElementById('btn-submit-final').style.display = 'block';
            }
        } else if ((finalMethod === 'pickup' || finalMethod === 'onsite') && hasPastDelivery && isChangingReception) {
            // SCENARIO: Switching from past delivery to onsite (already paid fee)
            if (deliveryNotice) {
                deliveryNotice.style.display = 'block';
                deliveryNotice.innerHTML = `
                <div style="text-align: center; box-shadow: 0 4px 15px rgba(56, 178, 172, 0.08);">
                <p style="color: #4A5568; font-size: 0.9rem; margin-bottom: 0px; font-weight: 500; line-height: 1.6;">
                    ค่าส่ง 50 บาท ที่คุณชำระมาแล้ว<br>จะถูกนำไปเป็นยอดโดเนทสะสมของคุณแทน
                </p>
                    </div>
                `;
            }
            document.getElementById('btn-submit-final').style.display = 'block';
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
    const submitDonationData = async () => {
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

        document.getElementById('quote-modal').style.display = 'none';
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

            // Check if switching from past delivery to onsite/pickup
            const isReturnShippingPrice = isStep3Reached && hasPastDelivery && isChangingReception && (finalMethod === 'pickup' || finalMethod === 'onsite');

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
                delivery_type: isStep3Reached ? ((finalMethod === 'delivery') ? 'delivery' : 'onsite') : "",
                include_shipping: isStep3Reached ? (finalMethod === 'delivery' && !hasPastDelivery) : false,
                isReturnShippingPrice: isReturnShippingPrice,
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
    };

    document.getElementById('btn-submit-final').addEventListener('click', () => {
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

        // Instead of submitting, show Quote Modal
        document.getElementById('quote-modal').style.display = 'flex';
    });

    // Quote Modal Listeners
    document.getElementById('btn-submit-with-quote').addEventListener('click', () => {
        const quote = document.getElementById('donate-quote').value.trim();
        if (!quote) {
            alert('เขียนข้อความถึง NexT1DE หรือกดข้ามหากยังไม่ต้องการ');
            document.getElementById('donate-quote').focus();
            return;
        }
        submitDonationData();
    });
    document.getElementById('btn-skip-quote').addEventListener('click', () => {
        document.getElementById('donate-quote').value = ""; // Clear quote
        submitDonationData();
    });



    document.getElementById('btn-confirm-slip-data').addEventListener('click', () => {
        if (!slipData || !slipData.is_slip || !slipData.amount) {
            alert('กรุณาแก้ไขข้อมูลให้ครบถ้วนก่อนยืนยัน');
            return;
        }

        const step2Container = document.getElementById('step-2');
        if (step2Container) {
            step2Container.style.minHeight = step2Container.offsetHeight + 'px';
        }

        const uploadContainer = document.getElementById('upload-slip-container');
        if (uploadContainer) uploadContainer.style.display = 'none';

        if (accountInfoBoxStep2) accountInfoBoxStep2.style.display = 'none';

        currentTotalOriginal = (mergedDonationData.total_amount || 0) + slipData.amount;
        verifiedSuccessSection.style.display = 'block';
        updateStep2Summary();

        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            if (step2Container) step2Container.style.minHeight = 'auto';
        }, 500);
    });

    // --- End Verification Flow ---

    const showSuccessScreen = () => {
        const screen = document.getElementById('success-screen');
        const netAmt = getNetAmount();
        window.scrollTo(0, 0); // Force scroll to top
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
        const successTitleEl = document.getElementById('success-gift-title');

        if (giftInfo.hasAny) {
            giftWrapper.style.display = 'block';
            let message = "";
            if (netAmt < 177) {
                message = `โดเนทอีก ฿${177 - netAmt} จะได้รับ Giftaway ชิ้นแรก!`;
            } else if (netAmt < 477) {
                message = `สะสมอีก ฿${477 - netAmt} ก็จะได้รับ Giveaway เพิ่ม!`;
            } else if (netAmt < 777) {
                message = `โดเนทเพิ่มอีก ฿${777 - netAmt} เพื่อรับ Giveaway เพิ่ม!`;
            } else if (netAmt < 1277) {
                message = `อีก ฿${1277 - netAmt} คุณก็จะได้ Giveaway ครบทุกชิ้นแล้ว! `;
            } else {
                message = `ยินดีด้วย คุณได้รับ Giveaway ครบทุกชิ้น`;
            }
            if (successTitleEl) successTitleEl.innerText = message;
            if (nextGoal) nextGoal.style.display = 'none';

            if (listEl) {
                listEl.innerHTML = getGiftHtml(giftInfo.gifts, 'flex-start');
            }

            const qrBox = document.getElementById('success-qr-code-box');
            const qrImg = document.getElementById('success-qr-img');
            const divider = document.getElementById('success-divider');

            if (qrBox && qrImg) {
                const profileUrl = "https://next1deprojectth.github.io/NexT1DE1stTideParty/profile.html?socialName=" + encodeURIComponent(socialInput.value || mergedDonationData.socialName) + "&socialType=" + encodeURIComponent(selectedSocial);
                qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(profileUrl);
                qrBox.style.display = 'flex';
                if (divider) divider.style.display = 'block';
            }
        } else {
            const qrBox = document.getElementById('success-qr-code-box');
            const divider = document.getElementById('success-divider');
            if (qrBox) qrBox.style.display = 'none';
            if (divider) divider.style.display = 'none';
        }
        screen.style.display = 'flex';

        // Hide Step content to prevent bleed-through
        document.querySelector('.donate-main').style.display = 'none';
        document.querySelector('.step-indicator-container').style.display = 'none';
    };

    const loadImageAsDataUrl = (relativePath) => {
        if (window.location.protocol === 'file:') return Promise.resolve(null);
        return fetch(new URL(relativePath, window.location.href))
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('fetch'))))
            .then((blob) => new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(blob);
            }))
            .catch(() => null);
    };

    const shareBtn = document.querySelector('.btn-success-share');
    let donateShareInProgress = false;
    if (shareBtn) {
        shareBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            แชร์
        `;
        shareBtn.addEventListener('click', async () => {
            if (donateShareInProgress) return;
            const root = document.getElementById('success-screen');
            const btns = document.querySelector('.success-actions');
            if (!root) return;

            donateShareInProgress = true;
            if (typeof showLoading === 'function') showLoading("กำลังเตรียมรูปภาพสำหรับแชร์...");
            if (btns) btns.style.display = 'none';

            try {
                const [bgDataUrl, logoDataUrl] = await Promise.all([
                    loadImageAsDataUrl('images/background.jpg'),
                    loadImageAsDataUrl('images/logo-project.png')
                ]);

                // const fallbackBg = 'linear-gradient(165deg, #1e3a8a 0%, #2563eb 40%, #0d9488 100%)';

                html2canvas(root, {
                    useCORS: false,
                    scale: 2,
                    backgroundColor: null,
                    logging: false,
                    onclone: (clonedDoc) => {
                        const clonedRoot = clonedDoc.getElementById('success-screen');
                        const clonedBg = clonedDoc.querySelector('.success-bg');
                        if (clonedBg) clonedBg.style.display = 'none';
                        if (clonedRoot) {
                            clonedRoot.style.position = 'relative';
                            // FORCE 3:4 RATIO
                            clonedRoot.style.width = '600px';
                            clonedRoot.style.height = '800px';
                            clonedRoot.style.display = 'flex';
                            clonedRoot.style.flexDirection = 'column';
                            clonedRoot.style.alignItems = 'center';
                            clonedRoot.style.justifyContent = 'center';
                            clonedRoot.style.padding = '40px';
                            if (bgDataUrl) {
                                clonedRoot.style.background = `url(${bgDataUrl}) center center / cover no-repeat`;
                            } else {
                                // clonedRoot.style.background = fallbackBg;
                            }
                            const qrBoxHide = clonedDoc.getElementById('success-qr-code-box');
                            if (qrBoxHide) qrBoxHide.style.display = 'none';
                            clonedRoot.style.setProperty('opacity', '1', 'important');
                            clonedRoot.style.setProperty('filter', 'none', 'important');

                            // Price - WHITE CARD RESTORED, Friendly Blue color
                            const cumCard = clonedDoc.querySelector('.success-cumulative-card');
                            if (cumCard) {
                                cumCard.style.setProperty('background', '#ffffff', 'important'); // RESTORE WHITE BOX
                                cumCard.style.setProperty('background-image', 'none', 'important');
                                cumCard.style.setProperty('border-radius', '24px', 'important');
                                cumCard.style.setProperty('padding', '25px', 'important');
                                cumCard.style.setProperty('box-shadow', '0 10px 25px rgba(0,0,0,0.05)', 'important');
                                cumCard.style.setProperty('border', 'none', 'important');
                                cumCard.style.setProperty('opacity', '1', 'important');
                            }

                            const priceVal = clonedDoc.querySelector('.success-price-value');
                            if (priceVal) {
                                priceVal.style.setProperty('background', 'linear-gradient(135deg, #286ACD 0%, #A3E4DB 100%)', 'important');
                                priceVal.style.setProperty('background-image', 'linear-gradient(135deg, #286ACD 0%, #A3E4DB 100%)', 'important');
                                priceVal.style.setProperty('border-radius', '20px', 'important'); // Rounded corners
                                priceVal.style.setProperty('padding', '35px 20px', 'important');
                                priceVal.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important'); // White text
                                priceVal.style.setProperty('color', '#ffffff', 'important');
                                priceVal.style.setProperty('font-size', '100px', 'important');
                                priceVal.style.setProperty('font-weight', '800', 'important');
                                priceVal.style.setProperty('text-shadow', 'none', 'important');
                                priceVal.style.setProperty('display', 'block', 'important');
                                priceVal.style.setProperty('width', '100%', 'important');
                                priceVal.style.setProperty('margin', '0 auto', 'important');
                                priceVal.style.setProperty('-webkit-background-clip', 'border-box', 'important');
                                priceVal.style.setProperty('background-clip', 'border-box', 'important');
                            }

                            // Titles - Solid color
                            clonedRoot.querySelectorAll('.success-project-title').forEach((el) => {
                                el.style.setProperty('background', 'none', 'important');
                                el.style.setProperty('-webkit-text-fill-color', '#286ACD', 'important');
                                el.style.setProperty('color', '#286ACD', 'important');
                                el.style.setProperty('font-size', '34px', 'important');
                                el.style.setProperty('white-space', 'nowrap', 'important');
                                el.style.setProperty('filter', 'none', 'important');
                            });

                            // Thank you - Black text
                            const thankYou = clonedDoc.querySelector('.success-thank-you');
                            if (thankYou) {
                                thankYou.style.setProperty('color', '#000000', 'important');
                                thankYou.style.setProperty('font-weight', '700', 'important');
                                thankYou.style.setProperty('opacity', '1', 'important');
                            }

                            // Hashtags - Dark Blue
                            const hashtags = clonedDoc.querySelector('.success-hashtags');
                            if (hashtags) {
                                hashtags.style.setProperty('color', '#286ACD', 'important');
                                hashtags.style.setProperty('font-weight', '700', 'important');
                                hashtags.style.setProperty('opacity', '1', 'important');
                            }

                            // Logo replacement
                            clonedRoot.querySelectorAll('img').forEach((img) => {
                                if (img.id === 'success-qr-img') return;
                                if (logoDataUrl) img.src = logoDataUrl;
                            });
                        }
                    }
                }).then(canvas => {
                    if (btns) btns.style.display = 'flex';
                    if (typeof hideLoading === 'function') hideLoading();

                    canvas.toBlob((blob) => {
                        donateShareInProgress = false;
                        if (!blob) return;
                        const file = new File([blob], 'NexT1DE-Moment.png', { type: 'image/png' });
                        const filesData = { files: [file] };

                        if (navigator.share && navigator.canShare && navigator.canShare(filesData)) {
                            navigator.share(filesData).catch(() => { });
                        } else {
                            const link = document.createElement('a');
                            link.href = canvas.toDataURL('image/png');
                            link.download = 'NexT1DE-Moment.png';
                            link.click();
                            alert('บันทึกรูปภาพเรียบร้อยแล้ว!');
                        }
                    }, 'image/png', 1);
                });
            } catch (err) {
                console.error(err);
                if (btns) btns.style.display = 'flex';
                if (typeof hideLoading === 'function') hideLoading();
                donateShareInProgress = false;
            }
        });
    }

    // Quote Char Counter
    const quoteInput = document.getElementById('donate-quote');
    const quoteCount = document.getElementById('quote-char-count');
    if (quoteInput && quoteCount) {
        quoteInput.addEventListener('input', () => {
            const length = quoteInput.value.length;
            quoteCount.innerText = `${length}/100`;
            if (length >= 100) {
                quoteCount.style.color = '#E53E3E';
            } else {
                quoteCount.style.color = '#718096';
            }
        });
    }

    const shareUrlBtn = document.getElementById('btn-share-link-donate');
    if (shareUrlBtn) {
        shareUrlBtn.addEventListener('click', () => {
            const shareData = {
                title: 'NexT1DE 1st Tide Party',
                text: 'มาร่วมสนับสนุน NexT1DE และ Ohna กันเถอะ!',
                url: window.location.origin + '/donate.html'
            };
            if (navigator.share) {
                navigator.share(shareData).catch(console.error);
            } else {
                navigator.clipboard.writeText(shareData.url).then(() => {
                    alert('คัดลอกลิงก์เรียบร้อยแล้ว!');
                });
            }
        });
    }

    // Initialize first step
    setStepUI(1);
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
