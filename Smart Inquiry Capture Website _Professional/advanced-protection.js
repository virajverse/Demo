// ===================================
// ADVANCED CODE PROTECTION SYSTEM
// Prevents HTML/CSS/JS inspection and copying
// ===================================

(function () {
    'use strict';

    // ===================================
    // ALERT SYSTEM (User-Friendly Notifications)
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
            font-family: 'Inter', Arial, sans-serif;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        alert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                ${message}
            </div>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        if (!document.getElementById('protection-animation-style')) {
            style.id = 'protection-animation-style';
            document.head.appendChild(style);
        }

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
    // 1. DISABLE INSPECT ELEMENT COMPLETELY
    // ===================================

    // Block right-click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showProtectionAlert('Right-click is disabled on this website.');
        return false;
    }, true);

    // Block all keyboard shortcuts for DevTools
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('Developer tools are disabled.');
            return false;
        }

        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('Inspect element is disabled.');
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('View source is disabled.');
            return false;
        }

        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('Saving is disabled.');
            return false;
        }

        // Ctrl+C (Copy)
        if (e.ctrlKey && e.keyCode === 67) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('Copying is disabled.');
            return false;
        }

        // Ctrl+A (Select All)
        if (e.ctrlKey && e.keyCode === 65) {
            e.preventDefault();
            e.stopPropagation();
            showProtectionAlert('Select all is disabled.');
            return false;
        }
    }, true);

    // ===================================
    // 2. DEVTOOLS DETECTION & BLOCKING
    // ===================================

    let devtoolsOpen = false;

    // Method 1: Console detection
    const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                handleDevToolsOpen();
            }
        }
    };

    // Method 2: Debugger trap
    setInterval(() => {
        const before = new Date();
        debugger;
        const after = new Date();
        if (after - before > 100) {
            handleDevToolsOpen();
        }
    }, 1000);

    // Method 3: Console.log override detection
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function () {
            handleDevToolsOpen();
            return 'devtools-detector';
        }
    });

    setInterval(() => {
        console.log(element);
        console.clear();
    }, 1000);

    // Check every 500ms
    setInterval(detectDevTools, 500);

    function handleDevToolsOpen() {
        // Blur the entire page
        document.body.style.filter = 'blur(20px)';
        document.body.style.pointerEvents = 'none';

        // Show warning
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                z-index: 999999;
                text-align: center;
                filter: none;
            ">
                <h2 style="color: #dc2626; margin: 0 0 1rem 0; font-size: 2rem;">
                    <br>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <br>
                    Access Denied
                </h2>
                <p style="color: #0f172a; margin: 0; font-size: 1.125rem;">
                    Developer tools are not allowed on this website.<br>
                    Please close DevTools to continue.
                </p>
            </div>
        `;
        document.body.appendChild(warning);

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 3000);
    }

    // ===================================
    // 3. DISABLE TEXT SELECTION
    // ===================================

    document.addEventListener('selectstart', function (e) {
        e.preventDefault();
        return false;
    }, true);

    document.addEventListener('mousedown', function (e) {
        if (e.detail > 1) {
            e.preventDefault();
            return false;
        }
    }, true);

    // CSS-based selection prevention
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(style);

    // ===================================
    // 4. DISABLE DRAG & DROP
    // ===================================

    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    }, true);

    // ===================================
    // 5. DISABLE COPY/PASTE
    // ===================================

    document.addEventListener('copy', function (e) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', 'Copying is disabled on this website.');
        return false;
    }, true);

    document.addEventListener('cut', function (e) {
        e.preventDefault();
        return false;
    }, true);

    // ===================================
    // 6. CONSOLE PROTECTION
    // ===================================

    // Override console methods
    const noop = () => { };
    const consoleProxy = new Proxy(console, {
        get(target, prop) {
            return noop;
        }
    });

    window.console = consoleProxy;

    // ===================================
    // 7. PREVENT IFRAME EMBEDDING
    // ===================================

    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // ===================================
    // 8. DISABLE PRINT
    // ===================================

    window.addEventListener('beforeprint', function (e) {
        e.preventDefault();
        document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50vh; transform: translateY(-50%);">Printing is disabled</h1>';
        return false;
    });

    window.addEventListener('afterprint', function (e) {
        location.reload();
    });

    // Override print function
    window.print = function () {
        alert('Printing is disabled on this website.');
        return false;
    };

    // ===================================
    // 9. WATERMARK (NON-REMOVABLE)
    // ===================================

    function addWatermark() {
        const watermark = document.createElement('div');
        watermark.innerHTML = 'Protected by Taliyo Technologies';
        watermark.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            font-size: 10px;
            color: rgba(0,0,0,0.3);
            pointer-events: none;
            z-index: 999999;
            font-family: Arial, sans-serif;
        `;
        watermark.id = 'taliyo-watermark-' + Math.random().toString(36).substr(2, 9);
        document.body.appendChild(watermark);

        // Monitor watermark removal
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach(function (node) {
                        if (node === watermark) {
                            document.body.innerHTML = '<h1 style="text-align: center; color: red;">Tampering detected!</h1>';
                            setTimeout(() => {
                                window.location.href = 'about:blank';
                            }, 2000);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Add watermark after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addWatermark);
    } else {
        addWatermark();
    }

    // ===================================
    // 10. DOM MUTATION PROTECTION
    // ===================================

    // Prevent DOM inspection by freezing it
    const protectDOM = () => {
        // Make HTML read-only
        Object.defineProperty(document, 'documentElement', {
            get: function () {
                return document.getElementsByTagName('html')[0];
            },
            set: function () {
                return false;
            }
        });
    };

    protectDOM();

    // ===================================
    // 11. SCREENSHOT PROTECTION
    // ===================================

    // Detect screenshot attempts (limited effectiveness)
    document.addEventListener('keyup', function (e) {
        // PrintScreen key
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText('');
            alert('Screenshots are discouraged on this website.');
        }
    });

    // ===================================
    // 12. SOURCE CODE OBFUSCATION NOTICE
    // ===================================

    // Add fake source code comments to confuse
    const fakeComment = document.createComment(`
        ===================================
        PROTECTED CODE - DO NOT COPY
        This website is protected by advanced security measures.
        Unauthorized copying or distribution is prohibited.
        © ${new Date().getFullYear()} Taliyo Technologies
        ===================================
    `);
    document.documentElement.insertBefore(fakeComment, document.documentElement.firstChild);

    // ===================================
    // INITIALIZATION
    // ===================================

    console.log('%cWEBSITE PROTECTED', 'font-size: 20px; font-weight: bold; color: #dc2626;');
    console.log('%cThis website is protected against code inspection and copying.', 'font-size: 14px; color: #64748b;');
    console.log('%c© Taliyo Technologies', 'font-size: 12px; color: #94a3b8;');

})();
