/* ================================================
   MediCare Hub - Data Management
   Firestore & LocalStorage-based data handling
   ================================================ */

// Helper to check if Firestore is available
function isFirestoreReady() {
  return typeof window.db !== 'undefined' && window.db !== null;
}

// Sample Medical Stores Data - Pernambut
const SAMPLE_STORES = [
  {
    id: 1,
    name: "Raja Medicals",
    area: "High Road",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "918148993165",
    rating: 4.8
  },
  {
    id: 2,
    name: "Royal Pharmacy",
    area: "Pernambut",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543211",
    rating: 4.7
  },
  {
    id: 3,
    name: "Alaghu Pharmacy",
    area: "Achari Street",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543212",
    rating: 4.6
  },
  {
    id: 4,
    name: "Bharath Medicals",
    area: "Veerasamy Street",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543213",
    rating: 4.5
  },
  {
    id: 5,
    name: "Zakir Medicals",
    area: "High Road",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543214",
    rating: 4.7
  },
  {
    id: 6,
    name: "Nobel Medicals",
    area: "High Road",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543215",
    rating: 4.6
  },
  {
    id: 7,
    name: "Shifa Health Solution",
    area: "High Road",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543216",
    rating: 4.8
  },
  {
    id: 8,
    name: "Vaseem Medical Shop",
    area: "High Road",
    city: "Pernambut",
    isOpen: true,
    isVerified: true,
    deliveringToday: true,
    whatsapp: "919876543217",
    rating: 4.5
  }
];

// Initialize stores
async function initializeStores() {
  if (isFirestoreReady()) {
    try {
      // Check if stores exist in Firestore
      const snapshot = await window.db.collection('stores').get();
      if (snapshot.empty) {
        // Seed Data
        const batch = window.db.batch();
        SAMPLE_STORES.forEach(store => {
          const docRef = window.db.collection('stores').doc(store.id.toString());
          batch.set(docRef, store);
        });
        await batch.commit();
        console.log('Stores seeded to Firestore');
      }
    } catch (error) {
      console.warn("Firestore Initialization Check Failed (using local fallback):", error);
      // We don't throw here, just let it fail silently so app can start with localStorage
    }
  } 
  
  // Always ensure LocalStorage has data as backup
  if (!localStorage.getItem('medicare_stores')) {
    localStorage.setItem('medicare_stores', JSON.stringify(SAMPLE_STORES));
  }
}

// Get all stores (Async)
async function getStores() {
  await initializeStores();
  
  if (isFirestoreReady()) {
    try {
      const snapshot = await db.collection('stores').get();
      return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));
    } catch (e) {
      console.error("Firestore Error:", e);
      return JSON.parse(localStorage.getItem('medicare_stores') || '[]');
    }
  } else {
    return JSON.parse(localStorage.getItem('medicare_stores') || '[]');
  }
}

// Get Local Stores Sync
function getLocalStores() {
  return JSON.parse(localStorage.getItem('medicare_stores') || '[]');
}

