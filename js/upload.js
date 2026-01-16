/* ================================================
   MediCare Hub - Upload & Order Logic
   Image upload, AI verification, WhatsApp integration
   ================================================ */

// Current state
let currentStore = null;
let uploadedImageData = null;
let uploadedImageFile = null; // Store the actual file for Web Share API
let aiVerificationPassed = false;

document.addEventListener('DOMContentLoaded', function() {
  initializeStorePage();
});

async function initializeStorePage() {
  // Get store ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get('id');
  
  if (!storeId) {
    // Redirect to home if no store selected
    window.location.href = 'index.html';
    return;
  }
  
  // Load store details
  try {
    // 1. Initial Render from Local Cache (Instant)
    const localStores = MediCareData.getLocalStores();
    const localStore = localStores.find(s => s.id == storeId); // Loose equality for string/int match
    if (localStore) {
      currentStore = localStore;
      displayStoreInfo(currentStore);
    }

    // 2. Fetch Fresh Data (Async)
    const freshStore = await MediCareData.getStoreById(storeId);
    if (freshStore) {
       currentStore = freshStore;
       // 3. Re-render with fresh data
       displayStoreInfo(currentStore);
    } else if (!currentStore) {
       // If no local and no remote, show error
       throw new Error("Store not found");
    }
  } catch (error) {
    console.error("Error fetching store:", error);
    currentStore = null;
  }
  
  if (!currentStore) {
    showAIMessage('error', 'Store not found', 'The selected store could not be found. Please go back and select another store.');
    return;
  }
  
  // Display store info
  displayStoreInfo(currentStore);
  
  // Setup upload functionality
  setupUpload();
  
  // Setup action buttons
  setupActionButtons();
}

function displayStoreInfo(store) {
  // Set store name
  document.getElementById('storeName').textContent = store.name;
  
  // Set badges
  const badgesContainer = document.getElementById('storeBadges');
  badgesContainer.innerHTML = '';
  
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
}

function setupUpload() {
  const uploadCard = document.getElementById('uploadCard');
  const galleryBtn = document.getElementById('galleryBtn');
  const galleryInput = document.getElementById('galleryInput');
  const changeImageBtn = document.getElementById('changeImageBtn');
  
  // Gallery button - opens file picker
  if (galleryBtn) {
    galleryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      galleryInput.click();
    });
  }
  
  // Upload card click - opens file picker
  uploadCard.addEventListener('click', (e) => {
    // Don't trigger if clicking the gallery button itself
    if (e.target.closest('.gallery-upload-btn')) return;
    galleryInput.click();
  });
  
  // Change image button
  changeImageBtn.addEventListener('click', () => {
    galleryInput.click();
  });
  
  // File input change handler
  galleryInput.addEventListener('change', handleImageUpload);
  
  // Drag and drop
  uploadCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadCard.classList.add('dragover');
  });
  
  uploadCard.addEventListener('dragleave', () => {
    uploadCard.classList.remove('dragover');
  });
  
  uploadCard.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadCard.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      processImage(files[0]);
    }
  });
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    processImage(file);
  }
}

function processImage(file) {
  // Show AI processing animation
  showAIProcessing();
  
  // Store the file for Web Share API
  uploadedImageFile = file;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    uploadedImageData = e.target.result;
    
    // Show preview
    document.getElementById('previewImage').src = uploadedImageData;
    document.getElementById('uploadCard').style.display = 'none';
    document.getElementById('uploadPreview').classList.add('active');
    
    // Simulate AI verification (runs in background)
    setTimeout(() => {
      runAIVerification(file);
    }, 1500);
  };
  
  reader.readAsDataURL(file);
}

function showAIProcessing() {
  const aiMessages = document.getElementById('aiMessages');
  aiMessages.innerHTML = `
    <div class="ai-processing">
      <div class="ai-dots">
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
      </div>
      <span>Analyzing your image...</span>
    </div>
  `;
}

