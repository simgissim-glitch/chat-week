import express from 'express';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = `너는 친구처럼 편하게 대화하는 AI 도우미 모아야.

[말투 규칙]
- 한국어 답변은 처음부터 끝까지 따뜻하고 자연스러운 반말(해체)로 작성해.
- 사용자가 존댓말을 쓰거나 이전 대화의 AI 답변이 존댓말이어도 따라 하지 마. 이번 답변부터 이 규칙을 적용해.
- 인사, 설명, 질문, 사과, 마무리에도 반말을 유지해. “-요”, “-습니다”, “-세요” 같은 존댓말 어미를 사용하지 마.
- 예: “안녕하세요” 대신 “안녕!”, “알려드릴게요” 대신 “알려줄게”, “어떤 게 궁금하세요?” 대신 “어떤 게 궁금해?”, “죄송합니다” 대신 “미안해”.
- 답변을 보내기 전에 네가 사용자에게 하는 말에 존댓말이 섞여 있는지 확인하고 자연스러운 반말로 고쳐.
- 단, 원문 인용이나 번역, 사용자가 작성해 달라고 요청한 이메일·문서의 본문은 해당 작업에 필요한 문체를 유지해. 그 앞뒤에 네가 덧붙이는 설명은 반말로 해.

[답변 원칙]
- 이전 대화의 사실과 맥락을 참고하고 쉽고 정확하게 설명해.
- 모르는 내용은 솔직하게 말해. 과도한 유행어, 욕설, 억지 친밀감은 피하고 이모지는 필요할 때만 사용해.
- 힘든 이야기에는 장난치지 말고 차분하고 다정하게 공감해.
- 다른 언어로 질문하면 그 언어로 답하되 편안하고 친근한 말투를 유지해.`;

export function createApp(client) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(express.static(path.join(directory, 'public')));

  app.post('/api/chat', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 101 ||
        messages.length % 2 !== 1 || messages.some((message, i) =>
          !message || message.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
          typeof message.content !== 'string' || !message.content.trim() || message.content.length > 12000)) {
      return res.status(400).json({ error: '대화 형식이 올바르지 않습니다. 새 대화를 시작해 주세요.' });
    }
    if (messages.reduce((sum, message) => sum + message.content.length, 0) > 60000) {
      return res.status(400).json({ error: '대화가 너무 길어졌습니다. 새 대화를 시작해 주세요.' });
    }
    if (!client) return res.status(503).json({ error: '서버의 .env 파일에 OPENAI_API_KEY를 설정한 뒤 서버를 다시 시작해 주세요.' });
    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        store: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(({ role, content }) => ({ role, content })),
        ],
        max_completion_tokens: 1500,
      });
      const reply = completion.choices?.[0]?.message?.content;
      if (!reply?.trim()) return res.status(502).json({ error: '답변을 받지 못했습니다. 다시 시도해 주세요.' });
      res.json({ reply });
    } catch (error) {
      const status = error.status === 429 ? 429 : 502;
      const message = error.status === 429 ? 'API 사용 한도 또는 요청 한도를 확인한 뒤 다시 시도해 주세요.'
        : error.status === 401 ? '서버에 설정한 OpenAI API 키를 확인해 주세요.'
        : 'AI에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      res.status(status).json({ error: message });
    }
  });
  app.use((error, req, res, next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: '요청을 처리할 수 없습니다. 메시지 길이와 형식을 확인해 주세요.' });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 0 }) : null;
  const port = Number(process.env.PORT) || 3000;
  createApp(client).listen(port, '127.0.0.1', () => console.log(`채팅 앱: http://localhost:${port}`));
}
