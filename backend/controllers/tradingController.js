const { db, save } = require('../models/store');
const emailService = require('../services/emailService');

exports.getOrders = (req, res) => {
    const { symbol, userEmail } = req.query;
    let result = JSON.parse(JSON.stringify(db.orders)); // Deep Clean Copy

    if (symbol) {
        result = result.filter(o => o.symbol === symbol);
    }

    // Role-based filtering
    const user = db.users.find(u => u.email === userEmail);
    const isTrader = user && user.role === 'TRADER';
    const isAdmin = user && user.role === 'ADMIN';

    if (!isAdmin && !isTrader) {
        if (user) {
            // Standard User sees only their own, EXCEPT for public market orders (non-RFQ)
            // This allows the Order Book to be populated with everyone's orders.
            result = result.filter(o => o.owner === user.name || o.type !== 'RFQ');
        } else {
            result = [];
        }
    }

    const userName = user ? user.name : '';

    result = result.map(order => {
        // Privacy for RFQ
        if (order.type === 'RFQ' && order.quotes) {
            const isOwner = order.owner === userName;
            if (!isAdmin && !isOwner) {
                if (isTrader) {
                    const myQuote = order.quotes[userEmail];
                    order.quotes = myQuote ? { [userEmail]: myQuote } : {};
                } else {
                    order.quotes = {};
                }
            }
        }

        // Blind Bidding Phase for Traders
        if (isTrader && order.status === 'OPEN' && order.type === 'RFQ') {
            order.owner = '';
        }

        // Processing/Filled anonymity unless winner
        if (isTrader && (order.status === 'PROCESSING' || order.status === 'FILLED')) {
            const iAmWinner = order.filledBy === userName;
            if (!iAmWinner) order.owner = '';
        }

        return order;
    });

    if (!isAdmin) {
        result = result.filter(o => !o.deleted);
    }

    res.json(result);
};

exports.createOrder = (req, res) => {
    const order = {
        id: 'ord_' + Date.now() + Math.random().toString(36).substr(2, 5),
        timestamp: Date.now(),
        quotes: {},
        status: 'OPEN',
        ...req.body
    };

    const ownerUser = db.users.find(u => u.name === order.owner);
    order.ownerCompany = ownerUser && ownerUser.company ? ownerUser.company : order.owner;

    if (order.type === 'RFQ') {
        const etsTraders = db.traderContacts.ETS || {};
        const recipients = Object.values(etsTraders)
            .filter(c => c.email && c.email.trim() !== '')
            .map(c => c.email);

        if (recipients.length > 0) {
            const now = new Date();
            const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const subject = `[Co-Fleeter] RFQ Notification (${dateStr} ${timeStr})`;
            const text = `
[견적 요청 알림]
새로운 견적 요청(RFQ)이 접수되었습니다.
Co-Fleeter 시스템에 접속하여 상세 내용을 확인하고 견적을 제출해 주시기 바랍니다.
■ 요청 수량: ${order.quantity.toLocaleString()} EUA
--------------------------------------------------
[RFQ Notification]
A new Request for Quote (RFQ) has been received.
Please log in to the Co-Fleeter system to review the details and submit your quote.
■ Requested Quantity: ${order.quantity.toLocaleString()} EUA
`;
            emailService.sendEmail(recipients.join(', '), subject, text);
        }
    }

    db.orders.unshift(order);
    save.trading();
    res.json({ success: true, order });
};

exports.deleteOrder = (req, res) => {
    const { id } = req.params;
    const index = db.orders.findIndex(o => o.id === id);

    if (index !== -1) {
        db.orders[index].deleted = true;
        db.orders[index].status = 'DELETED';
        save.trading();
        res.json({ success: true, message: 'Order deleted' });
    } else {
        res.status(404).json({ success: false, message: 'Order not found' });
    }
};

