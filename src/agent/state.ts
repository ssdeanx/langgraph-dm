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
  query?: string;
  research_data?: string[];
  summary?: string;
  report?: string;
  documentation?: string;
  retrieved_documents?: string[];
  critique_result?: string;
  rewritten_query?: string;
  final_answer?: string;
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
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  research_data: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  report: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  documentation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  retrieved_documents: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  critique_result: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  rewritten_query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  final_answer: Annotation<string>({
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
  | "reflection"
  | "documentation";
