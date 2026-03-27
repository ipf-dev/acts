# Asset Upload Architecture

## Decision Summary

ACTS의 업로드 대상 에셋은 **PostgreSQL에 메타데이터를 저장**하고,
**실제 바이너리 파일은 S3 호환 Object Storage에 저장**하되, 외부 링크 자산은
**메타데이터만 PostgreSQL에 저장**하는 구조가 가장 적절하다.

권장 구성:

- metadata DB: `PostgreSQL`
- binary storage: `S3-compatible object storage` for file assets only
- local dev: `PostgreSQL + LocalStack S3`
- production: `PostgreSQL + AWS S3` 또는 동급 호환 스토리지

현재 구현된 first slice:

- backend file upload: `upload-intent -> browser direct PUT -> LocalStack S3`
- backend link registration: `JSON request -> Spring Boot -> PostgreSQL`
- metadata tables: `assets`, `asset_files`, `asset_tags`, `asset_events`, `character_tags`, `character_tag_aliases`
- frontend: 자산 라이브러리 + 파일/링크 분리 업로드 모달 + 구조화 태그 편집 + 관리자 태그 관리

즉, 파일 자산은 direct upload를 사용하고, 링크 자산은 storage 없이 metadata-only로 등록한다.
이 단계에서는 업로드 경로를 둘로 나누되 메타데이터/태그/검색 경계를 먼저 고정하는 것이 목적이다.

이 구조를 선택하는 이유:

- 이미지, 오디오, 비디오, 문서 파일을 DB BLOB로 저장하면 백업/복구/성능/비용이 빠르게 나빠진다.
- ACTS는 검색, 필터, 권한, 이력, 재사용이 중요하므로 관계형 메타데이터 설계가 핵심이다.
- 업로드뿐 아니라 AI 생성 결과물도 같은 저장 구조로 흡수할 수 있다.

## Design Principle

핵심 원칙은 **logical asset**과 **physical file object**를 분리하는 것이다.

- `asset`: 사용자가 관리하고 검색하는 논리 단위
- `file object`: 실제 스토리지에 저장된 파일 버전

예:

- "한복 입은 토니 레퍼런스 이미지" = asset
- 원본 PNG, 썸네일 WEBP, 압축 미리보기 JPG = file objects / derivatives

## Recommended Data Model

### 1. `assets`

사용자가 보는 대표 자산 레코드.

주요 컬럼:

- `id uuid pk`
- `asset_type varchar(32)`
  - `IMAGE`, `AUDIO`, `VIDEO`, `DOCUMENT`, `URL`, `OTHER`
- `source_type varchar(32)`
  - `USER_UPLOAD`, `AI_GENERATED`, `EXTERNAL_IMPORT`
- `title varchar(255)`
- `description text`
- `owner_user_email varchar(255)`
- `organization_id bigint not null`
- `project_key varchar(100) null`
- `visibility_scope varchar(32) not null`
  - 초기 권장값: `ORG`, `GLOBAL`
- `current_file_id uuid null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamp not null`
- `updated_at timestamp not null`
- `deleted_at timestamp null`

역할:

- 목록/검색/상세 조회의 기준 테이블
- 권한 검사 기준 레코드
- 조직/프로젝트/소유자 기준 필터의 기준
- 사용자에게 노출되는 별도 상태 값은 두지 않고, 업로드/삭제 여부는 파일 레코드와 이벤트로 판단

### 2. `asset_files`

실제 업로드된 원본 파일 또는 새 버전의 physical object.

주요 컬럼:

- `id uuid pk`
- `asset_id uuid not null fk`
- `version_no integer not null`
- `storage_provider varchar(32) not null`
  - 초기값: `S3`
- `storage_bucket varchar(120) not null`
- `storage_key varchar(500) not null`
- `original_filename varchar(255) not null`
- `file_extension varchar(32) null`
- `mime_type varchar(120) not null`
- `size_bytes bigint not null`
- `sha256 varchar(64) null`
- `upload_status varchar(32) not null`
  - `ISSUED`, `UPLOADING`, `UPLOADED`, `VERIFIED`, `FAILED`
- `antivirus_status varchar(32) not null`
  - `PENDING`, `CLEAN`, `INFECTED`, `SKIPPED`
- `width integer null`
- `height integer null`
- `duration_ms bigint null`
- `page_count integer null`
- `created_by_email varchar(255) not null`
- `created_at timestamp not null`

