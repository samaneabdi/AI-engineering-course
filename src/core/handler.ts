import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { AgentDeps, ToolCallRecord } from "../types/types";
import { describeToolCall } from "./approve.ts";

const DEFAULT_MAX_STEPS = 15;

/**
 * Runs the model/tool loop for one user turn, mutating `messages` in place
 * (so the caller keeps full conversation history across turns).
 */
export async function Handler(
  messages: ChatCompletionMessageParam[],
  deps: AgentDeps
): Promise<{ text: string; log: ToolCallRecord[] }> {

  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  const log: ToolCallRecord[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const response = await deps.client.chat.completions.create({
      model: deps.model,
      messages,
      tools: deps.tools,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      return { text: "Error: model returned no response.", log };
    }

    messages.push(message as ChatCompletionMessageParam);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { text: message.content ?? "", log };
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const name = call.function.name;
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      let approved: boolean | null = null;
      let result: string;

      if (deps.risky.has(name)) {
        approved = await deps.approve(describeToolCall(name, args), name);
        if (!approved) {
          result = "User denied this action.";
        } else {
          result = await runHandler(deps, name, args);
        }
      } else {
        result = await runHandler(deps, name, args);
      }

      log.push({ name, args, result, approved });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  return {
    text: `Stopped after reaching the ${maxSteps}-step limit for this turn.`,
    log,
  };
}

async function runHandler(
  deps: AgentDeps,
  name: string,
  args: Record<string, any>
): Promise<string> {
  const handler = deps.handlers[name];
  if (!handler) return `Error: unknown tool "${name}".`;
  try {
    return await handler(args);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}