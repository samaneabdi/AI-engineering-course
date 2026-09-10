// run.ts — runs the full eval suite: single-turn tool-selection checks,
// then multi-turn mocked-tool runs. Exits non-zero if anything failed, so
// this can be wired into CI.
import { runSingleTurnEval } from "./eval_single.ts";
import { runMultiTurnEval } from "./eval_multi.ts";

async function main() {
  console.log("=== single-turn: tool selection ===");
  const single = await runSingleTurnEval();

  console.log("\n=== multi-turn: mocked run + LLM judge ===");
  const multi = await runMultiTurnEval();

  const passed = single.passed + multi.passed;
  const total = single.total + multi.total;
  console.log(`\n=== overall: ${passed}/${total} passed ===`);

  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
