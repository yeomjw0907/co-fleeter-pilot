# 🔄 Supabase로 마이그레이션 가이드

MongoDB에서 Supabase로 전환하는 방법입니다.

---

## 📋 전환 전 체크리스트

- [ ] Supabase 계정 생성 완료
- [ ] 프로젝트 생성 완료
- [ ] 데이터베이스 스키마 설계 완료
- [ ] 기존 데이터 백업 완료
- [ ] 마이그레이션 스크립트 준비 완료

---

## 1️⃣ Supabase 프로젝트 설정

### 계정 생성 및 프로젝트 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub로 로그인
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - Name: `co-fleeter`
   - Database Password: 강력한 비밀번호 (복사해두기!)
   - Region: 가장 가까운 지역 선택
6. "Create new project" 클릭 (약 2분 소요)

### 연결 정보 확인
1. Settings → API
2. 다음 정보 복사:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbGc...`
   - service_role key: `eyJhbGc...` (서버에서만 사용)

---

## 2️⃣ 데이터베이스 스키마 설계

### 현재 MongoDB 구조 분석
```javascript
// 현재 구조
- users: [] (배열)
- fleets: {} (userId별 객체)
- orders: [] (배열)
- trades: [] (배열)
- GlobalData: { key, data } (key-value)
```

### Supabase 테이블 구조

SQL Editor에서 다음 SQL 실행:

```sql
-- Users 테이블
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  role TEXT DEFAULT 'USER',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fleets 테이블
CREATE TABLE fleets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  ships JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Orders 테이블
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

-- Trades 테이블
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

-- Global Data 테이블 (key-value 저장)
CREATE TABLE global_data (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Data 테이블 (계산 내역 등)
CREATE TABLE user_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  calculations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Access Logs 테이블
CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  ip_address TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_fleets_user_id ON fleets(user_id);
```

---

## 3️⃣ 코드 수정

### 패키지 설치
```bash
cd co-fleeter-pilot
npm install @supabase/supabase-js
npm uninstall mongoose
```

### Supabase 클라이언트 생성

`backend/models/supabase.js` 생성:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
```

### Store 모델 수정

`backend/models/store.js` 수정:

```javascript
const supabase = require('./supabase');

// MongoDB 대신 Supabase 사용
async function saveToSupabase(key, data) {
  try {
    const { error } = await supabase
      .from('global_data')
      .upsert({ key, data, updated_at: new Date().toISOString() });
    
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`Supabase Save Error [${key}]`, e);
    return false;
  }
}

async function loadAll() {
  // Supabase에서 데이터 로드
  if (process.env.SUPABASE_URL) {
    console.log("Connecting to Supabase...");
    
    try {
      // Users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (!usersError && usersData) {
        db.users = usersData;
      }
      
      // Fleets
      const { data: fleetsData, error: fleetsError } = await supabase
        .from('fleets')
        .select('*');
      
      if (!fleetsError && fleetsData) {
        const fleetsObj = {};
        fleetsData.forEach(f => {
          fleetsObj[f.user_id] = f.ships;
        });
        db.fleets = fleetsObj;
      }
      
      // Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('deleted', false);
      
      if (ordersData) db.orders = ordersData;
      
      // Trades
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (tradesData) db.trades = tradesData;
      
      // Global Data
      const { data: globalData } = await supabase
        .from('global_data')
        .select('*');
      
      if (globalData) {
        globalData.forEach(item => {
          if (item.key === 'fuelData') db.fuelData = item.data;
          else if (item.key === 'euData') db.euData = item.data;
          // ... 기타 데이터
        });
      }
      
      console.log("Supabase Sync Complete.");
    } catch (e) {
      console.error("Supabase Sync Failed", e);
    }
  }
}

// Save 메서드 수정
const save = {
  users: async () => {
    if (process.env.SUPABASE_URL) {
      // Supabase에 users 저장
      for (const user of db.users) {
        await supabase.from('users').upsert(user);
      }
    }
  },
  fleets: async () => {
    if (process.env.SUPABASE_URL) {
      for (const [userId, ships] of Object.entries(db.fleets)) {
        await supabase.from('fleets').upsert({
          user_id: userId,
          ships: ships
        });
      }
    }
  },
  // ... 기타 save 메서드들
};
```

### 서버 설정 수정

`backend/server.js` 수정:

```javascript
// MongoDB 체크 대신 Supabase 체크
if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL environment variable is required for production deployment');
    process.exit(1);
}
```

---

## 4️⃣ 환경 변수 설정

### Vercel Dashboard
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (서버 전용)
- `NODE_ENV`: `production`

### 로컬 개발 (.env)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NODE_ENV=development
```

---

## 5️⃣ 데이터 마이그레이션

기존 MongoDB 데이터를 Supabase로 이전:

```javascript
// scripts/migrate-to-supabase.js
const mongoose = require('mongoose');
const supabase = require('../backend/models/supabase');

async function migrate() {
  // MongoDB 연결
  await mongoose.connect(process.env.MONGO_URI);
  
  // Users 마이그레이션
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  for (const user of users) {
    await supabase.from('users').upsert(user);
  }
  
  // ... 기타 데이터 마이그레이션
  
  console.log('Migration complete!');
  process.exit(0);
}

migrate();
```

---

## 6️⃣ 테스트

1. 로컬에서 테스트
2. Vercel에 배포
3. 데이터 정상 작동 확인
4. 기존 기능 테스트

---

## ⚠️ 주의사항

1. **RLS (Row Level Security) 설정**
   - Supabase는 기본적으로 RLS가 활성화되어 있음
   - 서버에서 접근하려면 Service Role Key 사용
   - 또는 RLS 정책 설정 필요

2. **데이터 타입 변환**
   - MongoDB의 ObjectId → Supabase의 TEXT/UUID
   - 날짜 형식 확인

3. **트랜잭션**
   - Supabase는 PostgreSQL이므로 트랜잭션 지원
   - 복잡한 작업은 트랜잭션 사용 권장

---

## 📝 마이그레이션 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 생성
- [ ] 코드 수정 완료
- [ ] 환경 변수 설정
- [ ] 데이터 마이그레이션
- [ ] 로컬 테스트 완료
- [ ] Vercel 배포
- [ ] 프로덕션 테스트 완료

---

**마이그레이션 완료 후 MongoDB는 제거해도 됩니다!** ✅
