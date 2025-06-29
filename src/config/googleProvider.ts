import "dotenv/config";
import { initTracing } from "./tracing.js";

initTracing();
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { traceable } from "langsmith/traceable";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set.");
}

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  apiKey: GOOGLE_API_KEY,
});

const model = traceable(
  // Accept a single argument and pass it to llm.invoke
  (input: any) => llm.invoke(input),
  { name: "ChatGoogle" }
);

const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
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