async function runAIVerification(file) {
  // Simulate AI verification checks
  const verificationResults = simulateAIChecks(file);
  
  // Clear processing message
  const aiMessages = document.getElementById('aiMessages');
  aiMessages.innerHTML = '';
  
  // Show verification results
  if (verificationResults.imageClarity) {
    showAIMessage('success', 'Image verified successfully', 'Your image is clear and ready for processing.');
    aiVerificationPassed = true;
  } else if (verificationResults.lowQuality) {
    showAIMessage('warning', 'Image quality could be better', 'The image is a bit unclear, but we\'ll do our best to process it.');
    aiVerificationPassed = true;
  } else if (verificationResults.tooBlurry) {
    showAIMessage('error', 'Image is too blurry', 'Please upload a clearer image for accurate processing.');
    aiVerificationPassed = false;
  }
  
  // Show note section and action buttons if verification passed
  if (aiVerificationPassed) {
    document.getElementById('phoneSection').style.display = 'block';
    document.getElementById('addressSection').style.display = 'block';
    document.getElementById('noteSection').style.display = 'block';
    document.getElementById('actionButtons').style.display = 'grid';
    
    // Pre-fill if logged in
    const user = await MediCareData.getLoggedInUser();
    if (user) {
      if (user.phone) document.getElementById('orderPhone').value = user.phone;
      if (user.address) document.getElementById('orderAddress').value = user.address;
    }
  }
}

function simulateAIChecks(file) {
  // Simulate AI verification based on file size and random factors
  // In a real app, this would use actual image processing
  
  const fileSizeMB = file.size / (1024 * 1024);
  const random = Math.random();
  
  // Larger files with good resolution typically mean better quality
  if (fileSizeMB > 0.5 && random > 0.2) {
    return { imageClarity: true };
  } else if (fileSizeMB > 0.1 && random > 0.1) {
    return { lowQuality: true };
  } else {
    // Very small files might be too compressed
    return { lowQuality: true }; // Being lenient for demo
  }
}

function showAIMessage(type, title, message) {
  const aiMessages = document.getElementById('aiMessages');
  
  const iconSvg = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  const messageHtml = `
    <div class="ai-message ${type}">
      <div class="ai-message-icon">
        ${iconSvg[type]}
      </div>
      <div class="ai-message-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
    </div>
  `;
  
  aiMessages.innerHTML = messageHtml;
}

function setupActionButtons() {
  const uploadBuyBtn = document.getElementById('uploadBuyBtn');
  const requestBtn = document.getElementById('requestBtn');
  
  uploadBuyBtn.addEventListener('click', () => submitOrder('urgent'));
  requestBtn.addEventListener('click', () => submitOrder('request'));
}

function submitOrder(orderType) {
  if (!uploadedImageData) {
    showAIMessage('error', 'No image uploaded', 'Please upload a prescription or medicine photo first.');
    return;
  }
  
  if (!aiVerificationPassed) {
    showAIMessage('error', 'Image verification failed', 'Please upload a clearer image before submitting.');
    return;
  }
  
  // Validate Address
  const address = document.getElementById('orderAddress').value.trim();
  if (!address) {
    showAIMessage('error', 'Delivery Address Required', 'Please enter your full delivery address.');
    document.getElementById('orderAddress').focus();
    return;
  }
  
  // Validate Phone
  const phone = document.getElementById('orderPhone').value.trim();
  if (!phone || phone.length < 10) {
    showAIMessage('error', 'Phone Number Required', 'Please enter a valid mobile number.');
    document.getElementById('orderPhone').focus();
    return;
  }
  
  processOrderSubmission(orderType);
}

async function processOrderSubmission(orderType) {
  // Show loading
  showLoading('Processing your order...');
  
  // Get inputs
  const note = document.getElementById('orderNote').value.trim();
  const address = document.getElementById('orderAddress').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  
  // Store guest phone for notification tracking
  sessionStorage.setItem('medicare_guest_phone', phone);
  
  // Auto-Login / Update User (Sync for now as per data.js)
  const user = await MediCareData.findOrCreateUserByPhone(phone, address);
  MediCareData.setLoggedInUser(user.id);
  
  try {
    // Create order (Async)
    const order = await MediCareData.createOrder(
      currentStore.id,
      uploadedImageData,
      note,
      address,
      phone,
      orderType
    );
    
    // Update AI verification status (Async)
    await MediCareData.updateOrderAIVerification(order.id, {
      passed: true,
      timestamp: new Date().toISOString()
    });
    
    // Simulate processing delay (or just wait a bit for UX)
    setTimeout(() => {
      hideLoading();
      
      // Use custom modal or redirect
      MediCareAlerts.alert(
        'Order Placed Successfully! 🎉', 
        'The store has been notified immediately. You can track status in the Alerts section.', 
        () => { window.location.href = 'index.html'; }
      );
    }, 2000); // Improved UX delay
    
  } catch (error) {
    console.error("Order Submission Failed:", error);
    hideLoading();
    MediCareAlerts.alert('Order Error', 'Failed to place order. Please try again.');
  }
}

