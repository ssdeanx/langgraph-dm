import "dotenv/config";
import { initTracing } from "./tracing.js";

initTracing();
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { traceable } from "langsmith/traceable";

function getEnvVar(name: string): string {
  
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }
  return value;
}

const GOOGLE_API_KEY = getEnvVar("GOOGLE_API_KEY");

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  maxRetries: 2,
  maxOutputTokens: 64000,
  streaming: true,
  cache: true,
  apiKey: GOOGLE_API_KEY,
});

const model = traceable(
  // Accept a single argument and pass it to llm.invoke
  (input: { content: string }) => llm.invoke([{ role: "user", content: input.content }]),
  { name: "ChatGoogle", tags: ["llm", "google", "agent", "chat"], metadata: { model: "gemini-2.5-pro", prompt: "gemini-2.5-pro", } }
);

const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  modelName: "gemini-embedding-exp-03-07",
});

// Wrap the embedQuery and embedDocuments methods with traceable
const embeddings = {
  embedQuery: traceable(
    embeddingModel.embedQuery.bind(embeddingModel),
    { name: "GoogleEmbeddings.embedQuery" }
  ),
  embedDocuments: traceable(
    embeddingModel.embedDocuments.bind(embeddingModel),
    { name: "GoogleEmbeddings.embedDocuments" }
  ),
};

export { model, embeddings };
