import type {
  LLMConfig,
  LLMMessage,
  LLMModel,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
  LLMTool,
} from "../../types";
import { BaseLLMProvider } from "../base";
import { streamText as chatStreamText } from "./chat";
import { generateText as embeddingsGenerateText } from "./embeddings";
import {
  getAvailableModels as helpersGetAvailableModels,
  validateConfig as helpersValidateConfig,
} from "./helpers";

export class DeepSeekProvider extends BaseLLMProvider {
  name: LLMProvider = "deepseek";

  getAvailableModels(): LLMModel[] {
    return helpersGetAvailableModels();
  }

  validateConfig(config: LLMConfig): boolean {
    return helpersValidateConfig(config);
  }

  async *streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    yield* chatStreamText(messages, tools, config);
  }

  async generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    return embeddingsGenerateText(messages, tools, config);
  }
}