// Get store by ID (Async)
async function getStoreById(id) {
  if (isFirestoreReady()) {
    try {
      const doc = await db.collection('stores').doc(id.toString()).get();
      if (doc.exists) {
        return { id: parseInt(doc.id), ...doc.data() };
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  } else {
    // Sync Fallback (wrapped in Promise)
    const stores = JSON.parse(localStorage.getItem('medicare_stores') || '[]');
    return stores.find(store => store.id === parseInt(id));
  }
}

// Search stores (Async)
async function searchStores(query) {
  const stores = await getStores(); // Reuse getStores
  const lowerQuery = query.toLowerCase();
  return stores.filter(store => 
    store.name.toLowerCase().includes(lowerQuery) ||
    store.area.toLowerCase().includes(lowerQuery) ||
    store.city.toLowerCase().includes(lowerQuery)
  );
}

// Filter open stores (Async)
async function getOpenStores() {
  const stores = await getStores();
  return stores.filter(store => store.isOpen);
}

// Order Management

// Generate ID
function generateOrderId() {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Create Order (Async)
async function createOrder(storeId, imageData, note, address, phone, orderType) {
  const newOrder = {
    id: generateOrderId(),
    storeId: parseInt(storeId),
    storeName: '', // Will fetch
    storeWhatsapp: '', // Will fetch
    imageData: imageData,
    note: note || '',
    address: address || '',
    phone: phone || '',
    orderType: orderType,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiVerification: null,
    rejectionReason: null
  };

  // Get Store Details first (use sync local for reliability)
  const stores = JSON.parse(localStorage.getItem('medicare_stores') || '[]');
  const store = stores.find(s => s.id === parseInt(storeId));
  if (store) {
    newOrder.storeName = store.name;
    newOrder.storeWhatsapp = store.whatsapp;
  }

  // ALWAYS save to localStorage first for reliable dashboard sync
  saveOrderToLocal(newOrder);
  
  // Also try Firestore if available
  if (isFirestoreReady()) {
    try {
      await db.collection('orders').doc(newOrder.id).set(newOrder);
      console.log('Order saved to Firestore:', newOrder.id);
    } catch (e) {
      console.error("Firestore Write Error:", e);
      // Already saved to localStorage above
    }
  }
  
  return newOrder;
}

// LocalStorage Helper for Orders
function saveOrderToLocal(order) {
  const orders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
  
  // Check if order already exists (avoid duplicates)
  const existingIndex = orders.findIndex(o => o.id === order.id);
  if (existingIndex === -1) {
    orders.push(order);
    localStorage.setItem('medicare_orders', JSON.stringify(orders));
    console.log('Order saved to localStorage:', order.id);
    
    // Trigger storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'medicare_orders',
      newValue: JSON.stringify(orders)
    }));
    
    // Add notifications for store and admin
    addNotification('store', order.storeId, 'New Order Received! 🛍️', `Order #${order.id} from ${order.phone || 'Customer'}`, 'success');
    addNotification('admin', 'admin', 'New Order Placed', `Order #${order.id} for ${order.storeName || 'Store'}`, 'info');
  }
}

// Get Orders (Async)
async function getOrders() {
  if (isFirestoreReady()) {
    const snapshot = await db.collection('orders').get();
    return snapshot.docs.map(doc => doc.data());
  } else {
    return JSON.parse(localStorage.getItem('medicare_orders') || '[]');
  }
}

// Get Order By ID (Async)
async function getOrderById(orderId) {
   if (isFirestoreReady()) {
    const doc = await db.collection('orders').doc(orderId).get();
    return doc.exists ? doc.data() : null;
  } else {
    const orders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
    return orders.find(order => order.id === orderId);
  }
}

// Get Orders By Store (Async)
async function getOrdersByStore(storeId) {
  if (isFirestoreReady()) {
    const snapshot = await db.collection('orders').where('storeId', '==', parseInt(storeId)).get();
    return snapshot.docs.map(doc => doc.data());
  } else {
    const orders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
    return orders.filter(order => order.storeId === parseInt(storeId));
  }
}

// Update Order Status (Async)
async function updateOrderStatus(orderId, status, rejectionReason = null) {
  if (isFirestoreReady()) {
    try {
      const updateData = {
        status: status,
        updatedAt: new Date().toISOString()
      };
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      
      const orderRef = db.collection('orders').doc(orderId);
      await orderRef.update(updateData);
      
      const doc = await orderRef.get();
      return doc.data();
    } catch (e) {
      console.error("Firestore Update Error:", e);
      return updateLocalOrderStatus(orderId, status, rejectionReason);
    }
  } else {
    return updateLocalOrderStatus(orderId, status, rejectionReason);
  }
}

// Local helper for status update
function updateLocalOrderStatus(orderId, status, rejectionReason = null) {
  const orders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex !== -1) {
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    if (rejectionReason) {
      orders[orderIndex].rejectionReason = rejectionReason;
    }
    localStorage.setItem('medicare_orders', JSON.stringify(orders));
    
    // Notify User
    const order = orders[orderIndex];
    if (order.phone) {
        addNotification(
           'user', 
           order.phone, 
           `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
           `Your order #${orderId} has been ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
           status === 'rejected' ? 'error' : 'success'
        );
    }
    return orders[orderIndex];
  }
  return null;
}

