# ATHLETIX Rowing V3

선수 프로필·훈련·체크인·PB·대회·목표를 누적하고 실제 OpenAI 응답으로 코칭하는 모바일 앱입니다. 정적 index.html / style.css / app.js와 Vercel Node 함수 api/analyze.js 구조를 유지합니다. 빌드 명령과 프레임워크 설정은 필요 없습니다.

## Vercel 설정

Environment Variables에 `OPENAI_API_KEY`를 Production 및 Preview 대상으로 등록하고 **재배포**하세요. 선택적으로 `OPENAI_MODEL`을 설정할 수 있습니다. 기본은 이미지 입력을 지원하는 `gpt-4o-mini`입니다. 키는 서버 환경변수에서만 읽고 GitHub나 프론트 코드에 넣지 않습니다. ChatGPT 구독과 OpenAI API 결제는 별개입니다.

AI 채팅·주간 분석·Concept2 사진 분석은 모두 POST `/api/analyze`를 사용합니다. 서버가 `https://api.openai.com/v1/responses`를 호출하고 `output_text`를 읽어 반환합니다. 사진은 실제 `input_image`로 전송됩니다. 성공 UI는 OpenAI response ID와 provider가 있을 때만 표시합니다. 가짜 코칭이나 자동 대체 답변은 없습니다.

모든 요청에 프로필, PB, 최근 7일/28일 훈련, 최근 28일 컨디션·수면·피로, 대회, 목표, 기준 날짜와 시간대가 포함됩니다. 채팅은 최근 8개 대화도 전달합니다. AI 화면의 데이터 보기에서 요청 내용을 확인할 수 있습니다.

## 저장과 입력

기존 V2 localStorage 키를 유지합니다. 데이터는 현재 브라우저에 저장되고 계정 동기화는 없습니다. 프로필 화면에서 JSON 백업과 복구가 가능합니다. 기록 시간은 분·초 분리 입력으로 iPhone 숫자 키보드에서도 콜론 없이 입력합니다. 사진은 긴 변 1,600px로 축소하고 분석 요청에만 포함합니다. 사진 인식 결과는 선수 확인 전에 기록에 자동 저장하지 않습니다.

## 검증

`node --test tests/analyze.test.cjs`는 로컬 HTTP POST, 누락된 키, 요청 데이터와 이미지 전달, 잘못된 키, 잔액 부족, rate limit, 빈 응답, 네트워크 오류를 검증합니다. OpenAI 응답을 모의하는 테스트는 실서비스 연결 증거가 아닙니다.

실제 배포에서 채팅·주간·사진 요청을 각각 실행하고 HTTP 200, `provider: openai`, `responseId`, OpenAI 생성 텍스트를 확인해야 연결 검증이 완료됩니다. API 키가 없으면 503 KEY_MISSING 안내가 반환됩니다. 키 오류·잔액 부족·API 장애는 오류 코드와 한국어 안내로 표시합니다.

### 2026-09-30 KST 실제 배포 확인

V3는 PR #2로 main에 병합되었고, 키 공백 정규화 및 오류 분류 수정도 운영 배포에 반영되었습니다. 키가 없는 Preview에서 세 가지 실제 POST가 503 KEY_MISSING 안내를 표시했습니다. 키 등록 후 Production의 채팅·주간·사진 POST는 실제 OpenAI Responses API에 도달했지만 `error.code: credit_balance_exhausted`, `error.type: insufficient_quota`로 거절되었습니다. 앱은 잔액·한도 부족 안내를 표시합니다.

합성 테스트 데이터로 프로필, PB, 최근 7일 1회/28일 2회 훈련, 컨디션 7·수면 8시간, 대회 및 목표가 요청 데이터에 포함되는 것을 확인했습니다. 사진 입력은 `input_image`로 구성되며 실제 사진 POST도 실행했습니다. 잘못된 키, 잔액 부족, API 오류 등 분기 검증은 모의 upstream을 사용하는 로컬 HTTP 테스트입니다.

**실제 OpenAI 생성 텍스트와 사진 인식 결과는 아직 미확인입니다. AI 연결 완료로 판정하지 않습니다.** 동일 OpenAI 조직의 API 잔액을 추가한 뒤 세 모드의 성공 응답을 확인해야 합니다. 같은 키의 잔액만 추가하는 경우 환경변수 변경이나 재배포는 필요 없습니다.

현재 서버 엔드포인트에는 사용자 인증이 없습니다. 공개 서비스의 비용 통제를 위해 Vercel Firewall의 rate limit과 OpenAI 프로젝트 예산을 설정하세요. 대규모 서비스 전환에는 계정 인증과 서버 측 사용자별 제한이 필요합니다.
