# Co-Fleeter 실행 가이드

## 🚀 빠른 시작

### 1. 의존성 설치 (최초 1회)
```bash
cd co-fleeter-pilot
npm install
cd backend
npm install
cd ..
```

### 2. 개발 모드로 실행 (권장)
```bash
npm run dev
```

이 명령은 다음을 실행합니다:
- 백엔드 서버: `http://localhost:8000`
- 프론트엔드 서버: `http://localhost:3000` (프록시 설정 포함)

**브라우저에서 `http://localhost:3000` 접속**

### 3. 또는 백엔드만 실행
```bash
npm start
```

그 후 브라우저에서 `http://localhost:8000` 접속

---

## ⚠️ Network Error 해결 방법

### 문제: "Network error" 메시지가 나타남

**원인:**
- 백엔드 서버가 실행되지 않음
- 프론트엔드를 `file://` 프로토콜로 직접 열었음

**해결:**
1. ✅ `npm run dev` 명령으로 백엔드와 프론트엔드를 동시에 실행
2. ✅ 브라우저에서 `http://localhost:3000` 또는 `http://localhost:8000` 접속
3. ❌ HTML 파일을 직접 더블클릭하지 마세요 (file:// 프로토콜)

---

## 🔍 문제 진단

### 포트 확인
```bash
# Windows PowerShell
netstat -ano | findstr ":8000"
netstat -ano | findstr ":3000"

# 포트가 사용 중이면 서버가 실행 중입니다
```

### 로그 확인
- 백엔드 콘솔에 "Co-Fleeter Backend running on port 8000" 메시지 확인
- 프론트엔드 콘솔에 "[PROXY] Forwarding /api/..." 메시지 확인

---

## 📝 기본 로그인 정보

- **Admin**: cfadmin@cofleeter.com / 1234
- **Trader A**: atrader@cofleeter.com / 1234
