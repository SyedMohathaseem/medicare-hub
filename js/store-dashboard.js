/* ================================================
   MediCare Hub - Store Dashboard Logic
   Order management for medical stores
   ================================================ */

let currentStoreId = null;
let lastOrderCount = -1;

document.addEventListener('DOMContentLoaded', function() {
  initializeStoreDashboard();
  
  // Request notification permission
  if ('Notification' in window) {
    Notification.requestPermission();
  }
});

function initializeStoreDashboard() {
  MediCareNotifications.init();
  // Check if logged in
  currentStoreId = MediCareData.getLoggedInStore();
  
  if (!currentStoreId) {
    window.location.href = '../login.html';
    return;
  }
  
  // Load store info using sync localStorage
  const stores = MediCareData.getLocalStores();
  const store = stores.find(s => s.id === parseInt(currentStoreId));
  if (store) {
    document.getElementById('storeName').textContent = store.name + ' Dashboard';
  } else {
    document.getElementById('storeName').textContent = 'Store Dashboard';
  }
  
  // Load orders
  loadOrders();
  
  // Real-time updates - polling every 2 seconds
  setInterval(() => {
    loadOrders();
  }, 2000);
  
  // Also listen for storage events
  window.addEventListener('storage', (e) => {
    if (e.key === 'medicare_orders') {
      loadOrders();
    }
    if (e.key === 'medicare_notis_data') {
       updateStoreBadge();
    }
  });
}

function loadOrders() {
  // Use sync localStorage for reliable data
  const allOrders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
  const orders = allOrders.filter(o => o.storeId === parseInt(currentStoreId));
  
  // Check for new orders
  if (lastOrderCount !== -1 && orders.length > lastOrderCount) {
    // Show in-app notification
    MediCareNotifications.show('New Order Received! 🛍️', 'A new order needs your attention.');
    
    // Trigger browser push notification
    showPushNotification();
  }
  lastOrderCount = orders.length;
  
  // Update Badge
  updateStoreBadge();

  const tableBody = document.getElementById('ordersTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (!tableBody) return;
  
  // Update stats
  updateStats(orders);
  
  // Check if no orders
  if (orders.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  // Sort orders by date (newest first)
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Render orders
  tableBody.innerHTML = orders.map(order => createOrderRow(order)).join('');
}

function updateStats(orders) {
  const pending = orders.filter(o => o.status === 'pending').length;
  const accepted = orders.filter(o => o.status === 'accepted').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  
  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('acceptedCount').textContent = accepted;
  document.getElementById('deliveredCount').textContent = delivered;
  document.getElementById('totalCount').textContent = orders.length;
}

function createOrderRow(order) {
  const statusClass = getStatusClass(order.status);
  const statusText = capitalizeFirst(order.status);
  const timeAgo = getTimeAgo(order.createdAt);
  const aiHint = order.aiVerification ? '✓ Verified' : 'Pending';
  const orderType = order.orderType === 'urgent' ? '🚨 Urgent' : '📋 Request';
  
  let actionsHtml = '';
  
  if (order.status === 'pending') {
    actionsHtml = `
      <button class="table-btn table-btn-accept" onclick="acceptOrder('${order.id}')">Accept</button>
      <button class="table-btn table-btn-reject" onclick="openRejectModal('${order.id}')">Reject</button>
    `;
  } else if (order.status === 'accepted') {
    actionsHtml = `
      <button class="table-btn table-btn-accept" onclick="markDelivered('${order.id}')">Mark Delivered</button>
    `;
  } else {
    actionsHtml = `<span style="color: var(--gray-400);">—</span>`;
  }
  
  return `
    <tr>
      <td>
        <strong style="color: var(--gray-900);">${order.id}</strong>
      </td>
      <td>
        <img src="${order.imageData}" alt="Order" class="order-image-thumb" onclick="viewImage('${order.id}')" style="cursor: pointer;">
      </td>
      <td>${orderType}</td>
      <td>
        <div style="max-width: 200px; min-width: 150px;">
          <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 4px;">📞 ${order.phone || 'N/A'}</div>
          <div style="font-size: 0.8em; color: var(--gray-500); line-height: 1.4; word-break: break-word; overflow-wrap: break-word;">📍 ${order.address || 'N/A'}</div>
        </div>
      </td>
      <td>
        <span style="color: ${order.aiVerification ? 'var(--success)' : 'var(--warning)'};">
          ${aiHint}
        </span>
      </td>
      <td>
        <span class="status-badge status-${order.status}">${statusText}</span>
      </td>
      <td style="color: var(--gray-500); font-size: var(--font-size-sm);">${timeAgo}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn table-btn-view" onclick="viewImage('${order.id}')">View</button>
          ${actionsHtml}
        </div>
      </td>
    </tr>
  `;
}

function getStatusClass(status) {
  const classes = {
    'pending': 'status-pending',
    'accepted': 'status-accepted',
    'delivered': 'status-delivered',
    'rejected': 'status-rejected'
  };
  return classes[status] || 'status-pending';
}

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

// Order Actions
async function acceptOrder(orderId) {
  await MediCareData.updateOrderStatus(orderId, 'accepted');
  loadOrders();
  showToast('Order accepted successfully!', 'success');
}

async function markDelivered(orderId) {
  await MediCareData.updateOrderStatus(orderId, 'delivered');
  loadOrders();
  showToast('Order marked as delivered!', 'success');
}

function openRejectModal(orderId) {
  document.getElementById('rejectOrderId').value = orderId;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectModal').classList.add('active');
}

function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('active');
}

async function confirmReject() {
  const orderId = document.getElementById('rejectOrderId').value;
  const reason = document.getElementById('rejectReason').value;
  
  if (!reason) {
    showToast('Please select a rejection reason', 'error');
    return;
  }
  
  // Update order status
  await MediCareData.updateOrderStatus(orderId, 'rejected', reason);
  
  // Get order for WhatsApp (Needs fetch again or from local, getOrderById is Async now)
  const order = await MediCareData.getOrderById(orderId);
  if (order) {
    // Generate rejection WhatsApp message
    const message = MediCareData.createRejectionWhatsAppMessage(order, reason);
    const whatsappLink = MediCareData.generateWhatsAppLink(order.storeWhatsapp, message);
    
    // Open WhatsApp (optional - uncomment if needed)
    // window.open(whatsappLink, '_blank');
  }
  
  closeRejectModal();
  loadOrders();
  showToast('Order rejected', 'warning');
}

// Image Modal
async function viewImage(orderId) {
  const order = await MediCareData.getOrderById(orderId);
  if (order) {
    document.getElementById('modalImage').src = order.imageData;
    
    if (order.note) {
      document.getElementById('orderNote').style.display = 'block';
      document.getElementById('noteText').textContent = order.note;
    } else {
      document.getElementById('orderNote').style.display = 'none';
    }
    
    document.getElementById('imageModal').classList.add('active');
  }
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});

