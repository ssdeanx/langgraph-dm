
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a Plan-and-Execute workflow.
 */
export interface PlanExecuteState {
  input: string;
  plan: string[];
  pastSteps: [string, string][];
  response: string;
  messages: BaseMessage[];
  next: string;
}

export const PlanExecuteAnnotation = Annotation.Root({
  input: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  plan: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  response: Annotation<string>({
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
});
