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
} from "./lib/actions.js";
import { logger, __dirname } from "./lib/helpers.js";
import { loadConfig, stopConfigFileWatcher } from "./config/config.js";

loadConfig();
applyFixes();

app.whenReady().then(() => {
  registerActivationListener();
  createTray();

  base.onChange("isKeyboardListenerActive", () => {
    try {
      logger.info("Detected change in isKeyboardListenerActive...");
      const config = base.get("config");
      base.set("isAppActive", !base.get("isAppActive"));
      if (base.get("isAppActive")) activateApp({ config });
      else inactivateApp({ config });
    } catch (err) {
      logger.error(err);
      throw err;
    }
  });

  uIOhook.on("keydown", (e) => {
    const keyMap = base.get("keyMap");
    const config = base.get("config");
    const isAppActive = base.get("isAppActive");
    const key = keyMap[String(e.keycode)];
    if (isAppActive && Object.keys(config.reverseBindings).includes(key)) {
      if (!key) logger.warn(`Unknown key ${e?.keycode}`);
      // if (key && !base.get(`keyStates.${key}`))
      if (key) base.set(`keyStates.${key}`, true);
    }
  });

  uIOhook.on("keyup", (e) => {
    const keyMap = base.get("keyMap");
    const config = base.get("config");
    const isAppActive = base.get("isAppActive");
    const key = keyMap[String(e.keycode)];
    if (isAppActive && Object.keys(config.reverseBindings).includes(key)) {
      if (!key) logger.warn(`Unknown key ${e?.keycode}`);
      // if (key && base.get(`keyStates.${key}`))
      if (key) base.set(`keyStates.${key}`, false);
    }
  });

  app.on("before-quit", () => {
    base.set("isKeyboardListenerActive", false);
    base.unsubscribeAll();
    unregisterAllGlobalShortcuts();
    stopConfigFileWatcher();
    logger.info("Quitting app...");
    gracefulExit();
  });

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
      logger.warn(`Process ${eventType} received...`);
      app.quit();
    });
  });
});