// Update AI Verification (Async)
async function updateOrderAIVerification(orderId, verification) {
  if (isFirestoreReady()) {
    try {
      const orderRef = db.collection('orders').doc(orderId);
      await orderRef.update({ aiVerification: verification });
      const doc = await orderRef.get();
      return doc.data();
    } catch (e) {
      return updateLocalOrderAI(orderId, verification);
    }
  } else {
    return updateLocalOrderAI(orderId, verification);
  }
}

function updateLocalOrderAI(orderId, verification) {
  const orders = JSON.parse(localStorage.getItem('medicare_orders') || '[]');
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex !== -1) {
    orders[orderIndex].aiVerification = verification;
    localStorage.setItem('medicare_orders', JSON.stringify(orders));
    return orders[orderIndex];
  }
  return null;
}

// Admin Management
function getAdminCredentials() {
  const defaultAdmin = {
    username: 'admin',
    password: 'admin123'
  };
  
  if (!localStorage.getItem('medicare_admin')) {
    localStorage.setItem('medicare_admin', JSON.stringify(defaultAdmin));
  }
  
  return JSON.parse(localStorage.getItem('medicare_admin'));
}

function validateAdminLogin(username, password) {
  const admin = getAdminCredentials();
  return admin.username === username && admin.password === password;
}

// Store Login Management
function getStoreCredentials() {
  const defaultStoreCredentials = [
    { storeId: 1, username: 'rajamedicals', password: 'store123' },
    { storeId: 2, username: 'royalpharmacy', password: 'store123' },
    { storeId: 3, username: 'alaghupharma', password: 'store123' },
    { storeId: 4, username: 'bharathmed', password: 'store123' },
    { storeId: 5, username: 'zakirmed', password: 'store123' },
    { storeId: 6, username: 'nobelmed', password: 'store123' },
    { storeId: 7, username: 'shifahealth', password: 'store123' },
    { storeId: 8, username: 'vaseemmed', password: 'store123' }
  ];
  
  if (!localStorage.getItem('medicare_store_credentials')) {
    localStorage.setItem('medicare_store_credentials', JSON.stringify(defaultStoreCredentials));
  }
  
  return JSON.parse(localStorage.getItem('medicare_store_credentials'));
}

function validateStoreLogin(username, password) {
  const credentials = getStoreCredentials();
  const store = credentials.find(cred => cred.username === username && cred.password === password);
  return store || null;
}

// Update or Add Store Credentials (used by Super Admin)
function updateStoreCredentials(storeId, username, password) {
  const credentials = getStoreCredentials();
  const existingIndex = credentials.findIndex(cred => cred.storeId === parseInt(storeId));
  
  if (existingIndex !== -1) {
    // Update existing
    credentials[existingIndex].username = username;
    credentials[existingIndex].password = password;
  } else {
    // Add new
    credentials.push({
      storeId: parseInt(storeId),
      username: username,
      password: password
    });
  }
  
  localStorage.setItem('medicare_store_credentials', JSON.stringify(credentials));
  return { storeId: parseInt(storeId), username, password };
}

// Get Credentials for a specific store
function getCredentialsByStoreId(storeId) {
  const credentials = getStoreCredentials();
  return credentials.find(cred => cred.storeId === parseInt(storeId)) || null;
}


// Store Status Management (for Admin)
async function updateStoreStatus(storeId, updates) {
  // Firestore Update
  if (isFirestoreReady()) {
    try {
      await window.db.collection('stores').doc(storeId.toString()).update(updates);
    } catch (e) {
      console.error('Firestore Store Update Error:', e);
    }
  }

  // Local Update
  const stores = await getStores(); // reusing getStores which handles local/remote fetch logic
  // But getStores returns a COPY, updating it won't update localStorage automatically unless we save it back.
  // We need to fetch invalidating cache or just read local storage directly for the update.
  // Actually getStores returns an array.
  
  // Let's read purely local for the local update to be safe
  const localStores = JSON.parse(localStorage.getItem('medicare_stores') || '[]');
  const storeIndex = localStores.findIndex(store => store.id === parseInt(storeId));
  
  if (storeIndex !== -1) {
    localStores[storeIndex] = { ...localStores[storeIndex], ...updates };
    localStorage.setItem('medicare_stores', JSON.stringify(localStores));
    return localStores[storeIndex];
  }
  return null;
}

