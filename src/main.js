import { app } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { gracefulExit } from "exit-hook";
import path from "path";
import robot from "@jitsi/robotjs";
import base from "./lib/base.js";
import config from "./config/config.js";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  registerActivationListener,
  unregisterAllGlobalShortcuts,
  uIOhookStart,
  uIOhookStop,
  createTray,
} from "./lib/actions.js";
import { reverseObject, logger, __dirname } from "./lib/helpers.js";
import { mouseMovementHandler } from "./lib/mouseActions.js";
import applyFixes from "./lib/fixes.js";

applyFixes();

const keyMap = reverseObject(UiohookKey);

let appActive = false;

const onActive = () => {
  logger.info("Activating app...");

  uIOhookStart(uIOhook);

  if (base.get("tray"))
    base.get("tray").setImage(path.join(__dirname, "./assets/logo-active.png"));

  // Register mode toggling hotkeys
  Object.keys(config.keyboardListenerHotkeys).forEach((key) => {
    if (key === "toggleActivation") return;
    const hotKeyAccelerator = config.keyboardListenerHotkeys[key];
    registerGlobalShortcut(hotKeyAccelerator, () => {
      // key = activateMode1, activateMode2, etc.
      base.set("currentMode", Number(key.replace("activateMode", "")));
    });
  });

  // Register all other global shortcuts when app is active
  Object.keys(config.bindings).forEach((key) => {
    registerGlobalShortcut(config.bindings[key], () => {});
  });

  base.subscribe(({ key: givenKey }) => {
    if (appActive && givenKey.includes("keyStates")) {
      const currentKey = givenKey.split(".")[1];
      // const currentKeyName = config.reverseBindings[currentKey];
      const keyStates = base.get("keyStates");
      const keys = Object.keys(keyStates);
      // const allKeyStatesAreFalse = keys.every((key) => !keyStates[key]);
      // if (allKeyStatesAreFalse) return;

      let dx = 0;
      let dy = 0;
      let scrollDx = 0;
      let scrollDy = 0;
      let scrollIsActive = false;
      let brakeIsActive = false;
      if (keyStates[config.bindings["scroll"]]) scrollIsActive = true;
      if (keyStates[config.bindings["brake"]]) brakeIsActive = true;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const keyName = config.reverseBindings[key];
        const keyIsActive = keyStates[key];
        switch (keyName) {
          case "up":
            if (keyIsActive && !scrollIsActive) dy += -1;
            else if (keyIsActive && scrollIsActive) scrollDy += 1;
            break;
          case "down":
            if (keyIsActive && !scrollIsActive) dy += 1;
            else if (keyIsActive && scrollIsActive) scrollDy += -1;
            break;
          case "left":
            if (keyIsActive && !scrollIsActive) dx += -1;
            else if (keyIsActive && scrollIsActive) scrollDx += 1;
            break;
          case "right":
            if (keyIsActive && !scrollIsActive) dx += 1;
            else if (keyIsActive && scrollIsActive) scrollDx += -1;
            break;
          case "mb1":
            if (keyIsActive) robot.mouseToggle("down", "left");
            else if (!keyIsActive) robot.mouseToggle("up", "left");
            break;
          case "mb2":
            if (keyIsActive) robot.mouseToggle("down", "right");
            else if (!keyIsActive) robot.mouseToggle("up", "right");
            break;
          case "mb3":
            if (keyIsActive) robot.mouseToggle("down", "middle");
            else if (!keyIsActive) robot.mouseToggle("up", "middle");
            break;
          case "brake":
            break;
          case "scroll":
            break;
          default:
            break;
        }
      }
      mouseMovementHandler({
        dx,
        dy,
        brakeIsActive,
        scrollIsActive,
        scrollDx,
        scrollDy,
      });
    }
  });
};

const onInactive = () => {
  logger.info("Inactivating app...");

  if (base.get("tray"))
    base.get("tray").setImage(path.join(__dirname, "./assets/logo.png"));

  uIOhookStop(uIOhook);

  // Unregister mode toggling hotkeys
  Object.keys(config.keyboardListenerHotkeys).forEach((key) => {
    if (key === "toggleActivation") return;
    const hotKeyAccelerator = config.keyboardListenerHotkeys[key];
    unregisterGlobalShortcut(hotKeyAccelerator);
  });

  // Unregister all other global shortcuts when app is inactive
  Object.keys(config.bindings).forEach((key) => {
    unregisterGlobalShortcut(config.bindings[key]);
  });

  base.unsubscribeAllButActivationListener();
};

app.whenReady().then(() => {
  registerActivationListener();
  createTray();

  base.onChange("isKeyboardListenerActive", () => {
    logger.info("Detected change in isKeyboardListenerActive...");
    appActive = !appActive;
    if (appActive) onActive();
    else onInactive();
  });

  uIOhook.on("keydown", (e) => {
    const key = keyMap[String(e.keycode)];
    if (appActive && Object.keys(config.reverseBindings).includes(key)) {
      if (!key) logger.warn(`Unknown key ${e?.keycode}`);
      // if (key && !base.get(`keyStates.${key}`))
      if (key) base.set(`keyStates.${key}`, true);
    }
  });

  uIOhook.on("keyup", (e) => {
    const key = keyMap[String(e.keycode)];
    if (appActive && Object.keys(config.reverseBindings).includes(key)) {
      if (!key) logger.warn(`Unknown key ${e?.keycode}`);
      // if (key && base.get(`keyStates.${key}`))
      if (key) base.set(`keyStates.${key}`, false);
    }
  });

  app.on("before-quit", () => {
    base.set("isKeyboardListenerActive", false);
    base.unsubscribeAll();
    unregisterAllGlobalShortcuts();
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
    process.on(eventType, () => app.quit());
  });
});
