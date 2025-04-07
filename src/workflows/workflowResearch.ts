import "dotenv/config";
import { z } from "zod";
import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { createConsoleReader } from "../helpers/reader.js";
import { isEmpty } from "remeda";
import { LLMTool } from "beeai-framework/tools/llm";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { Workflow } from "beeai-framework/workflows/workflow";
import { ChatModel } from "beeai-framework/backend/chat";
import { SystemMessage, UserMessage } from "beeai-framework/backend/message";
import { ArXivTool } from "beeai-framework/tools/arxiv";

import * as fs from 'fs';


const modelId = "watsonx:meta-llama/llama-3-3-70b-instruct"

const schema = z.object({
  input: z.string(),
  output: z.string().optional(),

  topic: z.string().optional(),
  notes: z.array(z.string()).default([]),
  articles: z.string().optional(),
  draft: z.string().optional(),
});

const workflow = new Workflow({
  schema,
  outputSchema: schema.required({ output: true }),
})
  .addStep("preprocess", async (state) => {
    const model = await ChatModel.fromName(modelId);
    const { object } = await model.createStructure({
      messages: [
        new UserMessage(
          [
            "Your task is to rewrite the user query so that it guides the researcher and writer to craft a report that perfectly aligns with the user's needs. Notes should be used only if the user complains about something.",
            "If the user query does ",
            "",
            ...[state.topic && ["# Previous Topic", state.topic, ""]],
            ...[!isEmpty(state.notes) && ["# Previous Notes", ...state.notes, ""]],
            "# User Query",
            state.input || "empty",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ],
      schema: z
        .object({
          error: z
            .string()
            .describe(
              "Use this field only if the user message is not a valid topic and is not a note to an existing blog post.",
            ),
        })
        .or(schema.pick({ topic: true, notes: true })),
    });

    if ("error" in object) {
      state.output = object.error;
      return Workflow.END;
    }

    state.notes = object.notes ?? [];
    state.topic = object.topic;
  })
  .addStrictStep("researcher", schema.required({ topic: true }), async (state) => {
    const llm = await ChatModel.fromName(modelId);
    const agent = new BeeAgent({
      llm,
      memory: new UnconstrainedMemory(),
      tools: [new DuckDuckGoSearchTool(), new LLMTool({ llm }), new ArXivTool()],
    });

    const { result } = await agent.run({
      prompt: [
        `You are a Researcher. Your task is to research the "${state.topic}" topic and write a list of your findings in Markdown format.`,
        ``,
        `# Objectives`,
        `1. Prioritize the latest research finds, authors, and noteworthy news.`,
        `2. Identify the main topic of any research, be sure to include authors, release dates, available urls and so on.`,
        `3. For every research find, include an extensive summary so that the user can have as much context as possible.`,
        ``,
        ...[!isEmpty(state.notes) && ["# Notes", ...state.notes, ""]],
        `Provide a structured output that covers the mentioned sections.`,
      ].join("\n"),
    });

    state.articles = result.text;
  })
  .addStrictStep("writer", schema.required({ articles: true }), async (state) => {
    const model = await ChatModel.fromName(modelId);
    const output = await model.create({
      messages: [
        new SystemMessage(
          [
            `You are a Report Writer. Your task is to write a comprehensive report on the current state of an academic topic, based on the provided context.`,
            ``,
            `# Context`,
            `${state.articles}`,
            ``,
            `# Objectives`,
            `- An engaging introduction`,
            `- Insightful body paragraphs detailing latest research finds, add links and reference details when available (2-3 per section)`,
            `- Properly named sections/subtitles`,
            `- A summarizing conclusion`,
            `- Format: Markdown`,
            ``,
            ...[!isEmpty(state.notes) && ["# Notes", ...state.notes, ""]],
            `Ensure the content flows naturally, incorporates SEO keywords, and is well-structured.`,
          ].join("\n"),
        ),
      ],
    });

    state.draft = output.getTextContent();

    state.output = output.getTextContent()
  })
  // .addStrictStep("editor", schema.required({ draft: true }), async (state) => {
  //   const model = await ChatModel.fromName(modelId);
  //   const output = await model.create({
  //     messages: [
  //       new SystemMessage(
  //         [
  //           `You are an Editor. Your task is to transform the following report to a final version.`,
  //           ``,
  //           `# Draft`,
  //           `${state.draft}`,
  //           ``,
  //           `# Objectives`,
  //           `- Fix Grammatical errors`,
  //           `- Remember to include`,
  //           ``,
  //           ...[!isEmpty(state.notes) && ["# Notes", ...state.notes, ""]],
  //           ``,
  //           `IMPORTANT: The final version must not contain any editor's comments.`,
  //         ].join("\n"),
  //       ),
  //     ],
  //   });

  //   state.output = output.getTextContent();
  // });

let lastResult = {} as Workflow.output<typeof workflow>;
const reader = createConsoleReader();
reader.write(
  "ℹ️ ",
  "I am a research and report agent. Please give me a topic for which I will write a report on its current state..",
);

let state_progress: any[] = [];

for await (const { prompt } of reader) {
  const { result } = await workflow
    .run({
      input: prompt,
      notes: lastResult?.notes,
      topic: lastResult?.topic,
    })
    .observe((emitter) => {
      emitter.on("start", ({ step, run }) => {
        reader.write(`-> ▶️ ${step}`, JSON.stringify(run.state));

        state_progress.push({
          step,
          state: run.state,
        });
      });
    });

  lastResult = result;
  reader.write("🤖 Answer", lastResult.output);

  //console.log(state_progress)
  state_progress.push({
    step: 'Final Answer',
    state: lastResult,
  });

  //---------------------- Save the process progress to a md file

  let markdownOutput = '';

  for (let i = 0; i < state_progress.length; i++) {
      const { step, state } = state_progress[i];

      markdownOutput += `\n## Step ${i + 1}: ${step}\n\n`;

      markdownOutput += `### Input:\n${state.input}\n`;

      if (state.topic) {
        markdownOutput += `\n### Topic:\n${state.topic}\n`;
      }

      if (state.notes && state.notes.length > 0) {
        markdownOutput += `\n### Notes:\n`;
        state.notes.forEach((note: string, idx: number) => {
          markdownOutput += `- Note ${idx + 1}: ${note}\n`;
        });
      }

      if (state.articles) {
        markdownOutput += `\n### Articles:\n${state.articles}\n`;
      }

      if (state.draft) {
        markdownOutput += `\n### Draft:\n${state.draft}\n`;
      }

      if (state.output) {
        markdownOutput += `\n### Output:\n${state.output}\n`;
      }

      markdownOutput += `\n---\n`;
    }

    const { step, state } = state_progress[state_progress.length-1]

  fs.writeFileSync(`state_progress_${state.topic}.md`, markdownOutput, 'utf-8');
  console.log('State progress saved to state_progress.md');
}
