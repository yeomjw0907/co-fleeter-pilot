# 🚀 MongoDB Atlas 클러스터 생성 가이드 (단계별)

## 1️⃣ 계정 생성 및 로그인

1. **https://www.mongodb.com/cloud/atlas** 접속
2. 우측 상단 **"Try Free"** 또는 **"Start Free"** 클릭
3. 로그인 방법 선택:
   - Google 계정으로 로그인 (추천)
   - GitHub 계정으로 로그인
   - 또는 이메일로 회원가입

---

## 2️⃣ 프로젝트 생성 (선택사항)

1. 로그인 후 **"Create"** 또는 **"New Project"** 클릭
2. 프로젝트 이름 입력: `Co-Fleeter` (또는 원하는 이름)
3. **"Next"** 클릭
4. **"Create Project"** 클릭

> 💡 프로젝트는 나중에 생성해도 됩니다. 바로 클러스터 생성으로 넘어가도 됩니다.

---

## 3️⃣ 클러스터 생성

### 3-1. 클러스터 생성 시작
1. 대시보드에서 **"Build a Database"** 버튼 클릭
   - 또는 **"Create"** → **"Database"** 클릭

### 3-2. 클러스터 타입 선택
1. **"M0 FREE"** 선택 (왼쪽에 FREE 배지가 있음)
   - 무료 플랜이므로 비용 걱정 없음
   - 512MB 저장 공간 제공
   
   ⚠️ **M0 FREE가 보이지 않나요?**
   - 프로젝트당 무료 클러스터는 1개만 가능합니다
   - 해결: 왼쪽 상단 프로젝트 이름 클릭 → **"New Project"** 생성
   - 자세한 내용은 `MONGODB_FREE_TIER_GUIDE.md` 참고

### 3-3. 클라우드 제공자 및 지역 선택
1. **Cloud Provider**: AWS (기본값, 그대로 두면 됨)
2. **Region**: 가장 가까운 지역 선택
   - 한국: `Seoul (ap-northeast-2)` 또는 `Tokyo (ap-northeast-1)`
   - 또는 기본값 그대로 사용

### 3-4. 클러스터 이름 설정
1. **Cluster Name**: `Cluster0` (기본값 그대로 사용 가능)
   - 또는 `cofleeter-cluster` 등 원하는 이름

### 3-5. 클러스터 생성
1. **"Create Cluster"** 버튼 클릭
2. ⏳ **2-5분 대기** (클러스터 생성 중)
   - 진행 상황이 화면에 표시됨
   - "Your cluster is being created" 메시지 확인

---

## 4️⃣ 데이터베이스 사용자 생성

클러스터 생성이 완료되면 자동으로 사용자 생성 화면이 나타납니다.

### 4-1. 사용자 정보 입력
1. **Authentication Method**: `Password` 선택 (기본값)
2. **Username**: `cofleeter_user` (또는 원하는 사용자명)
3. **Password**: 
   - 강력한 비밀번호 생성 (최소 8자, 대소문자, 숫자, 특수문자 포함)
   - ⚠️ **비밀번호를 반드시 복사해두세요!** (나중에 다시 볼 수 없음)
   - 예: `CoFleeter2024!@#`
4. **Database User Privileges**: `Atlas Admin` 선택 (기본값)

### 4-2. 사용자 생성
1. **"Create Database User"** 버튼 클릭
2. ⏳ 잠시 대기

---

## 5️⃣ 네트워크 접근 설정

### 5-1. IP 주소 추가
1. **"Add My Current IP Address"** 클릭
   - 또는 **"Allow Access from Anywhere"** 클릭 (0.0.0.0/0)
   - ⚠️ 개발/테스트용으로는 "Allow Access from Anywhere"가 편리합니다
   - 프로덕션에서는 특정 IP만 허용하는 것이 보안상 좋습니다

### 5-2. 확인
1. **"Finish and Close"** 클릭

---

## 6️⃣ 연결 문자열 복사

### 6-1. 연결 방법 선택
1. 클러스터가 생성되면 **"Connect"** 버튼 클릭
2. **"Connect your application"** 선택

### 6-2. 연결 문자열 확인
1. **Driver**: `Node.js` 선택 (기본값)
2. **Version**: `4.1 or later` 선택 (기본값)
3. 연결 문자열이 표시됨:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 6-3. 연결 문자열 수정
1. `<username>` 부분을 위에서 만든 사용자명으로 교체
   - 예: `cofleeter_user`
2. `<password>` 부분을 위에서 만든 비밀번호로 교체
   - 예: `CoFleeter2024!@#`
3. 마지막에 **데이터베이스 이름 추가**: `/cofleeter`
   - 최종 형태:
   ```
   mongodb+srv://cofleeter_user:CoFleeter2024!@#@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
   ```

### 6-4. 연결 문자열 복사
1. **"Copy"** 버튼 클릭하여 복사
2. ⚠️ **안전한 곳에 저장해두세요!** (나중에 Vercel 배포 시 사용)

---

## ✅ 완료!

이제 다음 정보를 가지고 있습니다:
- ✅ MongoDB 클러스터 생성 완료
- ✅ 데이터베이스 사용자 생성 완료
- ✅ 네트워크 접근 설정 완료
- ✅ 연결 문자열 복사 완료

---

## 📝 다음 단계

### 로컬 테스트 (선택사항)
`.env` 파일을 만들어서 테스트할 수 있습니다:

```bash
# co-fleeter-pilot/.env 파일 생성
MONGO_URI=mongodb+srv://cofleeter_user:비밀번호@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

### Vercel 배포 시
Vercel Dashboard → Settings → Environment Variables에 추가:
- `MONGO_URI`: 위의 연결 문자열
- `NODE_ENV`: `production`

---

## 🐛 문제 해결

### 클러스터 생성이 안 될 때
- 브라우저를 새로고침해보세요
- 다른 브라우저로 시도해보세요
- 잠시 후 다시 시도해보세요

### 연결 문자열이 복사가 안 될 때
- 수동으로 전체 문자열을 선택하여 복사
- 각 부분을 직접 입력

### 비밀번호를 잊어버렸을 때
- Security → Database Access → 사용자 선택 → "Edit" → 비밀번호 재설정

---

**클러스터 생성이 완료되면 알려주세요! 다음 단계로 진행하겠습니다.** 🚀
