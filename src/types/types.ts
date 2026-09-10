import type OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export type ToolHandler = (args: Record<string, any>) => Promise<string>;

export interface ToolHandlers {
  [name: string]: ToolHandler;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, any>;
  result: string;
  approved: boolean | null;
}

export interface AgentDeps {
  client: OpenAI;
  model: string;
  systemPrompt: string;
  tools: ChatCompletionTool[];
  handlers: ToolHandlers;
  risky: Set<string>;
  approve: (description: string, toolName: string) => Promise<boolean>;
  maxSteps?: number;
}
