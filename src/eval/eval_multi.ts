import { createClient, MODEL } from "../core/config.ts";
import { SYSTEM_PROMPT } from "../core/prompt.ts";
import { Handler } from "../core/handler.ts";
import { toolSchemas, RISKY } from "../tools/toolsRegistry.ts";
import type { ToolHandlers } from "../types/types.ts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = createClient();

// Fixed, deterministic responses — no real filesystem/shell access.
const MOCK_HANDLERS: ToolHandlers = {
  list_files: async () => "report.md\nREADME.md",
  read_file: async (args) =>
    args.path?.toString().includes("report.md")
      ? "Q3 revenue was $1.2M, up 8% quarter over quarter."
      : "(mocked file contents)",
};

// Every real tool needs a handler entry so unmocked calls fail loudly
// instead of hitting the network/filesystem.
const handlers: ToolHandlers = new Proxy(MOCK_HANDLERS, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    return async () => `Error: "${prop}" is not mocked for this eval.`;
  },
});

// Nothing in this task should be risky, so approval should never be invoked.
async function approve(description: string): Promise<boolean> {
  throw new Error(`Unexpected approval request in eval_multi: ${description}`);
}

interface Case {
  task: string;
  expectedOrder: string[]; // tool names that must appear, in this relative order
}

const CASES: Case[] = [
  {
    task: "List the files, then read report.md and summarize it in one sentence.",
    expectedOrder: ["list_files", "read_file"],
  },
];

async function judge(task: string, answer: string): Promise<number> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "developer",
        content:
          "Score 1-10 how well the answer completes the task. Reply with only the number.",
      },
      { role: "user", content: `Task: ${task}\nAnswer: ${answer}` },
    ],
  });
  const text = response.choices[0]?.message?.content?.trim() ?? "0";
  const score = Number.parseInt(text, 10);
  return Number.isFinite(score) ? score : 0;
}

function inRelativeOrder(order: string[], expected: string[]): boolean {
  let cursor = 0;
  for (const name of order) {
    if (name === expected[cursor]) cursor++;
    if (cursor === expected.length) return true;
  }
  return cursor === expected.length;
}

export async function runMultiTurnEval(): Promise<{ passed: number; total: number }> {
  let passed = 0;
  for (const c of CASES) {
    const messages: ChatCompletionMessageParam[] = [
      { role: "developer", content: SYSTEM_PROMPT },
      { role: "user", content: c.task },
    ];

    const { text, log } = await Handler(messages, {
      client,
      model: MODEL,
      systemPrompt: SYSTEM_PROMPT,
      tools: toolSchemas,
      handlers,
      risky: RISKY,
      approve,
    });

    const order = log.map((l) => l.name);
    const orderOk = inRelativeOrder(order, c.expectedOrder);
    const score = await judge(c.task, text);
    const scoreOk = score >= 6;
    const ok = orderOk && scoreOk;
    passed += ok ? 1 : 0;

    console.log(`[${ok ? "PASS" : "FAIL"}] ${JSON.stringify(c.task)}`);
    console.log(`  tool order: ${JSON.stringify(order)} (expected order ${JSON.stringify(c.expectedOrder)}: ${orderOk ? "ok" : "WRONG"})`);
    console.log(`  judge score: ${score}/10 (${scoreOk ? "ok" : "LOW"})`);
    console.log(`  answer: ${text}`);
  }
  console.log(`\n${passed}/${CASES.length} passed`);
  return { passed, total: CASES.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMultiTurnEval().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
