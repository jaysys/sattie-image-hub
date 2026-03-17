# K-Sattie Blueprint Porting Plan

## 목적

`data-sattie` 폴더에 있는 K-Sattie Sky Hub를 현재 저장소의 기술 스펙에 맞춰 포팅한다.

- 기능 목표: 기존 `data-sattie`와 동일한 도메인 기능 유지
- 기술 목표: `FastAPI + static HTML/JS`를 현재 프로젝트의 `Express + SQLite + React + TypeScript + Blueprint` 구조로 재구성
- UI 목표: 기존 정적 콘솔을 현재 저장소의 Blueprint 기반 운영 콘솔 스타일로 이식

## 기준 소스

- 원본 기능/도메인: [../data-sattie/app/main.py](../data-sattie/app/main.py)
- 원본 UI/동작: [../data-sattie/app/static/index.html](../data-sattie/app/static/index.html)
- 원본 기능 설명: [../data-sattie/README.md](../data-sattie/README.md)
- 원본 화면 설계: [../data-sattie/K-Sattie Sky Hub 검증 콘솔 와이어프레임 설계서.md](../data-sattie/K-Sattie%20Sky%20Hub%20검증%20콘솔%20와이어프레임%20설계서.md)
- 현재 타깃 앱 프런트 진입점: [../src/App.tsx](../src/App.tsx)
- 현재 타깃 앱 서버 진입점: [../server/index.js](../server/index.js)

## 현재 판단

이 포팅은 단순 번역 작업이 아니다.

- Python 서비스 로직을 Node 서버 구조로 재구성해야 한다.
- 정적 HTML 콘솔을 React 컴포넌트 구조로 분해해야 한다.
- 기존 `data-sattie`의 상태 전이, 인증, 시드, 시나리오, 다운로드 흐름을 유지해야 한다.
- 현재 저장소의 Blueprint UI 패턴과 라우팅 구조에 맞춰 화면을 재배치해야 한다.

## 목표 아키텍처

### 백엔드

- 런타임: `Node.js + Express`
- 저장소: `SQLite`
- 네임스페이스: `/api/sattie/*`
- 권장 모듈 구조:
  - `server/sattie/db.js`
  - `server/sattie/routes.js`
  - `server/sattie/service.js`
  - `server/sattie/seed.js`
  - `server/sattie/image.js`
  - `server/sattie/types.js` 또는 서비스 상수 모듈

### 프런트엔드

- 런타임: `React + TypeScript + Vite`
- UI: `Blueprint`
- 권장 라우트/화면:
  - `Dashboard`
  - `Satellites`
  - `Satellites Performance`
  - `Send A Uplink`
  - `Commands Monitor`
  - `Multi Payload Scenario`

### 데이터/상태

- 핵심 엔터티:
  - `satellites`
  - `ground_stations`
  - `requestors`
  - `commands`
  - `api_call_logs`
- 핵심 상태 전이:
  - `QUEUED -> ACKED -> CAPTURING -> DOWNLINK_READY`
  - 실패 시 `FAILED`

## 범위

### 포함

- 시드 위성/지상국/요청자 생성
- 위성/지상국/요청자 CRUD
- 업링크 생성
- 명령 상태 조회 및 자동 폴링
- 다운로드 링크 및 로컬 저장 메타 확인
- 이미지 초기화
- 다중 시나리오 실행
- 역할 모드(`admin`, `operator`, `requestor`) 기반 UI 제어
- API 키 헤더 처리 및 기본 rate limit

### 보류 가능 항목

- 외부 지도 이미지 생성 구현 세부 방식
- 이미지 생성 품질 최적화
- API 로그 모니터 화면의 세부 수준

## 액션 아이템

진행 상태는 아래 체크리스트와 상태 표기로 함께 관리한다.

| ID | 상태 | 작업 |
| --- | --- | --- |
| A00 | Done | 원본 `data-sattie` 구조, 기능, 화면, API 분석 |
| A01 | Done | 포팅 플랜 문서 생성 및 작업 트래킹 방식 확정 |
| A02 | Done | 타깃 데이터 모델과 API 계약서 초안 작성 |
| A03 | Done | SQLite 스키마와 seed 전략 설계 |
| A04 | Done | Express `sattie` 백엔드 스캐폴드 구현 |
| A05 | Done | 명령 상태 전이와 이미지/다운로드 서비스 구현 |
| A06 | Done | 프런트 공통 타입, API 클라이언트, 라우트 구조 재편 |
| A07 | Done | `Dashboard` 화면 포팅 |
| A08 | Done | `Satellites` 화면 포팅 |
| A09 | Done | `Satellites Performance` 화면 포팅 |
| A10 | Done | `Send A Uplink` 화면 포팅 |
| A11 | Done | `Commands Monitor` 화면 포팅 |
| A12 | Done | `Multi Payload Scenario` 화면 포팅 |
| A13 | Done | 역할 모드와 UI 권한 제어 반영 |
| A14 | Done | 통합 검증 및 잔여 갭 정리 |

## 체크리스트

### 분석

- [x] 현재 저장소 스택 확인
- [x] `data-sattie` 주요 엔드포인트 확인
- [x] 원본 콘솔 탭 구조 확인
- [x] 포팅 범위와 비범위 구분

### 백엔드

- [x] `/api/sattie/health`
- [x] `/api/sattie/satellites`
- [x] `/api/sattie/ground-stations`
- [x] `/api/sattie/requestors`
- [x] `/api/sattie/satellite-types`
- [x] `/api/sattie/scenarios`
- [x] `/api/sattie/uplink`
- [x] `/api/sattie/commands`
- [x] `/api/sattie/commands/:id/rerun`
- [x] `/api/sattie/downloads/:id`
- [x] `/api/sattie/downloads/:id/save-local`
- [x] `/api/sattie/images/clear`

### 프런트

- [x] 좌측 네비게이션 재구성
- [x] Blueprint 스타일 KPI 대시보드 구성
- [x] CRUD 테이블/편집 모달 구성
- [x] 업링크 폼과 프리셋 로직 구성
- [x] 명령 상태 타임라인/폴링 구성
- [x] 시나리오 실행 패널 구성
- [x] 역할별 접근 제어 구성

### 검증

- [x] seed 후 Dashboard KPI 반영 확인
- [x] 위성 CRUD 반영 확인
- [x] 지상국 CRUD 반영 확인
- [x] 요청자 CRUD 반영 확인
- [x] uplink 후 상태 전이 확인
- [x] downlink 다운로드 확인
- [x] clear 이후 실패 보정 확인
- [x] rerun 동작 확인
- [x] scenario 실행 결과 확인

## 진행 규칙

- 액션 아이템은 한 번에 하나씩 `In Progress`로 전환한다.
- 완료 시 문서의 상태 표와 체크리스트를 같이 갱신한다.
- 구현 중 범위 변경이 발생하면 이 문서의 범위와 결정 사항을 먼저 수정한다.
- 화면 구현보다 백엔드 계약을 먼저 고정한다.

## 다음 작업

현재 액션 아이템은 모두 완료했다.

- 검증 및 잔여 갭 정리는 [./sattie-verification.md](./sattie-verification.md)에 기록했다.
