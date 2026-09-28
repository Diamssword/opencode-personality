import type {
  PersonalityDefinition,
  MoodDefinition,
  ConfigResult,
} from "../types.js"
import { loadMoodState, saveMoodState } from "../config.js"

export function handleMoodCommand(
  args: string,
  statePath: string,
  config: PersonalityDefinition,
  moods: MoodDefinition[],
  activeKey: string,
  configResult: ConfigResult,
): string {
  const trimmed = args.trim().toLowerCase()
  const state = loadMoodState(statePath, config, activeKey)

  if (!trimmed || trimmed === "status") {
    return `Current mood: **${state.current}** (score: ${state.score.toFixed(2)})${state.override ? ` [override: ${state.override}]` : ""}\nActive personality: ${activeKey}\nConfig source: ${configResult.source}`
  }

  if (!moods.some(item => item.name === trimmed)) {
    return`Invalid mood. Choose from: ${moods.map(item => item.name).join(", ")}`
  }

  state.override = trimmed
  state.current = trimmed
  state.overrideExpiry = null
  saveMoodState(statePath, state, activeKey)
  return `Mood set to **${trimmed}**`;
}
