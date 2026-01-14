# ✅ Vercel 환경 변수 확인 가이드

## 현재 설정 확인

화면에서 확인된 환경 변수:
- ✅ `MONGO_URI`: 설정됨 (값: `mongodb+srv://admin:admin123!@co...`)
- ✅ `NODE_ENV`: 설정됨 (값: `production`)

---

## 🔍 MONGO_URI 값 확인 필요

화면에서 값이 잘려서 보입니다. 전체 값이 올바른지 확인해야 합니다.

### 올바른 형식
```
mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
```

### 확인 방법
1. `MONGO_URI` 옆의 **점 3개 메뉴(⋯)** 클릭
2. **"Edit"** 클릭
3. 전체 값 확인:
   - `mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority`
   - 이 형식이어야 합니다!

### 확인 포인트
- ✅ `admin` (사용자명)
- ✅ `admin123!` (비밀번호)
- ✅ `co-fleeter.lpebgqp.mongodb.net` (클러스터 주소)
- ✅ `/cofleeter` (데이터베이스 이름)
- ✅ `?retryWrites=true&w=majority` (옵션)

---

## ⚠️ 문제가 될 수 있는 경우

### 1. 값이 잘못되었을 때
- 클러스터 주소가 다름
- 데이터베이스 이름이 없음 (`/cofleeter` 누락)
- 비밀번호가 다름

### 2. 특수문자 문제
- 비밀번호에 `!`가 있어서 URL 인코딩이 필요할 수 있음
- 문제가 있으면: `admin123!` → `admin123%21`

---

## ✅ 체크리스트

- [x] `MONGO_URI` 환경 변수 설정됨
- [x] `NODE_ENV` 환경 변수 설정됨 (`production`)
- [ ] `MONGO_URI` 전체 값 확인 필요
- [ ] 값이 올바른 형식인지 확인 필요

---

## 🧪 테스트 방법

환경 변수가 올바르게 설정되었는지 확인:

1. **Vercel Dashboard → Deployments → 최신 배포 → Logs**
2. 다음 메시지 확인:
   ```
   ✅ MongoDB Connected Successfully
   ✅ Store: All data loaded
   ```

3. **에러가 있다면:**
   ```
   ❌ MongoDB Connection Error: ...
   ```
   → `MONGO_URI` 값 확인 필요

---

**MONGO_URI 값을 Edit해서 전체 값이 올바른지 확인해주세요!** 🔍
