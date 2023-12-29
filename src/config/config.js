import fs from "fs";
import path from "path";
import { app, shell } from "electron";
import { logger } from "../lib/helpers.js";
import { reverseObject } from "../lib/helpers.js";
import base from "../lib/base.js";
import defaultConfig from "./config.default.js";

export const configPath = path.join(app.getPath("userData"), "config.json");

export const loadConfig = (options = { skipBaseSet: false }) => {
  let configObj = defaultConfig;
  if (fs.existsSync(configPath)) {
    configObj = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  const config = {
    ...configObj,
  };
  config.reverseBindings = reverseObject(config.bindings);
  if (!options.skipBaseSet) base.set("config", config);
  return config;
};

const configFileWatcher = fs.watchFile(configPath, () => {
  try {
    logger.info("Config file updated...");
    const config = loadConfig({ skipBaseSet: true });

    const keyboardListenerIsActive = base.get("isKeyboardListenerActive");
    if (keyboardListenerIsActive) {
      base.set("isKeyboardListenerActive", false);
      base.set("config", config);
      base.set("isKeyboardListenerActive", true); // Re-activate because it was previously active
    } else {
      base.set("isKeyboardListenerActive", true);
      base.set("isKeyboardListenerActive", false);
      base.set("config", config);
      // Don't re-activate because it was already inactive
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
});

export const stopConfigFileWatcher = () => {
  if (typeof configFileWatcher.close === "function") configFileWatcher.close();
};

export const openConfig = () => {
  if (fs.existsSync(configPath)) {
    shell.openPath(configPath);
  } else {
    fs.writeFileSync(configPath, "{}");
    shell.openPath(configPath);
  }
};

export default {
  configPath,
  loadConfig,
  openConfig,
  stopConfigFileWatcher,
};