exports.matchOrder = (req, res) => {
    const { orderId } = req.body;
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = db.orders[orderIndex];
    let remainingQty = order.quantity;
    const executedTrades = [];

    const opponents = db.orders.filter(o => {
        if (o.id === orderId) return false;
        if (order.type === 'BUY') {
            return o.type === 'SELL' && o.price <= order.price && o.symbol === order.symbol;
        } else {
            return o.type === 'BUY' && o.price >= order.price && o.symbol === order.symbol;
        }
    }).sort((a, b) => order.type === 'BUY' ? a.price - b.price : b.price - a.price);

    for (const matchOrder of opponents) {
        if (remainingQty <= 0) break;
        const matchQty = Math.min(remainingQty, matchOrder.quantity);
        const execPrice = matchOrder.price;

        const trade = {
            id: 'trd_' + Date.now() + Math.random(),
            timestamp: Date.now(),
            symbol: order.symbol,
            type: 'MATCH',
            quantity: matchQty,
            price: execPrice,
            buyer: order.type === 'BUY' ? order.owner : matchOrder.owner,
            seller: order.type === 'SELL' ? order.owner : matchOrder.owner,
            aggressor: order.id
        };

        executedTrades.push(trade);
        db.trades.unshift(trade);

        // Update Volumes Cache
        if (!db.executedVolumes[order.symbol]) db.executedVolumes[order.symbol] = {};
        const pKey = execPrice.toFixed(2);
        db.executedVolumes[order.symbol][pKey] = (db.executedVolumes[order.symbol][pKey] || 0) + matchQty;

        const matchIndex = db.orders.findIndex(o => o.id === matchOrder.id);
        if (matchOrder.quantity <= matchQty) {
            db.orders.splice(matchIndex, 1);
        } else {
            db.orders[matchIndex].quantity -= matchQty;
        }
        remainingQty -= matchQty;
    }

    const updatedIndex = db.orders.findIndex(o => o.id === orderId);
    if (updatedIndex !== -1) {
        if (remainingQty <= 0) db.orders.splice(updatedIndex, 1);
        else db.orders[updatedIndex].quantity = remainingQty;
    }

    if (executedTrades.length > 0) save.trading();

    res.json({ success: true, executedQty: order.quantity - remainingQty, executedTrades });
};

exports.getHistory = (req, res) => {
    const { symbol } = req.query;
    let result = db.trades;
    if (symbol) result = result.filter(t => t.symbol === symbol);
    res.json(result);
};

exports.submitQuote = (req, res) => {
    const { orderId, traderEmail, price } = req.body;
    const order = db.orders.find(o => o.id === orderId);

    // Validation
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.type !== 'RFQ') return res.status(400).json({ success: false });
    if (order.status !== 'OPEN') return res.status(400).json({ success: false });

    const trader = db.users.find(u => u.email === traderEmail);
    if (!trader || trader.role !== 'TRADER') return res.status(403).json({ success: false });

    if (!order.quotes) order.quotes = {};
    order.quotes[traderEmail] = {
        price: parseFloat(price),
        traderName: trader.name,
        timestamp: Date.now()
    };

    save.trading();
    res.json({ success: true, message: 'Quote submitted' });
};

exports.acceptQuote = (req, res) => {
    const { orderId, traderEmail, phone } = req.body;
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return res.status(404).json({ success: false });
    const order = db.orders[orderIndex];

    const quote = order.quotes ? order.quotes[traderEmail] : null;
    if (!quote) return res.status(400).json({ success: false, message: 'Quote not found' });
    if (order.status !== 'OPEN') return res.status(400).json({ success: false });

    const trade = {
        id: 'trd_' + Date.now() + Math.random(),
        timestamp: Date.now(),
        symbol: order.symbol,
        type: 'RFQ_MATCH',
        quantity: order.quantity,
        price: quote.price,
        buyer: order.owner,
        seller: quote.traderName,
        aggressor: order.id
    };

    db.trades.unshift(trade);

    order.status = 'PROCESSING';
    order.filledPrice = quote.price;
    order.filledBy = quote.traderName;

    // Email
    // Dynamic Email Logic
    let contactEmail = traderEmail;

    // Lookup Real Notification Email in Admin Contacts
    try {
        const etsTraders = db.traderContacts.ETS || {};
        const contactList = Array.isArray(etsTraders) ? etsTraders : Object.values(etsTraders);

        // Find contact where loginId matches, OR if legacy/missing loginId, where email matches
        // But since traderEmail IS the Login ID coming from the Quote Key, we search for loginId/old-email
        const contact = contactList.find(c => (c.loginId && c.loginId === traderEmail) || (!c.loginId && c.email === traderEmail));

        if (contact && contact.email) {
            contactEmail = contact.email; // Use the Real Notification Email
        }
    } catch (err) {
        console.error("Error looking up contact email:", err);
    }

    if (contactEmail) {
        // Legacy logic check: order.owner seems to be 'Name' based on order creation
        const buyer = db.users.find(u => u.name === order.owner);

        if (buyer && phone) {
            buyer.phone = phone;
            save.users(); // Persist phone update
        }

        const buyerCompany = buyer ? buyer.company : 'Unknown';
        const buyerName = buyer ? buyer.name : order.owner;
        const buyerEmail = buyer ? buyer.email : 'N/A';
        const buyerPhone = buyer ? buyer.phone : phone;

        const subject = `[Co-Fleeter] Quote Accepted - Action Required`;
        const text = `
            Dear Trader,
            Your quote has been accepted.
            
            Transaction Details:
            - Symbol: ${order.symbol}
            - Quantity: ${order.quantity}
            - Price: €${quote.price}
            
            Buyer Details:
            - Company: ${buyerCompany}
            - Name: ${buyerName}
            - Email: ${buyerEmail}
            - Phone: ${buyerPhone || 'Not Provided'}
            
            Please proceed with the transaction.
        `;
        emailService.sendEmail(contactEmail, subject, text);
    }

    save.trading();
    res.json({ success: true, trade });
};

