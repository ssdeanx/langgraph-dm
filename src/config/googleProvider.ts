import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import {
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

import { wrapSDK } from "langsmith/wrappers";
import { createLLMAsJudge, CORRECTNESS_PROMPT, EvaluatorResult } from "openevals"; // Uncommented and imported


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
export const model = wrapSDK(new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxRetries: 2,
  tags: ["langgraph", "gemini-2.5-flash", "agent", "SFT"],
  topK: 0.3125,
  topP: 0.95,
  maxOutputTokens: 64000,
  convertSystemMessageToHumanContent: true,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
  streaming: true,
  cache: true,
  apiKey: GOOGLE_API_KEY,
}));

/* The code snippet `export const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey:
GOOGLE_API_KEY, modelName: "gemini-embedding-exp-03-07" });` is creating a new instance of the
`GoogleGenerativeAIEmbeddings` class with specific configuration options. */
export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_API_KEY,
  modelName: "gemini-embedding-exp-03-07",
  stripNewLines: true,
  maxRetries: 2,
  maxConcurrency: 6,
});

/**
 * Exports a pre-configured LLM judge using the primary model.
 * This judge can be used for evaluating responses in `openevals`.
 */
export const judgeModel: (params: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) => Promise<EvaluatorResult> = createLLMAsJudge({
  prompt: CORRECTNESS_PROMPT,
  model: "gemini-2.5-flash", // Use the model name as a string
  feedbackKey: "correctness",
});
