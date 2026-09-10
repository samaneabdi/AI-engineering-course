import * as readline from "node:readline/promises";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Handler } from "./core/handler.ts";
import { createClient, MODEL } from "./core/config.ts";
import { toolSchemas, buildHandlers, RISKY} from "./tools/toolsRegistry.ts";
import { makeInteractiveApprove } from "./core/approve.ts";
import { SYSTEM_PROMPT } from "./core/prompt.ts";

async function main() {
  const client = createClient();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const approve = makeInteractiveApprove(rl);
  const handlers = buildHandlers(client);

  const messages: ChatCompletionMessageParam[] = [{ role: "developer", content: SYSTEM_PROMPT }];

  console.log("Agent ready. Type your message, or 'exit' to quit.\n");

  while (true) {
    let input: string;
    try {
      input = await rl.question("you › ");
    } catch (err) {
      if (err instanceof Error && err.message.includes("readline was closed")) break; // EOF
      throw err;
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) continue;
    if (trimmed === "exit" || trimmed === "quit") break;

    messages.push({ role: "user", content: trimmed });

    try {
      const { text } = await Handler(messages, {
        client,
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        tools: toolSchemas,
        handlers,
        risky: RISKY,
        approve,
      });
      console.log(`agent › ${text}\n`);
    } catch (err) {
      console.log(
        `agent › Something went wrong: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  rl.close();
  console.log("Goodbye.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
