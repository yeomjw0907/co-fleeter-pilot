-- ============================================
-- Pending Orders 확인 SQL
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================

-- 1. REQUESTED/REQUESTING 상태인 모든 주문 조회
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
    timestamp,
    created_at
FROM orders
WHERE status IN ('REQUESTED', 'REQUESTING')
ORDER BY timestamp DESC;

-- 2. EUA Pending 주문만 조회
SELECT 
    id,
    type,
    status,
    owner,
    quantity,
    price,
    "linkedOrderId",
    timestamp
FROM orders
WHERE symbol = 'EUA' 
  AND status IN ('REQUESTED', 'REQUESTING')
ORDER BY timestamp DESC;

-- 3. FEM Pending 주문만 조회
SELECT 
    id,
    type,
    status,
    owner,
    quantity,
    price,
    "linkedOrderId",
    timestamp
FROM orders
WHERE symbol = 'FEM' 
  AND status IN ('REQUESTED', 'REQUESTING')
ORDER BY timestamp DESC;

-- 4. Broken Links 확인 (linkedOrderId가 존재하지 않는 경우)
SELECT 
    o1.id as order_id,
    o1.status,
    o1.symbol,
    o1."linkedOrderId",
    CASE 
        WHEN o2.id IS NULL THEN 'BROKEN LINK'
        ELSE 'OK'
    END as link_status
FROM orders o1
LEFT JOIN orders o2 ON o1."linkedOrderId" = o2.id
WHERE o1.status IN ('REQUESTED', 'REQUESTING')
  AND o1."linkedOrderId" IS NOT NULL;

-- 5. 요약 통계
SELECT 
    symbol,
    status,
    COUNT(*) as count
FROM orders
WHERE status IN ('REQUESTED', 'REQUESTING')
GROUP BY symbol, status
ORDER BY symbol, status;
