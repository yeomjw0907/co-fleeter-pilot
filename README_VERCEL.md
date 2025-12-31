# 🚀 Co-Fleeter Vercel 배포 가이드

## 📌 요약

**현재 상태**: ✅ Vercel 배포 준비 완료  
**필수 요구사항**: MongoDB Atlas 계정 (무료)

---

## 🎯 빠른 시작 (5분 배포)

### 1️⃣ MongoDB Atlas 설정 (2분)

```bash
1. https://www.mongodb.com/cloud/atlas 접속
2. "Start Free" 클릭 → 계정 생성
3. "Create a Cluster" → M0 (FREE) 선택
4. Cluster 이름: cofleeter
5. "Create Cluster" 클릭

# 데이터베이스 사용자 생성
6. Security → Database Access → Add New User
   - Username: cofleeter_user
   - Password: [강력한 비밀번호 생성] (복사해두기!)
   - Role: Atlas Admin

# IP 허용
7. Security → Network Access → Add IP Address
   - 0.0.0.0/0 입력 (모든 IP 허용)
   - Confirm

# 연결 문자열 복사
8. Databases → Connect → Connect your application
   - Driver: Node.js
   - Version: 4.1 or later
   - 연결 문자열 복사:
     mongodb+srv://cofleeter_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 2️⃣ GitHub에 푸시 (1분)

```bash
git init
git add .
git commit -m "Ready for Vercel deployment"

# GitHub에서 새 레포지토리 생성 후:
git remote add origin https://github.com/YOUR_USERNAME/cofleeter.git
git branch -M main
git push -u origin main
```

### 3️⃣ Vercel 배포 (2분)

```bash
1. https://vercel.com 접속 → Sign Up with GitHub
2. "New Project" 클릭
3. GitHub 레포지토리 Import
4. 설정:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (비워두기)
   - Output Directory: frontend

5. Environment Variables 추가:
   MONGO_URI = mongodb+srv://cofleeter_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
   NODE_ENV = production

6. "Deploy" 클릭!
```

---

## 🎉 배포 완료!

배포가 완료되면 다음과 같은 URL이 생성됩니다:
```
https://cofleeter-xxxx.vercel.app
```

### 기본 로그인 계정
- **Admin**: cfadmin@cofleeter.com / 1234
- **Trader A**: atrader@cofleeter.com / 1234

---

## 🔧 로컬 개발 vs 프로덕션

### 로컬 개발 (기존 방식)
```bash
npm run dev
# → JSON 파일에 데이터 저장
```

### 프로덕션 (Vercel)
```bash
# MongoDB에만 데이터 저장 (파일 시스템 사용 안 함)
```

---

## 🐛 문제 해결

### ❌ 배포는 성공했는데 페이지가 안 뜨는 경우

**1. Vercel Dashboard → Deployments → Logs 확인**

```bash
# 다음 메시지가 보여야 함:
✅ Co-Fleeter Backend initialized for Vercel Serverless
✅ MongoDB Connected
✅ Store: All data loaded
```

**2. MongoDB 연결 오류**
```
Error: "MONGO_URI environment variable is required"
→ Vercel Dashboard → Settings → Environment Variables에서 MONGO_URI 확인
```

**3. CORS 오류**
```
Access to fetch at 'https://...' has been blocked by CORS policy
→ 정상입니다! Vercel은 자동으로 같은 도메인에서 서비스됩니다
```

### ❌ 로그인이 안 되는 경우

```bash
# MongoDB에 초기 데이터가 없을 수 있음
# Vercel Logs에서 "Store: Restored admin user" 메시지 확인
# 없다면 MongoDB Atlas에서 직접 데이터 확인
```

---

## 📊 Vercel 무료 플랜 제한

| 항목 | 제한 |
|------|------|
| Bandwidth | 100GB/월 |
| Serverless 실행 시간 | 10초/요청 |
| Builds | 6,000분/월 |
| 도메인 | 무제한 |

→ Co-Fleeter는 이 제한 내에서 충분히 작동합니다!

---

## 🎨 커스텀 도메인 연결 (선택)

```bash
1. Vercel Dashboard → Settings → Domains
2. 도메인 입력 (예: cofleeter.com)
3. DNS 설정 안내에 따라 설정
```

---

## 🔄 코드 업데이트 방법

```bash
# 코드 수정 후
git add .
git commit -m "Update feature X"
git push

# Vercel이 자동으로 재배포! (1-2분 소요)
```

---

## 📞 지원

- Vercel 문서: https://vercel.com/docs
- MongoDB Atlas 문서: https://docs.atlas.mongodb.com
- 이 프로젝트 이슈: GitHub Issues

---

## ✅ 배포 체크리스트

- [ ] MongoDB Atlas 클러스터 생성
- [ ] 연결 문자열 복사
- [ ] GitHub 레포지토리 생성 및 푸시
- [ ] Vercel 프로젝트 생성
- [ ] MONGO_URI 환경 변수 설정
- [ ] 배포 완료 확인
- [ ] 로그인 테스트
- [ ] 주요 기능 테스트

---

## 💡 다음 단계

1. **이메일 기능 활성화**
   - Nodemailer 대신 SendGrid/Mailgun 사용
   - Vercel Environment Variables에 API Key 추가

2. **보안 강화**
   - 비밀번호 해싱 (bcrypt)
   - JWT 토큰 인증

3. **성능 최적화**
   - Vercel Edge Functions 고려
   - 이미지 최적화

---

**이제 전 세계 어디서나 접속 가능한 Co-Fleeter가 되었습니다! 🌍⚓**