제약:

- `unique(asset_id, version_no)`
- `unique(storage_bucket, storage_key)`

역할:

- 파일 버전 관리
- checksum/size/mime 검증
- 후처리 대상 추적

### 3. `asset_derivatives`

썸네일, 프리뷰, 트랜스코딩 결과를 저장.

주요 컬럼:

- `id uuid pk`
- `asset_file_id uuid not null fk`
- `derivative_type varchar(32) not null`
  - `THUMBNAIL`, `PREVIEW`, `TRANSCODED_MP4`, `WAVEFORM`
- `storage_bucket varchar(120) not null`
- `storage_key varchar(500) not null`
- `mime_type varchar(120) not null`
- `size_bytes bigint not null`
- `width integer null`
- `height integer null`
- `duration_ms bigint null`
- `created_at timestamp not null`

역할:

- 상세 화면 미리보기
- 목록 썸네일
- 브라우저 재생용 파생본

### 4. `upload_sessions`

브라우저 direct upload를 위한 임시 세션.

참고:

- 이 테이블은 최종 구조에는 유효하지만, 현재 첫 구현에는 아직 포함하지 않았다.
- 현재는 backend multipart upload로 시작하고, 파일량/성능 요구가 커질 때 presigned direct upload로 확장한다.

주요 컬럼:

- `id uuid pk`
- `asset_id uuid not null fk`
- `asset_file_id uuid not null fk`
- `issued_to_email varchar(255) not null`
- `presigned_method varchar(16) not null`
- `presigned_expires_at timestamp not null`
- `expected_size_bytes bigint null`
- `expected_sha256 varchar(64) null`
- `status varchar(32) not null`
  - `ISSUED`, `COMPLETED`, `EXPIRED`, `ABORTED`
- `created_at timestamp not null`

역할:

- presigned URL 발급 이력
- 업로드 완료 확인
- 중단/만료 제어

### 5. `asset_events`

에셋 단위 이벤트 로그. 글로벌 감사 로그와 별도로 두는 편이 낫다.

주요 컬럼:

- `id bigserial pk`
- `asset_id uuid not null fk`
- `event_type varchar(32) not null`
  - `UPLOAD_REQUESTED`, `UPLOAD_COMPLETED`, `METADATA_EXTRACTED`, `THUMBNAIL_CREATED`, `DELETED`
- `actor_email varchar(255) not null`
- `detail text null`
- `before_state jsonb null`
- `after_state jsonb null`
- `created_at timestamp not null`

역할:

- 에셋 lifecycle 추적
- 운영 디버깅
- 자산별 이력 화면

## Recommended Upload Flow

### Flow A. Browser direct upload

1. 프론트가 `POST /api/assets/upload-sessions` 호출
2. 백엔드가 `assets`, `asset_files`, `upload_sessions`를 생성한다
3. 백엔드가 presigned URL 반환
4. 브라우저가 object storage로 직접 업로드
5. 프론트가 `POST /api/assets/upload-sessions/{id}/complete` 호출
6. 백엔드가 object head 조회 후 size/mime/checksum 검증
7. 검증 성공 시 `asset_files.upload_status=VERIFIED`
8. 메타데이터 추출/썸네일 생성 작업이 필요하면 공통 후처리 파이프라인으로 넘긴다

### Flow B. AI 생성 결과 저장

1. 생성 워커가 object storage에 결과 저장
2. 백엔드가 `assets` + `asset_files` 생성
3. `upload_sessions` 없이 바로 `UPLOADED/VERIFIED`
4. 공통 후처리 파이프라인 진입

이 구조를 쓰면 업로드와 AI 생성이 같은 자산 모델을 공유한다.

### Flow 0. Current first slice

#### Flow 0A. File upload

1. 프론트 업로드 모달의 `파일 업로드` 탭에서 여러 파일을 선택한다.
2. 각 파일에 대해 제목, 설명, 캐릭터/장소/키워드 태그를 조정한다.
3. 프론트가 `POST /api/assets/upload-intent`로 presigned URL을 발급받는다.
4. 브라우저가 S3(LocalStack)에 파일을 직접 업로드한다.
5. 프론트가 `POST /api/assets/{assetId}/complete`를 호출한다.
6. 백엔드가 `assets`, `asset_files`, `asset_tags`, `asset_events`를 저장/완료 처리한다.
7. 캐릭터 태그는 `character_tags`와 `character_tag_aliases`를 기준으로 정합성을 검증하고 alias 검색어를 `assets.search_text`에 함께 반영한다.

