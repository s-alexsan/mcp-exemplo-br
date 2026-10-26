# mcp-exemplo-br

Servidor **MCP (Model Context Protocol)** de exemplo, em TypeScript, que funciona com qualquer LLM/cliente compatível com MCP.

| Tipo | Nome | O que faz |
|---|---|---|
| Ferramenta | `calcular` | soma, subtração, multiplicação, divisão |
| Ferramenta | `consultar_cep` | busca endereço de um CEP (API ViaCEP) |
| Ferramenta | `data_hora` | data/hora atual em um fuso horário |
| Recurso | `info://sobre` | texto descritivo do servidor |
| Prompt | `resumir_endereco` | modelo que pede para consultar e descrever um CEP |

Dois modos de transporte:

- **stdio** (padrão) – para apps locais: Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, LM Studio…
- **HTTP** (`--http`) – para LLMs que chamam MCP remoto: API da OpenAI, API da Anthropic, Gemini, ChatGPT…

---

## Rodar localmente

```bash
npm install
npm run build
npm start            # stdio
npm run start:http   # HTTP em http://localhost:3000/mcp (porta via PORT=...)
```

Teste rápido com o cliente incluso: `node test/cliente.mjs stdio` ou `node test/cliente.mjs http`.
Ou use o inspetor visual oficial: `npx @modelcontextprotocol/inspector npx -y mcp-exemplo-br`

## Publicar no npm

```bash
npm login
npm publish
```

Depois disso qualquer pessoa roda com `npx -y mcp-exemplo-br`.

---

## Usar em clientes locais (stdio)

### Claude Desktop
Arquivo `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "exemplo": { "command": "npx", "args": ["-y", "mcp-exemplo-br"] }
  }
}
```

### Claude Code
```bash
claude mcp add exemplo -- npx -y mcp-exemplo-br
```

### Cursor (`~/.cursor/mcp.json`) / Windsurf / LM Studio (`mcp.json`)
Mesmo JSON do Claude Desktop (`mcpServers`).

### VS Code (GitHub Copilot) – `.vscode/mcp.json`
```json
{
  "servers": {
    "exemplo": { "type": "stdio", "command": "npx", "args": ["-y", "mcp-exemplo-br"] }
  }
}
```

### Gemini CLI – `~/.gemini/settings.json`
Mesmo formato `mcpServers` do Claude Desktop.

### Modelos locais (Ollama, etc.)
Use um cliente com suporte a MCP, como LM Studio, Open WebUI ou `mcphost`:
```bash
mcphost -m ollama:qwen2.5 --config mcp.json
```

---

## Usar via HTTP (MCP remoto)

Para APIs de LLM na nuvem o servidor precisa estar acessível na internet. Opções:

- **Teste rápido:** `npm run start:http` + túnel: `npx cloudflared tunnel --url http://localhost:3000` (gera uma URL `https://...trycloudflare.com`)
- **Produção:** faça deploy em Render, Railway, Fly.io, etc. com o comando `node dist/index.js --http` (a porta vem da variável `PORT`).

A URL do MCP fica: `https://SEU-DOMINIO/mcp`

### OpenAI (Responses API)
```python
from openai import OpenAI
client = OpenAI()
resp = client.responses.create(
    model="gpt-5",
    tools=[{
        "type": "mcp",
        "server_label": "exemplo",
        "server_url": "https://SEU-DOMINIO/mcp",
        "require_approval": "never",
    }],
    input="Qual o endereço do CEP 01001-000?",
)
print(resp.output_text)
```

### Anthropic (Claude API – MCP connector)
```python
import anthropic
client = anthropic.Anthropic()
resp = client.beta.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1000,
    messages=[{"role": "user", "content": "Quanto é 7 vezes 6? Use a calculadora."}],
    mcp_servers=[{"type": "url", "url": "https://SEU-DOMINIO/mcp", "name": "exemplo"}],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "exemplo"}],
    betas=["mcp-client-2025-11-20"],
)
print(resp.content)
```

### Google Gemini (SDK `google-genai`)
O SDK do Gemini aceita uma sessão MCP diretamente como ferramenta:
```python
from google import genai
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async with streamablehttp_client("https://SEU-DOMINIO/mcp") as (r, w, _):
    async with ClientSession(r, w) as session:
        await session.initialize()
        resp = await genai.Client().aio.models.generate_content(
            model="gemini-2.5-flash",
            contents="Que horas são em Manaus?",
            config=genai.types.GenerateContentConfig(tools=[session]),
        )
        print(resp.text)
```

### ChatGPT / Claude.ai (conectores personalizados)
Em **Configurações → Conectores → Adicionar conector personalizado**, informe a URL `https://SEU-DOMINIO/mcp`.

---

## Estrutura

```
src/server.ts   # ferramentas, recursos e prompts
src/index.ts    # escolhe o transporte (stdio ou HTTP)
test/cliente.mjs
```

Para criar sua própria ferramenta, copie um bloco `server.registerTool(...)` em `src/server.ts`.

> ⚠️ O modo HTTP não tem autenticação. Para uso em produção, adicione um token (ex.: verificar o header `Authorization`) antes de expor publicamente.

## Licença
MIT
