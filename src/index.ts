#!/usr/bin/env node
import express from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { criarServidor } from "./server.js";

const modoHttp = process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http";

if (modoHttp) {
  // Modo HTTP (Streamable HTTP, sem estado): para clientes remotos como OpenAI, Gemini, ChatGPT etc.
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const server = criarServidor();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Modo sem estado: não há stream SSE (GET) nem sessão para encerrar (DELETE)
  app.all("/mcp", (_req, res) => {
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Método não permitido." }, id: null });
  });

  app.get("/", (_req, res) => {
    res.send("mcp-exemplo-br rodando. Endpoint MCP: POST /mcp");
  });

  const porta = Number(process.env.PORT ?? 3000);
  app.listen(porta, () => console.log(`MCP HTTP em http://localhost:${porta}/mcp`));
} else {
  // Modo stdio (padrão): para clientes locais como Claude Desktop, Claude Code, Cursor, VS Code
  await criarServidor().connect(new StdioServerTransport());
}
