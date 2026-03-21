document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentState = 0;
    let selectedSocial = 'x';
    let socialNameInput = '';
    let apiData = null;
    let slipData = null;

    let totalRights = 0;
    let fromDirect = 0;

    let itemCount = 1; // Default to 1
    let deliveryMethod = 'onsite'; // onsite or delivery
    let isEditingReception = false;
    let hasPastDelivery = false;
    let pastDeliveryType = 'onsite';
    let expectedTotal = 0;
    let expectedShipping = 0;

    let slipImageBase64 = '';
    let slipMimeType = '';

    const WORKSHOP_PRICE = 100;
    const SHIPPING_FEE = 50;

    // --- Endpoints ---
    const RECEIVER_NAME_TARGET = "ธัญดา";
    const WEBHOOK_URL = "https://next1de.app.n8n.cloud/webhook/6e4a539b-5580-40f9-a85f-47a488a2e842";
    const API_ENDPOINT = API_CONFIG.BASE_URL;
    const GET_API_URL = `${API_ENDPOINT}?action=getWorkshop`;
    const SAVE_API_URL = API_ENDPOINT;

    // --- DOM Elements ---
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const stepSuccess = document.getElementById('step-success');

    const bar1 = document.getElementById('bar-1');
    const bar2 = document.getElementById('bar-2');
    const bar3 = document.getElementById('bar-3');
    const stepLabel = document.getElementById('step-label-text');
    const navBack = document.getElementById('nav-back');
    const mainBg = document.getElementById('main-bg');

    // === Step 0 Logic ===
    const btnNextStep0 = document.getElementById('btn-next-step0');
    if (btnNextStep0) {
        btnNextStep0.addEventListener('click', () => {
            goToStep(1);
        });
    }

    // === Step 1 Logic ===
    const tabs = document.querySelectorAll('.social-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedSocial = tab.getAttribute('data-social');
        });
    });

    const btnNextStep1 = document.getElementById('btn-next-step1');
    btnNextStep1.addEventListener('click', async () => {
        const usernameEl = document.getElementById('social-username');
        const userValue = usernameEl.value.trim();
        if (!userValue) {
            usernameEl.style.border = "2px solid #E53E3E";
            setTimeout(() => usernameEl.style.border = "1px solid #E2E8F0", 2000);
            return;
        }
        socialNameInput = userValue;

        // Show Loading
        const loader = document.getElementById('api-loading-social');
        btnNextStep1.style.display = 'none';
        loader.style.display = 'block';

        try {
            const res = await fetch(`${GET_API_URL}&socialName=${encodeURIComponent(socialNameInput)}&socialType=${selectedSocial}`);
            const data = await res.json();

            if (data.status === 'ok') {
                apiData = data;
                totalRights = data.rights ? data.rights.total : 0;
                fromDirect = data.rights ? data.rights.from_direct : 0;

                // Determine past delivery
                if (data.receive) {
                    hasPastDelivery = true;
                    pastDeliveryType = data.receive.delivery_type === 'delivery' ? 'delivery' : 'onsite';
                    deliveryMethod = pastDeliveryType;
                } else {
                    hasPastDelivery = false;
                    deliveryMethod = 'onsite';
                }

                // Allow minimum 0 if they already have rights
                if (totalRights > 0) {
                    itemCount = 0;
                } else {
                    itemCount = 1;
                }

                initStep2();
                goToStep(2);
            } else {
                alert('ไม่พบข้อมูล หรือเกิดข้อผิดพลาดในการโหลด');
            }
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            loader.style.display = 'none';
            btnNextStep1.style.display = 'block';
        }
    });

    // === Step 2 Logic ===
    const displayRights = document.getElementById('display-current-rights');
    const rightsDetail = document.getElementById('current-rights-detail');
    const displayQty = document.getElementById('display-qty');
    const btnMinus = document.getElementById('btn-qty-minus');
    const btnPlus = document.getElementById('btn-qty-plus');
    const summaryQty = document.getElementById('summary-qty-inline');
    const summaryShipping = document.getElementById('summary-shipping-inline');
    const btnTotalPrice = document.getElementById('btn-total-price');
    const btnNextStep2 = document.getElementById('btn-next-step2');

    const pastBox = document.getElementById('past-reception-box');
    const normalSelector = document.getElementById('reception-selector');
    const pastTypeText = document.getElementById('past-type-text');
    const btnEditReception = document.getElementById('btn-edit-reception');
    const deliveryForm = document.getElementById('delivery-details-form');

    const deliveryCards = document.querySelectorAll('.delivery-method-card');

    function initStep2() {
        const rightsSection = document.getElementById('current-rights-box');
        if (totalRights > 0) {
            if (rightsSection) rightsSection.style.display = 'block';
            displayRights.innerText = totalRights.toString();
            let rightsTextArray = [];
            if (apiData && apiData.rights) {
                if (apiData.rights.from_donate > 0) rightsTextArray.push(`${apiData.rights.from_donate} สิทธิ์จากการโดเนท`);
                if (apiData.rights.from_direct > 0) rightsTextArray.push(`${apiData.rights.from_direct} สิทธิ์จากการซื้อ workshop`);
            }
            if (rightsTextArray.length > 0) {
                rightsDetail.innerText = rightsTextArray.join(' และ ');
                rightsDetail.style.display = 'block';
            } else {
                rightsDetail.style.display = 'none';
            }
        } else {
            if (rightsSection) rightsSection.style.display = 'none';
        }

        isEditingReception = !hasPastDelivery;

        if (hasPastDelivery) {
            pastBox.style.display = 'block';
            normalSelector.style.display = 'none';
            pastTypeText.innerText = pastDeliveryType === 'delivery' ? 'จัดส่งตามที่อยู่' : 'รับที่งาน';

            const pastDetails = document.getElementById('past-details');
            if (pastDetails) {
                if (pastDeliveryType === 'delivery' && apiData && apiData.receive) {
                    document.getElementById('past-name').innerText = apiData.receive.recipient_name || '-';
                    document.getElementById('past-phone').innerText = apiData.receive.shipping_phone || '-';
                    document.getElementById('past-address').innerText = apiData.receive.shipping_address || '-';
                    document.getElementById('past-postal').innerText = apiData.receive.shipping_postal || '-';
                    document.getElementById('past-fee-note').style.display = 'block';
                    pastDetails.style.display = 'block';
                } else {
                    pastDetails.style.display = 'none';
                    document.getElementById('past-fee-note').style.display = 'none';
                }
            }

            deliveryForm.style.display = 'none';
        } else {
            pastBox.style.display = 'none';
            normalSelector.style.display = 'flex';
            toggleDeliveryForm();
        }

        const shippingFeeText = document.getElementById('shipping-fee-text');
        if (shippingFeeText) {
            if (hasPastDelivery && pastDeliveryType === 'delivery') {
                shippingFeeText.innerText = 'ชำระค่าส่งแล้ว';
                shippingFeeText.style.color = '#48BB78';
            } else {
                shippingFeeText.innerText = 'ชำระเพิ่ม 50 บาท';
                shippingFeeText.style.color = '#F871B4';
            }
        }

        updatePricing();
    }

    btnMinus.addEventListener('click', () => {
        let min = totalRights > 0 ? 0 : 1;
        if (itemCount > min) {
            itemCount--;
            updatePricing();
        }
    });

    btnPlus.addEventListener('click', () => {
        if (itemCount < 10) {
            itemCount++;
            updatePricing();
        }
    });

    deliveryCards.forEach(card => {
        card.addEventListener('click', () => {
            const newMethod = card.getAttribute('data-method');
            if (hasPastDelivery && pastDeliveryType === 'delivery' && deliveryMethod === 'delivery' && newMethod === 'onsite') {
                alert('หากเลือกวิธีนี้ จะไม่คืนเงินค่าส่งที่เคยจ่ายไป');
            }
            deliveryCards.forEach(c => {
                c.classList.remove('active');
                c.style.border = '1px solid #E2E8F0';
            });
            card.classList.add('active');
            card.style.border = '2px solid #286ACD';
            deliveryMethod = newMethod;
            toggleDeliveryForm();
            updatePricing();
        });
    });

    btnEditReception.addEventListener('click', () => {
        isEditingReception = true;
        pastBox.style.display = 'none';
        normalSelector.style.display = 'flex';

        if (pastDeliveryType === 'delivery' && apiData && apiData.receive) {
            document.getElementById('ship-name').value = apiData.receive.recipient_name || '';
            document.getElementById('ship-phone').value = apiData.receive.shipping_phone || '';
            document.getElementById('ship-address').value = apiData.receive.shipping_address || '';
            document.getElementById('ship-postal').value = apiData.receive.shipping_postal || '';
        }

        // Select matching card
        deliveryCards.forEach(c => {
            if (c.getAttribute('data-method') === pastDeliveryType) {
                c.click();
            }
        });
        updatePricing();
    });

    function toggleDeliveryForm() {
        if (deliveryMethod === 'delivery') {
            deliveryForm.style.display = 'block';
        } else {
            deliveryForm.style.display = 'none';
        }
    }

    function updatePricing() {
        displayQty.innerText = `${itemCount} สิทธิ์`;

        const locationSection = document.getElementById('location-section-wrapper');
        if (locationSection) {
            if (itemCount === 0) {
                locationSection.style.display = 'none';
            } else {
                locationSection.style.display = 'block';
            }
        }

        // Update Button Styles
        let minActionCount = totalRights > 0 ? 0 : 1;
        if (itemCount <= minActionCount) {
            btnMinus.style.background = "#EDF2F7";
            btnMinus.style.color = "#CBD5E0";
            btnMinus.style.cursor = "not-allowed";
            btnMinus.style.opacity = "0.6";
        } else {
            btnMinus.style.background = "#EDF2F7";
            btnMinus.style.color = "#4A5568";
            btnMinus.style.cursor = "pointer";
            btnMinus.style.opacity = "1";
        }

        let subtotal = itemCount * WORKSHOP_PRICE;

        // Calculate shipping logic
        let shipping = 0;
        let finalMethod = isEditingReception ? deliveryMethod : pastDeliveryType;

        if (finalMethod === 'delivery') {
            if (!hasPastDelivery || (hasPastDelivery && pastDeliveryType !== 'delivery')) {
                shipping = SHIPPING_FEE;
            }
        }

        expectedShipping = shipping;
        expectedTotal = subtotal + shipping;

        const formatMoney = (num) => num.toLocaleString('th-TH');

        summaryQty.innerText = itemCount.toString();
        document.getElementById('summary-price-inline').innerText = `${formatMoney(subtotal)} บาท`;
        document.getElementById('summary-shipping-inline').innerText = `${formatMoney(shipping)} บาท`;

        if (expectedTotal === 0 && itemCount === 0) {
            btnNextStep2.innerHTML = `ดูสิทธิ์ (QR Code)`;
            btnNextStep2.style.background = "linear-gradient(135deg, #286ACD 0%, #A3E4DB 100%)";
        } else {
            btnNextStep2.innerHTML = `ยอดชำระ ${formatMoney(expectedTotal)} บาท`;
            btnNextStep2.style.background = "#FF6666";
        }
    }

    btnNextStep2.addEventListener('click', () => {
        if (expectedTotal === 0 && itemCount === 0) {
            // Skip payment step, go straight to success
            showSuccessScreen();
        } else {
            // Validate form if delivery is selected and they don't have past past info
            let finalMethod = isEditingReception ? deliveryMethod : pastDeliveryType;
            if (finalMethod === 'delivery' && (!hasPastDelivery || isEditingReception)) {
                if (!document.getElementById('ship-name').value.trim() ||
                    !document.getElementById('ship-phone').value.trim() ||
                    !document.getElementById('ship-address').value.trim() ||
                    !document.getElementById('ship-postal').value.trim()) {
                    alert("กรุณากรอกข้อมูลจัดส่งให้ครบถ้วน");
                    return;
                }
            }
            initStep3();
            goToStep(3);
        }
    });

    // === Step 3 Logic ===
    function initStep3() {
        document.getElementById('final-qty').innerText = itemCount;
        document.getElementById('final-base-price').innerText = itemCount * WORKSHOP_PRICE;
        document.getElementById('final-shipping').innerText = expectedShipping;
        document.getElementById('final-total').innerText = expectedTotal;

        // Reset verify UI
        document.getElementById('slip-file-input').value = "";
        document.getElementById('upload-zone-content').style.display = 'flex';
        document.getElementById('upload-preview-wrapper').style.display = 'none';

        document.getElementById('api-loading').style.display = 'none';
        document.getElementById('verification-result-box').style.display = 'none';
        document.getElementById('btn-submit-final').style.display = 'none';
    }

    // Expose file input trigger
    window.triggerFileInput = function () {
        document.getElementById('slip-file-input').click();
    };

    window.handleFileSelected = function (input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            slipMimeType = file.type;

            document.getElementById('upload-zone-content').style.display = 'none';
            const previewWrapper = document.getElementById('upload-preview-wrapper');
            const previewImg = document.getElementById('slip-preview-img');
            previewWrapper.style.display = 'block';

            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                slipImageBase64 = e.target.result.split(',')[1];
                verifySlipWithAI(file);
            };
            reader.readAsDataURL(file);
        }
    };

    async function verifySlipWithAI(file) {
        document.getElementById('api-loading').style.display = 'block';
        document.getElementById('verification-result-box').style.display = 'none';
        document.getElementById('btn-submit-final').style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('AI analysis failed');
            const aiResult = await response.json();

            // 1. Not a slip check
            if (!aiResult || aiResult.is_slip === false || !aiResult.amount) {
                showVerifyError("ไม่สามารถอ่านสลิปได้ กรุณาลองใหม่อีกครั้ง");
                return;
            }

            // 2. Receiver Name Check
            const rName = aiResult.receiver_name || '';
            if (!rName.includes(RECEIVER_NAME_TARGET)) {
                showVerifyError("บัญชีปลายทางไม่ถูกต้อง (ผู้รับควรชื่อ ธัญดา)");
                return;
            }

            // 3. Duplicate Ref Check
            const refNum = aiResult.ref_number || aiResult.transaction_ref;
            if (refNum && apiData && apiData.workshops) {
                const isDuplicate = apiData.workshops.some(w => w.transaction_ref === refNum);
                if (isDuplicate) {
                    showVerifyError("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้งานซ้ำได้");
                    return;
                }
            }

            // 4. Amount Check
            let parseAmountRaw = String(aiResult.amount).replace(/,/g, '');
            let amountExtracted = parseFloat(parseAmountRaw) || 0;

            if (Math.abs(amountExtracted - expectedTotal) > 0.1) {
                showVerifyError(`ยอดเงินไม่ถูกต้อง (สลิป: ${amountExtracted.toLocaleString()} ฿, ยอดที่ต้องจ่าย: ${expectedTotal.toLocaleString()} ฿)`);
                return;
            }

            slipData = aiResult;
            showVerifySuccess();

        } catch (error) {
            console.error('AI Verify Error:', error);
            showVerifyError("เกิดข้อผิดพลาดทางเทคนิคในการตรวจสอบสลิป");
        } finally {
            document.getElementById('api-loading').style.display = 'none';
        }
    }

    function showVerifyError(msg) {
        document.getElementById('verification-result-box').style.display = 'block';

        const verifySuccessDiv = document.getElementById('verify-success');
        const verifyErrorDiv = document.getElementById('verify-error');
        if (verifySuccessDiv) verifySuccessDiv.style.display = 'none';
        if (verifyErrorDiv) {
            verifyErrorDiv.style.display = 'block';
            const msgEl = document.getElementById('verify-error-msg');
            if (msgEl) msgEl.innerText = msg;
        }

        document.getElementById('btn-submit-final').style.display = 'none';
    }

    function showVerifySuccess() {
        document.getElementById('verification-result-box').style.display = 'block';

        const verifySuccessDiv = document.getElementById('verify-success');
        const verifyErrorDiv = document.getElementById('verify-error');
        if (verifySuccessDiv) verifySuccessDiv.style.display = 'block';
        if (verifyErrorDiv) verifyErrorDiv.style.display = 'none';

        document.getElementById('verify-sender-name').innerText = slipData.sender_name || '-';
        document.getElementById('verify-amount').innerText = `฿ ${slipData.amount.toLocaleString()}`;
        document.getElementById('verify-date').innerText = slipData.date || '-';

        document.getElementById('btn-submit-final').style.display = 'block';
    }

    const btnSubmit = document.getElementById('btn-submit-final');
    btnSubmit.addEventListener('click', async () => {
        btnSubmit.style.display = 'none';
        document.getElementById('submit-loading').style.display = 'block';

        let finalMethod = isEditingReception ? deliveryMethod : pastDeliveryType;
        let shipName = document.getElementById('ship-name').value;
        let shipPhone = document.getElementById('ship-phone').value;
        let shipAddress = document.getElementById('ship-address').value;
        let shipPostal = document.getElementById('ship-postal').value;

        let isIncludeShipping = (finalMethod === 'delivery' && (!hasPastDelivery || pastDeliveryType !== 'delivery'));

        try {
            // 1. Upload Image first (Same as donate.js)
            let uploadedImageUrl = "";
            if (slipImageBase64) {
                const uploadBody = {
                    action: "uploadImage",
                    mimeType: slipMimeType,
                    base64: slipImageBase64
                };
                const uploadRes = await fetch(API_ENDPOINT, {
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
            const payload = {
                action: "saveWorkshop",
                social_name: socialNameInput,
                social_type: selectedSocial,
                name: slipData.sender_name || "",
                bank_no: slipData.sender_account || "",
                bank: slipData.bank_code || "",
                username: socialNameInput,
                transaction_date: slipData.date ? slipData.date.replace(/\//g, '/') : "",
                transaction_ref: slipData.ref_number || "",
                receive_name: slipData.receiver_name || "",
                amount: slipData.amount || expectedTotal,
                item_count: itemCount,
                image: uploadedImageUrl,
                include_shipping: isIncludeShipping,
                event_type: "workshop",
                delivery_type: finalMethod,
                recipient_name: finalMethod === 'delivery' ? shipName : "",
                shipping_phone: finalMethod === 'delivery' ? shipPhone : "",
                shipping_address: finalMethod === 'delivery' ? shipAddress : "",
                shipping_postal: finalMethod === 'delivery' ? shipPostal : ""
            };

            await fetch(SAVE_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            showSuccessScreen();
        } catch (error) {
            console.error('Save failed', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
            btnSubmit.style.display = 'block';
        } finally {
            document.getElementById('submit-loading').style.display = 'none';
        }
    });

    // === Success Screen Logic ===
    function showSuccessScreen() {
        const indicator = document.querySelector('.step-indicator-container');
        if (indicator) indicator.style.display = 'none';

        const navbar = document.querySelector('.nav-bar');
        if (navbar) navbar.style.display = 'none';

        const stickyBox = document.querySelector('.sticky-summary-box');
        if (stickyBox) stickyBox.style.display = 'none';

        // Show background
        if (mainBg) {
            mainBg.classList.remove('donate-hide');
            mainBg.style.display = 'block';
            mainBg.style.background = 'url("images/background_workshop.png") no-repeat center center / cover';
            mainBg.innerHTML = '<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:-1;"></div>';
        }

        // Remove overflow:hidden so it can scroll properly on all devices
        document.body.style.overflow = '';
        window.scrollTo(0, 0);

        document.querySelectorAll('.donate-step').forEach(s => {
            s.style.display = 'none';
        });

        // Final fallback for step-0 button just in case
        const step0Btn = document.querySelector('.step0-btn-wrapper');
        if (step0Btn) step0Btn.style.display = 'none';

        if (stepSuccess) stepSuccess.style.display = 'flex'; // It's flex in new design

        let finalTotalRights = totalRights + itemCount;
        document.getElementById('success-total-rights').innerText = finalTotalRights;

        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: `WK-${selectedSocial}-${socialNameInput}`,
            width: 150,
            height: 150,
            colorDark: "#0A1628",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    document.getElementById('btn-back-home').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    const shareBtn = document.getElementById('btn-share');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = 'https://next1deprojectth.github.io/NexT1DE1stTideParty';
            if (navigator.share) {
                navigator.share({
                    url: shareUrl
                }).catch(e => console.log('Share failed', e));
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('คัดลอกลิงก์เรียบร้อยแล้ว');
                });
            }
        });
    }

    // === Navigation System ===
    function goToStep(step) {
        document.querySelectorAll('.donate-step').forEach(s => s.style.display = 'none');
        document.getElementById(`step-${step}`).style.display = 'block';
        currentState = step;

        bar1.className = 'progress-bar-item';
        bar2.className = 'progress-bar-item';
        bar3.className = 'progress-bar-item';

        if (step >= 1) bar1.classList.add('step-1-active');
        if (step >= 2) bar2.classList.add('step-2-active');
        if (step >= 3) bar3.classList.add('step-3-active');

        if (step === 1) stepLabel.innerText = "ข้อมูลผู้ร่วม workshop (1/3)";
        if (step === 2) stepLabel.innerText = "เลือกสิทธิ์และวิธีรับ (2/3)";
        if (step === 3) stepLabel.innerText = "ชำระเงินและแนบหลักฐานการชำระ (3/3)";

        const stepIndicatorWrapper = document.getElementById('step-indicator-wrapper');
        const navTitle = document.querySelector('.nav-title');

        if (step === 0) {
            if (stepIndicatorWrapper) stepIndicatorWrapper.style.display = 'none';
            if (navTitle) navTitle.innerText = "หน้าแรก";
        } else {
            if (stepIndicatorWrapper) stepIndicatorWrapper.style.display = 'block';
            if (navTitle) navTitle.innerText = "Workshop NexT1DE";
        }

        const stickySummary = document.querySelector('.sticky-summary-box');
        if (stickySummary) {
            stickySummary.style.display = (step === 2) ? 'flex' : 'none';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navBack.addEventListener('click', () => {
        if (currentState === 0) {
            window.location.href = 'index.html';
        } else if (currentState === 1) {
            goToStep(0);
        } else {
            goToStep(currentState - 1);
        }
    });

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
