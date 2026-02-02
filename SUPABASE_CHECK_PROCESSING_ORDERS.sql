-- ============================================
-- PROCESSING 상태 주문 상세 확인
-- ============================================

-- PROCESSING 상태인 주문 상세 정보
SELECT 
    id,
    symbol,
    type,
    status,
    owner,
    "ownerCompany",
    quantity,
    price,
    "linkedOrderId",
    "filled_price",
    "filled_by",
    timestamp,
    created_at
FROM orders
WHERE status = 'PROCESSING'
ORDER BY timestamp DESC;

-- PROCESSING 상태 주문의 linkedOrderId 확인
SELECT 
    o1.id as processing_order_id,
    o1.symbol,
    o1.type,
    o1.owner,
    o1.quantity,
    o1.price,
    o1."linkedOrderId",
    o2.id as linked_order_id,
    o2.status as linked_order_status,
    o2.owner as linked_order_owner
FROM orders o1
LEFT JOIN orders o2 ON o1."linkedOrderId" = o2.id
WHERE o1.status = 'PROCESSING'
ORDER BY o1.timestamp DESC;
