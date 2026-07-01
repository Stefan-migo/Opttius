import { appLogger as logger } from "@/lib/logger";

interface ChatSession {
  id: string;
  title: string | null;
  provider: string;
  model: string | null;
  created_at: string;
  updated_at: string;
  config?: unknown;
}

interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown;
  tool_results?: unknown;
  metadata?: unknown;
  created_at: string;
}

interface ExportData {
  session: ChatSession;
  messages: ChatMessage[];
}

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportToMarkdown(data: ExportData): string {
  const { session, messages } = data;

  let markdown = `# ${session.title || "Conversación"}\n\n`;
  markdown += `**Proveedor:** ${session.provider}\n`;
  markdown += `**Modelo:** ${session.model || "N/A"}\n`;
  markdown += `**Fecha de creación:** ${new Date(session.created_at).toLocaleString("es-ES")}\n`;
  markdown += `**Última actualización:** ${new Date(session.updated_at).toLocaleString("es-ES")}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((message, index) => {
    const timestamp = new Date(message.created_at).toLocaleString("es-ES");
    const roleLabel =
      {
        system: "Sistema",
        user: "Usuario",
        assistant: "Asistente",
        tool: "Herramienta",
      }[message.role] || message.role;

    markdown += `## ${roleLabel} - ${timestamp}\n\n`;

    if (message.tool_calls) {
      markdown += `**Herramientas ejecutadas:**\n`;
      if (Array.isArray(message.tool_calls)) {
        message.tool_calls.forEach((tc: unknown) => {
          markdown += `- ${tc.name || "Unknown"}\n`;
        });
      }
      markdown += `\n`;
    }

    if (message.role === "assistant" || message.role === "user") {
      markdown += `${message.content}\n\n`;
    } else if (message.role === "tool") {
      markdown += `\`\`\`json\n${JSON.stringify(message.content, null, 2)}\n\`\`\`\n\n`;
    }

    if (message.tool_results) {
      markdown += `**Resultados:**\n`;
      markdown += `\`\`\`json\n${JSON.stringify(message.tool_results, null, 2)}\n\`\`\`\n\n`;
    }

    if (index < messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  return markdown;
}

export function exportToTXT(data: ExportData): string {
  const { session, messages } = data;

  let text = `${session.title || "Conversación"}\n`;
  text += `${"=".repeat(50)}\n\n`;
  text += `Proveedor: ${session.provider}\n`;
  text += `Modelo: ${session.model || "N/A"}\n`;
  text += `Fecha de creación: ${new Date(session.created_at).toLocaleString("es-ES")}\n`;
  text += `Última actualización: ${new Date(session.updated_at).toLocaleString("es-ES")}\n\n`;
  text += `${"=".repeat(50)}\n\n`;

  messages.forEach((message) => {
    const timestamp = new Date(message.created_at).toLocaleString("es-ES");
    const roleLabel =
      {
        system: "[SISTEMA]",
        user: "[USUARIO]",
        assistant: "[ASISTENTE]",
        tool: "[HERRAMIENTA]",
      }[message.role] || `[${message.role.toUpperCase()}]`;

    text += `${roleLabel} - ${timestamp}\n`;
    text += `${"-".repeat(50)}\n`;
    text += `${message.content}\n\n`;

    if (message.tool_calls) {
      text += `Herramientas ejecutadas:\n`;
      if (Array.isArray(message.tool_calls)) {
        message.tool_calls.forEach((tc: unknown) => {
          text += `  - ${tc.name || "Unknown"}\n`;
        });
      }
      text += `\n`;
    }

    if (message.tool_results) {
      text += `Resultados:\n${JSON.stringify(message.tool_results, null, 2)}\n\n`;
    }

    text += `\n`;
  });

  return text;
}

export function exportToCSV(data: ExportData): string {
  const { session, messages } = data;

  let csv = "Rol,Fecha,Hora,Contenido,Herramientas\n";

  messages.forEach((message) => {
    const date = new Date(message.created_at);
    const dateStr = date.toLocaleDateString("es-ES");
    const timeStr = date.toLocaleTimeString("es-ES");

    const roleLabel =
      {
        system: "Sistema",
        user: "Usuario",
        assistant: "Asistente",
        tool: "Herramienta",
      }[message.role] || message.role;

    const content = message.content.replace(/"/g, '""').replace(/\n/g, " ");
    const tools = message.tool_calls
      ? Array.isArray(message.tool_calls)
        ? message.tool_calls
            .map((tc: unknown) => tc.name || "Unknown")
            .join("; ")
        : ""
      : "";

    csv += `"${roleLabel}","${dateStr}","${timeStr}","${content}","${tools}"\n`;
  });

  return csv;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(
  data: ExportData,
  format: "json" | "markdown" | "txt" | "csv",
): Promise<boolean> {
  let content: string;

  switch (format) {
    case "json":
      content = exportToJSON(data);
      break;
    case "markdown":
      content = exportToMarkdown(data);
      break;
    case "txt":
      content = exportToTXT(data);
      break;
    case "csv":
      content = exportToCSV(data);
      break;
  }

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    logger.error("Failed to copy to clipboard:", error);
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackError) {
      logger.error("Fallback copy failed:", fallbackError);
      return false;
    }
  }
}

export function exportConversation(
  data: ExportData,
  format: "json" | "markdown" | "txt" | "csv",
) {
  const { session } = data;
  const timestamp = new Date().toISOString().split("T")[0];
  const title = (session.title || "conversacion")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case "json":
      content = exportToJSON(data);
      filename = `${title}-${timestamp}.json`;
      mimeType = "application/json";
      break;
    case "markdown":
      content = exportToMarkdown(data);
      filename = `${title}-${timestamp}.md`;
      mimeType = "text/markdown";
      break;
    case "txt":
      content = exportToTXT(data);
      filename = `${title}-${timestamp}.txt`;
      mimeType = "text/plain";
      break;
    case "csv":
      content = exportToCSV(data);
      filename = `${title}-${timestamp}.csv`;
      mimeType = "text/csv";
      break;
  }

  downloadFile(content, filename, mimeType);
}
