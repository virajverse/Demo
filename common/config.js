/**
 * Taliyo Config Helper
 * Include this in your demo to access environment variables
 * Usage: <script src="../common/config.js"></script>
 */

(function () {
    'use strict';

    // Get demo name from current path
    function getDemoName() {
        const pathParts = window.location.pathname.split('/').filter(p => p);
        return pathParts[0] || '';
    }

    // Fetch config from server
    async function loadConfig() {
        const demoName = getDemoName();
        if (!demoName) {
            console.warn('[Taliyo Config] Could not determine demo name');
            return {};
        }

        try {
            const response = await fetch(`/api/config/${demoName}`);
            if (!response.ok) {
                console.warn('[Taliyo Config] Failed to load config:', response.statusText);
                return {};
            }

            const data = await response.json();
            return data.config || {};
        } catch (error) {
            console.error('[Taliyo Config] Error loading config:', error);
            return {};
        }
    }

    // Initialize Config object on window
    window.TaliyoConfig = {
        data: {},
        loaded: false,

        // Load config asynchronously
        async load() {
            this.data = await loadConfig();
            this.loaded = true;

            // Dispatch event for listeners
            window.dispatchEvent(new CustomEvent('taliyoConfigLoaded', {
                detail: this.data
            }));

            return this.data;
        },

        // Get config value by key
        get(key, defaultValue = null) {
            if (!this.loaded) {
                console.warn('[Taliyo Config] Config not loaded yet. Call TaliyoConfig.load() first.');
            }
            return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
        },

        // Get all config
        getAll() {
            return { ...this.data };
        }
    };

    // Auto-load on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.TaliyoConfig.load();
        });
    } else {
        window.TaliyoConfig.load();
    }
})();