async function addNewStore(storeData) {
  // Get current max ID (from local or remote? Remote is truth)
  // For simplicity, let's generate a new ID based on timestamp to avoid conflicts in concurrent env, 
  // OR fetch all stores and +1 (risky for concurrency but simple for this app).
  // Current app uses Integer IDs. Let's stick to that but be careful.
  let newId;
  const stores = await getStores();
  if (stores.length > 0) {
      newId = Math.max(...stores.map(s => s.id)) + 1;
  } else {
      newId = 1;
  }
  
  const newStore = {
    id: newId,
    name: storeData.name,
    area: storeData.area,
    city: storeData.city || 'Bangalore',
    isOpen: true,
    isVerified: false,
    deliveringToday: false,
    whatsapp: storeData.whatsapp,
    rating: 0
  };
  
  // Firestore Save
  if (isFirestoreReady()) {
    try {
      await window.db.collection('stores').doc(newId.toString()).set(newStore);
    } catch (e) {
      console.error('Firestore New Store Error:', e);
    }
  }
  
  // Local Save
  const localStores = JSON.parse(localStorage.getItem('medicare_stores') || '[]');
  localStores.push(newStore);
  localStorage.setItem('medicare_stores', JSON.stringify(localStores));
  
  return newStore;
}

async function deleteStore(storeId) {
  // Firestore Delete
  if (isFirestoreReady()) {
    try {
      await window.db.collection('stores').doc(storeId.toString()).delete();
    } catch (e) {
      console.error('Firestore Store Delete Error:', e);
    }
  }

  // Local Delete
  let stores = JSON.parse(localStorage.getItem('medicare_stores') || '[]');
  stores = stores.filter(store => store.id !== parseInt(storeId));
  localStorage.setItem('medicare_stores', JSON.stringify(stores));
}

// Analytics for Admin
function getAnalytics() {
  const orders = getOrders();
  const stores = getStores();
  
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
  
  const totalStores = stores.length;
  const verifiedStores = stores.filter(s => s.isVerified).length;
  const activeStores = stores.filter(s => s.isOpen).length;
  
  // Rejection reasons breakdown
  const rejectionReasons = {};
  orders.filter(o => o.rejectionReason).forEach(order => {
    rejectionReasons[order.rejectionReason] = (rejectionReasons[order.rejectionReason] || 0) + 1;
  });
  
  return {
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      accepted: acceptedOrders,
      delivered: deliveredOrders,
      rejected: rejectedOrders
    },
    stores: {
      total: totalStores,
      verified: verifiedStores,
      active: activeStores
    },
    rejectionReasons
  };
}

