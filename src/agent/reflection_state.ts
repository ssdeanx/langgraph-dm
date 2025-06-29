
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Represents the state for a Reflection workflow.
 */
export interface ReflectionState {
  request: string;
  content: string;
  critique: string;
  messages: BaseMessage[];
  next: string;
}

export const ReflectionAnnotation = Annotation.Root({
  request: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  content: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  critique: Annotation<string>({
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
