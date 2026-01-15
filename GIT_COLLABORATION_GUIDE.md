# 🚀 Git 협업 가이드 (초보자용)

Co-Fleeter 프로젝트의 Git 협업 방법을 설명합니다.

---

## 📋 목차
1. [사전 준비](#1-사전-준비)
2. [프로젝트 다운로드 (Clone)](#2-프로젝트-다운로드-clone)
3. [코드 수정 후 업로드 (Push)](#3-코드-수정-후-업로드-push)
4. [다른 사람 변경사항 가져오기 (Pull)](#4-다른-사람-변경사항-가져오기-pull)
5. [충돌 해결하기](#5-충돌-해결하기)

---

## 1. 사전 준비

### Git 설치
1. [Git 다운로드 페이지](https://git-scm.com/downloads) 접속
2. Windows용 다운로드 및 설치 (기본 옵션으로 Next 계속 클릭)

### GitHub 계정
1. [GitHub.com](https://github.com) 가입
2. 팀원에게 GitHub 사용자명(username) 공유
3. 팀원이 저장소에 **Collaborator**로 초대해야 함

---

## 2. 프로젝트 다운로드 (Clone)

**최초 1회만 실행** - 이미 폴더가 있으면 건너뛰세요.

```bash
# 1. 원하는 폴더로 이동 (예: 바탕화면)
cd C:\Users\[사용자명]\Desktop

# 2. 프로젝트 복제
git clone https://github.com/yeomjw09/co-fleeter-pilot.git

# 3. 폴더 진입
cd co-fleeter-pilot
```

> **💡 팁**: 바이브코딩에서 "터미널에서 이 명령어 실행해줘"라고 하면 됩니다!

---

## 3. 코드 수정 후 업로드 (Push)

코드를 수정한 후 GitHub에 업로드하는 방법:

```bash
# 1. 변경된 파일 모두 선택
git add .

# 2. 변경 내용 설명 작성
git commit -m "변경 내용 설명 (예: 로그인 버그 수정)"

# 3. GitHub에 업로드
git push origin main
```

### 📌 예시
```bash
git add .
git commit -m "Admin 페이지 UI 개선"
git push origin main
```

> **⚠️ 중요**: `push` 전에 항상 `pull`을 먼저 하세요! (아래 참조)

---

## 4. 다른 사람 변경사항 가져오기 (Pull)

다른 팀원이 수정한 내용을 내 PC로 가져옵니다.

```bash
# GitHub에서 최신 코드 가져오기
git pull origin main
```

### 📌 권장 작업 순서
1. **작업 시작 전**: `git pull origin main` (최신 코드 가져오기)
2. **코드 수정**
3. **작업 완료 후**: 
   - `git add .`
   - `git commit -m "설명"`
   - `git pull origin main` (혹시 다른 사람이 수정했을 수 있으니)
   - `git push origin main`

---

## 5. 충돌 해결하기

두 사람이 같은 파일을 동시에 수정하면 **충돌(Conflict)**이 발생합니다.

### 충돌 발생 시
```
CONFLICT (content): Merge conflict in frontend/js/app.js
```

### 해결 방법
1. 충돌난 파일을 열면 이런 식으로 표시됩니다:
```
<<<<<<< HEAD
내가 수정한 코드
=======
다른 사람이 수정한 코드
>>>>>>> origin/main
```

2. 둘 중 하나를 선택하거나 합쳐서 정리
3. `<<<<<<<`, `=======`, `>>>>>>>` 표시 삭제
4. 다시 커밋:
```bash
git add .
git commit -m "충돌 해결"
git push origin main
```

---

## 🎯 바이브코딩 사용자를 위한 팁

바이브코딩에서 이렇게 요청하면 됩니다:

| 하고 싶은 것 | 바이브코딩에 입력할 내용 |
|---|---|
| 최신 코드 가져오기 | "git pull 해줘" |
| 내 코드 업로드하기 | "git에 올려줘" 또는 "커밋하고 푸시해줘" |
| 변경 내역 확인 | "git status 보여줘" |
| 충돌 해결하기 | "충돌 해결해줘" |

---

## 📞 문제 발생 시

### "Permission denied" 오류
→ GitHub 저장소에 Collaborator로 초대받았는지 확인

### "Your local changes would be overwritten" 오류
→ 현재 수정 중인 파일이 있음. 먼저 커밋하거나 `git stash`

### 그 외 오류
→ 바이브코딩에 에러 메시지 복사해서 "이 오류 해결해줘"라고 요청

---

## 📁 중요 파일 설명

| 파일/폴더 | 설명 |
|---|---|
| `frontend/` | 화면(UI) 관련 코드 |
| `backend/` | 서버 로직 코드 |
| `.env` | 환경 설정 (MongoDB 연결 정보 등) - **절대 GitHub에 올리면 안됨!** |
| `vercel.json` | Vercel 배포 설정 |

---

*마지막 업데이트: 2026-01-15*