exports.completeOrder = (req, res) => {
    const { orderId } = req.body;
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ success: false });
    if (order.status !== 'CONTRACT') return res.status(400).json({ success: false, message: 'Order strictly requires CONTRACT status to complete.' });

    order.status = 'FILLED';
    save.trading();
    res.json({ success: true });
};

exports.requestTransaction = (req, res) => {
    const { orderId } = req.body;
    const order = db.orders.find(o => o.id === orderId);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Order is not open' });

    // Find a matching order to link with
    // For simplicity in this direct handshake model, we find the best price match that is OPEN
    const opponentType = order.type === 'BUY' ? 'SELL' : 'BUY';
    const potentialMatches = db.orders.filter(o =>
        o.symbol === order.symbol &&
        o.type === opponentType &&
        o.status === 'OPEN' &&
        (order.type === 'BUY' ? o.price <= order.price : o.price >= order.price)
    ).sort((a, b) => order.type === 'BUY' ? a.price - b.price : b.price - a.price);

    if (potentialMatches.length === 0) {
        return res.status(400).json({ success: false, message: 'No matching order found to request transaction with.' });
    }

    const targetOrder = potentialMatches[0]; // Best match

    // Update statuses
    // Constraint: Sell Quantity >= Buy Quantity
    let sellOrder, buyOrder;
    if (order.type === 'SELL') {
        sellOrder = order;
        buyOrder = targetOrder;
    } else {
        sellOrder = targetOrder;
        buyOrder = order;
    }

    if (sellOrder.quantity < buyOrder.quantity) {
        return res.status(400).json({
            success: false,
            message: `Cannot request: Sell Quantity (${sellOrder.quantity}) must be >= Buy Quantity (${buyOrder.quantity}).`
        });
    }

    // Update statuses
    // Link orders
    order.status = 'REQUESTING';
    order.linkedOrderId = targetOrder.id;

    targetOrder.status = 'REQUESTED';
    targetOrder.linkedOrderId = order.id;

    // --- Email Notification Logic (Match Found -> Notify Users) ---
    try {
        const buyerName = buyOrder.owner;
        const sellerName = sellOrder.owner;

        const buyerUser = db.users.find(u => u.name === buyerName) || {};
        const sellerUser = db.users.find(u => u.name === sellerName) || {};

        // Send to Buyer
        if (buyerUser.email) {
            const subject = `[Co-Fleeter] Match Found for your Buy Order`;
            const text = `A matching Sell order has been found for your request.\n\nQuantity: ${buyOrder.quantity}\nPrice: €${buyOrder.price}\n\nPlease log in and proceed to 'AGREE' if you wish to continue to Contract.`;
            emailService.sendEmail(buyerUser.email, subject, text);
        }

        // Send to Seller
        if (sellerUser.email) {
            const subject = `[Co-Fleeter] Request Received for your Sell Order`;
            const text = `A Buyer has requested a transaction on your order.\n\nRequested Qty: ${buyOrder.quantity}\nPrice: €${sellOrder.price}\n\nPlease log in and 'AGREE' to start the Contract.`;
            emailService.sendEmail(sellerUser.email, subject, text);
        }

    } catch (e) {
        console.error("Error sending user notifications in requestTransaction:", e);
    }

    save.trading();
    res.json({ success: true, message: 'Transaction requested. Notification sent to parties.' });
};