// Toast notification
function showToast(message, type = 'info') {
  // Create toast element
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
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Custom Push Notification
function showPushNotification() {
  const title = "New Order Received! 🛍️";
  const options = {
    body: "A new order needs your attention.",
    icon: "../logo.png"
  };
  
  // Browser Notification
  if ('Notification' in window) {
    if (Notification.permission === "granted") {
      new Notification(title, options);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, options);
        }
      });
    }
  }
  
  // In-app visual notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 9999;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.5s ease-out;
    opacity: 1;
    transition: opacity 0.5s;
  `;
  toast.innerHTML = `<span>🔔</span> New Order Received!`;
  document.body.appendChild(toast);
  
  // Audio Alert (Beep)
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Audio might fail if no interaction
  }
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Notification History UI
function showNotifications() {
  const notis = MediCareData.getUserNotifications('store', MediCareData.getLoggedInStore());
  
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
    
    // Update Badge
    updateStoreBadge();
  }
  
  panel.appendChild(header);
  panel.appendChild(list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

function updateStoreBadge() {
  const storeId = MediCareData.getLoggedInStore();
  if (!storeId) return;

  const notis = MediCareData.getUserNotifications('store', storeId);
  const unread = notis.filter(n => !n.read).length;
  const badge = document.getElementById('storeNotiBadge');
  
  if (badge) {
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread > 99 ? '99+' : unread;
    } else {
      badge.style.display = 'none';
    }
  }
}

window.showNotifications = showNotifications;

// Export functions for global access
window.acceptOrder = acceptOrder;
window.markDelivered = markDelivered;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.confirmReject = confirmReject;
window.viewImage = viewImage;
window.closeImageModal = closeImageModal;
