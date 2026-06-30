# chat-demo

给父母使用的公开 AI 对话体验页：GitHub Pages 前端 + Azure Functions 后端代理 + Azure OpenAI。

## 重要安全原则

不要把 Azure OpenAI API Key 写进 `frontend/`，也不要提交到 GitHub。

Key 只能放在 Azure Functions 的 Application settings / Environment variables 里。

## 项目结构

```text
frontend/                 # GitHub Pages 静态页面
api/                      # Azure Functions 后端代理
.github/workflows/pages.yml
```

## Azure OpenAI 配置

已按你的信息预填：

- Endpoint: `https://hanhantest03.services.ai.azure.com`
- Deployment: `gpt-5.4`
- API Version: `2024-12-01-preview`

需要你自己在 Azure Functions 中添加：

| Setting | Value |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://hanhantest03.services.ai.azure.com` |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-5.4` |
| `AZURE_OPENAI_API_VERSION` | `2024-12-01-preview` |
| `AZURE_OPENAI_API_KEY` | 你的 Azure OpenAI Key |
| `ALLOWED_ORIGIN` | `https://xhhzuikeaiya.github.io` |

## 本地运行 API

```bash
cd api
npm install
cp local.settings.example.json local.settings.json
# 编辑 local.settings.json，填入 AZURE_OPENAI_API_KEY
npm start
```

本地 API 地址通常是：

```text
http://localhost:7071/api/chat
```

## 配置前端 API 地址

部署 Azure Functions 后，打开：

```text
frontend/config.js
```

把：

```js
apiUrl: 'REPLACE_WITH_AZURE_FUNCTION_CHAT_URL'
```

替换为你的 Function 地址，例如：

```js
apiUrl: 'https://your-function-app.azurewebsites.net/api/chat'
```

## GitHub Pages

仓库推送到 `main` 后，GitHub Actions 会自动发布 `frontend/` 到 GitHub Pages。

预期页面地址：

```text
https://xhhzuikeaiya.github.io/chat-demo/
```

如果没有自动开启 Pages，请到 GitHub 仓库：

Settings → Pages → Source 选择 `GitHub Actions`。

## Privacy by Design 检查

- 前端不保存 Key。
- 浏览器端不持久化聊天记录。
- 后端使用 `Cache-Control: no-store`。
- 系统提示词要求用户不要输入身份证、银行卡、验证码、密码等敏感信息。
- 医疗、法律、金融类问题会提示不能替代专业人士。

## 后续建议

公开体验页建议继续补充：

- 简单限流，避免被刷。
- Azure Functions Easy Auth 或验证码。
- Application Insights 监控错误率，但不要记录用户完整输入。