exports.agreeTransaction = (req, res) => {
    const { orderId } = req.body;
    const order = db.orders.find(o => o.id === orderId);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'REQUESTED') return res.status(400).json({ success: false, message: 'Order is not in requested state' });


    const initiatorOrder = db.orders.find(o => o.id === order.linkedOrderId);
    if (!initiatorOrder || initiatorOrder.status !== 'REQUESTING') {
        // Rollback state if link is broken
        order.status = 'OPEN';
        delete order.linkedOrderId;
        save.trading();
        return res.status(400).json({ success: false, message: 'Initiating order not found or invalid.' });
    }

    // Determine Buy/Sell roles
    let sellOrder, buyOrder;
    if (order.type === 'SELL') {
        sellOrder = order;
        buyOrder = initiatorOrder;
    } else {
        sellOrder = initiatorOrder;
        buyOrder = order;
    }

    // Logic for Splitting Sell Order if Sell > Buy
    // Note: 'order' or 'initiatorOrder' references might point to the Sell Order.
    // We need to carefully handle the references.

    const matchQty = buyOrder.quantity;
    const execPrice = sellOrder.price; // Sell price governs usually, or established price

    let finalSellOrderId = sellOrder.id;

    if (sellOrder.quantity > buyOrder.quantity) {
        // PARTIAL FILL SCENARIO
        const remainingQty = sellOrder.quantity - matchQty;

        // 1. Create New Child Sell Order for the CONTRACT
        const contractSellOrder = {
            ...sellOrder,
            id: 'ord_' + Date.now() + '_sub',
            quantity: matchQty,
            status: 'CONTRACT',
            linkedOrderId: buyOrder.id,
            timestamp: Date.now() // New timestamp for the contract part? Or keep old? Let's update.
        };
        db.orders.unshift(contractSellOrder);
        finalSellOrderId = contractSellOrder.id;

        // 2. Update Original Sell Order (Remaining Open)
        sellOrder.quantity = remainingQty;
        sellOrder.status = 'OPEN';
        delete sellOrder.linkedOrderId; // Unlink the remaining part

        // 3. Update Buy Order link to the new Child
        buyOrder.linkedOrderId = contractSellOrder.id;

    } else {
        // FULL FILL SCENARIO
        sellOrder.status = 'CONTRACT';
    }

    buyOrder.status = 'CONTRACT';

    // --- Email Notification Logic (Contract Started -> Notify FuelEU Trader) ---
    try {
        const buyerName = buyOrder.owner;
        const sellerName = sellOrder.owner;

        const buyerUser = db.users.find(u => u.name === buyerName) || {};
        const sellerUser = db.users.find(u => u.name === sellerName) || {};

        const aaTrader = (db.traderContacts.FuelEU && db.traderContacts.FuelEU["AA Trader"])
            ? db.traderContacts.FuelEU["AA Trader"]
            : null;


        if (aaTrader && aaTrader.email) {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0];
            // Subject: [Co-Fleeter] FuelEU RFQ Notification (Date Time)
            const subject = `[Co-Fleeter] FuelEU RFQ Notification (${dateStr} ${timeStr})`;

            const text = `FuelEU Transaction Notification / FuelEU 거래 알림

Please proceed with FuelEU Pooling.
FuelEU Pooling을 진행해주세요.

Please find the details below for the agreed contract.
합의된 계약에 대한 세부 내용은 아래와 같습니다.

[Contract Summary / 체결 요약]
Quantity (수량): ${matchQty}
Unit Price (단가): €${execPrice}
Total Price (총액): €${(matchQty * execPrice).toLocaleString()}

[Buyer Information / 매수자 정보]
Company (회사): ${buyerUser.company || '-'}
Name (이름): ${buyerUser.name || buyerName}
Email (이메일): ${buyerUser.email || '-'}
Phone (전화번호): ${buyerUser.phone || '-'}

[Seller Information / 매도자 정보]
Company (회사): ${sellerUser.company || '-'}
Name (이름): ${sellerUser.name || sellerName}
Email (이메일): ${sellerUser.email || '-'}
Phone (전화번호): ${sellerUser.phone || '-'}

Please facilitate the transaction process.
거래 진행 부탁드립니다.`;

            emailService.sendEmail(aaTrader.email, subject, text);
            console.log(`Email sent to AA Trader (${aaTrader.email}) for Contract`);
        }
    } catch (e) {
        console.error("Error sending email in agreeTransaction:", e);
    }

    save.trading();
    res.json({ success: true, message: 'Contract agreed. FuelEU Trader notified.' });
};

exports.getEuaHistory = (req, res) => {
    // Merge Logic for Admin Panel / Chart
    const sheetData = db.euaSheetCache || [];
    const manualMap = new Map();
    if (db.euaManualData) db.euaManualData.forEach(m => manualMap.set(m.date, m.price));

    const combined = sheetData.map(d => {
        const item = { ...d };
        if (manualMap.has(d.time)) {
            item.price = manualMap.get(d.time);
            // Optional: Adjust Open/High/Low if they look weird compared to new price?
            // For now, keep them, just override closing price.
        }
        manualMap.delete(d.time);
        return item;
    });

    // Append manual-only dates
    manualMap.forEach((price, date) => {
        combined.push({
            time: date,
            price: price,
            open: price, high: price, low: price, vol: '-',
            change: '0.00%',
            source: 'MANUAL_ONLY'
        });
    });

    // Sort Descending (Newest First)
    combined.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(combined);
};

exports.updateStatus = (req, res) => {
    const { orderId, status } = req.body;
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ success: false });

    // Allow custom status updates for tracking
    order.status = status;
    save.trading();
    res.json({ success: true });
};
