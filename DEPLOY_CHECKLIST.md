# ✅ 웹 배포 체크리스트

## 배포 전 확인사항

- [ ] MongoDB Atlas 계정 생성 완료
- [ ] MongoDB 클러스터 생성 완료 (M0 FREE)
- [ ] 데이터베이스 사용자 생성 완료
- [ ] 네트워크 접근 설정 완료 (0.0.0.0/0)
- [ ] MongoDB 연결 문자열 복사 완료
- [ ] GitHub 레포지토리 생성 완료
- [ ] 코드가 GitHub에 푸시 완료
- [ ] Vercel 계정 생성 완료 (GitHub 연동)
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경 변수 설정 완료:
  - [ ] `MONGO_URI` 설정
  - [ ] `NODE_ENV=production` 설정
- [ ] 배포 완료 확인
- [ ] 배포 URL에서 로그인 테스트 완료

---

## 빠른 배포 명령어

### 1. GitHub에 푸시
```bash
cd co-fleeter-pilot
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/co-fleeter.git
git branch -M main
git push -u origin main
```

### 2. Vercel CLI로 배포 (선택사항)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

## 배포 후 확인

1. ✅ Vercel Dashboard → Deployments → Logs 확인
   - "MongoDB Connected" 메시지 확인
   - 에러가 없으면 성공!

2. ✅ 배포 URL 접속
   - 로그인 페이지가 정상적으로 보이는지 확인

3. ✅ 로그인 테스트
   - Admin 계정: `cfadmin@cofleeter.com` / `1234`

4. ✅ 주요 기능 테스트
   - 함대 관리
   - 거래 기능
   - 계산기

---

## 문제 발생 시

### MongoDB 연결 실패
→ Vercel Dashboard → Environment Variables → `MONGO_URI` 확인

### 페이지가 안 뜸
→ Vercel Dashboard → Deployments → Logs 확인

### 로그인 실패
→ Vercel Logs에서 "Store: Restored admin user" 메시지 확인
