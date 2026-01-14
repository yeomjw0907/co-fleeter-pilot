# 🌐 웹에서 바로 구동하기 - Vercel 배포 가이드

로컬 서버 없이 웹에서 바로 접속 가능하도록 배포하는 방법입니다.

---

## 🚀 빠른 배포 (3단계)

### 1️⃣ MongoDB Atlas 무료 계정 생성 (2분)

1. https://www.mongodb.com/cloud/atlas 접속
2. "Start Free" 클릭 → 계정 생성 (Google/GitHub로 간편 가입 가능)
3. "Create a Cluster" → **M0 FREE** 선택
4. 클러스터 이름: `cofleeter` (또는 원하는 이름)
5. "Create Cluster" 클릭 (약 3-5분 소요)

**데이터베이스 사용자 생성:**
1. Security → Database Access → "Add New Database User"
2. Authentication Method: Password
3. Username: `cofleeter_user`
4. Password: 강력한 비밀번호 생성 (복사해두기!)
5. Database User Privileges: "Atlas Admin"
6. "Add User" 클릭

**네트워크 접근 허용:**
1. Security → Network Access → "Add IP Address"
2. "Allow Access from Anywhere" 클릭 (0.0.0.0/0)
3. "Confirm" 클릭

**연결 문자열 복사:**
1. Databases → "Connect" 버튼 클릭
2. "Connect your application" 선택
3. Driver: Node.js, Version: 4.1 or later
4. 연결 문자열 복사:
   ```
   mongodb+srv://cofleeter_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. `<password>` 부분을 위에서 만든 비밀번호로 교체
6. 마지막에 `/cofleeter` 추가:
   ```
   mongodb+srv://cofleeter_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
   ```

---

### 2️⃣ GitHub에 코드 업로드 (1분)

**GitHub 레포지토리 생성:**
1. https://github.com 접속
2. 우측 상단 "+" → "New repository"
3. Repository name: `co-fleeter` (또는 원하는 이름)
4. Public 또는 Private 선택
5. "Create repository" 클릭

**코드 업로드:**
```bash
cd co-fleeter-pilot

# Git 초기화 (처음 한 번만)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial commit - Ready for Vercel deployment"

# GitHub 레포지토리 연결 (YOUR_USERNAME을 본인 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/co-fleeter.git

# 브랜치 이름을 main으로 변경
git branch -M main

# GitHub에 업로드
git push -u origin main
```

---

### 3️⃣ Vercel에 배포 (2분)

1. https://vercel.com 접속
2. "Sign Up" → GitHub 계정으로 로그인
3. "Add New..." → "Project" 클릭
4. "Import Git Repository" → 방금 만든 GitHub 레포지토리 선택
5. "Import" 클릭

**프로젝트 설정:**
- Framework Preset: **Other**
- Root Directory: `./` (기본값)
- Build Command: (비워두기)
- Output Directory: `frontend`
- Install Command: `npm install` (기본값)

**환경 변수 추가:**
"Environment Variables" 섹션에서 다음 추가:

1. `MONGO_URI`
   - Value: 위에서 복사한 MongoDB 연결 문자열
   - 예: `mongodb+srv://cofleeter_user:password123@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority`

2. `NODE_ENV`
   - Value: `production`

**배포:**
- "Deploy" 버튼 클릭
- 약 1-2분 대기

---

## 🎉 완료!

배포가 완료되면 다음과 같은 URL이 생성됩니다:
```
https://co-fleeter-xxxxx.vercel.app
```

이 URL을 브라우저에서 열면 바로 사용 가능합니다!

### 기본 로그인 정보
- **Admin**: `cfadmin@cofleeter.com` / `1234`
- **Trader A**: `atrader@cofleeter.com` / `1234`

---

## 🔄 코드 업데이트 방법

코드를 수정한 후:

```bash
git add .
git commit -m "Update feature"
git push
```

Vercel이 자동으로 재배포합니다! (약 1-2분 소요)

---

## 🐛 문제 해결

### 배포는 성공했는데 페이지가 안 뜨는 경우

1. **Vercel Dashboard → Deployments → 최신 배포 → Logs 확인**
   - 다음 메시지가 보여야 함:
     ```
     ✅ Co-Fleeter Backend initialized for Vercel Serverless
     ✅ MongoDB Connected
     ✅ Store: All data loaded
     ```

2. **MongoDB 연결 오류**
   - Vercel Dashboard → Settings → Environment Variables
   - `MONGO_URI` 값 확인 (비밀번호가 올바른지)
   - 연결 문자열에 `/cofleeter` 데이터베이스 이름이 포함되어 있는지 확인

### 로그인이 안 되는 경우

- MongoDB에 초기 데이터가 없을 수 있음
- 첫 로그인 시도 시 자동으로 Admin 계정이 생성됨
- 그래도 안 되면 Vercel Logs에서 "Store: Restored admin user" 메시지 확인

### CORS 오류

- Vercel에서는 같은 도메인에서 서비스되므로 CORS 문제가 없어야 함
- 만약 발생하면 Vercel Dashboard에서 도메인 확인

---

## 💰 비용

- **MongoDB Atlas**: 무료 (M0 클러스터)
- **Vercel**: 무료 (Hobby 플랜)
  - Bandwidth: 100GB/월
  - Serverless Functions: 무제한 (10초 제한)
  - 도메인: 무제한

---

## 📝 다음 단계 (선택)

1. **커스텀 도메인 연결**
   - Vercel Dashboard → Settings → Domains
   - 도메인 입력 (예: `cofleeter.com`)
   - DNS 설정 안내에 따라 설정

2. **이메일 기능 활성화**
   - 현재는 Nodemailer 사용 (Gmail 계정 필요)
   - 프로덕션에서는 SendGrid/Mailgun 사용 권장

3. **보안 강화**
   - 비밀번호 해싱 (bcrypt)
   - JWT 토큰 인증

---

**이제 전 세계 어디서나 접속 가능한 Co-Fleeter가 완성되었습니다! 🌍⚓**
