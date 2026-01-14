# ✅ MongoDB Atlas 최종 연결 설정

## 🔗 완성된 연결 문자열

### 기본 연결 문자열
```
mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
```

### URL 인코딩 버전 (특수문자 문제 시)
만약 위 연결 문자열이 작동하지 않으면, 비밀번호의 특수문자를 인코딩:
```
mongodb+srv://admin:admin123%21@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
```
- `!` → `%21`

---

## 💾 로컬 개발용 .env 파일 생성

프로젝트 루트(`co-fleeter-pilot/`)에 `.env` 파일을 만들고 다음 내용을 추가:

```env
MONGO_URI=mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority
NODE_ENV=development
```

**파일 생성 방법:**
1. `co-fleeter-pilot` 폴더에 `.env` 파일 생성
2. 위 내용 복사해서 붙여넣기
3. 저장

---

## 🚀 Vercel 배포 시 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에 추가:

### 1. MONGO_URI
- **Key**: `MONGO_URI`
- **Value**: `mongodb+srv://admin:admin123!@co-fleeter.lpebgqp.mongodb.net/cofleeter?retryWrites=true&w=majority`
- **Environment**: Production, Preview, Development (모두 선택)

### 2. NODE_ENV
- **Key**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Production

**⚠️ 주의**: 
- Vercel에서 특수문자(`!`)가 문제가 되면 URL 인코딩 버전 사용
- 또는 Vercel 환경 변수 입력란에 직접 입력하면 자동으로 처리됩니다

---

## 🧪 연결 테스트

### 로컬에서 테스트

```bash
cd co-fleeter-pilot

# .env 파일이 있는지 확인
# 그 다음 서버 실행
npm start
```

**성공 메시지:**
```
✅ MongoDB Connected Successfully
✅ Store: All data loaded
```

**실패 시 확인:**
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 연결 문자열에 오타가 없는지 확인
3. MongoDB Atlas에서 네트워크 접근 설정 확인 (0.0.0.0/0)

---

## ✅ 설정 완료 체크리스트

- [x] MongoDB Atlas 클러스터 생성 완료
- [x] 데이터베이스 사용자 생성 완료 (admin / admin123!)
- [x] 네트워크 접근 설정 완료
- [x] 연결 문자열 복사 완료
- [ ] `.env` 파일 생성 (로컬 개발용)
- [ ] 로컬 연결 테스트
- [ ] Vercel 환경 변수 설정 (배포 시)

---

## 📝 다음 단계

1. ✅ `.env` 파일 생성
2. ✅ 로컬에서 연결 테스트
3. ✅ GitHub에 코드 업로드
4. ✅ Vercel 배포

**이제 `.env` 파일을 만들고 테스트해보세요!** 🚀
