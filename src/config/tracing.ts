oimport "dotenv/config";

export function initTracing() {
  if (!process.env.LANGCHAIN_API_KEY) {
    console.warn("LANGCHAIN_API_KEY is not set. LangSmith tracing will be disabled.");
    return;
  }
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "LangGraphJS";
  console.log("LangSmith tracing initialized.");
}
