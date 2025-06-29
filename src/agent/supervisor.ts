
import { model } from "../config/googleProvider.js";
import { BaseMessage } from "@langchain/core/messages";


import { AgentType } from "./state.js";

const ALL_AGENT_TYPES: AgentType[] = ["react", "rag", "conversational", "research", "rewoo", "plan_execute", "self_rag", "crag", "collaboration", "research_team", "document_writing_team", "reflection"];

const supervisorPrompt = `You are a supervisor who needs to decide which agent to call next.

Given the following user request, respond with one of the following agent names: ${ALL_AGENT_TYPES.join(", ")}. If the task is complete, respond with 'FINISH'.

User Request: {input}`;

export async function supervisor(state: { messages: BaseMessage[] }) {
  const lastMessage = state.messages[state.messages.length - 1];
  const response = await model.invoke(
    supervisorPrompt.replace("{input}", lastMessage.content as string)
  );
  return {
    next: response.content as string,
  };
}
