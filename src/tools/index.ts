
export * from "./calculator.js";
// export * from "./memory.js";
export * from "./tavily.js";
export * from "./exa.js";
export * from "./github.js";
export * from "./local_git.js";
export * from "./document_processing.js";
export * from "./web_scraping.js";

import * as calculator from "./calculator.js";
// import * as memory from "./memory.js";
import * as tavily from "./tavily.js";
import * as exa from "./exa.js";
import * as github from "./github.js";
import * as local_git from "./local_git.js";
import * as document_processing from "./document_processing.js";
import * as web_scraping from "./web_scraping.js";

// Unified tools registry for agent consumption
export const tools = {
  ...calculator,
  ...tavily,
  ...exa,
  ...github,
  ...local_git,
  ...document_processing,
  ...web_scraping
};
