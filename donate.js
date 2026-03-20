document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentState = 1;
    let slipData = null;
    let selectedSocial = 'x';
    let selectedMethod = 'pickup'; // Default is onsite
    let mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null };
    let nickname = '';
    let currentTotalOriginal = 0;

    let slipImageBase64 = '';
    let slipMimeType = '';

    const RECEIVER_NAME_TARGET = "ธัญดา";
    const WEBHOOK_URL = "https://next1de.app.n8n.cloud/webhook/6e4a539b-5580-40f9-a85f-47a488a2e842";
    const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyCdxoOxw_jFxZmbKqsA5xesnpip-dfWbERa7clBLcpf0D87ZaItclgHbZMAYJccmW7Kw/exec";
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
        if (currentState === 2) {
            let hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
            return hasPastDelivery ? (currentTotalOriginal - 50) : currentTotalOriginal;
        }
        return selectedMethod === 'delivery' ? (currentTotalOriginal - 50) : currentTotalOriginal;
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
        } else if (step === 2) {
            step2.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            stepLabelText.innerText = 'อัปโหลดสลิป ใส่นามแฝง และยืนยันข้อมูล (2/3)';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (step === 3) {
            step3.style.display = 'block';
            bars[0].classList.add('step-1-active');
            bars[1].classList.add('step-2-active');
            bars[2].classList.add('step-3-active');
            stepLabelText.innerText = 'Giveaway (3/3)';
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

    btnConfirmStep1.addEventListener('click', async () => {
        const val = socialInput.value.trim();
        if (!val) {
            alert('กรุณากรอก Username บัญชีโซเชียลของคุณ');
            return;
        }
        showLoading('กำลังตรวจสอบข้อมูลรับสิทธิ์...');
        try {
            const res = await fetch(`${GET_API_URL}?action=getDonate&social_type=${selectedSocial}&social_name=${encodeURIComponent(val)}`);
            let data = await res.json();
            if (data.status !== 'ok') {
                // Not found, treat as new
                mergedDonationData = { status: 'new', total_amount: 0, donations: [], user: null, receive: null };
            } else {
                mergedDonationData = data;
                // Pre-fill slipData with user's default bank if available (as fallback)
                if (data.banks && data.banks.length > 0) {
                    const b = data.banks[0];
                    slipData.sender_name = slipData.sender_name || b.name;
                    slipData.sender_account = slipData.sender_account || b.bank_no;
                    slipData.bank_code = slipData.bank_code || b.bank;
                }
                // If they have old receive data, figure out their previous default social (just keeping val is fine though)
            }
            hideLoading();
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

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Uncomment the real fetch in production:
            const aiResponse = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
            if (!aiResponse.ok) throw new Error('AI analysis failed');
            const aiData = await aiResponse.json();

            // Mock Data for Testing
            // const aiData = { "is_slip": true, "date": "04/08/2025 16:08:00", "bank_code": "SCB", "sender_name": "นางสาว ทดสอบ ระบบ", "sender_account": "XXX-X-XX326-7", "receiver_name": "น.ส. ธัญดา โชติอนนต์", "ref_number": "521616374205I000022B9790", "amount": 1000, "currency": "THB" };

            aiLoading.style.display = 'none';
            document.getElementById('slip-verification-details').style.display = 'block';

            if (!aiData || !aiData.is_slip) {
                document.getElementById('verification-error-text').innerText = 'เกิดข้อผิดพลาด, ไม่สามารถอ่านสลิปได้';
                document.getElementById('verification-error-text').style.display = 'block';
                document.getElementById('verification-success-data').style.display = 'none';
                slipData = { is_slip: false, amount: 0, sender_name: '', date: '' }; // Clear or set minimal data
            } else {
                let rName = aiData.receiver_name || '';
                if (!rName.includes(RECEIVER_NAME_TARGET)) {
                    document.getElementById('verification-error-text').innerText = 'เกิดข้อผิดพลาด, บัญชีปลายทางไม่ถูกต้อง';
                    document.getElementById('verification-error-text').style.display = 'block';
                    document.getElementById('verification-success-data').style.display = 'none';
                    slipData = aiData; // Keep AI data even if receiver is wrong for editing
                } else {
                    document.getElementById('verification-error-text').style.display = 'none';
                    document.getElementById('verification-success-data').style.display = 'block';
                    slipData = aiData;

                    document.getElementById('verify-sender-name').innerText = slipData.sender_name || '-';
                    document.getElementById('verify-amount').innerText = slipData.amount ? slipData.amount + ' ฿' : '-';
                    document.getElementById('verify-date').innerText = slipData.date ? formatFromDatetimeLocal(formatToDatetimeLocal(slipData.date)) : '-';
                }
            }

        } catch (error) {
            console.error(error);
            aiLoading.style.display = 'none';
            uploadErrorMsg.innerText = 'เกิดข้อผิดพลาดทางเทคนิค, กรุณาลองใหม่อีกครั้ง';
            uploadErrorMsg.style.display = 'block';
            document.getElementById('slip-verification-details').style.display = 'none';
        }
    };

    const getGiftHtml = (gifts) => {
        let h = '<ul style="list-style:none; padding:0; margin:5px 0 0 0; text-align:center;">';
        if (gifts.stickers > 0) h += `<li>• สติกเกอร์ X ${gifts.stickers}</li>`;
        if (gifts.photoFrame > 0) h += `<li>• เฟรมใส่การ์ด X ${gifts.photoFrame}</li>`;
        if (gifts.foodFrame > 0) h += `<li>• กรอบส่องอาหาร X ${gifts.foodFrame}</li>`;
        if (gifts.lightSign > 0) h += `<li>• ป้ายไฟ X ${gifts.lightSign}</li>`;
        if (gifts.workshop > 0) h += `<li>• WORKSHOP X ${gifts.workshop}</li>`;
        h += '</ul>';
        return h;
    };

    const updateStep2Summary = () => {
        const netAmt = getNetAmount();
        document.getElementById('cumulative-amount').innerText = formatAmount(netAmt);

        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        const deliveryFeeEl = document.getElementById('cumulative-delivery-fee');
        if (hasPastDelivery) {
            deliveryFeeEl.style.display = 'block';
        } else {
            deliveryFeeEl.style.display = 'none';
        }

        const giftInfo = calculateGifts(netAmt);
        const giftBox = document.getElementById('step2-giveaway-box');
        // Render Giveaway Box
        if (!giftInfo.hasAny) {
            giftBox.style.display = 'none';
            document.getElementById('giveaway-more').innerText = `บริจาคอีก ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway`;
        } else {
            giftBox.innerHTML = `<p style="margin:0; font-weight:700; font-size:0.95rem;">GIVEAWAY ที่คุณได้รับ</p>${getGiftHtml(giftInfo.gifts)}`;
            document.getElementById('giveaway-more').innerText = `บริจาคอีก ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway เพิ่มมากขึ้น`;
        }

        const potentialFeeEl = document.getElementById('cumulative-potential-fee');
        if (potentialFeeEl) {
            if (giftInfo.hasAny && !hasPastDelivery) {
                potentialFeeEl.style.display = 'block';
                potentialFeeEl.innerText = `( ยอดเหลือ ${(netAmt - 50).toLocaleString('th-TH')} ถ้าเลือกส่ง Giveaway )`;
            } else {
                potentialFeeEl.style.display = 'none';
            }
        }

        const socialUsername = document.getElementById('social-username').value || selectedSocial;

        let timelineHtml = `
            <div style="background: white; border-radius: 20px; padding: 25px 20px; border: 1px solid #E2E8F0; margin-top: 25px; text-align: left;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom: 25px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#38A169" stroke="none">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"></path>
                    </svg>
                    <h4 style="margin:0; font-size:1.1rem; color:#2D3748; font-weight:800;">ประวัติการโดเนทของ <span style="font-weight:400;">${socialUsername}</span></h4>
                </div>
                <div class="history-list">
        `;

        timelineHtml += `
            <div class="history-item">
                <div class="history-dot current" style="border-color: #FC8181; background: white; box-shadow: none;">
                    <div style="width: 8px; height: 8px; background: #FC8181; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); position: absolute;"></div>
                </div>
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
                        <div class="history-dot past" style="border-color: #3182CE; background: white; box-shadow: none;">
                            <div style="width: 8px; height: 8px; background: #3182CE; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); position: absolute;"></div>
                        </div>
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
                <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:20px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style="color:#E53E3E; font-size:0.85rem; margin:0; font-weight:700;">คุณมีหักค่าส่ง Giveaway 50 บาท จากยอดโดเนท</p>
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
        summarySocial.innerText = socialInput.value;
        summaryNickname.innerText = nickname;
        summaryCurrentAmount.innerText = formatAmount(slipData.amount);

        const r = mergedDonationData.receive;

        // Setup initial default logic based on history
        let hasPastDelivery = r && r.delivery_type === 'delivery';

        if (hasPastDelivery) {
            selectedMethod = 'delivery';
            document.getElementById('method-pickup').classList.remove('selected');
            document.getElementById('method-delivery').classList.add('selected');

            document.getElementById('old-ship-name').innerText = r.recipient_name || '-';
            document.getElementById('old-address').innerText = r.shipping_address || '-';
            document.getElementById('old-postal').innerText = r.shipping_postal || '-';
            document.getElementById('old-phone').innerText = r.shipping_phone || '-';

            // Prefill inputs
            document.getElementById('phone-number').value = r.shipping_phone || '';
            document.getElementById('ship-name').value = r.recipient_name || '';
            document.getElementById('shipping-address').value = r.shipping_address || '';
            document.getElementById('postal-code').value = r.shipping_postal || '';

            document.getElementById('delivery-form-fields').style.display = 'block';
            document.getElementById('past-delivery-address-box').style.display = 'block';
            document.getElementById('new-delivery-address-fields').style.display = 'none';
        } else {
            selectedMethod = 'pickup';
            document.getElementById('method-pickup').classList.add('selected');
            document.getElementById('method-delivery').classList.remove('selected');
            document.getElementById('delivery-form-fields').style.display = 'none';
            document.getElementById('past-delivery-address-box').style.display = 'none';
            document.getElementById('new-delivery-address-fields').style.display = 'block';
        }

        updateStep3UI();
    };

    window.selectMethod = (method) => {
        selectedMethod = method;
        document.getElementById('method-pickup').classList.toggle('selected', method === 'pickup');
        document.getElementById('method-delivery').classList.toggle('selected', method === 'delivery');

        document.getElementById('delivery-form-fields').style.display = method === 'delivery' ? 'block' : 'none';

        let hasPastDelivery = mergedDonationData && mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';
        if (method === 'delivery' && hasPastDelivery) {
            document.getElementById('past-delivery-address-box').style.display = 'block';
            document.getElementById('new-delivery-address-fields').style.display = 'none';
        }

        updateStep3UI();
    };

    document.getElementById('btn-change-reception').addEventListener('click', () => {
        document.getElementById('past-delivery-address-box').style.display = 'none';
        document.getElementById('new-delivery-address-fields').style.display = 'block';

        // Clear inputs so they have to type new ones
        document.getElementById('phone-number').value = '';
        document.getElementById('ship-name').value = '';
        document.getElementById('shipping-address').value = '';
        document.getElementById('postal-code').value = '';
    });

    document.getElementById('btn-use-old-reception').addEventListener('click', function () {
        this.innerText = 'เลือกที่อยู่นี้แล้ว';
        this.style.background = '#38A169';
        this.style.color = '#fff';
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
        const netAmt = getNetAmount();
        const giftInfo = calculateGifts(netAmt);

        document.getElementById('summary-social').innerText = socialInput.value || selectedSocial || '-';
        document.getElementById('summary-nickname').innerText = nickname || '-';
        document.getElementById('summary-current-amount').innerText = formatAmount(slipData.amount);
        document.getElementById('summary-total-amount').innerText = formatAmount(netAmt);

        const feeRow = document.getElementById('summary-fee-row');
        const deliveryFeeEl = document.getElementById('summary-delivery-fee');
        const isDelivery = selectedMethod === 'delivery';
        const hasPastDelivery = mergedDonationData.receive && mergedDonationData.receive.delivery_type === 'delivery';

        if (isDelivery && !hasPastDelivery) {
            feeRow.style.display = 'flex';
            deliveryFeeEl.innerText = '50';
        } else if (hasPastDelivery) {
            feeRow.style.display = 'flex';
            deliveryFeeEl.innerText = '50';
        } else {
            feeRow.style.display = 'none';
        }

        const giftStatusBox = document.getElementById('step3-giveaway-status');
        const giftMoreEl = document.getElementById('step3-giveaway-more');
        const giftImg = document.getElementById('step3-giveaway-img');

        if (!giftInfo.hasAny) {
            giftStatusBox.innerText = 'คุณไม่ได้รับ Giveaway';
            giftMoreEl.innerText = `(บริจาคอีก ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway)`;
            giftImg.style.display = 'block';
        } else {
            let giftStr = `<p style="margin:0; font-weight:700; color:#4A5568;">Giveaway ที่คุณได้รับจากยอดโดเนทสะสม คือ</p>`;
            giftStr += getGiftHtml(giftInfo.gifts);
            giftStr += `<p style="margin:0; font-size:0.85rem; color:#718096; margin-top:15px;">( อาจมีการปรับเปลี่ยน หลังคำนวณค่าจัดส่ง )</p>`;
            giftStatusBox.innerHTML = giftStr;
            giftMoreEl.innerText = '';
            giftImg.style.display = 'none';
        }

        const deliveryNotice = document.getElementById('delivery-notice');
        const deliveryNoticeSub = document.getElementById('delivery-notice-sub');
        const deliveryNoticeMath = document.getElementById('delivery-notice-math');
        const deliveryFields = document.getElementById('delivery-form-fields');

        if (isDelivery && !hasPastDelivery) {
            deliveryNotice.style.display = 'block';
            if (!giftInfo.hasAny) {
                // Scenario 3: No gifts after deduction
                deliveryNotice.innerHTML = '<p style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin-bottom:5px;">หักค่าส่ง 50 บาท พบว่าคุณไม่ได้รับ Giveaway</p>' +
                    '<p style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin:0;">สามารถเปลี่ยนเป็นรับหน้างานได้ ไม่เสียค่าใช้จ่ายเพิ่มเติม</p>';
                deliveryNotice.style.display = 'block';
                deliveryFields.style.display = 'none';
                document.getElementById('btn-submit-final').style.display = 'none';
            } else {
                // Scenario 1: Still has gifts after deduction
                // Reset notice HTML to original structure or update specifically
                deliveryNotice.innerHTML = '<p style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin-bottom:5px;">หักค่าส่ง 50 บาท จากยอดโดเนทสะสม</p>' +
                    '<p id="delivery-notice-sub" style="color:#E53E3E; font-weight:700; font-size:0.9rem; margin:0; display:none;"></p>' +
                    '<p id="delivery-notice-math" style="color:#718096; font-size:0.85rem; margin-top:5px; margin-bottom:0; display:block;"></p>';
                deliveryNotice.style.display = 'block';
                const effectiveDonation = slipData.amount - 50;
                document.getElementById('delivery-notice-math').innerText = `(รอบนี้คุณโดเนท ${effectiveDonation.toLocaleString()} บาท + ค่าส่ง 50 บาท)`;
                deliveryFields.style.display = 'block';
                document.getElementById('btn-submit-final').style.display = 'block';
            }
        } else {
            // Scenario 2 (hasPastDelivery) or isDelivery is false
            deliveryNotice.style.display = 'none';
            document.getElementById('btn-submit-final').style.display = 'block';
            // For Scenario 2, if isDelivery is true, we still show the fields (past address box)
            if (isDelivery && hasPastDelivery) {
                deliveryFields.style.display = 'block';
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
        const shipName = document.getElementById('ship-name').value.trim();
        const phone = document.getElementById('phone-number').value.trim();
        const address = document.getElementById('shipping-address').value.trim();
        const postal = document.getElementById('postal-code').value.trim();

        if (currentTotalOriginal >= 177 && selectedMethod === 'delivery') {
            if (!shipName || !phone || !address || !postal) {
                alert('กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วน');
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
                delivery_type: isStep3Reached ? (selectedMethod === 'delivery' ? 'delivery' : 'onsite') : "",
                recipient_name: isStep3Reached ? (selectedMethod === 'delivery' ? shipName : "") : "",
                shipping_phone: isStep3Reached ? (selectedMethod === 'delivery' ? phone : "") : "",
                shipping_address: isStep3Reached ? (selectedMethod === 'delivery' ? address : "") : "",
                shipping_postal: isStep3Reached ? (selectedMethod === 'delivery' ? postal : "") : ""
            };

            await fetch(SAVE_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(body)
            });

            setTimeout(() => {
                hideLoading();
                showSuccessScreen();
            }, 1000);

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
        document.getElementById('edit-date').value = slipData?.date || '';
    });

    document.getElementById('close-edit-slip-modal').addEventListener('click', () => {
        editSlipModal.style.display = 'none';
    });

    document.getElementById('btn-save-edit-slip').addEventListener('click', () => {
        slipData.sender_name = document.getElementById('edit-sender-name').value;
        slipData.amount = parseFloat(document.getElementById('edit-amount').value) || 0;
        slipData.date = document.getElementById('edit-date').value;
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

        const giftInfo = calculateGifts(netAmt);
        const listEl = document.getElementById('success-gift-list');

        const giftWrapper = document.querySelector('.success-gift-list-wrapper');
        const nextGoal = document.getElementById('success-next-goal');

        if (giftInfo.hasAny) {
            giftWrapper.style.display = 'block';
            nextGoal.style.display = 'block';
            nextGoal.innerText = `บริจาคอีก ${formatAmount(giftInfo.diff)} เพื่อรับ Giveaway เพิ่มมากขึ้น`;

            const list = document.getElementById('success-gift-list');
            list.innerHTML = '';

            const giftNames = {
                stickers: 'สติกเกอร์',
                photoFrame: 'เฟรมใส่การ์ด',
                foodFrame: 'กรอบส่องอาหาร',
                lightSign: 'ป้ายไฟ',
                workshop: 'WORKSHOP'
            };

            Object.entries(giftInfo.gifts).forEach(([key, count]) => {
                if (count > 0) {
                    const li = document.createElement('li');
                    li.innerText = `${giftNames[key]} X ${count}`;
                    list.appendChild(li);
                }
            });
        } else {
            giftWrapper.style.display = 'none';
            nextGoal.style.display = 'none';
        }
        screen.style.display = 'flex';
    };

    document.getElementById('nav-back').addEventListener('click', () => {
        if (currentState === 3) setStepUI(2);
        else if (currentState === 2) setStepUI(1);
        else window.location.href = 'index.html';
    });
    document.querySelector('.btn-success-share').addEventListener('click', () => {
        if (navigator.share) navigator.share({ title: 'NexT1DE', url: window.location.origin }).catch(e => e);
        else alert('คัดลอกลิงก์เพื่อแชร์: ' + window.location.href);
    });
});
