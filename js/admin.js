/* ================================================
   MediCare Hub - Admin Dashboard Logic
   Platform management and analytics
   ================================================ */

document.addEventListener('DOMContentLoaded', function() {
  initializeAdminDashboard();
});

// Global state
let lastOrderCount = -1;

function initializeAdminDashboard() {
  // Init notifications
  MediCareNotifications.init();

  // Check if admin is logged in
  if (!MediCareData.isAdminLoggedIn()) {
    window.location.href = '../login.html';
    return;
  }
  
  // Set admin name (if element exists)
  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) {
    adminNameEl.textContent = 'Administrator';
  }
  
  // Load dashboard data
  loadAnalytics();
  loadStores();
  loadOrders();
  loadRejectionAnalytics();
  
  // Real-time updates (Storage Event)
  window.addEventListener('storage', (e) => {
    if (e.key === 'medicare_orders' || e.key === 'medicare_stores') {
       refreshDashboardData();
    }
  });

  // Polling for robust real-time (every 2 seconds)
  setInterval(() => {
    refreshDashboardData(true); // true = silent update (no duplicate badges)
  }, 2000);

  // Initial Badge Check
  updateNotificationBadge();
}

function refreshDashboardData(silent = false) {
    const orders = MediCareData.getOrders();
    const stores = MediCareData.getStores();
    
    // Check for new orders
    if (lastOrderCount !== -1 && orders.length > lastOrderCount) {
       if (!silent) {
           MediCareNotifications.show('New Order Received!', 'Check the orders list.', 'info');
       }
       // Update Badge
       updateNotificationBadge();
    }
    
    // Only update if data changed (optimization could go here, but for now we reload)
    // In a real app we would diff the data. For now, we trust the browser render speed.
    // However, to avoid flickering inputs (not present here), we can just wipe and redraw.
    
    // Update internal counters
    if (orders.length !== lastOrderCount) {
         lastOrderCount = orders.length;
         loadOrders();
         loadRejectionAnalytics();
         loadAnalytics();
    }
    
    // For stores, we don't have a change tracker yet, so we just reload if needed.
    // Or we can just reload every time for "fully realtime".
    // Let's reload everything to be safe as per user request.
    loadStores(); 
    loadAnalytics();
}

// Deprecated separate storage listener, moved to unified refreshDashboardData
// to handle both polling and events consistently.

function updateNotificationBadge() {
  const badge = document.getElementById('notiBadge');
  if (badge) {
     const notis = MediCareData.getUserNotifications('admin', 'admin');
     const unread = notis.filter(n => !n.read).length;
     
     if (unread > 0) {
       badge.style.display = 'flex'; // Changed to flex to center content
       badge.textContent = unread > 99 ? '99+' : unread;
     } else {
       badge.style.display = 'none';
     }
  }
}

function loadAnalytics() {
  const analytics = MediCareData.getAnalytics();
  
  // Store stats
  document.getElementById('totalStores').textContent = analytics.stores.total;
  document.getElementById('verifiedStores').textContent = analytics.stores.verified;
  document.getElementById('activeStores').textContent = analytics.stores.active;
  
  // Order stats
  document.getElementById('totalOrders').textContent = analytics.orders.total;
  document.getElementById('pendingOrders').textContent = analytics.orders.pending;
  document.getElementById('acceptedOrders').textContent = analytics.orders.accepted;
  document.getElementById('deliveredOrders').textContent = analytics.orders.delivered;
  document.getElementById('rejectedOrders').textContent = analytics.orders.rejected;
}

