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


/* This code snippet is exporting an instance of the `ChatGoogleGenerativeAI` class with specific
configuration options. Here's a breakdown of what each option is doing: */
export const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxRetries: 2,
  maxOutputTokens: 64000,
  streaming: true,
  cache: true,
  apiKey: GOOGLE_API_KEY,
});

/* The code snippet `export const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey:
GOOGLE_API_KEY, modelName: "gemini-embedding-exp-03-07" });` is creating a new instance of the
`GoogleGenerativeAIEmbeddings` class with specific configuration options. */
export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  modelName: "gemini-embedding-exp-03-07",
});
