# K-Sattie Image Hub

React + TypeScript + Vite 프런트와 Express + SQLite API 서버를 단일 포트로 붙인 Palantir BlueprintJS 기반 운영 콘솔입니다.

## 실행

원샷 스크립트:

```bash
./one-shot-setup.sh
./one-shot-startup.sh
./one-shot-stop.sh
```

- `one-shot-setup.sh`: 의존성 설치와 프로덕션 빌드를 수행합니다.
- `one-shot-startup.sh`: `127.0.0.1:6005`에서 서버를 기동하고 `.run/*.log`에 로그를 남깁니다.
- `one-shot-stop.sh`: 기동한 서버와 `6005` 포트 리스너를 종료합니다.

개발 모드:

```bash
npm install
npm run dev
```

`npm run dev`는 `127.0.0.1:6005`에서 프런트와 API를 함께 띄웁니다.

종료:

```bash
npm run stop
```

`npm run stop`는 기존 개발용 정리 스크립트입니다. 현재 단일 서버 운영에는 `./one-shot-stop.sh` 사용을 권장합니다.

## 프런트엔드 구성

- 프런트는 `React + TypeScript + Vite` 기반입니다.
- UI는 `Blueprint` 컴포넌트를 사용하며 `Dashboard / Approvals / Settings` 3개 라우트로 구성되어 있습니다.
- 전역 레이아웃과 부트스트랩 로딩은 [src/App.tsx](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/src/App.tsx)에서 담당합니다.
- 각 화면은 [src/pages/](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/src/pages)에 나뉘어 있고, 공통 API 호출은 [src/lib/api.ts](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/src/lib/api.ts)에 모아두었습니다.
- 공유 타입은 [src/types.ts](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/src/types.ts), 전역 스타일은 [src/styles.css](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/src/styles.css)에 있습니다.
- 개발 중 프런트는 `/api` 요청을 Vite 프록시로 백엔드 `127.0.0.1:3001`에 전달합니다.

## 백엔드 구성

- 백엔드는 `Express` 기반 API 서버이며 진입점은 [server/index.js](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/server/index.js)입니다.
- 데이터 저장소는 `sqlite3`이고, DB 생성·초기화·조회·저장은 [server/db.js](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/server/db.js)에서 처리합니다.
- 샘플 시드 데이터는 [server/seedData.js](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/server/seedData.js)에 있고, 실행 시 `server/data/sample.db` 파일이 생성됩니다.
- 현재 API는 부트스트랩, 대시보드 조회, 승인 큐 조회, 설정 저장, 승인 담당자 배정 흐름까지 포함합니다.
- 주요 엔드포인트는 `GET /api/bootstrap`, `GET /api/dashboard`, `GET /api/approvals`, `PUT /api/settings`, `POST /api/approvals/assign` 입니다.

## 들어 있는 것

- `@blueprintjs/core` + `@blueprintjs/icons`
- `@blueprintjs/select`
- `@blueprintjs/table`
- `react-router-dom`
- `express`
- `sqlite3`
- `Dashboard / Approvals / Settings` 라우트
- 입력 폼, 상태 카드, 승인 큐, 데이터 테이블
- 다이얼로그와 라이트/다크 토글
- SQLite 샘플 DB 기반 API

## 시작 포인트

Blueprint는 일반 마케팅 페이지보다 다음 경우에 더 잘 맞습니다.

- 운영 콘솔
- 어드민 화면
- 데이터 분석 대시보드
- 내부 업무 도구

반대로 모바일 퍼스트 랜딩 페이지에는 대체로 과한 편입니다.

## 파일 구조

- `src/`: React 프런트엔드 코드
- `src/pages/`: 화면 단위 페이지 컴포넌트
- `src/lib/api.ts`: 프런트 API 호출 계층
- `src/types.ts`: 프런트/백엔드 응답에 맞춘 공유 타입
- `server/`: Express + SQLite 백엔드 코드
- `server/data/`: 실행 시 생성되는 SQLite 데이터 파일
