
import * as chat_history from "./chat_history.js";
import * as vectorstores from "./vectorstores.js";
import * as storage from "./storage.js";

export const memory = {
  ...chat_history,
  ...vectorstores,
  ...storage
};
