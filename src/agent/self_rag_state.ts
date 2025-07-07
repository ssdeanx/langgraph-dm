
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

/**
 * Represents the state for a Self-RAG workflow.
 */
export interface SelfRagState {
  question: string;
  documents: Document[];
  generation: string;
  generationVQuestionGrade: string;
  generationVDocumentsGrade: string;
  next: string;
  messages: BaseMessage[];
}

export const SelfRagAnnotation = Annotation.Root({
  question: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  documents: Annotation<Document[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  generation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  generationVQuestionGrade: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  generationVDocumentsGrade: Annotation<string>({
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
