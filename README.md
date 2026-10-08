# 모아 · AI 챗봇

HTML, CSS, JavaScript와 Node.js / Express로 만든 한국어 챗봇입니다. OpenAI Chat Completions API의 `gpt-4o-mini`를 사용합니다.

## 실행

Node.js 22 이상에서 프로젝트 폴더를 열고 실행하세요. Windows PowerShell에서는 `npm` 대신 `npm.cmd`를 사용하면 실행 정책 문제를 피할 수 있습니다.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

`.env`의 `OPENAI_API_KEY=` 뒤에 본인의 OpenAI API 키를 입력하세요. 키를 공개하거나 브라우저 코드에 넣지 마세요.

```powershell
npm.cmd start
```

브라우저에서 http://localhost:3000 에 접속합니다. 개발 중 자동 재시작은 `npm.cmd run dev`, 테스트는 `npm.cmd test`를 사용합니다. `.env` 변경 후 서버를 다시 시작하세요.

## 대화 처리

- 브라우저 메모리의 배열에 성공한 사용자 질문과 AI 답변을 저장합니다.
- 매 요청마다 전체 대화 기록을 Express 서버로 보내고, 서버가 시스템 메시지와 함께 OpenAI에 전달합니다.
- 데이터베이스, 파일 저장, localStorage를 사용하지 않습니다. 새로고침, 탭 종료, 새 대화 버튼으로 기록이 사라집니다. 각 탭의 기록은 분리됩니다.
- API 키는 서버에서만 사용합니다. OpenAI 요청에는 `store: false`를 설정합니다. 답변 생성을 위해 대화 내용은 OpenAI로 전송되며 서비스의 데이터 처리 정책이 적용됩니다.
- 한 번에 사용자 입력 6,000자, 요청 대화 총 60,000자, 최대 51번째 질문까지 허용합니다. 한도를 넘으면 새 대화를 안내하며 이전 내용을 몰래 잘라내지 않습니다.
- 실패한 요청은 기록에 추가하지 않고 입력창에 복원합니다. AI 출력은 HTML로 해석하지 않고 텍스트로 표시합니다.
- 로컬 사용용으로 127.0.0.1에서 실행됩니다. 외부 공개 서비스로 운영하려면 인증과 요청 제한 등을 추가하세요.

## 구성

- `server.js`: 정적 파일 제공, 입력 검증, OpenAI API 호출
- `public/index.html`, `public/style.css`, `public/app.js`: 반응형 채팅 화면 및 대화 상태
- `test/server.test.js`: 모의 OpenAI 클라이언트를 사용한 서버 통합 테스트

공식 문서: [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini)
