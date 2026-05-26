# 🍅 나의 뽀모도로 앱

iPad에서 사용하는 개인용 뽀모도로 타이머 PWA입니다.

## 파일 구조

```
pomodoro-app/
├── index.html      ← 메인 HTML
├── style.css       ← 스타일
├── app.js          ← 타이머 로직
├── sw.js           ← Service Worker (오프라인 지원)
├── manifest.json   ← PWA 설정
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## GitHub Pages 배포 방법

### 1단계: GitHub 저장소 만들기
1. https://github.com 로그인
2. 우측 상단 **+** → **New repository**
3. Repository name: `pomodoro-app`
4. **Public** 선택
5. **Create repository** 클릭

### 2단계: 파일 업로드
```bash
# (Git이 설치된 경우)
git init
git add .
git commit -m "뽀모도로 앱 첫 배포"
git remote add origin https://github.com/내아이디/pomodoro-app.git
git push -u origin main
```

또는 GitHub 웹에서 **Add file → Upload files**로 직접 드래그 업로드

### 3단계: GitHub Pages 활성화
1. 저장소 → **Settings** 탭
2. 왼쪽 메뉴 → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **(root)** 선택
5. **Save** 클릭
6. 몇 분 후 주소 생성: `https://내아이디.github.io/pomodoro-app`

### 4단계: iPad에 설치
1. iPad Safari에서 위 주소 접속
2. 하단 **공유 버튼** (□↑) 탭
3. **"홈 화면에 추가"** 선택
4. **추가** 탭
5. 홈화면에 뽀모도로 앱 아이콘 생성 🎉

## 주요 기능
- 🍅 25분 집중 / 5분 짧은 휴식 / 15분 긴 휴식
- 🔔 완료 시 알림 & 차임 사운드
- 📊 오늘 완료 세션 & 누적 기록
- ⚙️ 시간 커스텀 설정
- ✨ 자동 시작 옵션
- 📱 오프라인에서도 작동 (PWA)
- ⌨️ 키보드 단축키: Space(시작/일시정지), R(리셋), S(건너뛰기)
