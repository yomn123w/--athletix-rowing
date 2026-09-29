# ATHLETIX Rowing

Vercel에서 정적 파일과 `api/analyze.js` 서버리스 함수를 배포합니다. 프레임워크 및 빌드 명령은 필요하지 않습니다. Vercel 프로젝트의 루트 디렉터리는 저장소 루트로 둡니다.

AI 기능을 사용하려면 Vercel 프로젝트의 Environment Variables에 `OPENAI_API_KEY`를 등록하고 재배포하세요. 선택적으로 `OPENAI_MODEL`을 설정할 수 있습니다(기본 `gpt-4o-mini`). API 키를 브라우저 코드나 GitHub에 넣지 마세요.

훈련, 체크인, PB, 대회는 현재 기기의 브라우저 localStorage에 저장됩니다. 계정 간 동기화는 지원하지 않습니다. 사진은 저장하지 않고 분석 요청 시에만 전송합니다. 이미지 최대 크기는 4MB입니다.
