import { existsSync, promises as fs } from "fs"
import { logger } from "@/src/utils/logger"
import chalk from "chalk"
import { Command } from "commander"
import { diffLines, type Change } from "diff"
import * as z from "zod"
import { Component } from "../utils/getComponents"
import { getInstalledComponents } from "../utils/getInstalledComponents"
import { promptForComponent, promptForComponents } from "../utils/promptComponents"

const updateOptionsSchema = z.object({
  component: z.string().optional(),
})


export interface FileDiff {
  file: string
  filePath: string
  patch: Change[]
}

export const addDiffCommand = ({ program }: { program: Command }) => {
  program
    .command("diff")
    .name("diff")
    .description("check for updates against the registry")
    .argument("[component]", "the component name")
    .action(async (name, opts) => {
      const options = updateOptionsSchema.parse({
        component: name,
      })


        
      const installedComponents  = await getInstalledComponents()
      
      if(!options.component) {
        const component = await promptForComponent(installedComponents) as Component
        options.component = component.name
      }
      const component = installedComponents.find((component) => {
        return component?.name === options.component
      })
      if (!component) {
        logger.error(
          `The component ${chalk.green(options.component)} does not exist.`
        )
        process.exit(1)
      }

      const changes = await diffComponent(component)

      if (!changes.length) {
        logger.info(`No updates found for ${options.component}.`)
        process.exit(0)
      }

      for (const change of changes) {
        logger.info(`- ${change.filePath}`)
        await printDiff(change.patch)
        logger.info("")
      }
    
  })
}

async function diffComponent(
  component: Component & { files: { localPath: string }[] },
): Promise<FileDiff[]> {
  const changes: FileDiff[] = []

  for (const registryFile of component.files) {
    const localFilePath = registryFile.localPath

    if (!existsSync(localFilePath)) {
      continue 
    }

    const fileContent = await fs.readFile(localFilePath, "utf8")
    const registryContent = registryFile.content

    const patch = diffLines(registryContent, fileContent)
    if (patch.length > 1) {
      changes.push({
        file: registryFile.name,
        filePath: localFilePath,
        patch,
      })
    }
  }
  return changes
}

async function printDiff(diff: Change[]) {
  diff.forEach((part) => {
    if (part) {
      if (part.added) {
        return process.stdout.write(chalk.green(part.value))
      }
      if (part.removed) {
        return process.stdout.write(chalk.red(part.value))
      }

      return process.stdout.write(part.value)
    }
  })
}