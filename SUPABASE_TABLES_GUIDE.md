# 📊 Supabase 테이블 구조 설명

## 정규화된 테이블 (Normalized Tables)

### 1. `users` 테이블 👥
**용도**: 사용자 계정 정보 저장

**컬럼 구조**:
```sql
- id (TEXT, PRIMARY KEY): 사용자 고유 ID (예: "user_1765888655541", "admin_cf")
- email (TEXT, UNIQUE): 로그인용 이메일 주소
- password (TEXT): 비밀번호 (현재 평문, 추후 해싱 권장)
- name (TEXT): 사용자 실명
- company (TEXT): 회사명
- role (TEXT): 역할 (ADMIN, USER, TRADER 등)
- permissions (JSONB): 권한 배열 ["MANAGE_FLEET", "VIEW_CALCULATOR", ...]
- id_custom (TEXT, NULLABLE): 커스텀 ID (예: "cfadmin")
- phone (TEXT, NULLABLE): 전화번호
- created_at (TIMESTAMP): 계정 생성일
```

**예시 데이터**:
```json
{
  "id": "admin_cf",
  "email": "cfadmin@cofleeter.com",
  "name": "Super Admin",
  "company": "Co-Fleeter",
  "role": "ADMIN",
  "permissions": ["VIEW_ADMIN", "MANAGE_USERS", "MANAGE_FLEET", ...]
}
```

---

### 2. `fleets` 테이블 🚢
**용도**: 각 사용자가 소유한 선박(Fleet) 정보 저장

**컬럼 구조**:
```sql
- id (UUID, PRIMARY KEY): 고유 ID (자동 생성)
- user_id (TEXT, FOREIGN KEY → users.id): 선박 소유자 ID
- ships (JSONB): 선박 배열 (선박 상세 정보)
- created_at (TIMESTAMP): 생성일
- updated_at (TIMESTAMP): 수정일
```

**ships JSONB 구조**:
```json
[
  {
    "id": "9947598",           // IMO 번호
    "name": "Puteri Ledang",   // 선박명
    "type": "LNG carrier",     // 선박 타입
    "dwt": 93414,              // 재화중량톤수
    "year": 2025,              // 건조년도
    "cii_rating": "B",         // CII 등급 (A~E)
    "co2_ytd": 934.2           // 올해 CO2 배출량 (톤)
  }
]
```

**관계**: `fleets.user_id` → `users.id`

---

### 3. `orders` 테이블 📋
**용도**: 탄소배출권 거래 주문 (매수/매도/RFQ) 저장

**컬럼 구조**:
```sql
- id (TEXT, PRIMARY KEY): 주문 고유 ID (예: "ord_1767594084668d8jmy")
- timestamp (BIGINT): 주문 생성 시간 (Unix timestamp)
- quotes (JSONB): RFQ 견적 응답들
- status (TEXT): 주문 상태 (OPEN, PROCESSING, MATCHED, CANCELLED)
- symbol (TEXT): 거래 상품 (EUA, FEM, ETS 등)
- type (TEXT): 주문 타입 (BUY, SELL, RFQ)
- quantity (INTEGER): 수량
- price (NUMERIC): 가격
- owner (TEXT): 주문 생성자 이름
- ownerCompany (TEXT): 회사명
- linkedOrderId (TEXT, NULLABLE): 연결된 반대편 주문 ID (매칭 시)
- created_at (TIMESTAMP): 생성일
```

**예시 데이터**:
```json
{
  "id": "ord_1767536754153yl14l",
  "timestamp": 1767536754153,
  "status": "PROCESSING",
  "symbol": "FEM",
  "type": "BUY",
  "quantity": 500,
  "price": 200,
  "owner": "JOO SUNGJUN",
  "ownerCompany": "HYUNDAI LNG SHIPPING CO., LTD.",
  "linkedOrderId": "ord_1767535493175kpufa"  // 매칭된 SELL 주문
}
```

