import { ChatVertexAI } from "@langchain/google-vertexai";
import { traceable } from "langsmith/traceable";

const vertexModel = traceable(
  new ChatVertexAI({
    model: "gemini-2.5-pro", // Using a model compatible with Vertex AI
    temperature: 0,
  }),
  { name: "ChatVertexAI" }
);

export { vertexModel };
