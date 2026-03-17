# K-Sattie Verification Notes

## 검증 범위

현재 포팅 결과에 대해 아래 두 축으로 검증했다.

- 백엔드 스모크 테스트
- 프런트 프로덕션 빌드

## 백엔드 스모크 테스트

실행 방식:

- Node 모듈 직접 호출
- 대상:
  - DB 초기화
  - baseline seed 확인
  - uplink 생성
  - 상태 전이 완료
  - images clear 이후 실패 보정
  - rerun 이후 재완료

검증 결과:

```json
{
  "satelliteCount": 15,
  "stationCount": 3,
  "requestorCount": 6,
  "readyState": "DOWNLINK_READY",
  "clearedState": "FAILED",
  "rerunState": "QUEUED",
  "finalState": "DOWNLINK_READY"
}
```

판정:

- seed 동작 정상
- uplink 및 상태 전이 정상
- clear 후 실패 보정 정상
- rerun 후 재처리 정상

## EXTERNAL + OSM 검증

실행 방식:

- 외부 인터넷 대신 로컬 fetch stub 사용
- 대상:
  - OSM tile fetch 경로의 PNG decode / 3x3 mosaic / crop / resize
  - `preview/external-map`
  - `generation_mode=EXTERNAL` uplink 후 실제 downlink PNG 생성

검증 결과:

```json
{
  "previewPngBytes": 6005,
  "externalRenderPngBytes": 102231,
  "pipelineState": "DOWNLINK_READY",
  "imageSource": {
    "mode": "EXTERNAL",
    "external_map_source": "OSM",
    "external_map_zoom": 16
  }
}
```

판정:

- `EXTERNAL + OSM` preview PNG 생성 정상
- `EXTERNAL + OSM` uplink 이후 실제 downlink 이미지 생성 정상
- 현재 구현은 `SATTIE_OSM_TILE_URL_TEMPLATE` 환경변수로 타일 엔드포인트를 대체해 로컬/테스트 환경 검증 가능

## 프런트 빌드 검증

실행 명령:

```bash
npm run build
```

결과:

- `tsc -b` 통과
- `vite build` 통과

판정:

- 현재 프런트 타입/라우트/컴포넌트 구조는 빌드 가능 상태

## 로컬 Dev 경로 검증

실행 방식:

- `npm run dev:server`
- `npm run dev:client -- --host 127.0.0.1 --port 4173`
- `http://127.0.0.1:4173/api/sattie/*` 기준 proxy 경로 확인

검증 결과:

- `GET /api/sattie/health` 응답 정상
- `GET /api/sattie/preview/external-map?...` 응답 `200`, PNG 바이트 생성 정상
- `POST /api/sattie/uplink`로 `generation_mode=EXTERNAL` command 생성 정상
- `GET /api/sattie/commands/{id}`에서 `DOWNLINK_READY`와 `product_metadata.image_source.mode=EXTERNAL` 확인
- `GET /api/sattie/downloads/{id}` 응답 `200 image/png`, 파일 시그니처 `89 50 4E 47 0D 0A 1A 0A` 확인

판정:

- 프런트 dev server의 `/api` proxy를 통해 OSM preview와 downlink download가 실제로 연결됨
- `EXTERNAL + OSM` 흐름은 빌드 수준이 아니라 로컬 dev 경로에서도 동작 확인됨

## 남은 갭

- 브라우저 상호작용 E2E 검증은 아직 수행하지 않음
- `requestor` 역할의 세부 소유권 검증은 프런트 제어 중심이며 서버 권한 모델은 아님
- App bootstrap 데이터는 CRUD, uplink, rerun, scenario 실행 이후 전체 셸 카운트와 함께 자동 동기화되도록 보강함

## 결론

현재 포팅은 아래 범위를 충족한다.

- `data-sattie` 도메인 자원 CRUD
- uplink / command / rerun / download / clear 흐름
- Blueprint 기반 대시보드, 관리, 분석, uplink, monitor, scenario 화면
- mock role mode 기반 UI 접근 제어

실사용 기준 다음 우선순위는 브라우저 E2E 검증과 서버 권한 모델 보강이다.
