import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
  messages: BaseMessage[];
  next?: string;
  sender?: string;
  sessionId?: string;
  userInput?: string;
}

export const AgentAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  sender: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "user",
  }),
  sessionId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "default",
  }),
  userInput: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

export type AgentType = 
  | "react" 
  | "rag" 
  | "conversational" 
  | "research" 
  | "rewoo" 
  | "plan_execute" 
  | "self_rag" 
  | "crag" 
  | "collaboration" 
  | "research_team" 
  | "document_writing_team" 
  | "reflection";
