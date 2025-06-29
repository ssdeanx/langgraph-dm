
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a research and reporting workflow.
 */
export interface ResearchState {
  query: string;
  messages: BaseMessage[];
  research_data: string[];
  summary: string;
  report: string;
  next: string;
}

export const ResearchAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  research_data: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
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
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
