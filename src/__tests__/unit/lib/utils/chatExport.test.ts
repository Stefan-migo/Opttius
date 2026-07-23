import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyToClipboard,
  downloadFile,
  exportConversation,
  exportToCSV,
  exportToJSON,
  exportToMarkdown,
  exportToTXT,
} from "@/lib/utils/chatExport";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSession = {
  id: "session-1",
  title: "Test Chat",
  provider: "openai",
  model: "gpt-4",
  created_at: "2024-06-15T12:00:00.000Z",
  updated_at: "2024-06-15T13:00:00.000Z",
};

const mockMessages = [
  {
    id: "msg-1",
    role: "system" as const,
    content: "Eres un asistente útil.",
    created_at: "2024-06-15T12:00:00.000Z",
  },
  {
    id: "msg-2",
    role: "user" as const,
    content: "Hola, ¿cómo estás?",
    created_at: "2024-06-15T12:00:30.000Z",
  },
  {
    id: "msg-3",
    role: "assistant" as const,
    content: "¡Hola! Estoy bien, ¿en qué puedo ayudarte?",
    created_at: "2024-06-15T12:01:00.000Z",
  },
  {
    id: "msg-4",
    role: "tool" as const,
    content: '{"result": "success"}',
    created_at: "2024-06-15T12:01:30.000Z",
    tool_calls: [{ name: "get_products" }, { name: "search_customer" }],
    tool_results: { data: [{ id: 1, name: "Producto" }] },
  },
];

const mockData = {
  session: mockSession,
  messages: mockMessages,
};

describe("exportToJSON", () => {
  it("returns pretty-printed JSON", () => {
    const result = exportToJSON(mockData);
    const parsed = JSON.parse(result);
    expect(parsed.session.id).toBe("session-1");
    expect(parsed.messages).toHaveLength(4);
    expect(result).toContain("\n");
  });

  it("handles empty messages", () => {
    const result = exportToJSON({ session: mockSession, messages: [] });
    const parsed = JSON.parse(result);
    expect(parsed.messages).toEqual([]);
  });
});

describe("exportToMarkdown", () => {
  it("includes session title as H1", () => {
    const result = exportToMarkdown(mockData);
    expect(result).toContain("# Test Chat");
  });

  it("includes provider and model metadata", () => {
    const result = exportToMarkdown(mockData);
    expect(result).toContain("openai");
    expect(result).toContain("gpt-4");
  });

  it("labels each message by role with timestamp", () => {
    const result = exportToMarkdown(mockData);
    expect(result).toContain("## Sistema");
    expect(result).toContain("## Usuario");
    expect(result).toContain("## Asistente");
    expect(result).toContain("## Herramienta");
  });

  it("includes tool_calls section", () => {
    const result = exportToMarkdown(mockData);
    expect(result).toContain("Herramientas ejecutadas");
    expect(result).toContain("get_products");
    expect(result).toContain("search_customer");
  });

  it("includes tool_results as JSON block", () => {
    const result = exportToMarkdown(mockData);
    expect(result).toContain("**Resultados:**");
    expect(result).toContain("```json");
    expect(result).toContain("Producto");
  });

  it("separates sections with ---", () => {
    const result = exportToMarkdown(mockData);
    // 1 after metadata + 3 between 4 messages
    const separators = result.match(/^---$/gm);
    expect(separators?.length).toBe(4);
  });

  it("handles null title", () => {
    const data = {
      session: { ...mockSession, title: null },
      messages: mockMessages,
    };
    const result = exportToMarkdown(data);
    expect(result).toContain("# Conversación");
  });
});

describe("exportToTXT", () => {
  it("includes session title", () => {
    const result = exportToTXT(mockData);
    expect(result).toContain("Test Chat");
  });

  it("includes separator lines", () => {
    const result = exportToTXT(mockData);
    expect(result).toContain("=".repeat(50));
    expect(result).toContain("-".repeat(50));
  });

  it("labels each message by role with bracket notation", () => {
    const result = exportToTXT(mockData);
    expect(result).toContain("[SISTEMA]");
    expect(result).toContain("[USUARIO]");
    expect(result).toContain("[ASISTENTE]");
    expect(result).toContain("[HERRAMIENTA]");
  });

  it("includes tool_calls and tool_results", () => {
    const result = exportToTXT(mockData);
    expect(result).toContain("Herramientas ejecutadas");
    expect(result).toContain("get_products");
    expect(result).toContain("Resultados:");
  });

  it("handles null title", () => {
    const data = {
      session: { ...mockSession, title: null },
      messages: mockMessages,
    };
    const result = exportToTXT(data);
    expect(result).not.toContain("null");
    expect(result).toContain("Conversación");
  });
});

describe("exportToCSV", () => {
  it("includes CSV header", () => {
    const result = exportToCSV(mockData);
    expect(result.startsWith("Rol,Fecha,Hora,Contenido,Herramientas")).toBe(true);
  });

  it("includes each message as a CSV row", () => {
    const result = exportToCSV(mockData);
    const rows = result.trim().split("\n");
    expect(rows).toHaveLength(5); // header + 4 messages
  });

  it("escapes double quotes in content", () => {
    const data = {
      session: mockSession,
      messages: [
        {
          id: "msg-1",
          role: "user" as const,
          content: 'Dijo "hola" y "adiós"',
          created_at: "2024-06-15T12:00:00.000Z",
        },
      ],
    };
    const result = exportToCSV(data);
    expect(result).toContain('""hola""');
  });

  it("includes tool names separated by semicolons", () => {
    const result = exportToCSV(mockData);
    expect(result).toContain("get_products; search_customer");
  });
});

describe("downloadFile", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("creates a Blob and triggers download", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL");

    downloadFile("test content", "test.txt", "text/plain");

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("sets the correct filename on the download link", () => {
    const createElementSpy = vi.spyOn(document, "createElement");

    downloadFile("content", "file.txt", "text/plain");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toBe("file.txt");
  });
});

describe("copyToClipboard", () => {
  it("returns true when clipboard API succeeds", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    const result = await copyToClipboard(mockData, "json");
    expect(result).toBe(true);
  });

  it("returns false when clipboard API fails and fallback also fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("permission denied")) },
      configurable: true,
    });

    // jsdom doesn't implement execCommand, add it
    (document as unknown).execCommand = vi.fn().mockReturnValue(false);

    const result = await copyToClipboard(mockData, "txt");
    expect(result).toBe(false);
  });
});

describe("exportConversation", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces a .json filename for JSON format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    exportConversation(mockData, "json");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toMatch(/\.json$/);
  });

  it("produces a .md filename for markdown format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    exportConversation(mockData, "markdown");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toMatch(/\.md$/);
  });

  it("produces a .txt filename for txt format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    exportConversation(mockData, "txt");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toMatch(/\.txt$/);
  });

  it("produces a .csv filename for csv format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    exportConversation(mockData, "csv");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toMatch(/\.csv$/);
  });

  it("sanitizes title in filename", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    const data = {
      session: { ...mockSession, title: "Mi Consulta #1!" },
      messages: [],
    };
    exportConversation(data, "json");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    // "Mi Consulta #1!" → .replace(/[^a-z0-9]/g, "-") → "mi-consulta--1--"
    expect(link.download).toMatch(/^mi-consulta--1--\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("uses 'conversacion' as default title when title is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T00:00:00.000Z"));

    const createElementSpy = vi.spyOn(document, "createElement");
    const data = {
      session: { ...mockSession, title: null },
      messages: [],
    };
    exportConversation(data, "json");

    const link = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(link.download).toMatch(/^conversacion-/);
  });
});