**주문 흐름**:
1. `OPEN`: 주문 등록 후 대기 중
2. `PROCESSING`: 매칭 진행 중
3. `MATCHED`: 거래 체결 완료
4. `CANCELLED`: 주문 취소

---

### 4. `trades` 테이블 💰
**용도**: 체결된 거래 내역 저장

**컬럼 구조**:
```sql
- id (TEXT, PRIMARY KEY): 거래 고유 ID
- timestamp (BIGINT): 거래 체결 시간
- type (TEXT): 거래 타입 (MATCH, RFQ_MATCH)
- symbol (TEXT): 거래 상품
- quantity (INTEGER): 거래 수량
- price (NUMERIC): 체결 가격
- buyer (TEXT): 매수자 이름
- seller (TEXT): 매도자 이름
- buyerCompany (TEXT): 매수자 회사
- sellerCompany (TEXT): 매도자 회사
- created_at (TIMESTAMP): 생성일
```

**예시 데이터**:
```json
{
  "id": "trade_1767536754200xyz",
  "timestamp": 1767536754200,
  "type": "MATCH",
  "symbol": "FEM",
  "quantity": 500,
  "price": 200,
  "buyer": "JOO SUNGJUN",
  "seller": "주성준",
  "buyerCompany": "HYUNDAI LNG SHIPPING CO., LTD.",
  "sellerCompany": "현대엘엔지쉽핑"
}
```

**용도**: 거래 히스토리, 통계, 리포트 생성에 사용

---

### 5. `user_data` 테이블 📊
**용도**: 사용자의 CII 계산 결과 및 히스토리 저장

**컬럼 구조**:
```sql
- id (UUID, PRIMARY KEY): 고유 ID (자동 생성)
- user_id (TEXT, FOREIGN KEY → users.id): 사용자 ID
- calculations (JSONB): 계산 결과 배열
- created_at (TIMESTAMP): 생성일
- updated_at (TIMESTAMP): 수정일
```

**calculations JSONB 구조**:
```json
[
  {
    "timestamp": 1767536800000,
    "ship_id": "9947598",
    "ship_name": "Puteri Ledang",
    "calculation_type": "CII",
    "result": {
      "attained_cii": 5.2,
      "required_cii": 6.1,
      "rating": "B",
      "co2_total": 934.2
    }
  }
]
```

**관계**: `user_data.user_id` → `users.id`

**용도**: 계산 히스토리 조회, 사용자별 데이터 분석

---

## 전역 데이터 테이블 (Global Data)

### 6. `global_data` 테이블 🌐
**용도**: 시스템 전역 설정 및 참조 데이터 저장 (Key-Value 형태)

**컬럼 구조**:
```sql
- key (TEXT, PRIMARY KEY): 데이터 키
- data (JSONB): 데이터 값 (JSON 객체)
- updated_at (TIMESTAMP): 최종 수정일
```

**저장되는 데이터**:

#### 6.1 `fuelData`
**용도**: 연료 타입별 탄소 배출 계수
```json
{
  "HFO": { "cf": 3.114, "lcv": 40.2 },
  "LFO": { "cf": 3.151, "lcv": 41.0 },
  "MDO": { "cf": 3.206, "lcv": 42.7 },
  "LNG": { "cf": 2.750, "lcv": 48.0 }
}
```

#### 6.2 `euData`
**용도**: EU ETS 탄소배출권 시장 가격 데이터 (769개 레코드)
```json
[
  {
    "date": "2024-01-02",
    "price": 85.50,
    "change": 0.5,
    "volume": 12500
  }
]
```

#### 6.3 `traderContacts`
**용도**: 거래자(Trader) 연락처 정보
```json
[
  {
    "id": "trader_001",
    "name": "김거래",
    "company": "Trading Corp",
    "email": "kim@trading.com",
    "phone": "010-1234-5678"
  }
]
```

