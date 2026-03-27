# Video Preview Lambda

이 디렉터리는 ACTS의 동영상 썸네일 생성용 AWS Lambda 컨테이너 이미지 자산을 담는다.

## 현재 구조

- backend: 업로드 완료 후 Lambda를 비동기로 호출
- runtime: AWS Lambda, package type `Container image`
- image registry: Amazon ECR
- storage: 원본 asset bucket을 그대로 사용
- output: `${objectKey}.preview.jpg`

## 디렉터리 구성

- `Dockerfile`: Lambda container image build 정의
- `handler.py`: 썸네일 생성 핸들러
- `requirements.txt`: Python 의존성
- `event.sample.json`: 수동 테스트 payload 예시
- `iam/lambda-trust-policy.json`: Lambda execution role 신뢰 정책 예시
- `iam/lambda-execution-policy.json`: Lambda execution role 권한 정책 예시

## 백엔드 계약

입력 payload:

```json
{
  "bucket": "acts-assets-dev-...",
  "objectKey": "assets/.../source.mp4",
  "previewObjectKey": "assets/.../source.mp4.preview.jpg",
  "originalFileName": "source.mp4"
}
```

## 권장 Lambda 설정

- package type: `Image`
- architecture: `arm64`
- memory: `2048 MB`
- timeout: `60 sec`
- ephemeral storage: `512 MB`

## 권장 preview 관리 방식

- 원본과 같은 S3 bucket에 저장
- key 규칙은 `${objectKey}.preview.jpg`로 고정
- 별도 DB row를 만들지 않고 파생 object로만 관리
- Lambda 시작 시 preview 존재 여부를 먼저 확인해 중복 생성을 피함
- preview는 immutable cache header로 저장

## IAM

- 신뢰 정책: `iam/lambda-trust-policy.json`
- 실행 정책: `iam/lambda-execution-policy.json`

`lambda-execution-policy.json`의 `__ASSET_BUCKET__`는 실제 bucket 이름으로 치환해야 한다.

## Backend 연결

- env: `ACTS_PREVIEW_VIDEO_THUMBNAIL_LAMBDA_FUNCTION_NAME`
- value: 생성한 Lambda 함수명
