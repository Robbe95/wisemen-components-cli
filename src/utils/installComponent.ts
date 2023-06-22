import ora from "ora"
import { existsSync, promises as fs } from "fs"
import path from "path"
import { execa } from "execa"

import { Component, getAvailableComponents } from "./getComponents"
import { PackageManager, getPackageManager } from "./getPackageManager"
import { logger } from "./logger"


export interface InstallComponentOptions {
  component: Component
  cliConfig: {
    componentsDirInstallation: string;
    askForDir: boolean;
    utilsLocation: string;
    componentDirAlias: string;
  },
  options: {
    overwrite: boolean;
  },
  packageManager: PackageManager;
  inRoot?: boolean;
}

export const installComponent = async ({ component, cliConfig, options, packageManager, inRoot = false }: InstallComponentOptions) => {
  const componentSpinner = ora(`${component.name}...`).start()

  // Write the files.
  for (const file of component.files) {
    const fileDir = inRoot ? `./src/${file.type}` : `./src/modules/ui/${file.type}/${file.placementDir}`
    // because these are the predefined routes for the utils and components we can
    // use them as a replacer for the defined routes on the installed file.
    file.content = file.content.replace(
      "@/lib/utils",
      cliConfig.utilsLocation
    )
    file.content = file.content.replace(
      `@/components/ui/`,
      cliConfig.componentDirAlias
    )
    if (!existsSync(path.resolve(fileDir))) {
      const spinner = ora(`Creating ${fileDir}...`).start()
      logger.info(`Creating ${path.resolve(fileDir)}...`)
      await fs.mkdir(path.resolve(fileDir), { recursive: true })
      spinner.succeed()

    }

    const filePath = path.resolve(fileDir, file.name)
    if (existsSync(filePath) && !options.overwrite) {
      componentSpinner.warn(`${file.name} already exists. Skipping. Use --overwrite to overwrite existing files`)
      continue
    }
    await fs.writeFile(filePath, file.content)
  }

  // Install dependencies.
  if (component.dependencies?.length) {
    const spinner = ora(`Installing dependencies...`).start()

    await execa(packageManager, [
      packageManager === "npm" ? "install" : "add",
      ...component.dependencies,
    ])
    spinner.succeed(
      `Installed ${component.dependencies.length} dependencies.\n${component.dependencies.join(", ")}`
    )

  }
  componentSpinner.succeed(component.name)
}