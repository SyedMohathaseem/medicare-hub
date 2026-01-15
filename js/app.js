/* ================================================
   MediCare Hub - Main Application Logic
   Store listing and navigation
   ================================================ */

document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  // Load stores on page load
  loadStores();
  
  // Setup search functionality
  setupSearch();
}

// Load and display stores with Stale-While-Revalidate
async function loadStores(searchQuery = '') {
  const storesGrid = document.getElementById('storesGrid');
  const noResults = document.getElementById('noResults');
  const template = document.getElementById('storeCardTemplate');
  
  if (!storesGrid || !template) return;

  // 1. Initial Render from Local Cache (Instant)
  if (!searchQuery) {
     const localStores = MediCareData.getLocalStores();
     if (localStores.length > 0) {
        renderStores(localStores, storesGrid, template, noResults);
     }
  }

  // 2. Fetch Fresh Data (Async)
  try {
    let stores = [];
    if (searchQuery) {
      stores = await MediCareData.searchStores(searchQuery);
    } else {
      stores = await MediCareData.getStores();
    }
    
    // 3. Re-render with fresh data
    renderStores(stores, storesGrid, template, noResults);
    
  } catch (error) {
    console.error("Failed to load stores:", error);
    if (!storesGrid.hasChildNodes()) {
         storesGrid.innerHTML = '<p class="text-center">Failed to load stores. Please try again.</p>';
    }
  }
}

function renderStores(stores, container, template, noResultsElement) {
  // Clear existing cards
  container.innerHTML = '';
  
  // Show/hide no results message
  if (stores.length === 0) {
    noResultsElement.style.display = 'block';
    return;
  } else {
    noResultsElement.style.display = 'none';
  }
  
  // Create store cards
  stores.forEach(store => {
    const card = createStoreCard(store, template);
    container.appendChild(card);
  });
}

// Create a single store card from template
function createStoreCard(store, template) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector('.store-card');
  
  // Set store ID
  card.dataset.storeId = store.id;
  
  // Set store name
  card.querySelector('.store-name').textContent = store.name;
  
  // Set area
  card.querySelector('.area-text').textContent = `${store.area}, ${store.city}`;
  
  // Set status
  const statusContainer = card.querySelector('.store-status');
  const statusText = card.querySelector('.status-text');
  
  if (store.isOpen) {
    statusContainer.classList.add('open');
    statusText.textContent = 'Open Now';
  } else {
    statusContainer.classList.add('closed');
    statusText.textContent = 'Closed';
  }
  
  // Set badges
  const badgesContainer = card.querySelector('.store-badges');
  
  // Free Delivery badge
  const deliveryBadge = document.createElement('span');
  deliveryBadge.className = 'badge badge-delivery';
  deliveryBadge.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
    Free Delivery
  `;
  badgesContainer.appendChild(deliveryBadge);
  
  // Disable button if store is closed
  const selectBtn = card.querySelector('.select-store-btn');
  if (!store.isOpen) {
    selectBtn.disabled = true;
    selectBtn.classList.remove('btn-primary');
    selectBtn.classList.add('btn-secondary');
    selectBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      Currently Closed
    `;
  }
  
  // Add click handler for selection
  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (store.isOpen) {
      selectStore(store.id);
    }
  });
  
  // Also make entire card clickable
  card.addEventListener('click', () => {
    if (store.isOpen) {
      selectStore(store.id);
    }
  });
  
  return clone;
}

// Handle store selection
function selectStore(storeId) {
  // Check if user is logged in
  if (!MediCareData.isUserLoggedIn()) {
    // Check if already in guest mode
    const isGuest = sessionStorage.getItem('medicare_guest_mode') === 'true';
    
    if (!isGuest) {
      // Save intended store for after login
      sessionStorage.setItem('medicare_redirect_store', storeId);
      // Show login modal
      showLoginModal();
      return;
    }
  }
  
  // Store the selected store ID in session
  MediCareData.setCurrentStore(storeId);
  
  // Navigate to store detail page
  window.location.href = `store.html?id=${storeId}`;
}

// Show login modal
// Notification History UI for Website
window.showUserNotifications = async function() {
  const user = await MediCareData.getLoggedInUser();
  if (!user) {
    MediCareAlerts.confirm(
       'Login Required',
       'Please login to view your notifications history.',
       'Login Now',
       'Cancel',
       () => { window.location.href = 'login.html'; }
    );
    return;
  }
  
  const notis = MediCareData.getUserNotifications('user', user.phone);
  
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
  header.innerHTML = '<h3 style="margin:0;">My Alerts</h3><button style="border:none;background:none;font-size:20px;cursor:pointer;" onclick="this.closest(\'div\').parentElement.parentElement.remove()">×</button>';
  
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
  }
  
  panel.appendChild(header);
  panel.appendChild(list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// Show login modal
function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('storeSearch');
  
  if (!searchInput) return;
  
  let debounceTimer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      loadStores(query);
    }, 300);
  });
  
  // Clear search on Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      loadStores();
    }
  });
}

// Utility: Get URL parameter
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Real-time updates for Customer
function setupRealtimeNotifications() {
  // Check initial state
  updateCustomerBadge();

  window.addEventListener('storage', (e) => {
    // If orders update, check if one of OUR orders changed status
    if (e.key === 'medicare_orders' || e.key === 'medicare_notis_data') {
       updateCustomerBadge();
       
       // Note: System notification for specific order status change is handled in data.js 
       // inside updateOrderStatus > addNotification. 
       // However, that only runs on the tab that triggered the update (Admin/Store).
       // We need to catch it here if we want to notify the user when they are just viewing.
       
       // Actually, data.js addNotification writes to localStorage.
       // We can detect new notification here.
    }
  });
}

// Track last notification count to trigger sound/system noti on incoming
let lastCustomerNotiCount = -1;

async function updateCustomerBadge() {
  const user = await MediCareData.getLoggedInUser();
  if (!user) return;

  const notis = MediCareData.getUserNotifications('user', user.phone);
  
  // Check for new notifications to trigger alert
  if (lastCustomerNotiCount !== -1 && notis.length > lastCustomerNotiCount) {
    const latest = notis[0]; // Assuming sorted desc
    if (latest && !latest.read) {
        MediCareNotifications.show(latest.title, latest.message, latest.type);
    }
  }
  lastCustomerNotiCount = notis.length;

  const unread = notis.filter(n => !n.read).length;
  const badge = document.getElementById('userNotiBadge');
  
  if (badge) {
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread > 99 ? '99+' : unread;
    } else {
      badge.style.display = 'none';
    }
  }
}

// Export for potential use
window.MediCareApp = {
  loadStores,
  selectStore,
  getUrlParam,
  updateCustomerBadge
};

// Initialize real-time listeners
setupRealtimeNotifications();
