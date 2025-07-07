import { Client } from "langsmith";
import { CORRECTNESS_PROMPT, EvaluatorResult } from "openevals"; // Removed createLLMAsJudge as it's used in googleProvider
import { evaluate } from "langsmith/evaluation";
import { graph } from "../agent/graph.js"; // Import the main LangGraph graph
import { AgentState } from "../agent/state.js"; // Import AgentState for type safety
import { judgeModel } from "./googleProvider.js"; // Import judgeModel from googleProvider

// Define example input and reference output pairs that you'll use to evaluate your app

export const client = new Client();



// Define the application logic you want to evaluate inside a target function
// This function will now invoke your LangGraph application
async function target(inputs: {
  question: string;
}): Promise<{ answer: string }> {
  const initialState: AgentState = {
    messages: [],
    userInput: inputs.question,
    sessionId: `eval-${Date.now()}`, // Unique session ID for evaluation run
  };

  const responseStream = await graph.stream(initialState, {
    streamMode: ["messages", "updates"], // Stream messages and updates for full visibility
  });

  let finalAnswer = "";
  for await (const chunk of responseStream) {
    const [eventType, data] = chunk;
    if (eventType === "updates") {
      // Iterate through node updates to find final_answer
      for (const nodeUpdate of Object.values(data)) {
        // Check if nodeUpdate is an object and has final_answer
        if (typeof nodeUpdate === 'object' && nodeUpdate !== null && 'final_answer' in nodeUpdate && nodeUpdate.final_answer) {
          finalAnswer = nodeUpdate.final_answer as string; // Cast to string as we know it's a string from AgentState
          break; // Found final_answer, no need to check other nodes
        }
      }
    }
  }

  // If final_answer is still not set, it means the graph might have ended without explicitly setting it
  // or the stream didn't capture the final state update.
  // In such cases, we can invoke the graph once to get the final state.
  if (!finalAnswer) {
    const finalState = await graph.invoke(initialState);
    if (finalState.final_answer) {
      finalAnswer = finalState.final_answer;
    } else if (finalState.messages && finalState.messages.length > 0) {
      // As a last resort, get the content of the last message
      const lastMessage = finalState.messages[finalState.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        finalAnswer = String(lastMessage.content);
      }
    }
  }

  return { answer: finalAnswer?.trim() || "" };
}

// Define an LLM as a judge evaluator to evaluate correctness of the output
// Import a prebuilt evaluator prompt from openevals (https://github.com/langchain-ai/openevals) and create an evaluator.

const correctnessEvaluator = async (params: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}) : Promise<EvaluatorResult> => {
  // Use the already defined judgeModel from googleProvider.js
  const evaluatorResult = await judgeModel({
    inputs: params.inputs,
    outputs: params.outputs,
    referenceOutputs: params.referenceOutputs,
  });
  return evaluatorResult;
};

// After running the evaluation, a link will be provided to view the results in langsmith
await evaluate(target, {
  // Replace "Sample dataset" with the name of your dataset from LangSmith
  // For example: data: "My LangSmith Dataset Name",
  data: "SFT-eval-dataset",
  evaluators: [
    correctnessEvaluator,
    // can add multiple evaluators here
  ],
  experimentPrefix: "SFT-eval",
  maxConcurrency: 2,
});
