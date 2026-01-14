# 🔐 MongoDB Atlas 연결 설정

## 현재 정보
- **Username**: `co-fleeter`
- **Password**: `24ZQ3ksCmf2r7aER`

---

## 📝 연결 문자열 만들기

### 1. MongoDB Atlas에서 클러스터 주소 확인

1. MongoDB Atlas 대시보드 접속
2. 클러스터 선택 → **"Connect"** 버튼 클릭
3. **"Connect your application"** 선택
4. 연결 문자열 복사:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. 연결 문자열 수정

위에서 복사한 문자열에서:
- `<username>` → `co-fleeter`로 교체
- `<password>` → `24ZQ3ksCmf2r7aER`로 교체
- 마지막에 `/cofleeter` 추가

**최종 형태:**
```
mongodb+srv://co-fleeter:24ZQ3ksCmf2r7aER@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
```

⚠️ **중요**: `cluster0.xxxxx.mongodb.net` 부분은 실제 클러스터 주소로 교체해야 합니다!

---

## 💾 로컬 개발용 .env 파일 생성

프로젝트 루트에 `.env` 파일을 만들고 다음 내용을 추가:

```env
MONGO_URI=mongodb+srv://co-fleeter:24ZQ3ksCmf2r7aER@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

**⚠️ 주의**: `cluster0.xxxxx.mongodb.net` 부분을 실제 클러스터 주소로 교체하세요!

---

## 🚀 Vercel 배포 시 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에 추가:

1. **MONGO_URI**
   - Value: `mongodb+srv://co-fleeter:24ZQ3ksCmf2r7aER@cluster0.xxxxx.mongodb.net/cofleeter?retryWrites=true&w=majority`
   - ⚠️ 실제 클러스터 주소로 교체 필요

2. **NODE_ENV**
   - Value: `production`

---

## ✅ 보안 확인

- ✅ `.env` 파일은 `.gitignore`에 포함되어 Git에 업로드되지 않음
- ✅ 비밀번호가 코드에 하드코딩되지 않음
- ✅ 환경 변수로 안전하게 관리

---

## 🧪 연결 테스트

로컬에서 테스트:

```bash
cd co-fleeter-pilot
npm start
```

콘솔에 다음 메시지가 보이면 성공:
```
✅ MongoDB Connected Successfully
✅ Store: All data loaded
```

---

**클러스터 주소를 알려주시면 완전한 연결 문자열을 만들어드리겠습니다!** 🚀