// WhatsApp Integration
function generateWhatsAppLink(phoneNumber, message) {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

function createOrderWhatsAppMessage(order, store) {
  const orderType = order.orderType === 'urgent' ? '🚨 URGENT ORDER' : '📋 Order Request';
  
  let message = `${orderType}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🆔 *Order ID:* ${order.id}\n`;
  message += `🏥 *Store:* ${store.name}\n`;
  message += `📍 *Area:* ${store.area}, ${store.city}\n`;
  message += `🕐 *Time:* ${new Date(order.createdAt).toLocaleString('en-IN')}\n`;
  
  if (order.address) {
    message += `📍 *Delivery Address:* ${order.address}\n`;
  }
  
  if (order.phone) {
    message += `📞 *Customer Phone:* ${order.phone}\n`;
  }
  
  if (order.note) {
    message += `📝 *Note:* ${order.note}\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📸 *Prescription image attached above*\n`;
  message += `💰 *Payment:* Cash on Delivery\n`;
  message += `🚚 *Delivery:* Free Home Delivery\n\n`;
  
  // WhatsApp Business Quick Reply Options
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚡ *QUICK RESPONSE OPTIONS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `✅ Reply *1* → ACCEPT ORDER\n`;
  message += `📦 Reply *2* → ORDER COMPLETED\n`;
  message += `❌ Reply *3* → REJECT ORDER\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `❌ *REJECTION REASONS (Reply number)*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `Reply *R1* → Medicine Not Available\n`;
  message += `Reply *R2* → Prescription Unclear\n`;
  message += `Reply *R3* → Out of Delivery Area\n`;
  message += `Reply *R4* → Store Closed\n`;
  message += `Reply *R5* → Need Valid Prescription\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `_Powered by MediCare Hub_ 💊\n`;
  message += `_Free Delivery • Trusted Stores_`;
  
  return message;
}

function createRejectionWhatsAppMessage(order, reason) {
  let message = `❌ ORDER UPDATE\n\n`;
  message += `Order ID: ${order.id}\n`;
  message += `Status: Rejected\n`;
  message += `Reason: ${reason}\n`;
  message += `\nPlease choose:\n`;
  message += `• WAIT - To wait for further assistance\n`;
  message += `• UPLOAD NEW - To submit a new image\n`;
  message += `• CANCEL - To cancel this order\n`;
  message += `\n---\nSent via MediCare Hub`;
  
  return message;
}

// Session Management
function setCurrentStore(storeId) {
  sessionStorage.setItem('medicare_current_store', storeId);
}

function getCurrentStore() {
  const storeId = sessionStorage.getItem('medicare_current_store');
  return storeId ? getStoreById(storeId) : null;
}

function clearCurrentStore() {
  sessionStorage.removeItem('medicare_current_store');
}

function setLoggedInStore(storeId) {
  console.log('Setting logged in store:', storeId);
  sessionStorage.setItem('medicare_logged_store', storeId);
}

function getLoggedInStore() {
  const storeId = sessionStorage.getItem('medicare_logged_store');
  return storeId ? parseInt(storeId) : null;
}

function setAdminLoggedIn(status) {
  console.log('Setting admin logged in:', status);
  sessionStorage.setItem('medicare_admin_logged', status ? 'true' : 'false');
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('medicare_admin_logged') === 'true';
}

function logout() {
  sessionStorage.removeItem('medicare_logged_store');
  sessionStorage.removeItem('medicare_admin_logged');
  sessionStorage.removeItem('medicare_current_store');
}

// User Management

// Sync Helper for getting users from local (needed for some sync checks)
function getLocalUsers() {
  if (!localStorage.getItem('medicare_users')) {
    localStorage.setItem('medicare_users', JSON.stringify([]));
  }
  return JSON.parse(localStorage.getItem('medicare_users'));
}

async function getUsers() {
  if (isFirestoreReady()) {
    try {
      const snapshot = await window.db.collection('users').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (e) {
      console.warn('Firestore User Fetch Error:', e);
      return getLocalUsers();
    }
  }
  return getLocalUsers();
}

async function registerUser(userData) {
  const users = await getUsers();
  
  // Check if phone already exists
  const existingUser = users.find(u => u.phone === userData.phone);
  if (existingUser) {
    return { success: false, error: 'Phone number already registered' };
  }
  
  // Create new user
  const newUser = {
    id: Date.now(), // Generate ID
    name: userData.name,
    phone: userData.phone,
    password: userData.password,
    address: userData.address || '',
    createdAt: new Date().toISOString()
  };
  
  // 1. Save to Firestore (Async)
  if (isFirestoreReady()) {
    try {
      // Use phone as doc ID for uniqueness or generated ID? 
      // Plan used Date.now(), let's stick to string ID if possible
      await window.db.collection('users').doc(newUser.id.toString()).set(newUser);
    } catch (e) {
      console.error('Firestore Register Error:', e);
      // Proceed to local storage (Dual Write)
    }
  }
  
  // 2. Save to LocalStorage (Backup)
  const localUsers = getLocalUsers();
  localUsers.push(newUser);
  localStorage.setItem('medicare_users', JSON.stringify(localUsers));
  
  return { success: true, user: newUser };
}

async function validateUserLogin(phone, password) {
  // Try Firestore first (for most up to date)
  if (isFirestoreReady()) {
    try {
       const snapshot = await window.db.collection('users').where('phone', '==', phone).where('password', '==', password).get();
       if (!snapshot.empty) {
         return snapshot.docs[0].data();
       }
    } catch (e) {
      console.error('Firestore Login Error:', e);
    }
  }

  // Fallback to LocalStorage
  const users = getLocalUsers();
  const user = users.find(u => u.phone === phone && u.password === password);
  return user || null;
}

async function getUserByPhone(phone) {
  if (isFirestoreReady()) {
    try {
      const snapshot = await window.db.collection('users').where('phone', '==', phone).get();
      if (!snapshot.empty) return snapshot.docs[0].data();
    } catch (e) {
       console.warn('Firestore Get User Error:', e);
    }
  }
  const users = getLocalUsers();
  return users.find(u => u.phone === phone) || null;
}

function setLoggedInUser(userId) {
  localStorage.setItem('medicare_logged_user', userId);
}

// Get Logged In User (Async likely better, but for now we keep it Sync for ID, Async for Details? 
// No, Plan said Async. Let's make it Async.)
async function getLoggedInUser() {
  const userId = localStorage.getItem('medicare_logged_user');
  if (!userId) return null;
  
  if (isFirestoreReady()) {
    try {
      const doc = await window.db.collection('users').doc(userId.toString()).get();
      if (doc.exists) return doc.data();
       // Try searching by ID field if doc ID differs (fallback logic)
       const snapshot = await window.db.collection('users').where('id', '==', parseInt(userId)).get();
       if (!snapshot.empty) return snapshot.docs[0].data();
    } catch (e) {
      // Fallback
    }
  }
  
  const users = getLocalUsers();
  return users.find(u => u.id === parseInt(userId)) || null;
}

function isUserLoggedIn() {
  return localStorage.getItem('medicare_logged_user') !== null;
}

function logoutUser() {
  localStorage.removeItem('medicare_logged_user');
}

async function findOrCreateUserByPhone(phone, address) {
  let user = await getUserByPhone(phone);
  
  if (user) {
    // Update address if provided
    if (address && (!user.address || user.address !== address)) {
        user.address = address;
        
        // Update Firestore
        if (isFirestoreReady()) {
          try {
             // Need doc ID. If user came from local, we might not know doc ID easily if it differs from ID.
             // Assumption: doc ID is user.id.toString()
             await window.db.collection('users').doc(user.id.toString()).update({ address: address });
          } catch(e) {
             console.error('Firestore Address Update Error:', e);
          }
        }

        // Update Local
        const localUsers = getLocalUsers();
        const localUserIdx = localUsers.findIndex(u => u.id === user.id);
        if (localUserIdx !== -1) {
           localUsers[localUserIdx].address = address;
           localStorage.setItem('medicare_users', JSON.stringify(localUsers));
        }
    }
    return user;
  }
  
  // Create new user (Guest)
  const newUser = {
    id: Date.now(),
    name: 'Valued Customer',
    phone: phone,
    address: address || '',
    password: '', // Guest user
    createdAt: new Date().toISOString()
  };
  
  // Firestore Save
  if (isFirestoreReady()) {
      try {
        await window.db.collection('users').doc(newUser.id.toString()).set(newUser);
      } catch (e) {
        console.error('Firestore Guest Create Error:', e);
      }
  }
  
  // Local Save
  const localUsers = getLocalUsers();
  localUsers.push(newUser);
  localStorage.setItem('medicare_users', JSON.stringify(localUsers));
  
  return newUser;
}

// Persistent Notifications
// Persistent Notifications

// Local Helper
function getLocalNotifications() {
  if (!localStorage.getItem('medicare_notis_data')) {
      localStorage.setItem('medicare_notis_data', JSON.stringify([]));
  }
  return JSON.parse(localStorage.getItem('medicare_notis_data'));
}

async function addNotification(role, userId, title, message, type='info') {
    const newNoti = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        role,
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    // Firestore Write
    if (isFirestoreReady()) {
        try {
            await window.db.collection('notifications').doc(newNoti.id).set(newNoti);
        } catch (e) {
            console.error('Firestore Noti Write Error:', e);
        }
    }
    
    // Local Write (Backup & Instant UI update if local)
    const notis = getLocalNotifications();
    notis.push(newNoti);
    localStorage.setItem('medicare_notis_data', JSON.stringify(notis));
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'medicare_notis_data',
      newValue: JSON.stringify(notis)
    }));
    
    console.log('Notification added:', title, 'for', role, userId);
}

async function getUserNotifications(role, id) {
    if (isFirestoreReady()) {
        try {
            let ref = window.db.collection('notifications').where('role', '==', role);
            
            if (role !== 'admin') {
                ref = ref.where('userId', '==', id);
            }
            
            const snapshot = await ref.get();
            const firestoreNotis = snapshot.docs.map(doc => doc.data());
            return firestoreNotis.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        } catch (e) {
            console.warn('Firestore User Noti Fetch Error:', e);
        }
    }

    const notis = getLocalNotifications();
    return notis
      .filter(n => n.role === role && (n.userId === id || role === 'admin'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function markNotificationRead(id) {
    if (isFirestoreReady()) {
        try {
            await window.db.collection('notifications').doc(id).update({ read: true });
        } catch (e) {
             console.error('Firestore Noti Read Error:', e);
        }
    }

    const notis = getLocalNotifications();
    const idx = notis.findIndex(n => n.id === id);
    if (idx !== -1) {
        notis[idx].read = true;
        localStorage.setItem('medicare_notis_data', JSON.stringify(notis));
    }
}

async function deleteNotification(id) {
    if (isFirestoreReady()) {
        try {
            await window.db.collection('notifications').doc(id).delete();
        } catch (e) {
             console.error('Firestore Noti Delete Error:', e);
        }
    }

    let notis = getLocalNotifications();
    notis = notis.filter(n => n.id !== id);
    localStorage.setItem('medicare_notis_data', JSON.stringify(notis));
}

// Custom Alert System
const MediCareAlerts = {
  // Simple Alert
  alert(title, message, onOk = null) {
    this._createModal('alert', title, message, 'OK', null, onOk, null);
  },

  // Confirm Dialog
  confirm(title, message, confirmText = 'Yes', cancelText = 'Cancel', onConfirm = null, onCancel = null) {
    this._createModal('confirm', title, message, confirmText, cancelText, onConfirm, onCancel);
  },

  _createModal(type, title, message, btn1Text, btn2Text, onBtn1, onBtn2) {
    // Remove existing
    const existing = document.getElementById('medicare-custom-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'medicare-custom-modal';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6); z-index: 20000;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.2s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; width: 90%; max-width: 400px;
      border-radius: 16px; padding: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
      transform: scale(0.95);
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      text-align: center;
      font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="width: 60px; height: 60px; background: ${type === 'alert' ? '#e0f2fe' : '#fef3c7'}; color: ${type === 'alert' ? '#0284c7' : '#d97706'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
           ${type === 'alert' ? 
             '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' : 
             '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
           }
        </div>
      </div>
      <h3 style="margin: 0 0 8px; font-size: 20px; color: #1f2937;">${title}</h3>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        ${type === 'confirm' ? `
          <button id="modal-btn-cancel" style="padding: 10px 20px; background: white; border: 1px solid #d1d5db; color: #374151; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1;">${btn2Text}</button>
        ` : ''}
        <button id="modal-btn-ok" style="padding: 10px 20px; background: var(--primary, #2563eb); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">${btn1Text}</button>
      </div>
    `;

    // Animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Handlers
    document.getElementById('modal-btn-ok').onclick = () => {
      overlay.remove();
      if (onBtn1) onBtn1();
    };

    if (type === 'confirm') {
      document.getElementById('modal-btn-cancel').onclick = () => {
        overlay.remove();
        if (onBtn2) onBtn2();
      };
    }
  }
};

// Unified Notification System
// Unified Notification System
const MediCareNotifications = {
  init() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }

    // Check permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  },

  requestPermission() {
    if (!('Notification' in window)) return Promise.reject('Not supported');
    return Notification.requestPermission();
  },

  playAlert() {
    try {
      // Audio context requires user interaction first, so this might fail if auto-triggered
      // We'll wrap it safely
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // "Ding" sound (C5 -> C6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio play failed (interaction required first)", e);
    }
  },

  // Show a "System" notification (Browser level)
  sendSystemNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const noti = new Notification(title, { 
          body: message, 
          icon: '../logo.png', // Ensure this path is correct relative to the page
          tag: 'medicare-notification' // Group notifications
        });
        
        noti.onclick = function() {
          window.focus();
          this.close();
        };
      } catch (e) {
        console.error("System notification failed", e);
      }
    }
  },

  show(title, message, type = 'success') {
    // 1. Play Sound
    this.playAlert();

    // 2. Browser Notification (System level)
    this.sendSystemNotification(title, message);

    // 3. In-App Toast
    this.showToast(title, message, type);
  },

  showToast(title, message, type) {
    // Remove existing if any (to prevent stack overlap in this simple version, or stack them nicely)
    const existing = document.querySelector('.medicare-notification-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = `medicare-notification-banner noti-${type}`;
    
    // Icon SVG based on type
    const icons = {
      success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    banner.innerHTML = `
      <div class="medicare-notification-icon">
        ${icons[type] || icons.info}
      </div>
      <div class="medicare-notification-content">
        <div class="medicare-notification-title">
          <span>${title}</span>
          <span class="medicare-notification-time">now</span>
        </div>
        <div class="medicare-notification-body">${message}</div>
      </div>
    `;

    // Click to dismiss
    banner.onclick = () => {
      banner.classList.remove('active');
      banner.classList.add('hiding');
      setTimeout(() => banner.remove(), 400);
    };

    document.body.appendChild(banner);

    // Animate In (Next Frame)
    requestAnimationFrame(() => {
      banner.classList.add('active');
      
      // Vibrate if on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
      }
    });

    // Auto Dismiss
    setTimeout(() => {
      if (document.body.contains(banner)) {
        banner.classList.remove('active');
        banner.classList.add('hiding');
        setTimeout(() => banner.remove(), 400);
      }
    }, 5000);
  }
};

