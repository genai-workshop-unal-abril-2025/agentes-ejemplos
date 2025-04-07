import { DynamicTool, StringToolOutput, JSONToolOutput } from "beeai-framework/tools/base";
import { z } from "zod";

const addIntegersTool = new DynamicTool({
  name: "addIntegers",
  description: "Adds two integers and returns the result.",
  inputSchema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  async handler(input) {
    const sum = input.a + input.b;
    return new StringToolOutput(`The sum of ${input.a} and ${input.b} is ${sum}.`);
  },
});

const countCharactersTool  = new DynamicTool({
  name: "countCharacters",
  description: "Counts the appearances of each character (letters, digits, symbols) in a string.",
  inputSchema: z.object({
    text: z.string(),
  }),
  async handler(input) {
    const counts: Record<string, number> = {};

    for (const char of input.text) {
      if (char === " ") continue;
      counts[char] = (counts[char] || 0) + 1;
    }

    return new JSONToolOutput(counts);
  },
});

export {addIntegersTool, countCharactersTool};
