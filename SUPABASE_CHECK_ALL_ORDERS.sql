-- ============================================
-- 모든 주문 상태 확인 SQL
-- ============================================

-- 1. 모든 주문의 상태별 개수
SELECT 
    status,
    COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 2. EUA 주문 상태 확인
SELECT 
    status,
    COUNT(*) as count
FROM orders
WHERE symbol = 'EUA'
GROUP BY status
ORDER BY count DESC;

-- 3. FEM 주문 상태 확인
SELECT 
    status,
    COUNT(*) as count
FROM orders
WHERE symbol = 'FEM'
GROUP BY status
ORDER BY count DESC;

-- 4. 최근 주문 20개 (상태 포함)
SELECT 
    id,
    symbol,
    type,
    status,
    owner,
    quantity,
    price,
    timestamp,
    created_at
FROM orders
ORDER BY timestamp DESC
LIMIT 20;

-- 5. 특정 상태의 주문 상세 조회
SELECT 
    id,
    symbol,
    type,
    status,
    owner,
    quantity,
    price,
    "linkedOrderId",
    timestamp
FROM orders
WHERE status IN ('OPEN', 'PROCESSING', 'CONTRACT', 'FILLED', 'CANCELLED')
ORDER BY timestamp DESC;
