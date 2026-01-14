# 🔍 MongoDB Atlas 설정 확인 가이드

## 현재 상태 확인

### ✅ 코드 레벨 확인
- ✅ MongoDB 연결 코드 준비 완료 (`backend/models/mongo.js`)
- ✅ 환경 변수 체크 로직 완료 (`backend/server.js`)
- ✅ 데이터 동기화 로직 완료 (`backend/models/store.js`)

### ❓ 실제 설정 확인 필요
- ❓ MongoDB Atlas 계정 생성 여부
- ❓ 클러스터 생성 여부
- ❓ 연결 문자열 (MONGO_URI) 보유 여부
- ❓ 네트워크 접근 설정 여부

---

## 🔍 MongoDB Atlas 설정 확인 방법

### 1. MongoDB Atlas 웹사이트 접속
1. https://www.mongodb.com/cloud/atlas 접속
2. 로그인 (Google/GitHub 계정으로 로그인했는지 확인)

### 2. 클러스터 확인
- **클러스터가 있으면**: ✅ 이미 설정 완료
- **클러스터가 없으면**: 새로 생성 필요

### 3. 연결 문자열 확인
1. Databases → "Connect" 버튼 클릭
2. "Connect your application" 선택
3. 연결 문자열 확인:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. `<password>` 부분을 실제 비밀번호로 교체
5. 마지막에 `/cofleeter` 추가:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
   ```

### 4. 네트워크 접근 확인
1. Security → Network Access
2. IP 주소가 `0.0.0.0/0` (모든 IP 허용)인지 확인
3. 없으면 "Add IP Address" → "Allow Access from Anywhere" 클릭

### 5. 데이터베이스 사용자 확인
1. Security → Database Access
2. 사용자가 있는지 확인
3. 없으면 새로 생성 필요

---

## 📝 설정이 완료되었다면

### 로컬 테스트
```bash
# .env 파일 생성 (프로젝트 루트 또는 backend 폴더)
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

### Vercel 배포 시
Vercel Dashboard → Settings → Environment Variables:
- `MONGO_URI`: 위의 연결 문자열
- `NODE_ENV`: `production`

---

## 🆕 설정이 안 되어 있다면

`DEPLOY_WEB.md` 파일의 "1️⃣ MongoDB Atlas 무료 계정 생성" 섹션을 따라하세요.

---

## ✅ 확인 체크리스트

- [ ] MongoDB Atlas 계정 로그인 가능
- [ ] 클러스터 생성 완료
- [ ] 데이터베이스 사용자 생성 완료
- [ ] 네트워크 접근 설정 완료 (0.0.0.0/0)
- [ ] 연결 문자열 복사 완료
- [ ] 연결 문자열에 데이터베이스 이름 포함 (`/cofleeter`)

---

## 🧪 연결 테스트

로컬에서 테스트하려면:

```bash
cd co-fleeter-pilot
# .env 파일에 MONGO_URI 설정 후
npm start
```

콘솔에 다음 메시지가 보이면 성공:
```
✅ MongoDB Connected Successfully
✅ Store: All data loaded
```
