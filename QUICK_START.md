# ⚡ Co-Fleeter Vercel 배포 - 5분 가이드

## 🎯 3단계로 끝내기

### 1️⃣ MongoDB 준비 (2분)

```
1. https://www.mongodb.com/cloud/atlas 접속
2. "Start Free" → 계정 생성
3. "Create Cluster" → M0 (FREE) 선택
4. Database Access → Add User (username/password 저장!)
5. Network Access → Add IP Address → 0.0.0.0/0
6. Connect → Connect your application → 연결 문자열 복사
   
   예시: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/cofleeter
```

### 2️⃣ GitHub 업로드 (1분)

```bash
git init
git add .
git commit -m "Deploy to Vercel"
git remote add origin https://github.com/YOUR_USERNAME/cofleeter.git
git push -u origin main
```

### 3️⃣ Vercel 배포 (2분)

```
1. https://vercel.com → Sign Up with GitHub
2. New Project → Import GitHub 레포지토리
3. Framework: Other
4. Environment Variables 추가:
   - MONGO_URI = (위에서 복사한 MongoDB 연결 문자열)
   - NODE_ENV = production
5. Deploy 클릭!
```

---

## ✅ 완료!

배포 URL: `https://your-project.vercel.app`

**로그인**: cfadmin@cofleeter.com / 1234

---

## 📚 더 자세한 가이드

- **상세 가이드**: `README_VERCEL.md`
- **체크리스트**: `DEPLOYMENT_CHECKLIST.md`
- **기술 문서**: `VERCEL_DEPLOYMENT_GUIDE.md`

---

## 🆘 문제 발생 시

**Vercel Logs 확인**: Dashboard → Deployments → Logs

**다음 메시지가 보여야 함**:
```
✅ Co-Fleeter Backend initialized for Vercel Serverless
✅ MongoDB Connected
```

**안 보이면**: MongoDB 연결 문자열 다시 확인!

---

**그게 다예요! 🎉**


