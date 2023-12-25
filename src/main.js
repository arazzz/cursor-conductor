import { app } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { gracefulExit } from "exit-hook";
import robot from "@jitsi/robotjs";
import base from "./base.js";
import config from "./config.js";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  registerKeyboardListener,
  unregisterAllGlobalShortcuts,
  uIOhookStart,
  uIOhookStop,
} from "./actions.js";
import { reverseObject, logger } from "./helpers.js";

const keyMap = reverseObject(UiohookKey);

let appActive = false;

robot.setMouseDelay(0);
robot.setKeyboardDelay(0);

const relMoveMose = ({ dx = 0, dy = 0 }) => {
  const { x: x0, y: y0 } = robot.getMousePos();
  const x1 = Math.round(x0 + dx);
  const y1 = Math.round(y0 + dy);
  // logger.info(`Moving mouse: ${x0} ${y0} -> ${x1} ${y1}`);
  robot.moveMouse(x1, y1);
};

const onActive = () => {
  logger.info("Activating app...");

  uIOhookStart(uIOhook);

  Object.keys(config.bindings).forEach((key) => {
    registerGlobalShortcut(config.bindings[key], () => {});
  });

  base.subscribe(({ key: givenKey, value, changed }) => {
    if (appActive && givenKey.includes("keyStates")) {
      const currentKey = givenKey.split(".")[1];
      const currentKeyName = config.reverseBindings[currentKey];
      const keyStates = base.get("keyStates");
      const keys = Object.keys(keyStates);
      // const allKeyStatesAreFalse = keys.every((key) => !keyStates[key]);
      // if (allKeyStatesAreFalse) return;

      let dx = 0;
      let dy = 0;
      let sensitivity = config.sensitivity;
      let scrollSensitivity = config.scrollSensitivity;
      let scrollIsActive = false;
      if (keyStates[config.bindings["scroll"]]) scrollIsActive = true;
      if (keyStates[config.bindings["brake"]]) {
        sensitivity = config.sensitivity * config.brakingFactor;
        scrollSensitivity =
          config.scrollSensitivity * config.scrollBrakingFactor;
      }

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const keyName = config.reverseBindings[key];
        const keyIsActive = keyStates[key];
        switch (keyName) {
          case "up":
            if (keyIsActive && !scrollIsActive) dy -= 1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(0, 1 * scrollSensitivity);
            break;
          case "down":
            if (keyIsActive && !scrollIsActive) dy += 1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(0, -1 * scrollSensitivity);
            break;
          case "left":
            if (keyIsActive && !scrollIsActive) dx -= 1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(1 * scrollSensitivity, 0);
            break;
          case "right":
            if (keyIsActive && !scrollIsActive) dx += 1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(-1 * scrollSensitivity, 0);
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
      // logger.info(`dx: ${dx}, dy: ${dy}`);
      if (dx || dy) relMoveMose({ dx, dy });
    }
  });
};

const onInactive = () => {
  logger.info("Inactivating app...");

  uIOhookStop(uIOhook);

  // Unregister all global shortcuts when app is inactive
  Object.keys(config.bindings).forEach((key) => {
    unregisterGlobalShortcut(config.bindings[key]);
  });

  base.unsubscribeAllButFirst();
};

app.whenReady().then(() => {
  registerKeyboardListener();

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
    unregisterAllGlobalShortcuts(uIOhook);
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
