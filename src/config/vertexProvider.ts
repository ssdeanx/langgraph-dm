import { ChatVertexAI } from "@langchain/google-vertexai";
import { traceable } from "langsmith/traceable";
import "dotenv/config";
import { initTracing } from "./tracing.js";

function getEnvVar(name: string): string {
  // Only this function should access process.env
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }
  return value;
}

const GOOGLE_API_KEY = getEnvVar("GOOGLE_API_KEY");



const vertexModel = traceable(
  new ChatVertexAI({
    model: "gemini-2.5-pro", // Using a model compatible with Vertex AI
    temperature: 0,
  }),
  { name: "ChatVertexAI" }
);

export { vertexModel };
