# 🔗 MongoDB Atlas 연결 정보

## 현재 설정
- **Username**: `admin`
- **Password**: `admin123!`
- **Database Name**: `cofleeter` (또는 원하는 이름)

---

## 📝 연결 문자열 만들기

### 1. 클러스터 주소 확인

MongoDB Atlas에서:
1. 클러스터 선택 → **"Connect"** 버튼 클릭
2. **"Connect to your application"** 선택
3. **"Drivers"** 옵션 클릭
4. 연결 문자열에서 클러스터 주소 확인:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - `cluster0.xxxxx.mongodb.net` 부분이 클러스터 주소입니다

### 2. 최종 연결 문자열

클러스터 주소를 알면 다음과 같이 만듭니다:

```
mongodb+srv://admin:admin123!@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
```

**⚠️ 중요**: 
- `cluster0.xxxxx.mongodb.net` 부분을 실제 클러스터 주소로 교체하세요
- 비밀번호에 특수문자(`!`)가 있으므로 URL 인코딩이 필요할 수 있습니다
- 특수문자가 문제가 되면: `admin123!` → `admin123%21`

---

## 💾 로컬 개발용 .env 파일 생성

프로젝트 루트(`co-fleeter-pilot/`)에 `.env` 파일을 만들고:

```env
MONGO_URI=mongodb+srv://admin:admin123!@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

**⚠️ 주의**: 
- `cluster0.xxxxx.mongodb.net` 부분을 실제 클러스터 주소로 교체하세요
- `.env` 파일은 `.gitignore`에 포함되어 Git에 업로드되지 않습니다

---

## 🚀 Vercel 배포 시 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에 추가:

1. **MONGO_URI**
   - Value: `mongodb+srv://admin:admin123!@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority`
   - ⚠️ 실제 클러스터 주소로 교체 필요

2. **NODE_ENV**
   - Value: `production`

**특수문자 문제 해결:**
만약 Vercel에서 연결이 안 되면, 비밀번호를 URL 인코딩:
- `admin123!` → `admin123%21`
- 또는 Vercel 환경 변수 설정에서 직접 입력하면 자동으로 처리됩니다

---

## 🧪 연결 테스트

### 로컬에서 테스트

```bash
cd co-fleeter-pilot

# .env 파일 생성 (위 내용으로)
# 그 다음 서버 실행
npm start
```

콘솔에 다음 메시지가 보이면 성공:
```
✅ MongoDB Connected Successfully
✅ Store: All data loaded
```

### 연결 실패 시 확인사항

1. **네트워크 접근 설정 확인**
   - Security → Network Access
   - `0.0.0.0/0` (모든 IP 허용) 설정되어 있는지 확인

2. **사용자 권한 확인**
   - Security → Database Access
   - `admin` 사용자가 `Atlas Admin` 권한을 가지고 있는지 확인

3. **클러스터 주소 확인**
   - 연결 문자열의 클러스터 주소가 정확한지 확인

---

## ✅ 다음 단계

1. ✅ MongoDB Atlas에서 클러스터 주소 확인
2. ✅ 연결 문자열 완성
3. ✅ `.env` 파일 생성 (로컬 개발용)
4. ✅ Vercel 환경 변수 설정 (배포용)

**클러스터 주소를 알려주시면 완전한 연결 문자열을 만들어드리겠습니다!** 🚀
