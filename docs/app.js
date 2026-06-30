const messagesEl = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#userInput');
const sendButton = document.querySelector('#sendButton');
const quickButtons = document.querySelectorAll('[data-prompt]');
const accessForm = document.querySelector('#accessForm');
const accessInput = document.querySelector('#accessInput');
const accessError = document.querySelector('#accessError');
const accessPanel = document.querySelector('#accessPanel');
const chatCard = document.querySelector('#chatCard');

const config = window.CHAT_CONFIG || {};
const history = [];
let currentAccessCode = sessionStorage.getItem('chat_demo_access_code') || '';

function setChatUnlocked(isUnlocked) {
  if (isUnlocked) {
    accessPanel.hidden = true;
    chatCard.classList.remove('locked');
    input.disabled = false;
    sendButton.disabled = false;
    quickButtons.forEach((button) => { button.disabled = false; });
    input.focus();
  } else {
    accessPanel.hidden = false;
    chatCard.classList.add('locked');
    input.disabled = true;
    sendButton.disabled = true;
    quickButtons.forEach((button) => { button.disabled = true; });
    accessInput.focus();
  }
}

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
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Code': currentAccessCode
      },
      body: JSON.stringify({ messages: history.slice(-12) })
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem('chat_demo_access_code');
      currentAccessCode = '';
      setChatUnlocked(false);
      throw new Error(data.error || '访问码不正确');
    }
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
    if (currentAccessCode) input.focus();
  }
}

accessForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = accessInput.value.trim();
  if (!code) {
    accessError.textContent = '请先输入访问码。';
    return;
  }
  currentAccessCode = code;
  sessionStorage.setItem('chat_demo_access_code', code);
  accessError.textContent = '';
  setChatUnlocked(true);
});

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

setChatUnlocked(Boolean(currentAccessCode));
