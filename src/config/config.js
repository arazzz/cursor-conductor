/**
 * @file /src/config/config.js
 * - Contains functions for loading the configuration file and
 *   setting it in the base object. This file is responsible for
 *   watching the config file for changes and updating the base object
 *   accordingly.
 */
import fs from "fs";
import path from "path";
import { app, shell } from "electron";
import { logger } from "../lib/helpers.js";
import { reverseObject } from "../lib/helpers.js";
import base from "../lib/base.js";
import defaultConfig from "./config.default.js";

export const configPath = path.join(app.getPath("userData"), "config.json");

/**
 * Loads the configuration file and returns the configuration object.
 *
 * @param {Object} options - Optional object containing configuration options.
 * @param {boolean} options.skipBaseSet - If true, skip setting the configuration in the base object.
 * @returns {Object} The loaded configuration object.
 */
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

/**
 * Stops the configuration file watcher.
 *
 * @return {undefined} - No return value.
 */
export const stopConfigFileWatcher = () => {
  if (typeof configFileWatcher.close === "function") configFileWatcher.close();
};

/**
 * Opens the configuration file if it exists, otherwise creates a new one and opens it.
 *
 * @return {undefined} - No return value.
 */
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
