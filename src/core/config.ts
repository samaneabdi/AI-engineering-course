import OpenAI from "openai";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";

export const MODEL = "openai/gpt-4o-mini";

export const WEB_SEARCH_MODEL = `${MODEL}:online`;

export function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment (.env).");
  }
  return new OpenAI({ apiKey, baseURL: BASE_URL });
}
