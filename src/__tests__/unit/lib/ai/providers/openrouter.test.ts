import { beforeEach, describe, expect, it, vi } from "vitest";

import { OpenRouterProvider } from "@/lib/ai/providers/openrouter";
import type { LLMConfig, LLMMessage } from "@/lib/ai/types";

// Mock fetch globally
global.fetch = vi.fn();

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;
  let mockConfig: Partial<LLMConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenRouterProvider();
    mockConfig = {
      apiKey: "sk-or-v1-test-key",
      model: "anthropic/claude-3.5-sonnet",
      temperature: 0.7,
      maxTokens: 2000,
    };
  });

  describe("provider metadata", () => {
    it("should have correct provider name", () => {
      expect(provider.name).toBe("openrouter");
    });

    it("should return available models", () => {
      const models = provider.getAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models).toContainEqual(
        expect.objectContaining({
          id: "anthropic/claude-3.5-sonnet",
          provider: "openrouter",
          supportsStreaming: true,
          supportsFunctionCalling: true,
        }),
      );
    });

    it("should include multiple provider models", () => {
      const models = provider.getAvailableModels();

      const modelIds = models.map((m) => m.id);

      // Should have Anthropic models
      expect(modelIds).toContain("anthropic/claude-3.5-sonnet");
      expect(modelIds).toContain("anthropic/claude-3-haiku");

      // Should have OpenAI models
      expect(modelIds).toContain("openai/gpt-4o");
      expect(modelIds).toContain("openai/gpt-3.5-turbo");

      // Should have Google models
      expect(modelIds).toContain("google/gemini-pro-1.5");

      // Should have DeepSeek
      expect(modelIds).toContain("deepseek/deepseek-chat");
    });
  });

  describe("validateConfig", () => {
    it("should validate valid config", () => {
      const validConfig: LLMConfig = {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        apiKey: "sk-or-v1-valid-key",
        temperature: 0.7,
      };

      expect(provider.validateConfig(validConfig)).toBe(true);
    });

    it("should accept any model ID (OpenRouter supports 100+)", () => {
      const customModelConfig: LLMConfig = {
        provider: "openrouter",
        model: "custom/unknown-model",
        apiKey: "sk-or-v1-valid-key",
      };

      expect(provider.validateConfig(customModelConfig)).toBe(true);
    });

    it("should reject config without API key", () => {
      const invalidConfig: LLMConfig = {
        provider: "openrouter",
        model: "anthropic/claude-3.5-sonnet",
        apiKey: "",
      };

      expect(provider.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe("generateText", () => {
    const mockMessages: LLMMessage[] = [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello!" },
    ];

    it("should send request to OpenRouter API", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Hello! How can I help you?" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
        model: "anthropic/claude-3.5-sonnet",
      };

      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await provider.generateText(
        mockMessages,
        undefined,
        mockConfig,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer sk-or-v1-test-key",
            "Content-Type": "application/json",
            "HTTP-Referer": expect.any(String),
            "X-Title": "Opttius AI Assistant",
          }),
        }),
      );

      expect(response).toEqual({
        content: "Hello! How can I help you?",
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18,
        },
        finishReason: "stop",
        model: "anthropic/claude-3.5-sonnet",
        toolCalls: undefined,
      });
    });

    it("should include OpenRouter-specific headers", async () => {
      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test" }, finish_reason: "stop" }],
        }),
      });

      await provider.generateText(mockMessages, undefined, mockConfig);

      const fetchCall = (global.fetch as unknown).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers["HTTP-Referer"]).toBeDefined();
      expect(headers["X-Title"]).toBe("Opttius AI Assistant");
    });

    it("should handle tool calls in response", async () => {
      const mockResponseWithTools = {
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call-123",
                  function: {
                    name: "get_weather",
                    arguments: JSON.stringify({ city: "New York" }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      };

      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => mockResponseWithTools,
      });

      const response = await provider.generateText(
        mockMessages,
        undefined,
        mockConfig,
      );

      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0]).toEqual({
        id: "call-123",
        name: "get_weather",
        arguments: { city: "New York" },
      });
    });

    it("should throw error on API failure", async () => {
      (global.fetch as unknown).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "Invalid API key" } }),
      });

      await expect(
        provider.generateText(mockMessages, undefined, mockConfig),
      ).rejects.toThrow("OpenRouter API error: Invalid API key");
    });

    it("should use environment variable API key if not in config", async () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-env-key";
      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test" }, finish_reason: "stop" }],
        }),
      });

      await provider.generateText(mockMessages, undefined, {});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sk-or-v1-env-key",
          }),
        }),
      );

      delete process.env.OPENROUTER_API_KEY;
    });

    it("should throw error if no API key is available", async () => {
      await expect(
        provider.generateText(mockMessages, undefined, { apiKey: undefined }),
      ).rejects.toThrow("OpenRouter API key is required");
    });
  });

  describe("streamText", () => {
    const mockMessages: LLMMessage[] = [
      { role: "user", content: "Stream test" },
    ];

    it("should stream text chunks", async () => {
      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        "data: [DONE]\n",
      ];

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData[0]),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData[1]),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData[2]),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const chunks = [];
      for await (const chunk of provider.streamText(
        mockMessages,
        undefined,
        mockConfig,
      )) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ content: "Hello", done: false });
      expect(chunks[1]).toEqual({ content: " world", done: false });
      expect(chunks[2]).toEqual({ content: "", done: true });
    });

    it("should handle tool calls in stream", async () => {
      const mockStreamData = [
        'data: {"choices":[{"delta":{"tool_calls":[{"id":"call-1","function":{"name":"test","arguments":"{\\"arg\\":\\"value\\"}"}}]}}]}\n',
        "data: [DONE]\n",
      ];

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData[0]),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(mockStreamData[1]),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const chunks = [];
      for await (const chunk of provider.streamText(
        mockMessages,
        undefined,
        mockConfig,
      )) {
        chunks.push(chunk);
      }

      expect(chunks[0].toolCalls).toBeDefined();
      expect(chunks[0].toolCalls?.[0]).toEqual({
        id: "call-1",
        name: "test",
        arguments: { arg: "value" },
      });
    });

    it("should throw error if stream fails", async () => {
      (global.fetch as unknown).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "Invalid request" } }),
      });

      const generator = provider.streamText(
        mockMessages,
        undefined,
        mockConfig,
      );

      await expect(generator.next()).rejects.toThrow(
        "OpenRouter API error: Invalid request",
      );
    });
  });

  describe("custom base URL", () => {
    it("should use custom base URL if provided", async () => {
      const customConfig: Partial<LLMConfig> = {
        ...mockConfig,
        baseURL: "https://custom-proxy.com/api/v1",
      };

      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Test" }, finish_reason: "stop" }],
        }),
      });

      await provider.generateText([], undefined, customConfig);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://custom-proxy.com/api/v1/chat/completions",
        expect.any(Object),
      );
    });
  });
});
