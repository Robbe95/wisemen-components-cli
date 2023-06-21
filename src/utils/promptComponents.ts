import prompts from "prompts"
import { Component } from "./getComponents"
import { GLOBAL_COMPONENTS } from ".."

export async function promptForComponents(components: Component[]) {

  const { components: selectedComponents } = await prompts({
    type: "autocompleteMultiselect",
    name: "components",
    message: "Which component(s) would you like to add?",
    hint: "Space to select. A to select all. I to invert selection.",
    instructions: false,
    choices: components
      .filter(component => !GLOBAL_COMPONENTS.includes(component.name))
      .map((component) => ({
        title: component.name,
        value: component,
      })),
  })

  return selectedComponents
}