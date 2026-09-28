import { tool } from "@opencode-ai/plugin"
import type {
  PersonalityDefinition,
  MoodDefinition,
  ConfigResult,
} from "../types.js"
import { mergeWithDefaults, resolveScopePath, savePersonalityToFile } from "../config.js"
import type { ToolEditor } from "@opencode/plugin/promise/tool"

export function createSavePersonalityTool(
  register:ToolEditor,
  configResult: ConfigResult
) {
  register.add({
    name: "savePersonality",
    description:
      "Save a personality configuration. Use this after collecting personality details from the user.",
    input: {
      name: tool.schema
        .string()
        .optional()
        .describe("Name/identifier for the personality (used as key in personality collection)"),
      description: tool.schema
        .string()
        .describe("Personality description (required) - describes how the assistant behaves"),
      emoji: tool.schema
        .boolean()
        .optional()
        .describe("Whether to use emojis in responses (default: false)"),
      slangIntensity: tool.schema
        .number()
        .optional()
        .describe("Slang usage intensity 0-1: 0=none, 0.3=light, 0.7=heavy (default: 0)"),
      moodEnabled: tool.schema
        .boolean()
        .optional()
        .describe("Enable mood drift system (default: false)"),
      moodDefault: tool.schema
        .string()
        .optional()
        .describe("Default mood name (default: happy)"),
      moodDrift: tool.schema
        .number()
        .optional()
        .describe("Mood drift amount 0-1 (default: 0.2)"),
      moodToast: tool.schema
        .boolean()
        .optional()
        .describe("Show toast notifications on mood change (default: true)"),
      moods: tool.schema
        .array(
          tool.schema.object({
            name: tool.schema.string().describe("Unique mood name"),
            hint: tool.schema.string().describe("Describe how this mood affects responses"),
            score: tool.schema.number().describe("Numeric score for drift calculations"),
          })
        )
        .optional()
        .describe("Custom mood definitions (optional - defaults are provided)"),
      scope: tool.schema
        .enum(["project", "global"])
        .optional()
        .describe("Where to save: project (.opencode/) or global (~/.config/opencode/)"),
    },
    async execute(args:any) {
      if (!args.description || args.description.trim().length === 0) {
        return { content: "Error: description is required. Please provide a personality description." }
      }

      const scope = args.scope ?? "project"
      const scopePath = resolveScopePath(scope, configResult)

      const partial: Partial<PersonalityDefinition> = {
        name: args.name?.trim() ?? "",
        description: args.description.trim(),
        emoji: args.emoji ?? false,
        slangIntensity: args.slangIntensity ?? 0,
        mood: {
          enabled: args.moodEnabled ?? false,
          default: args.moodDefault ?? "happy",
          override: null,
          drift: args.moodDrift ?? 0.2,
          toast: args.moodToast ?? true,
        },
      }

      if (args.moods && args.moods.length > 0) {
        partial.moods = args.moods as MoodDefinition[]
      }

      const definition = mergeWithDefaults(partial)

      // Use name as the personality key, fall back to active personality or "default"
      const key = args.name?.trim() || configResult.file?.active || "default"
      savePersonalityToFile(scopePath, key, definition, true)
      return { content: `Personality "${key}" saved to ${scope} (${scopePath}) and set as active.` }
    },
  });
}
