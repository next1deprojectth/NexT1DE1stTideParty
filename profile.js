document.addEventListener('DOMContentLoaded', () => {

    const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxVTIIijNn_TOaHrAdV-Gc0UB8azbEJmalF-NVzeAoAKD4ZOZP22NPZyGtJCKnNi7rQpA/exec";

    const socialTabs = document.querySelectorAll('.social-tab');
    const searchInput = document.getElementById('search-username');
    const btnSearch = document.getElementById('btn-search');

    let selectedSocial = 'x';

    // UI Elements
    const apiLoading = document.getElementById('api-loading');
    const errorMsg = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const shareUrlBox = document.getElementById('share-url-box');
    const shareUrlInput = document.getElementById('share-url-input');

    // Parse URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const urlSocialName = urlParams.get('socialName');
    const urlSocialType = urlParams.get('socialType');

    if (urlSocialName) {
        searchInput.value = urlSocialName;
        selectedSocial = urlSocialType || 'x';
        updateTabs(selectedSocial);
        fetchProfile(urlSocialName, selectedSocial);
    }

    // Setup Tabs
    function updateTabs(social) {
        socialTabs.forEach(t => t.classList.remove('active'));
        const activeTab = Array.from(socialTabs).find(t => t.dataset.social === social) || document.getElementById('tab-twitter');
        if (activeTab) {
            activeTab.classList.add('active');
            selectedSocial = activeTab.dataset.social;
        }
    }

    socialTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            updateTabs(tab.dataset.social);
        });
    });

    // Search Button
    btnSearch.addEventListener('click', () => {
        const val = searchInput.value.trim();
        if (!val) {
            alert('กรุณากรอก Username เพื่อค้นหา');
            return;
        }

        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('socialName', val);
        newUrl.searchParams.set('socialType', selectedSocial);
        window.history.pushState({}, '', newUrl);

        fetchProfile(val, selectedSocial);
    });

    document.getElementById('btn-copy-url').addEventListener('click', function () {
        shareUrlInput.select();
        document.execCommand('copy');
        this.innerText = 'คัดลอกแล้ว';
        setTimeout(() => this.innerText = 'คัดลอก', 2000);
    });

    async function fetchProfile(socialName, socialType) {
        apiLoading.style.display = 'block';
        errorMsg.style.display = 'none';
        resultContainer.style.display = 'none';
        shareUrlBox.style.display = 'none';

        try {
            const res = await fetch(`${API_ENDPOINT}?action=getDonate&socialName=${encodeURIComponent(socialName)}&socialType=${encodeURIComponent(socialType)}`);
            const data = await res.json();

            if (data.status !== 'ok' || (!data.donations || data.donations.length === 0)) {
                // Not found
                apiLoading.style.display = 'none';
                errorMsg.style.display = 'block';
                return;
            }

            // Render Profile
            renderProfile(data);

            apiLoading.style.display = 'none';
            resultContainer.style.display = 'block';

            shareUrlInput.value = window.location.href;
            shareUrlBox.style.display = 'block';

        } catch (error) {
            console.error('Fetch error:', error);
            apiLoading.style.display = 'none';
            errorMsg.style.display = 'block';
            errorMsg.querySelector('p').innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        }
    }

    function renderProfile(data) {
        // Header
        const pName = data.user?.social_name || data.socialName;
        document.getElementById('profile-name').innerText = pName;
        document.getElementById('profile-social-type').innerText = `ช่องทาง: ${data.user?.social_type || 'x'}`;
        document.getElementById('profile-avatar').innerText = pName.charAt(0).toUpperCase();

        // Total Amount
        const total = data.total_amount || 0;
        document.getElementById('profile-total-amount').innerText = `฿${total.toLocaleString('th-TH', { minimumFractionDigits: total % 1 === 0 ? 0 : 2 })}`;

        // Gifts
        const giftInfo = calculateGifts(total);
        const giftsContainer = document.getElementById('profile-gifts-container');
        if (total >= 177) {
            giftsContainer.innerHTML = getGiftHtml(giftInfo.gifts);
        } else {
            giftsContainer.innerHTML = `<p style="text-align:center; color:#A0AEC0; margin:0; font-size: 0.9rem;">ไม่ได้รับ Giveaway (ยอดน้อยกว่า 177 บาท)</p>`;
        }

        // Reception
        const recCard = document.getElementById('reception-card');
        if (data.receive) {
            recCard.style.display = 'block';
            const r = data.receive;
            document.getElementById('reception-type-label').innerText = r.delivery_type === 'delivery' ? 'จัดส่งตามที่อยู่' : 'รับที่หน้างาน (จามจุรีสแควร์ ชั้น G)';

            if (r.delivery_type === 'delivery') {
                document.getElementById('reception-address-box').style.display = 'block';
                document.getElementById('reception-onsite-box').style.display = 'none';

                document.getElementById('rec-name').innerText = r.recipient_name || '-';
                document.getElementById('rec-address').innerText = r.shipping_address || '-';
                document.getElementById('rec-postal').innerText = r.shipping_postal || '';
                document.getElementById('rec-phone').innerText = r.shipping_phone || '-';
            } else {
                document.getElementById('reception-address-box').style.display = 'none';
                document.getElementById('reception-onsite-box').style.display = 'block';
            }
        } else {
            if (total >= 177) {
                recCard.style.display = 'block';
                document.getElementById('reception-type-label').innerText = 'ยังไม่ได้ลงทะเบียนวิธีรับ Giveaway';
                document.getElementById('reception-type-label').style.color = '#DD6B20';
                document.getElementById('reception-address-box').style.display = 'none';
                document.getElementById('reception-onsite-box').style.display = 'none';
            } else {
                recCard.style.display = 'none';
            }
        }

        // History
        const listContainer = document.getElementById('profile-history-list');
        let html = '';
        if (data.donations && data.donations.length > 0) {
            data.donations.forEach(d => {
                const dateStr = d.transaction_date || d.date || d.timestamp || d['วันเวลาโอน'] || '-';
                const dispDate = formatThaiDate(dateStr);
                const dispAmount = d.amount ? parseFloat(d.amount).toLocaleString('th-TH') : '0';

                let imgHtml = '';
                if (d.image) {
                    imgHtml = `<a href="${d.image}" target="_blank" style="color: #4299E1; font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 4px; border: 1px solid #BEE3F8; padding: 2px 8px; border-radius: 12px; background: #EBF8FF;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        ดูสลิป
                    </a>`;
                }

                html += `
                    <div class="history-item" style="display: flex; gap: 15px; position: relative; padding-bottom: 20px;">
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <div style="width: 14px; height: 14px; background: #CBD5E0; border-radius: 50%; z-index: 2;"></div>
                            <div style="flex: 1; width: 2px; background: #E2E8F0; margin-top: 5px;"></div>
                        </div>
                        <div style="flex: 1; background: #F7FAFC; padding: 15px; border-radius: 15px; border: 1px solid #E2E8F0; margin-top: -5px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <p style="margin: 0; font-weight: 700; color: #2D3748; font-size: 0.95rem;">ยอดโอน ${dispAmount} บาท</p>
                                    <p style="margin: 2px 0 0; color: #718096; font-size: 0.8rem;">${dispDate}</p>
                                    <p style="margin: 4px 0 0; color: #A0AEC0; font-size: 0.75rem;">นามแฝง: ${d.username || '-'}</p>
                                    <p style="margin: 2px 0 0; color: #718096; font-size: 0.75rem;">ธนาคาร: ${d.bank || '-'}</p>
                                </div>
                                <div>${imgHtml}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        listContainer.innerHTML = html;

        // Remove the last timeline line
        const lastLine = listContainer.querySelector('.history-item:last-child > div:first-child > div:last-child');
        if (lastLine) lastLine.style.display = 'none';
        const lastItem = listContainer.querySelector('.history-item:last-child');
        if (lastItem) lastItem.style.paddingBottom = '0';
    }

    // --- Helpers ---
    const formatThaiDate = (dateStr) => {
        if (!dateStr || dateStr === '-') return '-';

        let date;
        if (dateStr.includes('T') || dateStr.includes('-')) {
            date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
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

        return { gifts };
    };

    const getGiftHtml = (gifts) => {
        let h = '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:10px;">';
        const badgeStyle = `style="background:#E2E8F0; color:#2D3748; padding:6px 15px; border-radius:50px; font-size:0.8rem; font-weight:700; white-space:nowrap; border:1px solid #CBD5E0;"`;

        if (gifts.stickers > 0) h += `<span ${badgeStyle}>สติกเกอร์ X ${gifts.stickers}</span>`;
        if (gifts.photoFrame > 0) h += `<span ${badgeStyle}>เฟรมใส่การ์ด X ${gifts.photoFrame}</span>`;
        if (gifts.foodFrame > 0) h += `<span ${badgeStyle}>กรอบส่องอาหาร X ${gifts.foodFrame}</span>`;
        if (gifts.lightSign > 0) h += `<span ${badgeStyle}>ป้ายไฟ X ${gifts.lightSign}</span>`;
        if (gifts.workshop > 0) h += `<span ${badgeStyle}>WORKSHOP X ${gifts.workshop}</span>`;

        h += '</div>';
        return h;
    };
});
