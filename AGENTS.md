# AGENTS.md

## Current Work

현재 이 저장소에서는 `data-sattie`를 현재 프로젝트 스택에 맞춰 포팅하는 작업을 진행 중이다.

- 원본: `data-sattie`
- 타깃 스택:
  - 프런트: `React + TypeScript + Vite + Blueprint`
  - 백엔드: `Express + SQLite`
- 목표:
  - 기존 `data-sattie` 기능과 도메인 흐름 유지
  - 기존 정적 HTML/JS 콘솔을 Blueprint 스타일 운영 콘솔로 재구성
  - Python/FastAPI 구현을 현재 저장소 구조로 이식

## Source Of Truth

현재 작업의 기준 문서는 아래 두 파일이다.

- [docs/sattie-porting-plan.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-porting-plan.md)
- [docs/sattie-api-contract.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-api-contract.md)
- [docs/sattie-db-design.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-db-design.md)
- [docs/sattie-verification.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-verification.md)

원본 분석 기준은 아래 파일이다.

- [data-sattie/app/main.py](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/data-sattie/app/main.py)
- [data-sattie/app/static/index.html](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/data-sattie/app/static/index.html)
- [data-sattie/README.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/data-sattie/README.md)
- [data-sattie/K-Sattie Sky Hub 검증 콘솔 와이어프레임 설계서.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/data-sattie/K-Sattie%20Sky%20Hub%20검증%20콘솔%20와이어프레임%20설계서.md)

## Progress

완료:

- `A00` 원본 `data-sattie` 구조, 기능, 화면, API 분석
- `A01` 포팅 플랜 문서 생성 및 작업 트래킹 방식 확정
- `A02` 타깃 데이터 모델과 API 계약서 초안 작성
- `A03` SQLite 스키마와 seed 전략 설계
- `A04` Express `sattie` 백엔드 스캐폴드 구현
- `A05` 명령 상태 전이와 이미지/다운로드 서비스 구현
- `A06` 프런트 공통 타입, API 클라이언트, 라우트 구조 재편
- `A07` `Dashboard` 화면 포팅
- `A08` `Satellites` 화면 포팅
- `A09` `Satellites Performance` 화면 포팅
- `A10` `Send A Uplink` 화면 포팅
- `A11` `Commands Monitor` 화면 포팅
- `A12` `Multi Payload Scenario` 화면 포팅
- `A13` 역할 모드와 UI 권한 제어 반영
- `A14` 통합 검증 및 잔여 갭 정리

다음 작업:

- 현재 액션 아이템은 모두 완료

## Porting Decisions

- 신규 API는 기존 샘플 API와 충돌하지 않게 `/api/sattie/*` 네임스페이스를 사용한다.
- 응답 필드명은 원본 `data-sattie`와 호환되도록 우선 `snake_case`를 유지한다.
- 역할 모드(`admin`, `operator`, `requestor`)는 우선 프런트 시뮬레이션 제어로 구현한다.
- 화면 구현 전에 백엔드 계약과 SQLite 스키마를 먼저 고정한다.
- 포팅은 원본 HTML을 그대로 복사하지 않고 React 컴포넌트로 분해해서 구현한다.

## Working Rule

- 액션 아이템 진행 시 먼저 [docs/sattie-porting-plan.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-porting-plan.md)의 상태를 확인한다.
- 새 작업을 시작하거나 끝낼 때는 플랜 문서의 상태 표와 체크리스트를 같이 갱신한다.
- 구현 중 범위 변경이나 설계 변경이 생기면 코드보다 문서를 먼저 수정한다.
- 작업 우선순서는 아래와 같다.
  - 계약 확정
  - DB/seed 설계
  - Express 백엔드
  - React/Blueprint 프런트
  - 통합 검증

## Notes For Next Turn

- 포팅 기본 범위는 완료 상태다.
- App bootstrap 스냅샷은 CRUD, uplink, rerun, scenario 실행 이후 자동 갱신되도록 보강된 상태다.
- `EXTERNAL + OSM`은 더 이상 placeholder가 아니며, 서버에서 실제 tile fetch 기반 PNG 생성과 preview endpoint를 지원한다.
- 후속 작업이 필요하면 [docs/sattie-verification.md](/Users/jaehojoo/workspace/codex-lgcns/temp-blueprint/docs/sattie-verification.md)의 잔여 갭부터 처리한다.
