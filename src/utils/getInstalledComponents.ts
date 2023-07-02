import { existsSync } from "fs"
import { Component, getAvailableComponents } from "./getComponents"
import { getFilePath } from "./getFilePath"
import { logger } from "./logger"

export const getInstalledComponent = async ({ componentName, availableComponents}: { availableComponents: Component[], componentName: string}) => {
  const component = availableComponents.find((component) => {
    return component.name === componentName
  })
  if(!component) {
    return
  }

  const installedFiles: (Component['files'][number] & { localPath: string })[] = []
  component.files.forEach((file) => {
    const filePath = getFilePath(file)
    if(existsSync(filePath)) {
      installedFiles.push({
        ...file,
        localPath: filePath
      })
    } 
    else {
      return
    }
  })

  if(installedFiles.length === 0) {
    return
  }

  return {
    ...component,
    files: installedFiles
  }
}
  

export const getInstalledComponents = async () => {
  const components = await getAvailableComponents()
  const installedComponents = await Promise.all(components.map(async (component) => {
    const installedComponent = await getInstalledComponent({ componentName: component.name, availableComponents: components })
    if(!installedComponent) {
      return
    }
    return installedComponent
  }))
  return installedComponents.filter((component) => component)
}
