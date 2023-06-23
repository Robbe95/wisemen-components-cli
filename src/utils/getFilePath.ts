import { Component } from "./getComponents";

export const getFilePath = (file: Component['files'][number]) => {
  const filePath = `./src/modules/ui/${file.type}/${file.placementDir}/${file.name}`
  return filePath
}