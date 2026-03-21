/* --- Admin Dashboard Logic --- */

let allUsers = [];
let filteredUsers = [];

const STATUS_OPTIONS = [
    { value: 0, label: "อยู่ในช่วงกิจกรรม", class: "status-0" },
    { value: 1, label: "ยืนยันตัวตนแล้ว", class: "status-1" },
    { value: 2, label: "เตรียมพัสดุ", class: "status-2" },
    { value: 3, label: "รอส่ง", class: "status-3" },
    { value: 4, label: "ส่งแล้ว", class: "status-4" },
    { value: 5, label: "ได้รับแล้ว", class: "status-5" }
];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // Setup Filters
    const searchInp = document.getElementById('search-input');
    const actFilt = document.getElementById('filter-activity');
    const shipFilt = document.getElementById('filter-shipping');

    const handleFilter = () => {
        const term = searchInp.value.toLowerCase().trim();
        const activity = actFilt.value;
        const shipping = shipFilt.value;
        filterUsers(term, activity, shipping);
    };

    searchInp.addEventListener('input', handleFilter);
    actFilt.addEventListener('change', handleFilter);
    shipFilt.addEventListener('change', handleFilter);
});

async function fetchData() {
    showLoading(true);
    try {
        const url = `${API_CONFIG.BASE_URL}?action=getAdminSummary`;

        const response = await fetch(url, {
            method: 'GET'
        });

        const data = await response.json();

        if (data.status === 'ok') {
            allUsers = data.users;
            updateStats(data.summary);
            renderUsers(allUsers);
        } else {
            console.error('Error fetching data:', data.message);
            alert('ไม่สามารถโหลดข้อมูลได้: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Fetch error:', err);
        // Fallback for demonstration if script is not deployed
    } finally {
        showLoading(false);
    }
}

function updateStats(summary) {
    document.getElementById('stat-total-users').innerText = summary.total_users;
    document.getElementById('stat-total-net').innerText = `฿${summary.total_net_donate.toLocaleString('th-TH')}`;
    document.getElementById('stat-total-workshop').innerText = summary.total_workshop_users;

    const deliveryCount = summary.shipping_breakdown.delivery || 0;
    const onsiteCount = summary.shipping_breakdown.onsite || 0;
    document.getElementById('stat-shipping-ratio').innerText = `${deliveryCount} D / ${onsiteCount} O`;
}

function renderUsers(users) {
    const tbody = document.getElementById('user-rows');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');

        // Social Badge Class
        const socialClass = `social-${user.social_type.toLowerCase()}`;
        const socialChar = user.social_type.toUpperCase().substring(0, 1);

        // Gifts list (Bullet style)
        const giftItems = user.giftaway.items || [];
        const giftHtml = giftItems.map(item => `<div style="display:flex; align-items:flex-start; gap:6px; font-size: 0.74rem; margin-bottom:3px; color:#475569; line-height:1.3;"><span style="color:var(--primary-blue); font-size:1.1rem; line-height:0.8;">•</span> ${item}</div>`).join('');

        // Shipping Icon/Text
        const isDelivery = user.shipping.delivery_type === 'delivery';
        const shipLabel = isDelivery ? 'จัดส่ง' : 'หน้างาน';
        const shipClass = isDelivery ? 'pill-delivery' : 'pill-onsite';

        // Address Content
        let addressHtml = '-';
        if (isDelivery) {
            const addr = user.shipping;
            addressHtml = `
                <div class="address-info" id="addr-${user.user_id}">
                    <strong>${addr.recipient_name || 'ไม่ระบุ'}</strong><br>
                    T: ${addr.shipping_phone || '-'}<br>
                    ${addr.shipping_address || '-'} ${addr.shipping_postal || ''}
                    <button class="btn-copy-address" onclick="copyAddress('${user.user_id}')">
                        คัดลอกที่อยู่
                    </button>
                </div>
            `;
        }

        // Status Status dropdown
        // (Use localStorage or default for now since API doesn't provide status)
        const savedStatus = localStorage.getItem(`status-${user.user_id}`) || 0;

        // Activity badges
        const activities = [];
        if (user.donate.count > 0) activities.push(`<span class="gift-tag" style="background:#EBF8FF; color:#2B6CB0; border-color:#BEE3F8;">โดเนท (${user.donate.count})</span>`);
        if (user.workshop.has_workshop) activities.push(`<span class="gift-tag" style="background:#F0FFF4; color:#2F855A; border-color:#C6F6D5;">Workshop (${user.workshop.total_rights})</span>`);
        const activityHtml = activities.join('');

        tr.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="social-badge ${socialClass}">${socialChar}</div>
                    <div>
                        <div class="user-name">${user.social_name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">${user.user_id}</div>
                        <a href="profile.html?socialName=${encodeURIComponent(user.social_name)}&socialType=${encodeURIComponent(user.social_type)}" target="_blank" style="text-decoration:none; display: inline-flex; font-size: 0.65rem; color: var(--primary-blue); font-weight: 700; border: 1px solid var(--primary-blue); padding: 1px 8px; border-radius: 50px; background: rgba(79, 70, 229, 0.05); transition: 0.2s;" onmouseover="this.style.background='var(--primary-blue)'; this.style.color='white'" onmouseout="this.style.background='rgba(79, 70, 229, 0.05)'; this.style.color='var(--primary-blue)'" title="ดูโปรไฟล์">
                            ดูข้อมูล
                        </a>
                    </div>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${activityHtml}
                </div>
            </td>
            <td>
                <div class="gift-tags">${giftHtml}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">
                    ${user.giftaway.qualified ? '✅ Qualify ' + user.giftaway.tier_min : '❌ Not Qualify'}
                </div>
            </td>
            <td style="font-weight: 800; color: var(--primary-blue);">฿${user.donate.net_total.toLocaleString('th-TH')}</td>
            <td style="text-align: center;">
                <span style="font-weight: 800; font-size: 1rem;">${user.workshop.total_rights} สิทธิ์</span>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">
                    โดเนท ${user.workshop.from_donate} / ซื้อ ${user.workshop.from_direct}
                </div>
            </td>
            <td>
                <div class="shipping-pill ${shipClass}">
                    ${shipLabel}
                </div>
            </td>
            <td>${addressHtml}</td>
            <td>
                <select class="status-select status-${savedStatus}" onchange="changeStatus(this, '${user.user_id}')">
                    ${STATUS_OPTIONS.map(opt => `
                        <option value="${opt.value}" class="${opt.class}" ${opt.value == savedStatus ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('count-filtered').innerText = `พบ ${users.length} คน`;
}

function filterUsers(term, activity = 'all', shipping = 'all') {
    filteredUsers = allUsers.filter(user => {
        // 1. Search term (by social name or user id)
        const matchTerm = user.social_name.toLowerCase().includes(term) ||
            user.user_id.toLowerCase().includes(term);
        if (!matchTerm) return false;

        // 2. Activity filter
        if (activity === 'donate' && !(user.donate.count > 0)) return false;
        if (activity === 'workshop' && !user.workshop.has_workshop) return false;
        if (activity === 'both' && !(user.donate.count > 0 && user.workshop.has_workshop)) return false;

        // 3. Shipping method filter
        if (shipping === 'delivery' && user.shipping.delivery_type !== 'delivery') return false;
        if (shipping === 'onsite' && user.shipping.delivery_type !== 'onsite') return false;

        return true;
    });
    renderUsers(filteredUsers);
}

function changeStatus(select, userId) {
    const val = select.value;
    localStorage.setItem(`status-${userId}`, val);

    // Update class for styling
    select.className = `status-select status-${val}`;

    showToast(`Status updated for ${userId}`);
}

function copyAddress(userId) {
    const user = allUsers.find(u => u.user_id === userId);
    if (!user) return;

    const addr = user.shipping;
    const textToCopy = [
        addr.recipient_name,
        addr.shipping_phone,
        addr.shipping_address,
        addr.shipping_postal
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Address copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

function showLoading(active) {
    document.getElementById('loading').style.display = active ? 'flex' : 'none';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.transform = 'translateX(-50%) translateY(0px)';

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2500);
}

