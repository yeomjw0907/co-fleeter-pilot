# ✅ Vercel 배포 체크리스트

## 🎯 준비 완료 상태

이 프로젝트는 **Vercel 배포가 가능하도록 수정**되었습니다!

### 변경된 파일들
- ✅ `vercel.json` - Vercel 설정 파일 생성
- ✅ `backend/server.js` - Serverless 환경 대응
- ✅ `backend/models/store.js` - 프로덕션에서 파일 쓰기 비활성화
- ✅ `.gitignore` - 민감한 파일 제외
- ✅ `package.json` - 엔진 버전 명시
- ✅ `README_VERCEL.md` - 상세 배포 가이드

---

## 📋 배포 전 체크리스트

### 1단계: MongoDB Atlas 설정 (필수)
- [ ] MongoDB Atlas 계정 생성 (https://www.mongodb.com/cloud/atlas)
- [ ] 무료 클러스터 생성 (M0 Free Tier)
- [ ] 데이터베이스 사용자 생성
- [ ] Network Access에서 `0.0.0.0/0` 허용
- [ ] 연결 문자열 복사 (형식: `mongodb+srv://...`)

### 2단계: GitHub 설정
- [ ] GitHub 계정 로그인
- [ ] 새 레포지토리 생성 (Public 또는 Private)
- [ ] 로컬에서 Git 초기화:
  ```bash
  git init
  git add .
  git commit -m "Initial commit - Ready for Vercel"
  git remote add origin https://github.com/YOUR_USERNAME/cofleeter.git
  git branch -M main
  git push -u origin main
  ```

### 3단계: Vercel 배포
- [ ] Vercel 계정 생성 (https://vercel.com)
- [ ] GitHub 계정 연결
- [ ] "New Project" 클릭
- [ ] GitHub 레포지토리 Import
- [ ] 프로젝트 설정:
  - Framework Preset: **Other**
  - Root Directory: **`./`**
  - Build Command: **(비워두기)**
  - Output Directory: **`frontend`**

### 4단계: 환경 변수 설정 (중요!)
Vercel Dashboard → Settings → Environment Variables에서 추가:

| 변수명 | 값 | 예시 |
|--------|-----|------|
| `MONGO_URI` | MongoDB 연결 문자열 | `mongodb+srv://user:pass@cluster.mongodb.net/cofleeter` |
| `NODE_ENV` | `production` | `production` |

- [ ] MONGO_URI 추가
- [ ] NODE_ENV 추가

### 5단계: 배포!
- [ ] "Deploy" 버튼 클릭
- [ ] 배포 완료 대기 (1-2분)
- [ ] 생성된 URL 확인 (예: `https://cofleeter-xxx.vercel.app`)

---

## 🧪 배포 후 테스트

### 기본 기능 테스트
- [ ] 메인 페이지 접속 확인
- [ ] 로그인 테스트 (cfadmin@cofleeter.com / 1234)
- [ ] 대시보드 로딩 확인
- [ ] Fleet 페이지 접속
- [ ] Calculator 작동 확인
- [ ] Trading 페이지 확인

### 데이터 저장 테스트
- [ ] 새 선박 추가 → 새로고침 후 유지 확인
- [ ] 계산 결과 저장 → 새로고침 후 유지 확인
- [ ] 주문 생성 → 새로고침 후 유지 확인

### 문제 발생 시
1. **Vercel Dashboard → Deployments → Logs** 확인
2. 다음 메시지가 보여야 함:
   ```
   ✅ Co-Fleeter Backend initialized for Vercel Serverless
   ✅ MongoDB Connected
   ✅ Store: All data loaded
   ```

---

## 🚨 자주 발생하는 문제

### 문제 1: "MONGO_URI is required" 오류
**원인**: 환경 변수가 설정되지 않음  
**해결**: Vercel Dashboard → Settings → Environment Variables에서 MONGO_URI 추가 후 재배포

### 문제 2: 페이지는 뜨는데 데이터가 없음
**원인**: MongoDB 연결 실패  
**해결**: 
1. MongoDB Atlas에서 Network Access 확인 (0.0.0.0/0 허용 필요)
2. 연결 문자열의 비밀번호에 특수문자가 있다면 URL 인코딩 필요

### 문제 3: CORS 오류
**원인**: 정상입니다! Vercel은 같은 도메인에서 서비스되므로 CORS 문제 없음  
**해결**: 무시하거나, 브라우저 콘솔에서 실제 오류 메시지 확인

### 문제 4: 로그인 후 리다이렉트 안 됨
**원인**: 프론트엔드 경로 문제  
**해결**: `frontend/js/auth.js`에서 `window.location.href` 확인

---

## 📊 Vercel 무료 플랜 제한

| 항목 | 제한 | Co-Fleeter 사용량 |
|------|------|-------------------|
| Bandwidth | 100GB/월 | ~1GB (예상) |
| Serverless 실행 시간 | 10초/요청 | ~1초 (평균) |
| Builds | 6,000분/월 | ~1분/배포 |
| 프로젝트 수 | 무제한 | 1개 |

✅ **Co-Fleeter는 무료 플랜으로 충분히 운영 가능합니다!**

---

## 🔄 코드 업데이트 방법

```bash
# 1. 코드 수정
# 2. Git에 커밋
git add .
git commit -m "Update: 기능 추가"
git push

# Vercel이 자동으로 감지하고 재배포! (1-2분 소요)
```

---

## 🎨 선택 사항

### 커스텀 도메인 연결
1. Vercel Dashboard → Settings → Domains
2. 도메인 입력 (예: `cofleeter.com`)
3. DNS 설정 (Vercel이 안내)

### 이메일 기능 활성화
현재 Nodemailer는 Vercel에서 제한적입니다.  
**대안**: SendGrid, Mailgun 등 사용

```bash
# Vercel Environment Variables에 추가
SENDGRID_API_KEY = your_api_key
```

---

## 📞 도움이 필요하면

- **Vercel 문서**: https://vercel.com/docs
- **MongoDB Atlas 문서**: https://docs.atlas.mongodb.com
- **Vercel 커뮤니티**: https://github.com/vercel/vercel/discussions

---

## 🎉 배포 완료!

축하합니다! 이제 전 세계 어디서나 접속 가능한 Co-Fleeter가 되었습니다! 🌍

**배포된 URL**: `https://your-project.vercel.app`

---

## 📝 다음 단계 추천

1. [ ] 커스텀 도메인 연결
2. [ ] 보안 강화 (JWT, 비밀번호 해싱)
3. [ ] 이메일 서비스 연동 (SendGrid)
4. [ ] 성능 모니터링 설정
5. [ ] 백업 전략 수립 (MongoDB Atlas 자동 백업)

---

**Made with ❤️ for Maritime Decarbonization**


