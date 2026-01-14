// ===================================
// WEBSITE PROTECTION SYSTEM
// Taliyo Technologies - Anti-Copy Protection
// ===================================

(function () {
    'use strict';

    // ===================================
    // 1. DISABLE RIGHT CLICK
    // ===================================
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showProtectionAlert('Right-click is disabled on this website.');
        return false;
    });

    // ===================================
    // 2. DISABLE KEYBOARD SHORTCUTS
    // ===================================
    document.addEventListener('keydown', function (e) {
        // Disable F12 (DevTools)
        if (e.keyCode === 123) {
            e.preventDefault();
            showProtectionAlert('Developer tools are disabled.');
            return false;
        }

        // Disable Ctrl+Shift+I (Inspect)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            showProtectionAlert('Inspect element is disabled.');
            return false;
        }

        // Disable Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            showProtectionAlert('Console is disabled.');
            return false;
        }

        // Disable Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            showProtectionAlert('View source is disabled.');
            return false;
        }

        // Disable Ctrl+S (Save)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            showProtectionAlert('Saving is disabled.');
            return false;
        }

        // Disable Ctrl+C (Copy) on specific elements
        if (e.ctrlKey && e.keyCode === 67) {
            const selection = window.getSelection().toString();
            if (selection.length > 50) {
                e.preventDefault();
                showProtectionAlert('Copying large content is disabled.');
                return false;
            }
        }
    });

    // ===================================
    // 3. DEVTOOLS DETECTION
    // ===================================
    let devtoolsOpen = false;
    const threshold = 160;

    setInterval(function () {
        if (window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                handleDevToolsOpen();
            }
        } else {
            devtoolsOpen = false;
        }
    }, 500);

    function handleDevToolsOpen() {
        // Blur the page
        document.body.style.filter = 'blur(10px)';
        document.body.style.userSelect = 'none';

        // Show warning
        const warning = document.createElement('div');
        warning.id = 'devtools-warning';
        warning.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                z-index: 999999;
                text-align: center;
                max-width: 500px;
            ">
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Developer Tools Detected</h2>
                <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">
                    This website is protected by Taliyo Technologies.<br>
                    Please close developer tools to continue.
                </p>
                <p style="font-size: 0.9rem; opacity: 0.8;">
                    Unauthorized copying or modification is prohibited.
                </p>
            </div>
        `;

        if (!document.getElementById('devtools-warning')) {
            document.body.appendChild(warning);
        }

        // Remove blur and warning when devtools closed
        const checkInterval = setInterval(function () {
            if (window.outerWidth - window.innerWidth <= threshold &&
                window.outerHeight - window.innerHeight <= threshold) {
                document.body.style.filter = '';
                document.body.style.userSelect = '';
                const warningEl = document.getElementById('devtools-warning');
                if (warningEl) warningEl.remove();
                clearInterval(checkInterval);
            }
        }, 500);
    }

    // ===================================
    // 4. DISABLE TEXT SELECTION (Optional)
    // ===================================
    document.addEventListener('selectstart', function (e) {
        const target = e.target;
        // Allow selection in input fields
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return true;
        }
        // Disable selection for large text blocks
        const selection = window.getSelection().toString();
        if (selection.length > 100) {
            e.preventDefault();
            return false;
        }
    });

    // ===================================
    // 5. DISABLE DRAG AND DROP
    // ===================================
    document.addEventListener('dragstart', function (e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
            e.preventDefault();
            return false;
        }
    });

    // ===================================
    // 6. CONSOLE PROTECTION
    // ===================================
    // Detect console usage
    const consoleCheck = setInterval(function () {
        const before = new Date();
        debugger;
        const after = new Date();
        if (after - before > 100) {
            handleDevToolsOpen();
        }
    }, 1000);

    // Override console methods
    const noop = function () { };
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'group', 'groupEnd', 'time', 'timeEnd', 'profile', 'profileEnd', 'dirxml', 'assert', 'count', 'markTimeline', 'timeStamp', 'clear'];

    const originalConsole = {};
    methods.forEach(function (method) {
        originalConsole[method] = console[method];
        console[method] = function () {
            // Log to server that someone is trying to use console
            if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                // In production, you can log this to your server
                // fetch('/api/log-suspicious-activity', { method: 'POST', body: JSON.stringify({ action: 'console-usage' }) });
            }
            // Still allow console in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                originalConsole[method].apply(console, arguments);
            }
        };
    });

    // ===================================
    // 7. WATERMARK PROTECTION
    // ===================================
    function addWatermark() {
        const watermark = document.createElement('div');
        watermark.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            font-size: 10px;
            color: #888;
            font-family: Arial, sans-serif;
            z-index: 999999;
            pointer-events: none;
            user-select: none;
            opacity: 0.5;
        `;
        watermark.textContent = '© Taliyo Technologies';
        watermark.id = 'taliyo-watermark';
        document.body.appendChild(watermark);

        // Monitor if watermark is removed
        setInterval(function () {
            if (!document.getElementById('taliyo-watermark')) {
                handleDevToolsOpen();
                addWatermark();
            }
        }, 1000);
    }

    // ===================================
    // 8. ALERT SYSTEM
    // ===================================
    function showProtectionAlert(message) {
        // Create custom alert
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            font-family: Arial, sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        alert.textContent = '🔒 ' + message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(alert);

        // Remove after 3 seconds
        setTimeout(function () {
            alert.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(function () {
                alert.remove();
            }, 300);
        }, 3000);
    }

    // ===================================
    // 9. IFRAME PROTECTION
    // ===================================
    if (window.top !== window.self) {
        // Prevent website from being loaded in iframe
        window.top.location = window.self.location;
    }

    // ===================================
    // 10. PRINT PROTECTION
    // ===================================
    window.addEventListener('beforeprint', function (e) {
        document.body.innerHTML = '<h1 style="text-align: center; padding: 3rem;">This content is protected and cannot be printed.<br><br>© Taliyo Technologies</h1>';
    });

    // ===================================
    // INITIALIZE PROTECTION
    // ===================================
    document.addEventListener('DOMContentLoaded', function () {
        addWatermark();

        // Add protection notice in console (for localhost only)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('%c⚠️ PROTECTION ACTIVE', 'font-size: 20px; font-weight: bold; color: #667eea;');
            console.log('%cThis website is protected by Taliyo Technologies', 'font-size: 14px; color: #888;');
            console.log('%cUnauthorized copying, modification, or distribution is prohibited.', 'font-size: 12px; color: #f5576c;');
        }
    });

    // ===================================
    // 11. SOURCE CODE OBFUSCATION NOTICE
    // ===================================
    // This script itself should be minified and obfuscated in production
    // Use tools like: javascript-obfuscator.com or uglify-js

})();

// ===================================
// ADDITIONAL PROTECTION: CODE ENCRYPTION
// ===================================
// For maximum protection, you can encrypt your HTML/CSS/JS
// and decrypt it on the client side using a key
// This makes it extremely difficult to copy the source code

console.log('%c🔒 Website Protected by Taliyo Technologies', 'font-size: 16px; font-weight: bold; color: #667eea; background: #f0f0f0; padding: 10px;');