// Export for use in other files
window.MediCareData = {
  // Stores
  getStores,
  getLocalStores,
  getStoreById,
  searchStores,
  getOpenStores,
  updateStoreStatus,
  addNewStore,
  deleteStore,
  
  // Orders
  createOrder,
  getOrders,
  deleteNotification,
  getOrderById,
  getOrdersByStore,
  updateOrderStatus,
  updateOrderAIVerification,
  
  // Auth
  validateAdminLogin,
  validateStoreLogin,
  getAdminCredentials,
  getStoreCredentials,
  updateStoreCredentials,
  getCredentialsByStoreId,
  
  // User Auth
  registerUser,
  validateUserLogin,
  getUserByPhone,
  getUsers,
  setLoggedInUser,
  getLoggedInUser,
  isUserLoggedIn,
  logoutUser,
  findOrCreateUserByPhone,
  
  // Analytics
  getAnalytics,
  
  // WhatsApp
  generateWhatsAppLink,
  createOrderWhatsAppMessage,
  createRejectionWhatsAppMessage,
  
  // Notifications
  MediCareNotifications,
  addNotification,
  getUserNotifications,
  markNotificationRead,
  
  // Alerts
  MediCareAlerts,
  
  // Session
  setCurrentStore,
  getCurrentStore,
  clearCurrentStore,
  setLoggedInStore,
  getLoggedInStore,
  setAdminLoggedIn,
  isAdminLoggedIn,
  logout
};

