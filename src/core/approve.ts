import * as readline from "node:readline/promises";

const sessionAllowList = new Set<string>();

export function isAlwaysAllowed(toolName: string): boolean {
  return sessionAllowList.has(toolName);
}

export function describeToolCall(name: string, args: Record<string, any>): string {
  switch (name) {
    case "write_file":
      return `write ${args.path}`;
    case "edit_file":
      return `edit ${args.path}`;
    case "delete_file":
      return `delete ${args.path}`;
    case "run_command":
      return `run: ${args.command}`;
    default:
      return `${name}(${JSON.stringify(args)})`;
  }
}

export function makeInteractiveApprove(rl: readline.Interface) {
  return async (description: string, toolName: string): Promise<boolean> => {
    if (isAlwaysAllowed(toolName)) return true;
    const answer = (
      await rl.question(`agent › I'd like to ${description}. Allow? (y/n/a=always allow ${toolName}) › `)
    )
      .trim()
      .toLowerCase();
    if (answer === "a") {
      sessionAllowList.add(toolName);
      return true;
    }
    return answer === "y" || answer === "yes";
  };
}
