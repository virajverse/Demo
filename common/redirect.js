/**
 * Universal Redirect Logic for Demo Hosting System
 * Handles source-aware redirects and back button functionality
 * 
 * Features:
 * - Reads ?return= query parameter
 * - Validates and stores return URL in localStorage
 * - Provides universal back button functionality
 * - Safe fallbacks for direct access
 * - WebView-safe with try/catch protection
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'demo_return_url';

    /**
     * Validates if a URL is safe (http/https only)
     * @param {string} url - URL to validate
     * @returns {boolean} - True if URL is valid and safe
     */
    function isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    /**
     * Gets the return URL from query parameter
     * @returns {string|null} - Sanitized return URL or null
     */
    function getReturnParam() {
        try {
            const params = new URLSearchParams(window.location.search);
            const returnUrl = params.get('return');
            
            if (returnUrl && isValidUrl(returnUrl)) {
                return returnUrl;
            }
        } catch (e) {
            // Silent fail for WebView compatibility
            console.warn('Failed to parse return parameter:', e);
        }
        return null;
    }

    /**
     * Stores return URL in localStorage
     * @param {string} url - URL to store
     */
    function storeReturnUrl(url) {
        try {
            if (url && isValidUrl(url)) {
                localStorage.setItem(STORAGE_KEY, url);
            }
        } catch (e) {
            // Silent fail - localStorage may be disabled
            console.warn('Failed to store return URL:', e);
        }
    }

    /**
     * Retrieves stored return URL from localStorage
     * @returns {string|null} - Stored URL or null
     */
    function getStoredReturnUrl() {
        try {
            const url = localStorage.getItem(STORAGE_KEY);
            if (url && isValidUrl(url)) {
                return url;
            }
        } catch (e) {
            // Silent fail
            console.warn('Failed to retrieve return URL:', e);
        }
        return null;
    }

    /**
     * Clears stored return URL
     */
    function clearStoredReturnUrl() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Handles the back navigation
     * Prioritizes: stored return URL > browser history
     */
    function handleBack() {
        try {
            const returnUrl = getStoredReturnUrl();
            
            if (returnUrl) {
                // Clear stored URL before redirecting
                clearStoredReturnUrl();
                window.location.href = returnUrl;
            } else {
                // Fallback to browser history
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // Ultimate fallback - go to root
                    window.location.href = '/';
                }
            }
        } catch (e) {
            // Ultimate fallback on any error
            console.warn('Back navigation failed:', e);
            try {
                window.history.back();
            } catch (e2) {
                // Do nothing - WebView may block this
            }
        }
    }

    /**
     * Creates and injects the universal back button
     */
    function createBackButton() {
        try {
            // Check if button already exists
            if (document.getElementById('demo-back-btn')) {
                return;
            }

            // Create button element
            const button = document.createElement('button');
            button.id = 'demo-back-btn';
            button.setAttribute('aria-label', 'Go Back');
            button.setAttribute('title', 'Go Back');
            
            // SVG arrow icon
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            `;

            // Inject styles
            const style = document.createElement('style');
            style.id = 'demo-back-btn-styles';
            style.textContent = `
                #demo-back-btn {
                    position: fixed;
                    top: 16px;
                    left: 16px;
                    z-index: 999999;
                    width: 44px;
                    height: 44px;
                    border: none;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.75);
                    color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    transition: all 0.2s ease;
                    opacity: 0;
                    transform: translateX(-10px);
                    animation: demo-back-btn-appear 0.3s ease forwards;
                    animation-delay: 0.5s;
                }

                @keyframes demo-back-btn-appear {
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                #demo-back-btn:hover {
                    background: rgba(0, 0, 0, 0.9);
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
                }

                #demo-back-btn:active {
                    transform: scale(0.95);
                }

                #demo-back-btn:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.25);
                }

                #demo-back-btn svg {
                    flex-shrink: 0;
                }

                /* Mobile adjustments */
                @media (max-width: 768px) {
                    #demo-back-btn {
                        width: 40px;
                        height: 40px;
                        top: 12px;
                        left: 12px;
                    }

                    #demo-back-btn svg {
                        width: 18px;
                        height: 18px;
                    }
                }

                /* Respect reduced motion preferences */
                @media (prefers-reduced-motion: reduce) {
                    #demo-back-btn {
                        animation: none;
                        opacity: 1;
                        transform: none;
                    }

                    #demo-back-btn:hover {
                        transform: none;
                    }
                }
            `;

            // Add to document
            document.head.appendChild(style);
            document.body.appendChild(button);

            // Attach click handler
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleBack();
            });

        } catch (e) {
            console.warn('Failed to create back button:', e);
        }
    }

    /**
     * Initialize the redirect system
     */
    function init() {
        try {
            // 1. Check for return parameter and store it
            const returnParam = getReturnParam();
            if (returnParam) {
                storeReturnUrl(returnParam);
            }

            // 2. Create back button when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createBackButton);
            } else {
                createBackButton();
            }

        } catch (e) {
            console.warn('Redirect system initialization failed:', e);
        }
    }

    // Export functions for external use (if needed)
    window.DemoRedirect = {
        handleBack: handleBack,
        getStoredReturnUrl: getStoredReturnUrl,
        clearStoredReturnUrl: clearStoredReturnUrl
    };

    // Auto-initialize
    init();

})();
