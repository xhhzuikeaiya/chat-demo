const messagesEl = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#userInput');
const sendButton = document.querySelector('#sendButton');
const quickButtons = document.querySelectorAll('[data-prompt]');

const config = window.CHAT_CONFIG || {};
const history = [];

function addMessage(role, content) {
  const article = document.createElement('article');
  article.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '我' : '助';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;

  article.append(avatar, bubble);
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  input.disabled = isLoading;
  sendButton.textContent = isLoading ? '思考中…' : '发送';
}

async function sendMessage(text) {
  const apiUrl = config.apiUrl;
  if (!apiUrl || apiUrl.includes('REPLACE_WITH')) {
    addMessage('assistant', '还没有配置后端地址。请先部署 Azure Functions，并在 config.js 里填写 apiUrl。');
    return;
  }

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  setLoading(true);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    const reply = data.reply || '抱歉，我没有收到有效回复。';
    addMessage('assistant', reply);
    history.push({ role: 'assistant', content: reply });
  } catch (error) {
    addMessage('assistant', `抱歉，刚刚连接失败：${error.message}。请稍后再试。`);
  } finally {
    setLoading(false);
    input.focus();
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendMessage(text);
});

quickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.dataset.prompt;
    input.focus();
  });
});
