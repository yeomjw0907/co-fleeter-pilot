/**
 * Co-Fleeter Trading History Module
 * Track and display all trading activities
 */

class TradingHistory {
    constructor() {
        this.storageKey = 'cofleeter_trading_history';
    }

    /**
     * Add a trade to history
     * @param {Object} trade - Trade object
     */
    addTrade(trade) {
        const history = this.getHistory();
        // Ensure trade has a timestamp
        if (!trade.timestamp) {
            trade.timestamp = Date.now();
        }
        history.push(trade);
        this.saveHistory(history);
    }

    /**
     * Get all trading history
     * @returns {Array} List of trades
     */
    getHistory() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    /**
     * Save history to storage
     * @param {Array} history 
     */
    saveHistory(history) {
        localStorage.setItem(this.storageKey, JSON.stringify(history));
    }

    /**
     * Get filtered trading history
     * @param {Object} filters - Filter criteria {symbol, type, startDate, endDate}
     * @returns {Array} Filtered list of trades
     */
    getFilteredHistory(filters) {
        let history = this.getHistory();

        if (filters.symbol) {
            history = history.filter(t => t.symbol === filters.symbol);
        }
        if (filters.type) {
            history = history.filter(t => t.type === filters.type);
        }
        if (filters.startDate) {
            const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
            history = history.filter(t => new Date(t.timestamp).getTime() >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
            history = history.filter(t => new Date(t.timestamp).getTime() <= end);
        }
        return history;
    }

    /**
     * Calculate trading statistics matching the app.js requirements
     * @param {string} userEmail - Optional filter by user (not strictly used in current app.js logic but good for future)
     * @returns {Object} Stats object { totalTrades, totalVolume, totalValue, avgPrice, symbols: {...} }
     */
    getStatistics(userEmail = null) {
        const history = this.getHistory();

        const stats = {
            totalTrades: 0,
            totalVolume: 0,
            totalValue: 0,
            avgPrice: 0,
            symbols: {}
        };

        history.forEach(trade => {
            // Optional: Filter by user if needed, but app.js passes currentUser.email currently
            // Logic below assumes we aggregate ALL local history since it's client-side storage

            stats.totalTrades++;
            stats.totalVolume += (Number(trade.quantity) || 0);
            const tradeValue = (Number(trade.quantity) || 0) * (Number(trade.price) || 0);
            stats.totalValue += tradeValue;

            if (!stats.symbols[trade.symbol]) {
                stats.symbols[trade.symbol] = {
                    count: 0,
                    volume: 0,
                    value: 0
                };
            }

            stats.symbols[trade.symbol].count++;
            stats.symbols[trade.symbol].volume += (Number(trade.quantity) || 0);
            stats.symbols[trade.symbol].value += tradeValue;
        });

        stats.avgPrice = stats.totalVolume > 0
            ? stats.totalValue / stats.totalVolume
            : 0;

        return stats;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        localStorage.removeItem(this.storageKey);
        toast.success('Trading history cleared');
    }

    /**
     * Export history to CSV
     */
    exportToCSV() {
        const history = this.getHistory();

        if (history.length === 0) {
            toast.warning('No trading history to export');
            return;
        }

        const headers = ['Date', 'Time', 'Symbol', 'Type', 'Quantity', 'Price', 'Total', 'Buyer', 'Seller'];
        const rows = history.map(trade => {
            const date = new Date(trade.timestamp);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                trade.symbol,
                trade.type || 'MATCH',
                trade.quantity,
                trade.price.toFixed(2),
                (trade.quantity * trade.price).toFixed(2),
                trade.buyer || 'N/A',
                trade.seller || 'N/A'
            ];
        });

        const csv = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading_history_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Trading history exported successfully!');
    }
}

// Create global instance
const tradingHistory = new TradingHistory();
