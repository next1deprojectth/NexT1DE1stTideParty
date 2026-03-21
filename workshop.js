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
    const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxVTIIijNn_TOaHrAdV-Gc0UB8azbEJmalF-NVzeAoAKD4ZOZP22NPZyGtJCKnNi7rQpA/exec";
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

    const calculateWorkshop = (data) => {
        // Workshop history is from data.donations (which for workshop action means workshop purchases)
        // plus potential workshops from status (donations that reached workshop levels)
        let totalCount = 0;
        let history = [];

        // 1. From direct workshop registrations/purchases
        if (data.donations && data.donations.length > 0) {
            data.donations.forEach(d => {
                const amt = parseFloat(d.amount) || 0;
                // Assuming amount determines workshop count if it's a purchase, 
                // but usually it's 1 registration per slip for workshop specific form.
                // We'll trust the count provided in history if available, else 1.
                const count = d.count || 1;
                totalCount += count;
                history.push({
                    type: 'Direct',
                    count: count,
                    date: d.transaction_date || d.date || d.timestamp,
                    amount: amt
                });
            });
        }

        // 2. From donations reaching Level 4 (included in status/total_amount or special field)
        // If the API provides 'workshop_from_donate', use it.
        if (data.workshop_from_donate) {
            totalCount += data.workshop_from_donate;
            history.push({
                type: 'from Donation',
                count: data.workshop_from_donate,
                date: 'สะสมจากยอดโดเนท',
                amount: 0
            });
        }

        return { totalCount, history };
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

        // Only deduct fee if it's a new delivery registration (not reusing past delivery that already paid)
        if (finalMethod === 'delivery' && (!mergedDonationData.receive || mergedDonationData.receive.delivery_type !== 'delivery' || isChangingReception)) {
            // For workshop, we might not need to show 'net' as much as 'total registered'
            // but we keep the logic similar for consistency.
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
            // Also clear Step 2 state when going back to Step 1
            resetStep2UI();
        } else if (step === 2) {
            step2.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            stepLabelText.innerText = 'ข้อมูลการลงทะเบียน (2/3)';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (step === 3) {
            step3.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            bars[2].classList.add('step-3-active');
            stepLabelText.innerText = 'ข้อมูลการร่วมกิจกรรม (3/3)';
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
            alert('กรุณากรอก Username บัญชีโซเชียลของคุณ');
            return;
        }
        showLoading('กำลังตรวจสอบสิทธิ์ Workshop...');
        try {
            const res = await fetch(`${GET_API_URL}?action=getWorkshop&socialName=${encodeURIComponent(val)}&socialType=${encodeURIComponent(selectedSocial)}`);
            let data = await res.json();
            if (data.status !== 'ok') {
                mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null, total_workshops: 0 };
            } else {
                mergedDonationData = data;
                if (!mergedDonationData.total_workshops) {
                    mergedDonationData.total_workshops = (data.donations ? data.donations.length : 0) + (data.workshop_from_donate || 0);
                }
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
                        document.getElementById('verification-error-text').innerText = 'สลิปนี้เคยใช้ลงทะเบียนไปแล้ว ไม่สามารถใช้งานซ้ำได้';
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

    const getWorkshopHtml = (history) => {
        let h = '<div style="display:flex; flex-direction:column; gap:8px; align-items:center; margin-top:10px;">';
        const badgeStyle = `style="background:#404040; color:white; padding:8px 20px; border-radius:12px; font-size:0.85rem; font-weight:700; width:100%; max-width:280px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border:none;"`;

        if (history && history.length > 0) {
            history.forEach(item => {
                h += `<div ${badgeStyle}>${item.type} : ${item.count} สิทธิ์ <br><span style="font-size:0.75rem; font-weight:400; opacity:0.8;">(${item.date})</span></div>`;
            });
        } else {
            h += `<div ${badgeStyle}>ไม่มีประวัติ Workshop</div>`;
        }

        h += '</div>';
        return h;
    };

    const updateStep2Summary = () => {
        const workshopInfo = calculateWorkshop(mergedDonationData);
        const currentWorkshopStatus = (slipData.is_slip ? 1 : 0);
        const totalWorkshops = (workshopInfo.totalCount + currentWorkshopStatus);

        document.getElementById('cumulative-amount').innerText = totalWorkshops + ' สิทธิ์';

        const giftBox = document.getElementById('step2-giveaway-box');
        if (giftBox) {
            giftBox.style.display = 'block';
            giftBox.innerHTML = getWorkshopHtml(workshopInfo.history);
        }

        const giveawayMore = document.getElementById('giveaway-more');
        if (giveawayMore) {
            giveawayMore.style.display = 'block';
            giveawayMore.innerText = 'สิทธิ์ที่เพิ่มขึ้นจะแสดงหลังจากการกดยืนยันสำเร็จ';
        }

        const socialUsername = mergedDonationData.socialName || document.getElementById('social-username').value || selectedSocial;

        let timelineHtml = `
            <div style="background: white; border-radius: 32px; padding: 45px 25px 25px; border: 1px solid #E2E8F0; margin-top: 50px; text-align: left; position: relative;">
                <div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); background: white; border: 1.5px solid #E2E8F0; padding: 8px 30px; border-radius: 50px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <h4 style="margin:0; font-size:1rem; color:#000000; font-weight:800; letter-spacing:-0.4px;">ประวัติการร่วม Workshop ของ <span style="font-weight:400;">${socialUsername}</span></h4>
                </div>
                <div class="history-list">
        `;

        if (slipData.is_slip) {
            timelineHtml += `
                <div class="history-item">
                    <div class="history-dot current"></div>
                    <div class="history-content">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <p class="history-label">ลงทะเบียน Workshop <span style="font-weight:400; color:#718096;">(รอบนี้)</span></p>
                            <p class="history-amount">1 สิทธิ์</p>
                        </div>
                        <p class="history-date" style="margin-top:2px;">${formatThaiDate(slipData.date)}</p>
                    </div>
                </div>
            `;
        }

        if (workshopInfo.history.length > 0) {
            workshopInfo.history.forEach(item => {
                timelineHtml += `
                    <div class="history-item">
                        <div class="history-dot past"></div>
                        <div class="history-content">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <p class="history-label">สิทธิ์ Workshop (${item.type})</p>
                                <p class="history-amount">${item.count} สิทธิ์</p>
                            </div>
                            <p class="history-date" style="margin-top:2px;">${item.date === 'สะสมจากยอดโดเนท' ? item.date : formatThaiDate(item.date)}</p>
                        </div>
                    </div>
                `;
            });
        }

        timelineHtml += `</div></div>`;
        document.getElementById('history-section').innerHTML = timelineHtml;
    };

    document.getElementById('btn-confirm-step2').addEventListener('click', () => {
        nickname = nicknameInput.value.trim();
        if (!nickname) {
            alert('กรุณากรอก นามแฝงสำหรับลงทะเบียนครั้งนี้ ก่อนไปขั้นตอนถัดไป');
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

    document.getElementById('btn-use-old-reception').addEventListener('click', function () {
        const rec = mergedDonationData.receive;
        if (!rec) return;

        selectedMethod = rec.delivery_type;
        if (rec.delivery_type === 'delivery') {
            document.getElementById('ship-name').value = rec.recipient_name || '';
            document.getElementById('phone-number').value = rec.shipping_phone || '';
            document.getElementById('shipping-address').value = rec.shipping_address || '';
            document.getElementById('postal-code').value = rec.shipping_postal || '';
        }

        this.innerText = 'เลือกแล้ว';
        this.style.background = '#38A169';

        // Minor delay to show feedback then show confirmed state in summary or just proceed
        updateStep3UI();
    });

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
        const workshopInfo = calculateWorkshop(mergedDonationData);
        const currentWorkshopStatus = (slipData.is_slip ? 1 : 0);
        const totalWorkshops = (workshopInfo.totalCount + currentWorkshopStatus);

        document.getElementById('summary-social').innerText = socialInput.value || selectedSocial || '-';
        document.getElementById('summary-nickname').innerText = nickname || '-';
        document.getElementById('summary-current-amount').innerText = formatAmount(slipData.amount);
        document.getElementById('summary-total-amount').innerText = totalWorkshops;

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

        if (totalWorkshops <= 0) {
            giftStatusBox.innerHTML = '<p style="margin:0; font-weight:700; color:#ff67a3; font-size:1rem;">ไม่พบสิทธิ์ Workshop</p>';
            giftMoreEl.innerText = `(ร่วมโดเนทสะสมหรือซื้อ Workshop เพื่อรับสิทธิ์)`;
            giftImg.style.display = 'block';
        } else {
            giftStatusBox.innerHTML = getWorkshopHtml(workshopInfo.history.concat(slipData.is_slip ? [{ type: 'Registered (New)', count: 1, date: 'Now' }] : []));
            giftMoreEl.innerText = '';
            giftImg.style.display = 'none';
        }

        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const deliveryNotice = document.getElementById('delivery-notice');
        const deliveryFields = document.getElementById('new-delivery-address-fields');

        if (finalMethod === 'delivery' && !hasPastDelivery) {
            if (deliveryNotice) deliveryNotice.style.display = 'block';
            if (totalWorkshops <= 0) {
                if (deliveryNotice) {
                    deliveryNotice.innerHTML =
                        '<p style="color:#FF0000; font-weight:800; font-size:1.05rem; margin-bottom:8px; line-height:1.4;">หักค่าส่ง 50 บาท จากยอดชำระ<br>สิทธิ์ของคุณไม่เพียงพอ</p>';
                }
                if (deliveryFields) deliveryFields.style.display = 'none';
                document.getElementById('btn-submit-final').style.display = 'none';
            } else {
                if (deliveryNotice) {
                    deliveryNotice.innerHTML = '<p style="color:#E53E3E; font-weight:700; font-size:0.95rem; margin-bottom:5px;">หักค่าส่ง 50 บาท (เฉพาะกรณีจัดส่งอุปกรณ์)</p>';
                }
                if (deliveryFields) deliveryFields.style.display = 'block';
                document.getElementById('btn-submit-final').style.display = 'block';
            }
        } else {
            if (deliveryNotice) deliveryNotice.style.display = 'none';
            document.getElementById('btn-submit-final').style.display = 'block';
            if (finalMethod === 'delivery' && hasPastDelivery) {
                if (deliveryFields) deliveryFields.style.display = 'block';
            }
        }

        if (totalWorkshops <= 0 && (!slipData || !slipData.is_slip)) {
            receptionSectionWrapper.style.display = 'none';
        } else {
            receptionSectionWrapper.style.display = 'block';
        }
    };

    // --- Final Submit ---
    document.getElementById('btn-submit-final').addEventListener('click', async () => {
        const shipName = document.getElementById('ship-name').value.trim();
        const phone = document.getElementById('phone-number').value.trim();
        const address = document.getElementById('shipping-address').value.trim();
        const postal = document.getElementById('postal-code').value.trim();

        if (currentTotalOriginal >= 177 && selectedMethod === 'delivery') {
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

            // 2. Save Workshop Data
            const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
            const body = {
                action: "saveWorkshop",
                social_name: socialInput.value,
                social_type: selectedSocial,
                name: slipData.sender_name,
                bank_no: slipData.sender_account,
                bank: slipData.bank_code,
                transaction_date: slipData.date.replace(/\//g, '/'),
                transaction_ref: slipData.ref_number,
                amount: slipData.amount,
                image: uploadedImageUrl,
                username: nickname,
                delivery_type: selectedMethod === 'delivery' ? 'delivery' : 'onsite',
                include_shipping: selectedMethod === 'delivery' && !hasPastDelivery,
                recipient_name: selectedMethod === 'delivery' ? shipName : "",
                shipping_phone: selectedMethod === 'delivery' ? phone : "",
                shipping_address: selectedMethod === 'delivery' ? address : "",
                shipping_postal: selectedMethod === 'delivery' ? postal : ""
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

    // --- Slip Verification Edit Flow ---
    const editSlipModal = document.getElementById('edit-slip-modal');
    document.getElementById('btn-edit-slip-data').addEventListener('click', () => {
        editSlipModal.style.display = 'flex';
        document.getElementById('edit-sender-name').value = slipData?.sender_name || '';
        document.getElementById('edit-amount').value = slipData?.amount || '';
        document.getElementById('edit-date').value = formatToDatetimeLocal(slipData?.date || '');
    });

    document.getElementById('close-edit-slip-modal').addEventListener('click', () => {
        editSlipModal.style.display = 'none';
    });

    document.getElementById('btn-save-edit-slip').addEventListener('click', () => {
        slipData.sender_name = document.getElementById('edit-sender-name').value;
        slipData.amount = parseFloat(document.getElementById('edit-amount').value) || 0;
        const editedDate = document.getElementById('edit-date').value;
        slipData.date = formatFromDatetimeLocal(editedDate);
        slipData.is_slip = true;

        editSlipModal.style.display = 'none';

        document.getElementById('verification-error-text').style.display = 'none';
        document.getElementById('verification-success-data').style.display = 'block';
        document.getElementById('verify-sender-name').innerText = slipData.sender_name;
        document.getElementById('verify-amount').innerText = slipData.amount + ' ฿';
        document.getElementById('verify-date').innerText = slipData.date;
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
        const workshopInfo = calculateWorkshop(mergedDonationData);
        const currentWorkshopStatus = (slipData.is_slip ? 1 : 0);
        const totalWorkshops = (workshopInfo.totalCount + currentWorkshopStatus);

        document.getElementById('success-total-amount').innerText = totalWorkshops + ' สิทธิ์';

        // Hide fee on final screen per user request
        const successFeeEl = document.getElementById('success-delivery-fee');
        if (successFeeEl) successFeeEl.style.display = 'none';

        // Add Hashtags
        const hashtagsEl = document.getElementById('success-hashtags');
        if (hashtagsEl) {
            hashtagsEl.innerText = '#NextT1DE1stTideParty #NexT1DE';
        }

        const listEl = document.getElementById('success-gift-list');
        const giftWrapper = document.querySelector('.success-gift-list-wrapper');
        const nextGoal = document.getElementById('success-next-goal');

        if (totalWorkshops > 0) {
            giftWrapper.style.display = 'block';
            nextGoal.style.display = 'block';
            nextGoal.innerText = `คุณสามารถเข้าร่วม Workshop เพื่อรับความประทับใจเพิ่มได้อีกนะครับ`;

            listEl.innerHTML = getWorkshopHtml(workshopInfo.history.concat(slipData.is_slip ? [{ type: 'Registered (New)', count: 1, date: 'ตอนนี้' }] : []));
        } else {
            giftWrapper.style.display = 'none';
            nextGoal.style.display = 'none';
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
