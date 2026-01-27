-- ============================================
-- Co-Fleeter Supabase 테이블 스키마 업데이트
-- 실제 데이터 구조에 맞게 테이블 수정
-- ============================================

-- 1. Users 테이블 수정 (id_custom, phone 컬럼 추가)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS id_custom TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Orders 테이블 수정 (linkedOrderId 컬럼 추가)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS "linkedOrderId" TEXT,
ADD COLUMN IF NOT EXISTS "ownerCompany" TEXT;

-- linkedOrderId는 nullable이어야 함 (모든 주문이 연결된 것은 아님)

-- 3. 기존 데이터 삭제 (재마이그레이션 준비)
DELETE FROM user_data;
DELETE FROM fleets;
DELETE FROM trades;
DELETE FROM orders;
DELETE FROM users;

-- 완료
SELECT 'Tables updated successfully!' AS status;
