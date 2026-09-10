// eval_single.ts — does the model pick the RIGHT tool for a one-shot request?
//
// Single-turn eval: stop the model after one step and inspect its tool
// selection. No execution, no multi-step loop — just: given this prompt,
// which tool(s) (if any) does it choose to call?
import { createClient, MODEL } from "../core/config.ts";
import { SYSTEM_PROMPT } from "../core/prompt.ts";
import { toolSchemas } from "../tools/toolsRegistry.ts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient();

// A tiny dataset: prompt -> the tool(s) we expect. Empty = should call none.
const CASES: { prompt: string; expect: string[] }[] = [
  { prompt: "Read the contents of package.json", expect: ["read_file"] },
  { prompt: "Show me the files in the src folder", expect: ["list_files"] },
  { prompt: "Create hello.txt containing 'hi'", expect: ["write_file"] },
  { prompt: "Delete the file temp.log", expect: ["delete_file"] },
  { prompt: "Run 'npm test' and show me the output", expect: ["run_command"] },
  {
    prompt: "In config.json, replace the text 'debug: false' with 'debug: true'",
    expect: ["edit_file"],
  },
  { prompt: "Who won the most recent Formula 1 race?", expect: ["web_search"] },
  { prompt: "What is the capital of France?", expect: [] }, 
];

async function toolsChosen(prompt: string): Promise<string[]> {
  // Stop after ONE step: we want the SELECTION, not execution.
  const messages: ChatCompletionMessageParam[] = [
    { role: "developer", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    tools: toolSchemas,
    tool_choice: "auto",
  });
  const toolCalls = response.choices[0]?.message?.tool_calls ?? [];
  return toolCalls.filter((c) => c.type === "function").map((c) => c.function.name);
}

function sameTools(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

export async function runSingleTurnEval(): Promise<{ passed: number; total: number }> {
  let passed = 0;
  for (const c of CASES) {
    const chosen = await toolsChosen(c.prompt);
    const ok = sameTools(chosen, c.expect);
    passed += ok ? 1 : 0;
    console.log(`[${ok ? "PASS" : "FAIL"}] ${JSON.stringify(c.prompt)}   chose=${chosen}`);
  }
  console.log(`\n${passed}/${CASES.length} passed`);
  return { passed, total: CASES.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSingleTurnEval().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
