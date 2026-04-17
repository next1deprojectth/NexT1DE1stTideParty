/* --- Admin Dashboard Logic (Advanced Thai Version) --- */

let allUsers = [];
let filteredUsers = [];
let summaryData = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // Setup Filters
    const searchInp = document.getElementById('search-input');
    const shipFilt = document.getElementById('filter-shipping');
    const setFilt = document.getElementById('filter-set');

    const handleFilter = () => { applyFilters(); };

    searchInp.addEventListener('input', handleFilter);
    shipFilt.addEventListener('change', handleFilter);
    setFilt.addEventListener('change', handleFilter);

    // Export Button
    const exportBtn = document.getElementById('btn-export-excel');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
});

async function fetchData() {
    showLoading(true);
    try {
        const url = `${API_CONFIG.BASE_URL}?action=getAdminSummary`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (HTTP ${response.status})`);
        }
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('ข้อมูลจากเซิร์ฟเวอร์ผิดรูปแบบ (ไม่ใช่ JSON)');
        }

        if (data.status === 'ok') {
            allUsers = data.users || [];
            allUsers.forEach(u => u.giveaway_set = calculateUserSet(u));
            
            summaryData = data.summary;
            renderDashboard(allUsers, summaryData);
            applyFilters(); 

            // Enable export button
            const exportBtn = document.getElementById('btn-export-excel');
            if (exportBtn) exportBtn.disabled = false;
        } else {
            showToast('ข้อผิดพลาด: ' + (data.message || 'ไม่ทราบสาเหตุ'));
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        showLoading(false);
    }
}

function calculateUserSet(user) {
    if (!user.giftaway) return 0;
    const tier = user.giftaway.tier_min || 0;
    if (tier >= 1277) return 4;
    if (tier >= 777) return 3;
    if (tier >= 477) return 2;
    if (tier >= 177) return 1;
    return 0;
}

function renderDashboard(users, summary) {
    const dashboard = document.getElementById('stats-dashboard');
    if (!dashboard || !summary) return;
    dashboard.style.display = 'flex';

    // 1. Finance Mini Row
    const financeContainer = document.getElementById('finance-stats');
    financeContainer.innerHTML = `
        <div class="finance-item">
            <div class="finance-label">ยอดโดเนท (Raw)</div>
            <div class="finance-value">฿${(summary.total_raw_donate || 0).toLocaleString()}</div>
        </div>
        <div class="finance-item">
            <div class="finance-label">ยอดโดเนท (Net)</div>
            <div class="finance-value">฿${(summary.total_net_donate || 0).toLocaleString()}</div>
        </div>
        <div class="finance-item">
            <div class="finance-label">ผู้ใช้</div>
            <div class="finance-value">${(summary.total_users || 0).toLocaleString()} <span style="font-size: 0.6rem;">คน</span></div>
        </div>
        <div class="finance-item">
            <div class="finance-label">Workshop</div>
            <div class="finance-value">${(summary.total_workshop_users || 0).toLocaleString()} <span style="font-size: 0.6rem;">คน</span></div>
        </div>
    `;

    // 2. Giveaway Sets (Stacked Bar)
    const setCounts = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    const itemCounts = {};
    users.forEach(u => {
        setCounts[u.giveaway_set]++;
        if (u.giftaway && u.giftaway.items) {
            u.giftaway.items.forEach(item => {
                itemCounts[item] = (itemCounts[item] || 0) + 1;
            });
        }
    });

    const totalUsers = users.length || 1;
    const setConfig = [
        { id: 4, label: 'เซต 4', color: '#818CF8' },
        { id: 3, label: 'เซต 3', color: '#A5B4FC' },
        { id: 2, label: 'เซต 2', color: '#C7D2FE' },
        { id: 1, label: 'เซต 1', color: '#E0E7FF' },
        { id: 0, label: 'ไม่ได้รับ', color: '#F1F5F9' }
    ];

    const stackedBar = document.getElementById('sets-stacked-bar');
    stackedBar.innerHTML = setConfig.map(s => {
        const percent = (setCounts[s.id] / totalUsers * 100).toFixed(1);
        if (percent <= 0) return '';
        return `<div class="bar-segment" style="width: ${percent}%; background: ${s.color};" title="${s.label}: ${setCounts[s.id]} คน (${percent}%)"></div>`;
    }).join('');

    const legend = document.getElementById('sets-legend');
    legend.innerHTML = setConfig.map(s => `
        <div class="legend-item">
            <div class="legend-dot" style="background: ${s.color};"></div>
            <span>${s.label}:</span>
            <span class="legend-count">${setCounts[s.id]}</span>
        </div>
    `).join('');

    // 3. Items Mini Bar Chart
    const itemContainer = document.getElementById('item-stats');
    const itemsSorted = Object.entries(itemCounts).sort((a,b) => b[1] - a[1]);
    const maxCount = itemsSorted.length > 0 ? itemsSorted[0][1] : 1;
    
    itemContainer.innerHTML = itemsSorted.map(([name, count]) => {
        const percent = (count / maxCount * 100).toFixed(1);
        return `
            <div class="item-bar-row">
                <div class="item-name-mini" title="${name}">${name}</div>
                <div class="item-bar-bg">
                    <div class="item-bar-fill" style="width: ${percent}%;"></div>
                </div>
                <div class="item-count-mini">${count}</div>
            </div>
        `;
    }).join('');
}

function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase().trim();
    const shipping = document.getElementById('filter-shipping').value;
    const setFilter = document.getElementById('filter-set').value;

    filteredUsers = allUsers.filter(user => {
        // Search Term Filter
        const matchTerm = (user.social_name || '').toLowerCase().includes(term) ||
                          (user.user_id || '').toLowerCase().includes(term);
        if (!matchTerm) return false;

        // Shipping Filter
        if (shipping !== 'all') {
            const deliveryType = user.shipping ? user.shipping.delivery_type : 'not_set';
            if (shipping === 'delivery' && deliveryType !== 'delivery') return false;
            if (shipping === 'onsite' && deliveryType !== 'onsite') return false;
        }

        // Giveaway Set Filter
        if (setFilter !== 'all') {
            const setVal = parseInt(setFilter);
            if (user.giveaway_set !== setVal) return false;
        }

        return true;
    });

    renderUsers(filteredUsers);
}

function renderUsers(users) {
    const tbody = document.getElementById('user-rows');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 100px; color: var(--text-muted); font-weight:800; background:none;">ไม่พบข้อมูลรายการ</td></tr>`;
        document.getElementById('tab-info-bar').innerText = `ไม่พบข้อมูลที่ต้องการค้นหา`;
        return;
    }

    const sorted = [...users].sort((a, b) => (a.social_name || '').localeCompare(b.social_name || ''));

    sorted.forEach(user => {
        const tr = document.createElement('tr');

        // Color Mapping
        const socialColors = { 
            'x': '#000000', 'X': '#000000', 
            'tiktok': '#ff0050', 'TikTok': '#ff0050', 
            'ig': 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', 'IG': 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', 
            'line': '#00b900', 'Line': '#00b900' 
        };
        const sColor = socialColors[user.social_type] || '#64748B';

        // Giveaway items
        const gifts = user.giftaway ? (user.giftaway.items || []) : [];
        const giftHtml = gifts.length > 0 
            ? gifts.map(g => `<div class="gift-item">${g}</div>`).join('') 
            : '<span style="color:#CBD5E1; font-size:0.75rem;">ไม่มีรายการ</span>';

        // Column 3: Workshop
        let workshopHtml = '<span style="color:#CBD5E1; font-size:0.75rem;">-</span>';
        if (user.workshop && user.workshop.has_workshop) {
            const total = user.workshop.total_rights || 0;
            const fromD = user.workshop.from_donate || 0;
            const fromS = user.workshop.from_direct || 0;
            workshopHtml = `
                <div class="ws-bubble">x${total}</div>
                <div class="ws-sources">
                    ${fromD > 0 ? `<span class="src">x${fromD} (โดเนท)</span>` : ''}
                    ${fromS > 0 ? `<span class="src">x${fromS} (ซื้อเอง)</span>` : ''}
                </div>
            `;
        }

        const deliveryType = user.shipping ? user.shipping.delivery_type : 'not_set';
        const isDelivery = deliveryType === 'delivery';
        const isOnsite = deliveryType === 'onsite';
        
        let pillHtml = '';
        if (isDelivery) {
            pillHtml = `<span class="shipping-pill pill-delivery">จัดส่ง</span>`;
        } else if (isOnsite) {
            pillHtml = `<span class="shipping-pill pill-onsite">รับหน้างาน</span>`;
        } else {
            pillHtml = `<span class="shipping-pill pill-none">ไม่ได้ระบุ</span>`;
        }

        let addressHtml = '-';
        if (isDelivery && user.shipping) {
            const s = user.shipping;
            addressHtml = `
                <div class="addr-group">
                    <div class="addr-top">
                        <b>${s.recipient_name || 'ไม่ระบุ'}</b> 
                        <span>${s.shipping_phone || ''}</span>
                    </div>
                    <div class="addr-text">${s.shipping_address || '-'} ${s.shipping_postal || ''}</div>
                    <button class="btn-copy-address" onclick="copyAddress('${user.user_id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        คัดลอกที่อยู่
                    </button>
                </div>
            `;
        } else if (isOnsite) {
            addressHtml = `<div style="color:#166534; font-weight:800; font-size:0.8rem;">รับหน้างาน (จามจุรีสแควร์)</div>`;
        } else {
            addressHtml = `<div style="color:#64748B; font-weight:600; font-size:0.8rem;">ยังไม่ได้เลือกวิธีรับของ</div>`;
        }

        tr.innerHTML = `
            <td>
                <div class="user-row-header">
                    <div class="social-badge" style="background:${sColor}">${(user.social_type || '?').substring(0, 1).toUpperCase()}</div>
                    <div class="user-main-info">
                        <span class="name">${user.social_name || 'ไม่พบนามแฝง'}</span>
                        <span class="uid">${user.user_id || '-'}</span>
                        <a href="profile.html?socialName=${encodeURIComponent(user.social_name || '')}&socialType=${encodeURIComponent(user.social_type || 'x')}" target="_blank" class="profile-link-btn">ดูข้อมูลเพิ่มเติม</a>
                    </div>
                </div>
            </td>
            <td><div class="gift-list">${giftHtml}</div></td>
            <td><div class="workshop-col-info">${workshopHtml}</div></td>
            <td style="font-weight: 800; color: var(--text-main);">฿${(user.donate ? user.donate.net_total : 0).toLocaleString()}</td>
            <td>${pillHtml}</td>
            <td>${addressHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('tab-info-bar').innerText = `พบรายชื่อทั้งหมด ${users.length} คน`;
}

function copyAddress(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user || !user.shipping) return;
    const s = user.shipping;
    const text = `${s.recipient_name || ''}\n${s.shipping_phone || ''}\n${s.shipping_address || ''} ${s.shipping_postal || ''}`;
    navigator.clipboard.writeText(text).then(() => showToast('คัดลอกที่อยู่สำเร็จ'));
}

function exportToExcel() {
    if (!filteredUsers || filteredUsers.length === 0) {
        showToast('ไม่มีข้อมูลที่จะส่งออก');
        return;
    }

    try {
        const onsiteUsers = filteredUsers
            .filter(u => u.shipping && u.shipping.delivery_type === 'onsite')
            .sort((a, b) => (a.social_name || '').localeCompare(b.social_name || ''));
            
        const deliveryUsers = filteredUsers
            .filter(u => u.shipping && u.shipping.delivery_type === 'delivery')
            .sort((a, b) => (a.social_name || '').localeCompare(b.social_name || ''));

        const mapUser = (u, index, isDelivery) => {
            const banks = u.banks || [];
            const gifts = u.giftaway ? (u.giftaway.items || []) : [];
            const shipping = u.shipping || {};

            const baseData = {
                'No.': index + 1,
                'ชื่อ Account': u.social_name || '',
                'Social': u.social_type || '',
                'ชื่อบัญชีโอนเงิน': banks.length > 0 ? (banks[0].name || '') : '',
                'ยอดโดเนท': u.donate ? u.donate.net_total : 0,
                'ยอดซื้อWorkshop': u.workshop ? u.workshop.total_amount : 0,
                'A6 Sticker': gifts.includes('A6 Sticker') ? '✓' : '-',
                'UV Sticker': gifts.includes('UV Sticker') ? '✓' : '-',
                'Clear Plastic Purse': gifts.includes('Clear Plastic Purse') ? '✓' : '-',
                'Acrylic Frame': gifts.includes('Acrylic Frame') ? '✓' : '-',
                'Light Sign Strap': gifts.includes('Light Sign Strap') ? '✓' : '-',
                'Workshop': u.workshop ? (u.workshop.total_rights || 0) : 0
            };

            if (isDelivery) {
                return {
                    ...baseData,
                    'ข้อมูลจัดส่ง': `ชื่อผู้รับ : ${shipping.recipient_name || '-'}\nที่อยู่ : ${shipping.shipping_address || '-'} ${shipping.shipping_postal || ''}\nเบอร์โทร : ${shipping.shipping_phone || '-'}`
                };
            }
            return baseData;
        };

        const onsiteData = onsiteUsers.map((u, i) => mapUser(u, i, false));
        const deliveryData = deliveryUsers.map((u, i) => mapUser(u, i, true));

        const workbook = XLSX.utils.book_new();

        if (onsiteData.length > 0) {
            const wsOnsite = XLSX.utils.json_to_sheet(onsiteData);
            wsOnsite['!cols'] = [
                { wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
                { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
            ];
            XLSX.utils.book_append_sheet(workbook, wsOnsite, "รับหน้างาน");
        }

        if (deliveryData.length > 0) {
            const wsDelivery = XLSX.utils.json_to_sheet(deliveryData);
            
            // Enable wrap text for shipping info
            const range = XLSX.utils.decode_range(wsDelivery['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: 12 }); // Column 12 is 'ข้อมูลจัดส่ง'
                if (wsDelivery[cellRef]) {
                    if (!wsDelivery[cellRef].s) wsDelivery[cellRef].s = {};
                    wsDelivery[cellRef].s.alignment = { wrapText: true, vertical: 'top' };
                }
            }

            wsDelivery['!cols'] = [
                { wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
                { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
                { wch: 60 } // ข้อมูลจัดส่ง width
            ];
            XLSX.utils.book_append_sheet(workbook, wsDelivery, "จัดส่ง");
        }

        if (onsiteData.length === 0 && deliveryData.length === 0) {
            showToast('ไม่พบข้อมูลที่แยกตามประเภทการรับของ');
            return;
        }

        const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
        XLSX.writeFile(workbook, `NexT1DE_Admin_Summary_${dateStr}.xlsx`);
        showToast('ส่งออก Excel สำเร็จ');
    } catch (err) {
        console.error('Export Error:', err);
        showToast('เกิดข้อผิดพลาดในการส่งออก');
    }
}

function showLoading(active) {
    // Disabled as per user request to not show loading message/screen
    /*
    const modal = document.getElementById('loader-modal');
    if (modal) {
        modal.style.display = active ? 'flex' : 'none';
    }
    */
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 2500);
}
