# 🚀 Vercel 배포 다음 단계

## ✅ 현재 완료된 것

Vercel Environment Variables 화면에서 확인:
- ✅ `MONGO_URI` 설정됨 (All Environments)
- ✅ `NODE_ENV` 설정됨 (All Environments)

---

## 🔍 확인해야 할 것

### 1. Vercel 환경 변수 값 확인

현재 화면에서:

1. **MONGO_URI 값 확인**
   - `MONGO_URI` 옆의 점 3개 메뉴(⋯) 클릭
   - "Edit" 클릭
   - 값이 다음인지 확인:
     ```
     mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
     ```
   - 다르면 수정하고 "Save"

2. **NODE_ENV 값 확인**
   - `NODE_ENV` 옆의 점 3개 메뉴(⋯) 클릭
   - "Edit" 클릭
   - 값이 `production`인지 확인
   - 다르면 수정하고 "Save"

---

## 📝 다음 단계

### 1단계: 로컬 .env 파일 확인

`.env` 파일이 다음 내용을 포함하는지 확인:

```env
MONGO_URI=mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

**위치**: `co-fleeter-pilot/.env` (프로젝트 루트)

---

### 2단계: 로컬 연결 테스트

```bash
cd co-fleeter-pilot
npm start
```

**성공 메시지 확인:**
```
✅ MongoDB Connected Successfully
✅ Store: All data loaded
```

---

### 3단계: GitHub에 코드 업로드

```bash
cd co-fleeter-pilot

# Git 초기화 (처음 한 번만)
git init

# 모든 파일 추가 (.env는 자동으로 제외됨)
git add .

# 커밋
git commit -m "Ready for Vercel deployment with MongoDB"

# GitHub 레포지토리 연결 (이미 있다면 생략)
git remote add origin https://github.com/YOUR_USERNAME/co-fleeter-pilot.git

# 브랜치 이름 변경
git branch -M main

# GitHub에 업로드
git push -u origin main
```

---

### 4단계: Vercel 배포

1. **Vercel Dashboard로 돌아가기**
   - 왼쪽 사이드바에서 "Deployments" 클릭

2. **새 배포 트리거**
   - "Redeploy" 버튼 클릭 (최신 배포가 있다면)
   - 또는 GitHub에 푸시하면 자동으로 배포됨

3. **배포 로그 확인**
   - 배포가 시작되면 "View Function Logs" 클릭
   - 다음 메시지 확인:
     ```
     ✅ MongoDB Connected Successfully
     ✅ Store: All data loaded
     ```

---

## ⚠️ 문제 해결

### Vercel에서 연결 실패 시

1. **MONGO_URI 값 확인**
   - 특수문자(`!`)가 문제일 수 있음
   - URL 인코딩 버전 시도:
     ```
     mongodb+srv://admin:admin123%21@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
     ```

2. **MongoDB Atlas 네트워크 설정 확인**
   - Security → Network Access
   - `0.0.0.0/0` (모든 IP 허용) 설정되어 있는지 확인

3. **배포 로그 확인**
   - Vercel Dashboard → Deployments → 최신 배포 → Logs
   - 에러 메시지 확인

---

## ✅ 체크리스트

- [ ] .env 파일 내용 확인
- [ ] 로컬 연결 테스트 성공
- [ ] Vercel MONGO_URI 값 확인/수정
- [ ] Vercel NODE_ENV 값 확인
- [ ] GitHub에 코드 업로드
- [ ] Vercel 배포 완료
- [ ] 배포 로그에서 MongoDB 연결 확인

---

**먼저 Vercel에서 MONGO_URI 값이 올바른지 확인해주세요!** 🔍
