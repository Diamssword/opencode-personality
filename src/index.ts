import { Plugin } from "@opencode/plugin"
import type { CommandOutput, PersonalityDefinition } from "./types.js"
import { loadConfigWithPrecedence, resolveMoods, loadMoodState } from "./config.js"
import { buildPersonalityPrompt } from "./prompt.js"
import { driftMoodWithToast } from "./mood.js"
import { createSetMoodTool } from "./tools/setMood.js"
import { createSavePersonalityTool } from "./tools/savePersonality.js"
import { handleMoodCommand } from "./commands/mood.js"
import { handlePersonalityCommand } from "./commands/personality.js"


const plugin = Plugin.define({
  id: "opencode-personality",
  async setup(ctx) {
    const directory = ctx.location.directory;
    const configResult = loadConfigWithPrecedence(directory)
    if (configResult.config === null) {
      ctx.command.transform(trans => {
        trans.add({
          name: "personality",
          execute: async (input) => {
            var res = await handlePersonalityCommand(input.prompt.text, configResult);
            ctx.session.prompt({ sessionID: input.sessionID, text: res, delivery: input.delivery })
          }
        })
      });
      ctx.tool.transform(trans => {
       createSavePersonalityTool(trans,configResult)
      })
      ctx.command.reload()
      return;
    }

    const config:PersonalityDefinition = configResult.config
    const file = configResult.file!
    const activeKey = file.active
    const { statePath } = configResult
    const moods = resolveMoods(config)
    ctx.tool.transform(trans => {
      createSetMoodTool(trans, statePath, config, moods,  activeKey)
       createSavePersonalityTool(trans,configResult)
    })
    ctx.command.transform(trans => {
      trans.add({
        name: "personality",
        execute: async (input) => {
          var res = await handlePersonalityCommand(input.prompt.text, configResult);
          ctx.session.prompt({ sessionID: input.sessionID, text: res, delivery: input.delivery })
        }
      });
      trans.add({
        name: "mood",
        execute: async (input) => {
          var res = handleMoodCommand(input.prompt.text,  statePath,config,moods,activeKey,configResult);
          ctx.session.prompt({ sessionID: input.sessionID, text: res, delivery: input.delivery })
        }
      })
    });
    ctx.session.hook("context", async input => {
      let state = loadMoodState(statePath, config, activeKey)

      if (config.mood.enabled) {
        state = await driftMoodWithToast(
          statePath,
          state,
          config,
          moods,
          config.mood.seed,
          (s) => {
            input.messages.push({ content:{type:"text",text:s},role:"system"})
          },
          activeKey
        )
      }
      const prompt = buildPersonalityPrompt(config, state.current, moods);
      input.system.push({text:`<personality>\n${prompt}\n</personality>`,type:"text"})
    })

  }
    /*return {

      event: async ({ event }) => {
        if (event.type === "message.updated" && config.mood.enabled) {
          const msg = event.properties as { info?: { sessionID?: string; role?: string } }
          if (msg.info?.sessionID && msg.info.role === "assistant") {
            const state = loadMoodState(statePath, config, activeKey)
            await driftMoodWithToast(
              statePath,
              state,
              config,
              moods,
              config.mood.seed,
              client,
              activeKey
            )
          }
        }
      },
    }
  }*/
});


export default plugin
