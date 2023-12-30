/**
 * @file /src/config/config.js
 * - Contains functions for loading the configuration file and
 *   setting it in the base object. This file is responsible for
 *   watching the config file for changes and updating the base object
 *   accordingly.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { app, shell } from "electron";
import { logger } from "../lib/helpers.js";
import { reverseObject } from "../lib/helpers.js";
import base from "../lib/base.js";
import defaultConfig from "./config.default.js";

export const configPath = path.join(app.getPath("userData"), "config.json");

export const configParsers = {
  /**
   * Retrieves the configuration value based on the current operating system.
   *
   * @param {Object} configSubObj - The configuration sub-object.
   * @return {*} - The configuration value based on the current operating system.
   */
  perOS: (configSubObj) =>
    configSubObj[os.type().toLowerCase()] ?? configSubObj.default ?? null,
};

/**
 * Parse the given config object recursively and return the parsed config.
 *
 * @param {object} config - The config object to be parsed.
 * @return {object} The parsed config object with all sub-objects parsed according to the configParsers object.
 * @throws {Error} If an error occurs while parsing the config object.
 */
export const parseConfig = (config) => {
  try {
    const parsedConfig = {};
    Object.keys(config).forEach((key) => {
      if (typeof config[key] === "object") {
        // Parse the config values
        // Loop through the parsers and parse the sub-objects if necessary
        Object.keys(configParsers).forEach((parser) => {
          if (typeof config[key][parser] === "object")
            config[key] = configParsers[parser](config[key][parser]);
        });
        if (typeof config[key] === "object")
          parsedConfig[key] = parseConfig(config[key]);
        else parsedConfig[key] = config[key];
      } else {
        parsedConfig[key] = config[key];
      }
    });
    return parsedConfig;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

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
  const parsedConfigObj = parseConfig(configObj);
  const config = {
    ...parsedConfigObj,
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
  configParsers,
  parseConfig,
  configPath,
  loadConfig,
  openConfig,
  stopConfigFileWatcher,
};
