# Vercel 배포 가이드

## 📋 사전 준비

### 1. MongoDB Atlas 설정 (필수)
현재 프로젝트는 파일 시스템에 데이터를 저장하는데, Vercel은 읽기 전용 파일 시스템이므로 MongoDB가 필수입니다.

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 무료 계정 생성
2. 새 클러스터 생성 (M0 - Free Tier)
3. Database Access에서 사용자 생성
4. Network Access에서 `0.0.0.0/0` (모든 IP) 허용
5. Connection String 복사:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/cofleeter?retryWrites=true&w=majority
   ```

### 2. Git 저장소 생성

```bash
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git remote add origin https://github.com/your-username/cofleeter.git
git push -u origin main
```

## 🚀 Vercel 배포 단계

### 방법 1: Vercel Dashboard (간편)

1. [Vercel](https://vercel.com) 가입/로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. Import 후 다음 설정:

**Framework Preset**: Other
**Root Directory**: `./`
**Build Command**: (비워두기)
**Output Directory**: `frontend`

5. **Environment Variables** 추가:
   ```
   MONGO_URI = mongodb+srv://...
   NODE_ENV = production
   ```

6. "Deploy" 클릭

### 방법 2: Vercel CLI

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## ⚙️ 환경 변수 설정

Vercel Dashboard → Project Settings → Environment Variables에서 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `MONGO_URI` | `mongodb+srv://...` | MongoDB 연결 문자열 (필수) |
| `NODE_ENV` | `production` | 환경 설정 |

## 🔧 코드 수정 필요 사항

### 1. 파일 저장소 제거 (backend/models/store.js)

현재 코드는 MongoDB와 파일 시스템 하이브리드인데, Vercel에서는 MongoDB만 사용해야 합니다.

```javascript
// ❌ 제거할 코드
saveJSON(paths.USERS_FILE, db.users);

// ✅ MongoDB만 사용
saveToMongo('users', db.users);
```

### 2. server.js 수정

```javascript
// Vercel은 PORT를 동적으로 할당
const PORT = process.env.PORT || 8000;

// MongoDB를 필수로 체크
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is required for production');
  process.exit(1);
}
```

### 3. CORS 설정 업데이트

```javascript
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-app.vercel.app']
        : ['http://localhost:3000', 'http://localhost:8000'],
    credentials: true
}));
```

## 🧪 배포 전 로컬 테스트

MongoDB를 사용하여 로컬에서 테스트:

```bash
# .env 파일 생성
echo "MONGO_URI=mongodb+srv://..." > backend/.env

# 백엔드 실행
cd backend
node server.js

# 다른 터미널에서 프론트엔드 실행
npx lite-server
```

## 🐛 문제 해결

### 배포는 성공했는데 데이터가 안 보여요
→ MongoDB 연결 확인: Vercel Logs에서 "MongoDB Connected" 메시지 확인

### API 호출이 실패해요
→ Frontend의 API URL을 절대 경로로 변경:
```javascript
// ❌ 안 됨
fetch('/api/data')

// ✅ 프로덕션
fetch(`${window.location.origin}/api/data`)
```

### 로그인이 안 돼요
→ 초기 Admin 계정이 MongoDB에 생성되었는지 확인
→ Vercel Function Logs 확인

## 📊 제한 사항

- **Serverless 실행 시간**: 최대 10초 (Hobby Plan)
- **메모리**: 1024 MB
- **파일 업로드**: 직접 저장 불가 (AWS S3 등 사용 필요)

## 🔗 배포 완료 URL

배포 후 다음과 같은 URL이 생성됩니다:
```
https://cofleeter-xxxxx.vercel.app
```

## 📝 다음 단계

1. ✅ MongoDB 설정
2. ✅ GitHub에 푸시
3. ✅ Vercel에 배포
4. ⬜ 커스텀 도메인 연결 (선택)
5. ⬜ 이메일 서비스 설정 (Nodemailer → SendGrid 등)


