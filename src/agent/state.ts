import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";


/* The `export interface AgentState` is defining a TypeScript interface named `AgentState`. This
interface specifies the structure of an object that must have the following properties: */
export interface AgentState {
  messages: BaseMessage[];
  query?: string;
  next?: string;
  sender?: string;
  sessionId?: string;
  userInput?: string;
  final_answer?: string;

  // Research Agent specific state
  research_data?: string[];
  summary?: string;
  report?: string;

  // RAG Agent specific state
  retrieved_documents?: string[];
  generated_answer?: string;

  // Documentation Agent specific state
  drafted_documentation?: string;
  final_documentation?: string;

  // Data Agent specific state
  data_summary?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data_output?: any;
}

export const AgentAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
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
  final_answer: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  // Research Agent specific annotations
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
  // RAG Agent specific annotations
  retrieved_documents: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  generated_answer: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  // Documentation Agent specific annotations
  drafted_documentation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  final_documentation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  // Data Agent specific annotations
  data_summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  data_output: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});


export type AgentType =
  | "react"
  | "rag"
  | "conversational"
  | "research"
  | "documentation"
  | "data";
