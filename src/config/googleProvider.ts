import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";

/**
 * Utility function for environment variable access
 */
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }
  return value;
}

const GOOGLE_API_KEY = getEnvVar("GOOGLE_API_KEY");

// LangSmith tracing happens automatically when env vars are set
// No manual wrapping needed - LangGraph.js handles it
export const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  maxRetries: 2,
  maxOutputTokens: 64000,
  streaming: true,
  cache: true,
  apiKey: GOOGLE_API_KEY,
});

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  modelName: "gemini-embedding-exp-03-07",
});
