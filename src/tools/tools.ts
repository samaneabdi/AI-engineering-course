import OpenAI from "openai";
import { WEB_SEARCH_MODEL } from "../core/config.ts";
import { exec } from "node:child_process";

const TIMEOUT_MS = 30_000;
const MAX_BUFFER = 1_000_000;

export async function webSearch(client: OpenAI, args: { query: string }): Promise<string> {
  const response = await client.chat.completions.create({
    model: WEB_SEARCH_MODEL,
    messages: [
      {
        role: "user",
        content: `Search the web and answer concisely, citing sources by name/URL: ${args.query}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : "Web search returned no usable results.";
}

import { promises as fs } from "node:fs";
import * as path from "node:path";

export async function writeFile(args: { path: string; content: string }): Promise<string> {
  const target = path.resolve(process.cwd(), args.path);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, args.content, "utf-8");
  return `Wrote ${args.content.length} bytes to ${args.path}.`;
}

export async function readFile(args: { path: string }): Promise<string> {
  const target = path.resolve(process.cwd(), args.path);
  const content = await fs.readFile(target, "utf-8");
  return content;
}

export async function editFile(args: {
  path: string;
  old_text: string;
  new_text: string;
}): Promise<string> {
  const target = path.resolve(process.cwd(), args.path);
  const content = await fs.readFile(target, "utf-8");
  if (!content.includes(args.old_text)) {
    return `Error: could not find the text ${JSON.stringify(
      args.old_text
    )} in ${args.path}. No changes made.`;
  }
  const occurrences = content.split(args.old_text).length - 1;
  const updated = content.split(args.old_text).join(args.new_text);
  await fs.writeFile(target, updated, "utf-8");
  return `Replaced ${occurrences} occurrence(s) of ${JSON.stringify(
    args.old_text
  )} with ${JSON.stringify(args.new_text)} in ${args.path}.`;
}

export async function listFiles(args: { dir?: string }): Promise<string> {
  const dir = args.dir ?? ".";
  const target = path.resolve(process.cwd(), dir);
  const entries = await fs.readdir(target, { withFileTypes: true });
  if (entries.length === 0) return `${dir} is empty.`;
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort()
    .join("\n");
}

export async function deleteFile(args: { path: string }): Promise<string> {
  const target = path.resolve(process.cwd(), args.path);
  await fs.unlink(target);
  return `Deleted ${args.path}.`;
}

export function runCommand(args: { command: string }): Promise<string> {
  return new Promise((resolve) => {
    exec(
      args.command,
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();
        if (error) {
          resolve(
            `Command exited with an error (${error.message}).\nOutput:\n${output || "(no output)"}`
          );
          return;
        }
        resolve(output || "(command produced no output)");
      }
    );
  });
}

