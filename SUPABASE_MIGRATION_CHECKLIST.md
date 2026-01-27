# 🔄 Supabase 마이그레이션 체크리스트

Co-Fleeter 프로젝트를 MongoDB에서 Supabase로 마이그레이션하는 작업 체크리스트입니다.

**예상 소요 시간: 2-3일 (16-24시간)**

---

## 📋 Phase 1: Supabase 프로젝트 설정 (1-2시간)

### 1.1 Supabase 계정 및 프로젝트 생성
- [ ] https://supabase.com 접속 및 로그인
- [ ] "New Project" 생성
  - Name: `co-fleeter`
  - Database Password: (강력한 비밀번호 생성 및 저장)
  - Region: 가장 가까운 지역 선택 (Seoul 또는 Tokyo)
- [ ] 프로젝트 생성 완료 대기 (~2분)

### 1.2 연결 정보 확인 및 저장
- [ ] Settings → API 이동
- [ ] 다음 정보 복사 및 저장:
  ```
  Project URL: https://xxxxx.supabase.co
  anon public key: eyJhbGc...
  service_role key: eyJhbGc... (서버 전용, 절대 노출 금지)
  ```

### 1.3 데이터베이스 스키마 생성
- [ ] Supabase Dashboard → SQL Editor 이동
- [ ] 아래 SQL 스크립트 실행 (총 7개 테이블)

```sql
-- 1. Users 테이블
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  role TEXT DEFAULT 'USER',
  suspended BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Fleets 테이블
CREATE TABLE fleets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ships JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Orders 테이블
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  owner TEXT NOT NULL,
  owner_company TEXT,
  status TEXT DEFAULT 'OPEN',
  quotes JSONB DEFAULT '{}'::jsonb,
  filled_price NUMERIC,
  filled_by TEXT,
  linked_order_id TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Trades 테이블
CREATE TABLE trades (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  buyer TEXT NOT NULL,
  seller TEXT NOT NULL,
  aggressor TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Pools 테이블
CREATE TABLE pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target_volume NUMERIC NOT NULL,
  current_volume NUMERIC DEFAULT 0,
  target_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'OPEN',
  owner TEXT NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at BIGINT
);

-- 6. Global Data 테이블 (key-value 저장)
CREATE TABLE global_data (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. User Data 테이블 (계산 내역 등)
CREATE TABLE user_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calculations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Access Logs 테이블
CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  name TEXT,
  role TEXT,
  ip_address TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_fleets_user_id ON fleets(user_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_pools_status ON pools(status);
```

- [ ] 테이블 생성 성공 확인
- [ ] Table Editor에서 테이블 목록 확인

---

## 📋 Phase 2: 패키지 및 의존성 업데이트 (10분)

### 2.1 패키지 설치
```bash
cd co-fleeter-pilot
npm install @supabase/supabase-js
```

### 2.2 (선택) MongoDB 패키지 제거
```bash
# 나중에 마이그레이션 완료 후 제거
# npm uninstall mongoose
```

---

## 📋 Phase 3: 코드 수정 (8-12시간)

### 3.1 Supabase 클라이언트 생성
- [ ] `backend/models/supabase.js` 파일 생성
- [ ] Supabase 클라이언트 초기화 코드 작성
- [ ] 연결 테스트 함수 작성

### 3.2 Store 모듈 수정
- [ ] `backend/models/store.js` 수정
  - [ ] `saveToSupabase()` 함수 추가
  - [ ] `loadAll()` 함수 수정 (Supabase에서 데이터 로드)
  - [ ] `save` 객체 메서드들 수정 (users, fleets, orders 등)

### 3.3 컨트롤러 수정
- [ ] `backend/controllers/authController.js` 수정
  - [ ] login 함수 (쿼리 방식 유지)
  - [ ] register 함수 (쿼리 방식 유지)
  - [ ] updateProfile 함수
- [ ] `backend/controllers/adminController.js` 수정
  - [ ] 모든 admin 함수 검증
- [ ] 기타 컨트롤러 파일 검토 및 수정
  - [ ] `tradingController.js` (존재 시)
  - [ ] `apiController.js` (존재 시)
  - [ ] `poolingController.js` (존재 시)

### 3.4 서버 설정 수정
- [ ] `backend/server.js` 수정
  - [ ] 환경 변수 체크 (MONGO_URI → SUPABASE_URL)
  - [ ] 초기화 로직 수정
- [ ] `package.json` 의존성 확인

### 3.5 환경 변수 설정
- [ ] 로컬 `.env` 파일 생성/수정
  ```env
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  NODE_ENV=development
  ```

