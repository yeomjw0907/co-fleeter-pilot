/**
 * Co-Fleeter Loading State Manager
 * Handles loading indicators and skeleton UI
 */

class LoadingManager {
    constructor() {
        this.overlay = null;
        this.init();
    }

    init() {
        // Create global loading overlay
        if (!document.getElementById('loading-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'loading-overlay';
            this.overlay.className = 'loading-overlay hidden';
            this.overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div class="loading-text">Loading...</div>
                </div>
            `;
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.getElementById('loading-overlay');
        }
    }

    /**
     * Show global loading overlay
     * @param {string} message - Optional loading message
     */
    show(message = 'Loading...') {
        const textEl = this.overlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
        this.overlay.classList.remove('hidden');
    }

    /**
     * Hide global loading overlay
     */
    hide() {
        this.overlay.classList.add('hidden');
    }

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     */
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `
                <span class="btn-spinner"></span>
                <span>Processing...</span>
            `;
            button.classList.add('btn-loading');
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
            button.classList.remove('btn-loading');
        }
    }

    /**
     * Create skeleton loading UI
     * @param {number} lines - Number of skeleton lines
     * @returns {string} HTML string
     */
    createSkeleton(lines = 3) {
        let html = '<div class="skeleton-container">';
        for (let i = 0; i < lines; i++) {
            html += '<div class="skeleton-line"></div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Wrap async function with loading state
     * @param {Function} fn - Async function to wrap
     * @param {string} message - Loading message
     */
    async wrap(fn, message = 'Loading...') {
        this.show(message);
        try {
            const result = await fn();
            return result;
        } finally {
            this.hide();
        }
    }

    /**
     * Wrap button click with loading state
     * @param {HTMLElement} button - Button element
     * @param {Function} fn - Async function to execute
     */
    async wrapButton(button, fn) {
        this.setButtonLoading(button, true);
        try {
            const result = await fn();
            return result;
        } finally {
            this.setButtonLoading(button, false);
        }
    }
}

// Create global instance
const loading = new LoadingManager();
window.loading = loading;
