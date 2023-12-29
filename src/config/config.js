import fs from "fs";
import path from "path";
import { app, shell } from "electron";
import { reverseObject } from "../lib/helpers.js";
import defaultConfig from "./config.default.js";

let configObj = defaultConfig;
const configPath = path.join(app.getPath("userData"), "config.json");
if (fs.existsSync(configPath)) {
  configObj = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} else {
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

export let config = {
  ...configObj,
};

config.reverseBindings = reverseObject(config.bindings);

fs.watchFile(configPath, () => {
  configObj = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  config = {
    ...configObj,
  };
  config.reverseBindings = reverseObject(config.bindings);
  logger.info("Config file updated...");

  app.relaunch();
  app.quit();
});

export const openConfig = () => {
  const configPath = path.join(app.getPath("userData"), "config.json");
  if (fs.existsSync(configPath)) {
    shell.openPath(configPath);
  } else {
    fs.writeFileSync(configPath, "{}");
    shell.openPath(configPath);
  }
};

export default config;