function loadStores() {
  const stores = MediCareData.getStores();
  const tableBody = document.getElementById('storesTableBody');
  
  // Calculate Revenue (Mock: Delivered * ₹450)
  const allOrders = MediCareData.getOrders();
  
  tableBody.innerHTML = stores.map(store => {
    // Filter orders for this store
    const storeDeliveredOrders = allOrders.filter(o => o.storeId === store.id && o.status === 'delivered');
    // Calculate simple revenue
    const revenue = storeDeliveredOrders.length * 450;
    
    return `
    <tr>
      <td>
        <strong style="color: var(--gray-900);">${store.name}</strong>
      </td>
      <td>${store.area}, ${store.city}</td>
      <td>
        <span style="font-weight: 600; color:var(--primary-dark);">₹${revenue.toLocaleString('en-IN')}</span>
      </td>
      <td>
        <span class="status-badge ${store.isOpen ? 'status-accepted' : 'status-rejected'}">
          ${store.isOpen ? 'Open' : 'Closed'}
        </span>
      </td>
      <td>
        <span style="color: ${store.isVerified ? 'var(--success)' : 'var(--gray-400)'};">
          ${store.isVerified ? '✓ Verified' : '○ Pending'}
        </span>
      </td>
      <td>
        <span style="color: ${store.deliveringToday ? 'var(--success)' : 'var(--gray-400)'};">
          ${store.deliveringToday ? '✓ Yes' : '○ No'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          ${!store.isVerified ? `<button class="table-btn table-btn-accept" onclick="verifyStore(${store.id})">Verify</button>` : ''}
          <button class="table-btn table-btn-view" onclick="toggleStoreStatus(${store.id}, ${!store.isOpen})">${store.isOpen ? 'Close' : 'Open'}</button>
          <button class="table-btn table-btn-reject" onclick="deleteStore(${store.id})">Delete</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

function loadOrders() {
  const orders = MediCareData.getOrders();
  
  if (lastOrderCount === -1) lastOrderCount = orders.length;

  const tableBody = document.getElementById('ordersTableBody');
  const emptyState = document.getElementById('emptyOrdersState');
  
  if (orders.length === 0) {
    tableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Sort by date (newest first)
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  tableBody.innerHTML = orders.map(order => {
    const orderType = order.orderType === 'urgent' ? '🚨 Urgent' : '📋 Request';
    const timeAgo = getTimeAgo(order.createdAt);
    
    return `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.storeName}</td>
        <td>${orderType}</td>
        <td>
          <span class="status-badge status-${order.status}">
            ${capitalizeFirst(order.status)}
          </span>
        </td>
        <td style="color: var(--gray-500); font-size: var(--font-size-sm);">${timeAgo}</td>
        <td style="color: ${order.rejectionReason ? 'var(--error)' : 'var(--gray-400)'};">
          ${order.rejectionReason || '—'}
        </td>
      </tr>
    `;
  }).join('');
}

function loadRejectionAnalytics() {
  const analytics = MediCareData.getAnalytics();
  const container = document.getElementById('rejectionAnalytics');
  
  const reasons = analytics.rejectionReasons;
  const reasonKeys = Object.keys(reasons);
  
  if (reasonKeys.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500);">No rejection data available yet</p>';
    return;
  }
  
  // Sort by count
  reasonKeys.sort((a, b) => reasons[b] - reasons[a]);
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      ${reasonKeys.map(reason => {
        const count = reasons[reason];
        const maxCount = Math.max(...Object.values(reasons));
        const percentage = (count / maxCount) * 100;
        
        return `
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
              <span style="color: var(--gray-700);">${reason}</span>
              <span style="color: var(--gray-500); font-weight: 600;">${count}</span>
            </div>
            <div style="height: 8px; background: var(--gray-200); border-radius: var(--radius-full); overflow: hidden;">
              <div style="height: 100%; width: ${percentage}%; background: var(--error); border-radius: var(--radius-full);"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Store Actions
function verifyStore(storeId) {
  MediCareData.updateStoreStatus(storeId, { isVerified: true });
  loadStores();
  loadAnalytics();
  showToast('Store verified successfully!', 'success');
}

function toggleStoreStatus(storeId, newStatus) {
  MediCareData.updateStoreStatus(storeId, { isOpen: newStatus });
  loadStores();
  loadAnalytics();
  showToast(`Store ${newStatus ? 'opened' : 'closed'} successfully!`, 'info');
}

function deleteStore(storeId) {
  MediCareAlerts.confirm(
    'Delete Store',
    'Are you sure you want to delete this store? This action cannot be undone.',
    'Delete',
    'Cancel',
    () => {
        MediCareData.deleteStore(storeId);
        loadStores();
        loadAnalytics();
        MediCareNotifications.show('Store Deleted', 'The store has been removed.', 'warning');
    }
  );
}

// Add Store Modal
function openAddStoreModal() {
  document.getElementById('addStoreModal').classList.add('active');
}

function closeAddStoreModal() {
  document.getElementById('addStoreModal').classList.remove('active');
  document.getElementById('newStoreName').value = '';
  document.getElementById('newStoreArea').value = '';
  document.getElementById('newStoreWhatsapp').value = '';
}

function addNewStore() {
  const name = document.getElementById('newStoreName').value.trim();
  const area = document.getElementById('newStoreArea').value.trim();
  const whatsapp = document.getElementById('newStoreWhatsapp').value.trim();
  
  if (!name || !area || !whatsapp) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  MediCareData.addNewStore({
    name: name,
    area: area,
    whatsapp: whatsapp
  });
  
  closeAddStoreModal();
  loadStores();
  loadAnalytics();
  showToast('Store added successfully!', 'success');
}

// Section Navigation
function showSection(section) {
  // This could be expanded for full SPA navigation
  // For now, just scroll to section
  const element = document.getElementById(section + 'Section');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

// Utility functions
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `ai-message ${type}`;
  toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 2000; max-width: 350px; box-shadow: var(--shadow-xl);';
  
  const iconSvg = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  toast.innerHTML = `
    <div class="ai-message-icon">${iconSvg[type]}</div>
    <div class="ai-message-content">
      <h4>${message}</h4>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});

// Notification History UI
function showNotifications() {
  const notis = MediCareData.getUserNotifications('admin', 'admin');
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 10001;
    display: flex; justify-content: flex-end;
  `;
  
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  
  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 350px; background: white; height: 100%;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    display: flex; flex-direction: column;
    animation: slideInRight 0.3s ease-out;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = 'padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
  header.innerHTML = '<h3 style="margin:0;">Notifications</h3><button style="border:none;background:none;font-size:20px;cursor:pointer;" onclick="this.closest(\'div\').parentElement.parentElement.remove()">×</button>';
  
  const list = document.createElement('div');
  list.style.cssText = 'flex: 1; overflow-y: auto; padding: 0;';
  
  if (notis.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No notifications</div>';
  } else {
    list.innerHTML = notis.map(n => `
      <div style="padding: 15px 20px; border-bottom: 1px solid #f5f5f5; background: ${n.read ? 'white' : '#f0f9ff'}; position: relative;">
        <button onclick="MediCareData.deleteNotification('${n.id}'); this.closest('div').remove();" style="position: absolute; top: 10px; right: 10px; border: none; background: none; cursor: pointer; color: #999; font-size: 18px; line-height: 1;">&times;</button>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 5px; padding-right: 20px; color: ${n.type === 'error' ? 'red' : '#333'}">${n.title}</div>
        <div style="font-size: 13px; color: #555; line-height: 1.4;">${n.message}</div>
        <div style="font-size: 11px; color: #999; margin-top: 8px;">${new Date(n.createdAt).toLocaleString()}</div>
      </div>
    `).join('');
    
    // Mark all as read
    notis.forEach(n => MediCareData.markNotificationRead(n.id));
    
    // Update badge status
    updateNotificationBadge();
  }
  
  panel.appendChild(header);
  panel.appendChild(list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

window.showNotifications = showNotifications;

// Export functions for global access
window.verifyStore = verifyStore;
window.toggleStoreStatus = toggleStoreStatus;
window.deleteStore = deleteStore;
window.openAddStoreModal = openAddStoreModal;
window.closeAddStoreModal = closeAddStoreModal;
window.addNewStore = addNewStore;
window.showSection = showSection;
