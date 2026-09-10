import type OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { ToolHandlers } from "../types/types.ts";
import { webSearch, writeFile, readFile, editFile, listFiles, deleteFile, runCommand } from "./tools.ts";

export const RISKY = new Set(["write_file", "edit_file", "delete_file", "run_command"]);

export const toolSchemas: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current or external facts you don't already know.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create a new file or overwrite an existing one with the given content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to write." },
          content: { type: "string", description: "Full text content to write." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read and return the contents of an existing file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Change an existing file by replacing an exact snippet of its current text with new text.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to edit." },
          old_text: { type: "string", description: "Exact existing text to find." },
          new_text: { type: "string", description: "Text to replace it with." },
        },
        required: ["path", "old_text", "new_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List the files and folders in a directory.",
      parameters: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Relative directory to list. Defaults to '.'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Permanently delete a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to delete." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command or script and return its output.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run." },
        },
        required: ["command"],
      },
    },
  },
];

export function buildHandlers(client: OpenAI): ToolHandlers {
  return {
    web_search: (args) => webSearch(client, args as { query: string }),
    write_file: (args) => writeFile(args as { path: string; content: string }),
    read_file: (args) => readFile(args as { path: string }),
    edit_file: (args) =>
      editFile(args as { path: string; old_text: string; new_text: string }),
    list_files: (args) => listFiles(args as { dir?: string }),
    delete_file: (args) => deleteFile(args as { path: string }),
    run_command: (args) => runCommand(args as { command: string }),
  };
}
