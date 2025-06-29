
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

/**
 * Represents the state for a Corrective RAG (CRAG) workflow.
 */
export interface CragState {
  question: string;
  documents: Document[];
  web_search_results: string;
  generation: string;
  documents_grade: string;
  next: string;
  messages: BaseMessage[];
}

export const CragAnnotation = Annotation.Root({
  question: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  documents: Annotation<Document[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  web_search_results: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  generation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  documents_grade: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
