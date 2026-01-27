# Supabase 환경 변수 설정 가이드

## 로컬 개발 환경 설정

프로젝트 루트의 `.env` 파일에 다음 내용을 추가하세요:

```env
# Supabase Configuration
SUPABASE_URL=https://byfqwzcjdxljbwulzjaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_U8oE8OYpARdQTarCq1yZLg_hyKlqMxu
NODE_ENV=development
```

### 주의사항 ⚠️
- **SERVICE_ROLE_KEY**는 서버에서만 사용하세요!
- 절대 프론트엔드 코드나 GitHub에 노출하지 마세요!
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요!

---

## Vercel 배포 환경 설정

Vercel Dashboard에서 다음 환경 변수를 추가하세요:

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 다음 3개 변수 추가:

```
Name: SUPABASE_URL
Value: https://byfqwzcjdxljbwulzjaf.supabase.co

Name: SUPABASE_SERVICE_ROLE_KEY
Value: sb_secret_U8oE8OYpARdQTarCq1yZLg_hyKlqMxu

Name: NODE_ENV
Value: production
```

4. Save 클릭
5. 재배포 (Redeploy)

---

## 키 설명

### Anon Public Key (프론트엔드용)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZnF3emNqZHhsamJ3dWx6amFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDU3NDYsImV4cCI6MjA4NTA4MTc0Nn0.C_BZ_quEYe5kipOSla3C42HjPhCNsJFbOo2gKEG93WQ
```
- 제한된 권한 (RLS 적용)
- 프론트엔드에서 사용 가능
- 현재 프로젝트에서는 사용 안 함 (백엔드 API 경유)

### Service Role Key (백엔드용) 🔒
```
sb_secret_U8oE8OYpARdQTarCq1yZLg_hyKlqMxu
```
- **모든 권한 (RLS 우회)**
- **절대 노출 금지!**
- 서버 코드에서만 사용
- 환경 변수로만 관리

---

## .gitignore 확인

`.gitignore` 파일에 다음이 포함되어 있는지 확인하세요:

```gitignore
.env
.env.local
.env.development
.env.production
*.env
```

---

## 테스트

환경 변수가 제대로 설정되었는지 확인:

```bash
# Windows PowerShell
echo $env:SUPABASE_URL

# Mac/Linux
echo $SUPABASE_URL
```

또는 Node.js에서:

```javascript
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Has Service Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
```
