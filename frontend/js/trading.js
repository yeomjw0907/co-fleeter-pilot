class TradingService {
    constructor() {
        this.baseUrl = '/api/trading';
    }

    async getOrders(symbolFilter = null, userEmail = null) {
        try {
            let url = this.baseUrl + '/orders?';
            if (symbolFilter) url += `symbol=${symbolFilter}&`;
            if (userEmail) url += `userEmail=${encodeURIComponent(userEmail)}`;

            const response = await fetch(url);
            return await response.json();
        } catch (e) {
            console.error('Failed to get orders', e);
            return [];
        }
    }

    async submitQuote(orderId, traderEmail, price) {
        try {
            const response = await fetch(`${this.baseUrl}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, traderEmail, price })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data;
        } catch (e) {
            console.error('Failed to submit quote', e);
            return { success: false, message: 'Network error' };
        }
    }

    async acceptQuote(orderId, traderEmail, phone) {
        try {
            const response = await fetch(`${this.baseUrl}/accept-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, traderEmail, phone })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data;
        } catch (e) {
            console.error('Failed to accept quote', e);
            return { success: false, message: 'Network error' };
        }
    }

    async placeOrder(order) {
        try {
            const response = await fetch(`${this.baseUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            const data = await response.json();
            window.dispatchEvent(new Event('market-updated'));
            return data.order;
        } catch (e) {
            console.error('Failed to place order', e);
            return null;
        }
    }

    async cancelOrder(orderId) {
        try {
            const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data.success;
        } catch (e) {
            console.error('Failed to cancel order', e);
            return false;
        }
    }

    async matchOrder(orderId) {
        try {
            const response = await fetch(`${this.baseUrl}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data;
        } catch (e) {
            console.error('Failed to match order', e);
            return { success: false, message: 'Network error' };
        }
    }

    async requestTransaction(orderId) {
        try {
            const response = await fetch(`${this.baseUrl}/request-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data;
        } catch (e) {
            console.error('Failed to request transaction', e);
            return { success: false, message: 'Network error' };
        }
    }

    async agreeTransaction(orderId) {
        try {
            const response = await fetch(`${this.baseUrl}/agree-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data;
        } catch (e) {
            console.error('Failed to agree transaction', e);
            return { success: false, message: 'Network error' };
        }
    }

    async updateStatus(orderId, status) {
        try {
            const response = await fetch(`${this.baseUrl}/orders/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status })
            });
            const data = await response.json();
            if (data.success) {
                window.dispatchEvent(new Event('market-updated'));
            }
            return data.success;
        } catch (e) {
            console.error('Failed to update status', e);
            return false;
        }
    }

    async getExecutedVolumes(symbol) {
        try {
            const response = await fetch(`${this.baseUrl}/volumes/${symbol}`);
            return await response.json();
        } catch (e) {
            console.error('Failed to get volumes', e);
            return {};
        }
    }
}

const tradingService = new TradingService();
window.tradingService = tradingService;