// Share image directly to WhatsApp using Web Share API
async function shareImageToWhatsApp(order, message) {
  const whatsappLink = MediCareData.generateWhatsAppLink(currentStore.whatsapp, message);
  
  // Check if Web Share API with files is supported (mainly mobile browsers)
  if (navigator.canShare && uploadedImageFile) {
    try {
      // Create a renamed file with order ID
      const fileExtension = uploadedImageFile.name.split('.').pop() || 'jpg';
      const renamedFile = new File(
        [uploadedImageFile], 
        `prescription_${order.id}.${fileExtension}`, 
        { type: uploadedImageFile.type }
      );
      
      const shareData = {
        title: `MediCare Hub Order - ${order.id}`,
        text: message,
        files: [renamedFile]
      };
      
      // Check if we can share files
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        // After sharing, redirect to order status
        window.location.href = `order-status.html?orderId=${order.id}&whatsapp=${encodeURIComponent(whatsappLink)}`;
        return;
      }
    } catch (err) {
      console.log('Web Share failed, using fallback:', err);
    }
  }
  
  // Desktop Fallback: Copy image to clipboard + open WhatsApp Web
  try {
    await copyImageToClipboard();
    // Open WhatsApp Web directly
    window.open(whatsappLink, '_blank');
    // Show success message and redirect
    setTimeout(() => {
      alert('✅ Image copied to clipboard!\n\nJust press Ctrl+V (or Cmd+V on Mac) in the WhatsApp chat to paste the image.');
      window.location.href = `order-status.html?orderId=${order.id}&whatsapp=${encodeURIComponent(whatsappLink)}`;
    }, 500);
  } catch (err) {
    console.log('Clipboard copy failed, falling back to download:', err);
    // Final fallback: Download image
    downloadPrescriptionImage(order.id);
    setTimeout(() => {
      alert('📸 Image downloaded! Please attach it in WhatsApp chat.');
      window.location.href = `order-status.html?orderId=${order.id}&whatsapp=${encodeURIComponent(whatsappLink)}`;
    }, 500);
  }
}

// Copy image to clipboard for easy pasting in WhatsApp
async function copyImageToClipboard() {
  // Convert base64 to blob
  const response = await fetch(uploadedImageData);
  const blob = await response.blob();
  
  // Create ClipboardItem with the image
  const clipboardItem = new ClipboardItem({
    [blob.type]: blob
  });
  
  // Write to clipboard
  await navigator.clipboard.write([clipboardItem]);
}

// Download the prescription image for manual attachment (final fallback)
function downloadPrescriptionImage(orderId) {
  const link = document.createElement('a');
  link.href = uploadedImageData;
  link.download = `prescription_${orderId}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showLoading(text) {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Login Reminder Modal
function showLoginReminder(onLogin, onGuest) {
  let modal = document.getElementById('loginReminderModal');
  
  if (!modal) {
    const modalHtml = `
      <div id="loginReminderModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 3000; display: flex; align-items: center; justify-content: center; opacity: 0; animation: fadeIn 0.3s forwards;">
         <div style="background: white; padding: 2rem; border-radius: 20px; max-width: 350px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); transform: translateY(20px); animation: slideUp 0.3s forwards;">
            <div style="width: 60px; height: 60px; margin: 0 auto 1rem; background: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px;">
               🔐
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-bottom: 0.5rem;">Login Recommended</h3>
            <p style="color: #6b7280; margin-bottom: 1.5rem; font-size: 0.9rem;">Log in to track your orders, save addresses, and get faster checkout next time.</p>
            <div style="display: flex; gap: 0.75rem;">
               <button id="remindGuestBtn" style="flex: 1; padding: 0.75rem 1rem; background: #f3f4f6; color: #4b5563; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Continue as Guest</button>
               <button id="remindLoginBtn" style="flex: 1; padding: 0.75rem 1rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Login Now</button>
            </div>
         </div>
      </div>
      <style>
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { to { transform: translateY(0); } }
      </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('loginReminderModal');
  }
  
  modal.style.display = 'flex';
  
  // Clone nodes to remove old listeners if any
  const guestBtn = document.getElementById('remindGuestBtn');
  const loginBtn = document.getElementById('remindLoginBtn');
  
  const newGuestBtn = guestBtn.cloneNode(true);
  const newLoginBtn = loginBtn.cloneNode(true);
  
  guestBtn.parentNode.replaceChild(newGuestBtn, guestBtn);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  
  newGuestBtn.onclick = () => {
      modal.style.display = 'none';
      onGuest();
  };
  
  newLoginBtn.onclick = () => {
      modal.style.display = 'none';
      onLogin();
  };
}

// Export for potential use
window.MediCareUpload = {
  submitOrder
};
