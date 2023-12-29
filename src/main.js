/**
 * @file /src/main.js
 *  - Main entry point for the app. This file is responsible for setting up
 *    the app, registering global shortcuts, and handling app lifecycle events.
 */
import { app } from "electron";
import { uIOhook } from "uiohook-napi";
import { gracefulExit } from "exit-hook";
import base from "./lib/base.js";
import activateApp from "./lib/activateApp.js";
import inactivateApp from "./lib/inactivateApp.js";
import applyFixes from "./lib/fixes.js";
import {
  registerActivationListener,
  unregisterAllGlobalShortcuts,
  createTray,
  updateKeyPressedState,
} from "./lib/actions.js";
import { logger, __dirname } from "./lib/helpers.js";
import { loadConfig, stopConfigFileWatcher } from "./config/config.js";

loadConfig(); // Load config file and set it in the base object
applyFixes(); // Apply any fixes needed for the current OS, config, etc.

// Main
app.whenReady().then(() => {
  registerActivationListener(); // Register activation listener
  createTray(); // Create system tray icon

  // Register listener for changes in the isKeyboardListenerActive property
  base.onChange("isKeyboardListenerActive", () => {
    try {
      logger.info("Detected change in isKeyboardListenerActive...");
      const config = base.get("config");
      base.set("isAppActive", !base.get("isAppActive")); // Toggle app state
      if (base.get("isAppActive")) activateApp({ config });
      else inactivateApp({ config });
    } catch (err) {
      logger.error(err);
      throw err;
    }
  });

  // Listen for key press events
  uIOhook.on("keydown", (e) => updateKeyPressedState(e, true));
  uIOhook.on("keyup", (e) => updateKeyPressedState(e, false));

  // Set up exit handler
  app.on("before-quit", () => {
    base.set("isKeyboardListenerActive", false);
    base.unsubscribeAll();
    unregisterAllGlobalShortcuts();
    stopConfigFileWatcher();
    logger.info("Quitting app...");
    gracefulExit();
  });

  // Handle process exit events
  [
    `exit`,
    `SIGINT`,
    `SIGUSR1`,
    `SIGUSR2`,
    `uncaughtException`,
    `SIGTERM`,
    `SIGABRT`,
  ].forEach((eventType) => {
    process.on(eventType, () => {
      // logger.warn(`Process ${eventType} received...`);
      app.quit();
    });
  });
});
