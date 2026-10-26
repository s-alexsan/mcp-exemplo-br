// Testa o servidor nos dois transportes: node test/cliente.mjs [stdio|http]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const modo = process.argv[2] ?? "stdio";
const transport = modo === "http"
  ? new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"))
  : new StdioClientTransport({ command: "node", args: ["dist/index.js"] });

const client = new Client({ name: "teste", version: "1.0.0" });
await client.connect(transport);
console.log("Ferramentas:", (await client.listTools()).tools.map((t) => t.name).join(", "));
for (const [name, args] of [
  ["calcular", { a: 7, b: 6, operacao: "multiplicacao" }],
  ["calcular", { a: 1, b: 0, operacao: "divisao" }],
  ["consultar_cep", { cep: "01001-000" }],
  ["data_hora", {}],
]) {
  const r = await client.callTool({ name, arguments: args });
  console.log(`${name}:`, r.isError ? "[erro]" : "", r.content[0].text);
}
console.log("Recurso:", (await client.readResource({ uri: "info://sobre" })).contents[0].text);
console.log("Prompt:", (await client.getPrompt({ name: "resumir_endereco", arguments: { cep: "70040010" } })).messages[0].content.text);
await client.close();
