const { app } = require('@azure/functions');

const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.4';
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
const configuredAllowedOrigin = process.env.ALLOWED_ORIGIN || 'https://xhhzuikeaiya.github.io';
const accessCode = process.env.ACCESS_CODE || '';

const SYSTEM_PROMPT = `你是一个温暖、耐心、适合父母使用的中文 AI 助手。
回答要：
- 使用简体中文，语气亲切、清楚、不过度专业；
- 如果用户问医疗、法律、金融等高风险问题，要说明不能替代专业人士；
- 不要索要身份证、银行卡、验证码、密码等敏感信息；
- 对老人友好，步骤要简单，一次不要给太多复杂操作。`;

function getHeader(request, name) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || '';
}

function resolveAllowedOrigin(request) {
  const origin = getHeader(request, 'origin');
  const allowList = new Set([
    configuredAllowedOrigin,
    'https://xhhzuikeaiya.github.io',
    'http://localhost:5500',
    'http://localhost:8080',
    'http://127.0.0.1:5500'
  ].filter(Boolean));

  if (!origin) return configuredAllowedOrigin;
  if (configuredAllowedOrigin === '*' || allowList.has(origin)) return origin;
  return configuredAllowedOrigin;
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code, x-access-code',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}

function safeMessages(inputMessages = []) {
  return inputMessages
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

app.http('chat', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return {
        status: 200,
        headers: corsHeaders(request),
        body: ''
      };
    }

    if (accessCode && getHeader(request, 'x-access-code') !== accessCode) {
      return {
        status: 401,
        headers: corsHeaders(request),
        jsonBody: { error: '访问码不正确，请向家人确认后再试。' }
      };
    }

    if (!endpoint || !apiKey) {
      return { status: 500, headers: corsHeaders(request), jsonBody: { error: 'Server is missing Azure OpenAI configuration.' } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, headers: corsHeaders(request), jsonBody: { error: 'Invalid JSON body.' } };
    }

    const messages = safeMessages(body.messages);
    if (!messages.length) {
      return { status: 400, headers: corsHeaders(request), jsonBody: { error: 'Missing messages.' } };
    }

    const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${apiVersion}`;
    const payload = {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_completion_tokens: 900
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        context.error('Azure OpenAI error', response.status, data);
        return {
          status: response.status,
          headers: corsHeaders(request),
          jsonBody: { error: data?.error?.message || 'Azure OpenAI request failed.' }
        };
      }

      return {
        status: 200,
        headers: corsHeaders(request),
        jsonBody: {
          reply: data?.choices?.[0]?.message?.content || '抱歉，我刚刚没有生成有效回复，请再试一次。'
        }
      };
    } catch (error) {
      context.error(error);
      return {
        status: 500,
        headers: corsHeaders(request),
        jsonBody: { error: 'Server error while calling Azure OpenAI.' }
      };
    }
  }
});
