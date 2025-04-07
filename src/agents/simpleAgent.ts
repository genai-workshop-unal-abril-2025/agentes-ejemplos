import "dotenv/config.js";
import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { FrameworkError } from "beeai-framework/errors";
import { TokenMemory } from "beeai-framework/memory/tokenMemory";
import { createConsoleReader } from "../helpers/reader.js";
import { ChatModel } from "beeai-framework/backend/chat";

import {addIntegersTool, countCharactersTool} from "src/tools/customTools.js";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";

//ibm/granite-3-8b-instruct  meta-llama/llama-3-3-70b-instruct

const llm = await ChatModel.fromName("watsonx:ibm/granite-3-8b-instruct")

const agent = new BeeAgent({
  llm: llm,
  memory: new TokenMemory(),
  tools: [ addIntegersTool, countCharactersTool ], //countCharactersTool
});

const reader = createConsoleReader({ fallback: "What is the current weather in Las Vegas?" });
for await (const { prompt } of reader) {
  try {
    const response = await agent
    .run(
        { prompt },
        {
          execution: {
            maxIterations: 8,
            maxRetriesPerStep: 3,
            totalMaxRetries: 10,
          },
        },
      )
      .observe((emitter) => {
        emitter.on("update", (data) => {
          reader.write(`Agent 🤖 (${data.update.key}) :`, data.update.value);
        });
      });

    reader.write(`Agent 🤖 :`, response.result.text);
  } catch (error) {
    reader.write(`Error`, FrameworkError.ensure(error).dump());
  }
}