---

## 📋 Phase 4: 데이터 마이그레이션 (2-3시간)

### 4.1 기존 데이터 백업
- [ ] 현재 MongoDB 데이터 백업
- [ ] 또는 로컬 JSON 파일 백업

### 4.2 마이그레이션 스크립트 작성
- [ ] `scripts/migrate-mongo-to-supabase.js` 생성
- [ ] MongoDB에서 데이터 추출 로직
- [ ] Supabase로 데이터 삽입 로직

### 4.3 데이터 마이그레이션 실행
- [ ] 스크립트 실행
- [ ] 데이터 검증 (users, fleets, orders, trades 등)
- [ ] Supabase Dashboard에서 데이터 확인

---

## 📋 Phase 5: 테스트 및 검증 (3-4시간)

### 5.1 로컬 환경 테스트
- [ ] 서버 시작: `npm start`
- [ ] 로그인 테스트 (admin 계정)
- [ ] 회원가입 테스트
- [ ] Fleet 관리 테스트
- [ ] 거래 기능 테스트
- [ ] Admin 기능 테스트
- [ ] 모든 페이지 동작 확인

### 5.2 에러 수정
- [ ] 콘솔 에러 확인 및 수정
- [ ] API 응답 검증
- [ ] 데이터 일관성 확인

---

## 📋 Phase 6: Vercel 배포 (1시간)

### 6.1 Vercel 환경 변수 설정
- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] 다음 변수 추가:
  ```
  SUPABASE_URL = https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY = eyJhbGc... (service_role key)
  NODE_ENV = production
  ```

### 6.2 배포
- [ ] Git commit 및 push
  ```bash
  git add .
  git commit -m "feat: Migrate from MongoDB to Supabase"
  git push origin main
  ```
- [ ] Vercel 자동 배포 확인
- [ ] 또는 수동 배포: `npm run deploy`

### 6.3 프로덕션 테스트
- [ ] 배포된 URL 접속
- [ ] 로그인 테스트
- [ ] 주요 기능 테스트
- [ ] 데이터 저장/로드 확인
- [ ] 성능 확인

---

## 📋 Phase 7: 정리 및 문서화 (30분)

### 7.1 코드 정리
- [ ] MongoDB 관련 파일 제거 (선택)
  - `backend/models/mongo.js`
  - `migrate-to-mongo.js`
  - `test-mongodb-connection.js`
- [ ] 사용하지 않는 코드 정리

### 7.2 문서 업데이트
- [ ] README.md 업데이트
- [ ] 환경 변수 가이드 업데이트
- [ ] 배포 가이드 업데이트

### 7.3 최종 확인
- [ ] 모든 기능 정상 작동 확인
- [ ] Supabase Dashboard에서 데이터 확인
- [ ] 로그 확인 (에러 없는지)

---

## ✅ 완료 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 스키마 생성 완료
- [ ] 코드 수정 완료
- [ ] 데이터 마이그레이션 완료
- [ ] 로컬 테스트 통과
- [ ] Vercel 배포 완료
- [ ] 프로덕션 테스트 통과
- [ ] MongoDB 관련 코드 정리 완료
- [ ] 문서 업데이트 완료

---

## 🚨 주의사항

1. **Service Role Key 보안**
   - Service Role Key는 절대 프론트엔드에 노출하지 말 것
   - 백엔드에서만 사용
   - GitHub에 커밋하지 않도록 .env 파일 확인

2. **Row Level Security (RLS)**
   - 초기에는 RLS 비활성화 상태로 시작
   - 서버에서 Service Role Key 사용하면 RLS 우회
   - 나중에 프론트엔드에서 직접 접근 시 RLS 정책 설정 필요

3. **데이터 백업**
   - 마이그레이션 전 반드시 백업
   - 문제 발생 시 롤백 계획 준비

4. **점진적 마이그레이션**
   - 한 번에 모든 기능을 전환하지 말고
   - 단계별로 테스트하며 진행

---

## 📞 문제 발생 시

1. Supabase 연결 실패
   - URL과 Key 확인
   - 네트워크 연결 확인
   - Supabase Dashboard에서 프로젝트 상태 확인

2. 데이터 마이그레이션 실패
   - 백업에서 복구
   - 스키마 확인
   - 데이터 형식 검증

3. 배포 실패
   - Vercel 로그 확인
   - 환경 변수 확인
   - 빌드 에러 확인

---

**마이그레이션을 시작할 준비가 되었으면 Phase 1부터 순서대로 진행하세요!** 🚀