#### 6.4 `emailConfig`
**용도**: 이메일 발송 설정 (거래 알림 등)
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "from_email": "noreply@cofleeter.com",
  "templates": {
    "trade_matched": "거래가 체결되었습니다..."
  }
}
```

#### 6.5 `pools` (예정)
**용도**: 배출권 공동구매 풀(Pool) 정보
```json
[
  {
    "id": "pool_001",
    "name": "SME Pool 2025",
    "participants": ["user_001", "user_002"],
    "target_quantity": 10000,
    "current_quantity": 7500
  }
]
```

---

## 기타 테이블

### 7. `access_logs` 테이블 📝
**용도**: 사용자 접속 로그 (현재 미사용, 향후 확장용)

**컬럼 구조**:
```sql
- id (UUID, PRIMARY KEY)
- user_id (TEXT)
- action (TEXT): 액션 타입 (LOGIN, LOGOUT, VIEW_PAGE 등)
- timestamp (TIMESTAMP)
- ip_address (TEXT)
- metadata (JSONB)
```

---

## 테이블 간 관계도

```
users (사용자)
  ↓ 1:N
fleets (선박)
  
users (사용자)
  ↓ 1:N
user_data (계산 데이터)

orders (주문)
  ↓ N:N (linkedOrderId)
orders (반대편 주문)
  ↓ 생성
trades (체결 내역)

global_data (전역 설정)
  → 모든 사용자가 공유
```

---

## 데이터 흐름 예시

### 사용자 등록 및 선박 추가
1. `users` 테이블에 사용자 생성
2. `fleets` 테이블에 `user_id`로 선박 정보 저장
3. 선박 CII 계산 후 `user_data`에 결과 저장

### 거래 프로세스
1. **주문 등록**: `orders` 테이블에 BUY/SELL 주문 생성 (status: OPEN)
2. **매칭**: 반대편 주문 찾아서 `linkedOrderId` 연결 (status: PROCESSING)
3. **체결**: `trades` 테이블에 거래 내역 생성 (status: MATCHED)

---

## 데이터 확인 방법

### Supabase Dashboard
1. **Table Editor** → 각 테이블 직접 조회/수정
2. **SQL Editor** → 복잡한 쿼리 실행

### 예시 쿼리

```sql
-- 특정 사용자의 선박 조회
SELECT u.name, f.ships 
FROM users u
JOIN fleets f ON u.id = f.user_id
WHERE u.email = 'cfadmin@cofleeter.com';

-- 체결된 거래 내역 조회
SELECT * FROM trades 
WHERE symbol = 'EUA' 
ORDER BY timestamp DESC 
LIMIT 10;

-- 특정 사용자의 계산 히스토리
SELECT u.name, ud.calculations 
FROM users u
JOIN user_data ud ON u.id = ud.user_id
WHERE u.id = 'user_1765888655541';

-- 모든 OPEN 상태 주문 조회
SELECT * FROM orders 
WHERE status = 'OPEN' 
ORDER BY timestamp DESC;
```

---

## 정규화의 장점

### 이전 (global_data에 모두 저장)
❌ 모든 데이터가 하나의 테이블에 섞여있음  
❌ 데이터 관계 파악 어려움  
❌ 쿼리 성능 저하  
❌ 데이터 무결성 보장 어려움

### 현재 (정규화된 테이블 구조)
✅ 각 엔티티(사용자, 선박, 주문 등)가 독립된 테이블  
✅ Foreign Key로 데이터 무결성 보장  
✅ 효율적인 쿼리 및 인덱싱  
✅ 확장성 및 유지보수 용이  
✅ Supabase의 Realtime, RLS 등 기능 활용 가능

---

## 다음 개선 사항

1. **보안 강화**: 비밀번호 해싱 (bcrypt)
2. **RLS 활성화**: Row Level Security로 사용자별 데이터 격리
3. **인덱스 추가**: 자주 조회하는 컬럼에 인덱스 생성
4. **Realtime 구독**: 주문/거래 실시간 업데이트
5. **Audit 로그**: 모든 데이터 변경 기록
