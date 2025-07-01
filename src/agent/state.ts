import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";


/* The `export interface AgentState` is defining a TypeScript interface named `AgentState`. This
interface specifies the structure of an object that must have the following properties: */
export interface AgentState {
  messages: BaseMessage[];
  next?: string;
  sender?: string;
  sessionId?: string;
  userInput?: string;
}

/* This code snippet is defining an `AgentAnnotation` object using the `Annotation.Root` method. The
`AgentAnnotation` object contains properties such as `messages`, `next`, `sender`, `sessionId`, and
`userInput`, each with its own configuration defined using the `Annotation` method. */
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
