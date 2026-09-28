import { tool } from "@opencode-ai/plugin"
import type { PersonalityDefinition, MoodDefinition, PluginClient, MoodDuration } from "../types.js"
import { loadMoodState, saveMoodState } from "../config.js"
import type { ToolEditor } from "@opencode/plugin/promise/tool"

export function createSetMoodTool(
  register:ToolEditor,
  statePath: string,
  config: PersonalityDefinition,
  moods: MoodDefinition[],
  activeKey: string
) {
  register.add({
    name: "setMood",
    description: "Set the assistant's current mood",
    input: {
      mood: tool.schema.string().describe("The mood to set"),
      duration: tool.schema
        .enum(["message", "session", "permanent"])
        .optional()
        .describe(
          "How long the override lasts: message (next response only), session (until session ends), permanent (persists across sessions)"
        ),
    },
    async execute(args:any) {
      const state = loadMoodState(statePath, config, activeKey)

      if (!moods.some(item => item.name === args.mood)) {
        return { content: `Invalid mood. Choose from: ${moods.map(item => item.name).join(", ")}` }
      }

      state.override = args.mood
      if (args.duration === "message") {
        state.overrideExpiry = Date.now() + 1
      } else {
        state.overrideExpiry = null
      }
      state.current = args.mood

      saveMoodState(statePath, state, activeKey)
/*      await client.app.log({
        body: {
          service: "personality-plugin",
          level: "info",
          message: `Mood set to ${args.mood} (duration: ${(args.duration as MoodDuration) ?? "session"})`,
        },
      })
*/
      return { content: `Mood changed to ${args.mood}` }
    },
  });
}