#### Flow 0B. Link registration

1. 프론트 업로드 모달의 `링크 등록` 탭에서 URL, 제목, 링크 유형, 캐릭터/장소/키워드 태그를 입력한다.
2. 여러 링크를 임시 목록에 쌓은 뒤 일괄 등록한다.
3. 프론트가 `POST /api/assets/links` JSON 요청을 보낸다.
4. 백엔드는 S3 접근 없이 `assets`, `asset_tags`, `asset_events`만 저장한다.
5. 등록된 링크 자산은 라이브러리 검색, 상세, 이력, 삭제, 내보내기 대상에 포함된다.
6. 프론트 자산 라이브러리가 새 카탈로그를 다시 조회한다.

#### Flow 0C. Admin tag management

1. 관리자가 관리자 설정의 `태그 관리` 탭으로 이동한다.
2. 캐릭터 이름은 생성/수정/삭제할 수 있고, 검색 alias를 여러 개 관리할 수 있다.
3. 장소와 키워드는 현재 라이브러리에 존재하는 값을 기준으로 수정/병합/삭제할 수 있다.
4. 병합/수정/삭제 후 백엔드는 `asset_tags`와 `assets.search_text`를 일괄 갱신한다.

## Storage Key Strategy

권장 key:

- original: `assets/{asset_id}/v{version_no}/original/{uuid}-{sanitized-filename}`
- derivative: `assets/{asset_id}/v{version_no}/derivatives/{derivative_type}.{ext}`

이유:

- asset 기준 정리가 쉽다
- 버전별 고립이 된다
- 삭제/복구/이관이 단순하다

## Search And Filtering

검색 기준은 object storage가 아니라 PostgreSQL metadata여야 한다.

초기 권장 인덱스:

- `assets(owner_user_email, created_at desc)`
- `assets(organization_id, created_at desc)`
- `assets(status, asset_type)`
- `assets(project_key)`
- `gin(metadata jsonb_path_ops)`

검색 MVP:

- 제목
- 원본 파일명
- 조직
- 프로젝트
- 타입
- 생성자
- 업로드 일시

초기에는 PostgreSQL로 충분하다. 검색 품질이 중요해지면 그때 OpenSearch/Meilisearch를 붙인다.

## Security And Validation

최소 요구:

- 허용 mime type whitelist
- 허용 최대 용량 정책
- 업로드 완료 후 object head 재검증
- 가능하면 sha256 또는 etag 검증
- 파일명 sanitize
- 바이러스 검사 훅 또는 quarantine 상태 준비
- presigned URL 짧은 만료 시간

중요:

- 장기적으로는 direct upload가 맞다.
- 하지만 현재 slice는 태깅/메타데이터/검색 경계를 먼저 확인하는 단계라 backend multipart를 허용한다.

## What Should Not Go Into This Structure

시나리오 본문 같은 text-first 콘텐츠는 object storage 중심 모델보다
PostgreSQL 문서/버전 모델이 더 적절하다.

즉:

- binary asset: `assets + asset_files + object storage`
- text scenario/document: 별도 `documents` 또는 `scenario_contents` 테이블

둘은 검색/권한 층에서 통합해서 보여주면 된다.

## Local And Production Recommendation

Local:

- PostgreSQL
- LocalStack S3

Production:

- PostgreSQL
- S3
- 비동기 후처리 worker

## Recommended First Implementation Slice

가장 먼저 만들 최소 범위:

1. `organizations`, `assets`, `asset_files`, `upload_sessions`
2. `POST /api/assets/upload-sessions`
3. `POST /api/assets/upload-sessions/{id}/complete`
4. `GET /api/assets`
5. `GET /api/assets/{id}`
6. 이미지 업로드 1종만 먼저 지원
7. 썸네일 없이도 업로드 완료 상태까지 보이기

이 slice가 끝나면 이후에:

- audio/video derivative
- access scope
- export/download
- asset_events

를 얹는 순서가 가장 안전하다.

세부 엔티티/테이블 설계는 [ASSET_DATA_MODEL.md](/Users/kimminsung/Workspace/acts/docs/ASSET_DATA_MODEL.md) 기준으로 확장한다.
