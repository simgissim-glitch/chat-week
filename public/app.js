const form = document.querySelector('#chat-form');
const input = document.querySelector('#input');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
const log = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const status = document.querySelector('#status');
let history = [];
let busy = false;

function addMessage(role, content) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = role === 'user' ? '나' : '✳ 모아';
  const body = document.createElement('div');
  body.className = 'content';
  body.textContent = content;
  article.append(name, body);
  log.append(article);
  article.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return article;
}

function resize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || busy) return;
  busy = true;
  send.disabled = reset.disabled = input.disabled = true;
  welcome.hidden = true;
  status.textContent = '모아가 답변을 생각하고 있어요…';
  const userMessage = addMessage('user', content);
  input.value = '';
  resize();
  const messages = [...history, { role: 'user', content }];
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '답변을 받지 못했습니다.');
    history = [...messages, { role: 'assistant', content: data.reply }];
    addMessage('assistant', data.reply);
    status.textContent = '';
  } catch (error) {
    userMessage.remove();
    welcome.hidden = history.length > 0;
    input.value = content;
    resize();
    status.textContent = error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 다시 보내 주세요.'
      : error instanceof TypeError ? '서버 연결을 확인한 뒤 다시 보내 주세요.' : error.message;
  } finally {
    busy = false;
    send.disabled = reset.disabled = input.disabled = false;
    input.focus();
  }
});
input.addEventListener('input', resize);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});
reset.addEventListener('click', () => {
  if (busy) return;
  history = [];
  log.replaceChildren();
  welcome.hidden = false;
  status.textContent = '';
  input.value = '';
  resize();
  input.focus();
});
document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    if (busy) return;
    input.value = button.dataset.prompt;
    resize();
    input.focus();
  });
});
