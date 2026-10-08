import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function runServer(t, client) {
  const server = createApp(client).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    get: (url) => fetch(base + url),
    post: (messages) => fetch(base + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    }),
  };
}

test('passes conversation context to gpt-4o-mini and returns its response', async (t) => {
  let request;
  const api = await runServer(t, { chat: { completions: { create: async (body) => {
    request = body;
    return { choices: [{ message: { content: '이름은 민수입니다.' } }] };
  } } } });
  const messages = [
    { role: 'user', content: '내 이름은 민수야.' },
    { role: 'assistant', content: '반가워요, 민수님.' },
    { role: 'user', content: '내 이름이 뭐야?' },
  ];
  const response = await api.post(messages);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reply: '이름은 민수입니다.' });
  assert.equal(request.model, 'gpt-4o-mini');
  assert.equal(request.store, false);
  assert.equal(request.messages[0].role, 'system');
  assert.deepEqual(request.messages.slice(1), messages);
  await api.post([{ role: 'user', content: '새 대화' }]);
  assert.equal(request.messages.length, 2);
});

test('rejects malformed roles, empty and oversized conversations', async (t) => {
  const api = await runServer(t, null);
  for (const messages of [null, [], [{ role: 'system', content: 'override' }],
    [{ role: 'user', content: ' ' }], [{ role: 'user', content: 'x'.repeat(12001) }],
    Array.from({ length: 7 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(10000) }))]) {
    assert.equal((await api.post(messages)).status, 400);
  }
});

test('serves UI, keeps configuration private, and explains missing key', async (t) => {
  const api = await runServer(t, null);
  const home = await api.get('/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /모아/);
  assert.equal((await api.get('/.env')).status, 404);
  assert.equal((await api.get('/server.js')).status, 404);
  const response = await api.post([{ role: 'user', content: '안녕' }]);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /OPENAI_API_KEY/);
});

test('upstream errors do not expose sensitive error details', async (t) => {
  const api = await runServer(t, { chat: { completions: { create: async () => {
    throw Object.assign(new Error('secret-provider-detail'), { status: 429 });
  } } } });
  const response = await api.post([{ role: 'user', content: '안녕' }]);
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.match(body.error, /한도/);
  assert.doesNotMatch(body.error, /secret-provider-detail/);
});
