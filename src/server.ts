import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Cria o servidor MCP com todas as ferramentas, recursos e prompts de exemplo. */
export function criarServidor(): McpServer {
  const server = new McpServer({ name: "mcp-exemplo-br", version: "1.0.0" });

  // Ferramenta 1: calculadora simples
  server.registerTool(
    "calcular",
    {
      title: "Calculadora",
      description: "Faz uma operação matemática entre dois números (soma, subtracao, multiplicacao, divisao).",
      inputSchema: {
        a: z.number().describe("Primeiro número"),
        b: z.number().describe("Segundo número"),
        operacao: z.enum(["soma", "subtracao", "multiplicacao", "divisao"]),
      },
    },
    async ({ a, b, operacao }) => {
      if (operacao === "divisao" && b === 0) {
        return { isError: true, content: [{ type: "text", text: "Não é possível dividir por zero." }] };
      }
      const resultado = { soma: a + b, subtracao: a - b, multiplicacao: a * b, divisao: a / b }[operacao];
      return { content: [{ type: "text", text: `${a} ${operacao} ${b} = ${resultado}` }] };
    }
  );

  // Ferramenta 2: consulta de CEP (API pública ViaCEP)
  server.registerTool(
    "consultar_cep",
    {
      title: "Consultar CEP",
      description: "Busca o endereço de um CEP brasileiro usando a API pública ViaCEP.",
      inputSchema: { cep: z.string().describe("CEP com 8 dígitos, ex.: 01001000 ou 01001-000") },
    },
    async ({ cep }) => {
      const digitos = cep.replace(/\D/g, "");
      if (digitos.length !== 8) {
        return { isError: true, content: [{ type: "text", text: "CEP inválido: informe 8 dígitos." }] };
      }
      const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = (await resp.json()) as Record<string, string>;
      if (!resp.ok || dados.erro) {
        return { isError: true, content: [{ type: "text", text: `CEP ${digitos} não encontrado.` }] };
      }
      const texto = `${dados.logradouro}, ${dados.bairro} - ${dados.localidade}/${dados.uf} (CEP ${dados.cep})`;
      return { content: [{ type: "text", text: texto }] };
    }
  );

  // Ferramenta 3: data e hora atual em um fuso
  server.registerTool(
    "data_hora",
    {
      title: "Data e hora",
      description: "Retorna a data e hora atual em um fuso horário (padrão: America/Sao_Paulo).",
      inputSchema: { fuso: z.string().optional().describe("Fuso IANA, ex.: America/Manaus") },
    },
    async ({ fuso }) => {
      const tz = fuso ?? "America/Sao_Paulo";
      try {
        const agora = new Date().toLocaleString("pt-BR", { timeZone: tz, dateStyle: "full", timeStyle: "medium" });
        return { content: [{ type: "text", text: `${agora} (${tz})` }] };
      } catch {
        return { isError: true, content: [{ type: "text", text: `Fuso horário inválido: ${tz}` }] };
      }
    }
  );

  // Recurso: um texto estático que o cliente pode ler
  server.registerResource(
    "sobre",
    "info://sobre",
    { title: "Sobre este servidor", mimeType: "text/plain" },
    async (uri) => ({
      contents: [{ uri: uri.href, text: "Servidor MCP de exemplo com calculadora, consulta de CEP e data/hora." }],
    })
  );

  // Prompt: modelo de mensagem reutilizável
  server.registerPrompt(
    "resumir_endereco",
    {
      title: "Resumir endereço",
      description: "Pede ao modelo para consultar um CEP e descrever o local.",
      argsSchema: { cep: z.string() },
    },
    ({ cep }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: `Use a ferramenta consultar_cep para o CEP ${cep} e descreva o local em uma frase.` },
        },
      ],
    })
  );

  return server;
}
