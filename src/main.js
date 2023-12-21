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
import _ from "lodash";

const keyMap = reverseObject(UiohookKey);

let appActive = false;

robot.setMouseDelay(0);
robot.setKeyboardDelay(0);

const relMoveMose = ({ dx = 0, dy = 0 }) => {
  const { x, y } = robot.getMousePos();
  const dt =
    base.get("mouseStates.dt") ??
    Date.now() - base.get("mouseStates.time") ??
    0.00001;
  let vx = dx * config.acceleration;
  let vy = dy * config.acceleration;
  vx *= config.inertia;
  vy *= config.inertia;

  vy = vy > 0 ? Math.min(vy, config.maxSpeed) : Math.max(vy, -config.maxSpeed);
  vx = vx > 0 ? Math.min(vx, config.maxSpeed) : Math.max(vx, -config.maxSpeed);

  let pos_x = vx * dt + x;
  let pos_y = vy * dt + y;
  pos_x = Math.round(pos_x);
  pos_y = Math.round(pos_y);

  logger.box({
    x,
    y,
    dt,
    vx,
    vy,
    pos_x,
    pos_y,
  });

  robot.moveMouse(pos_x, pos_y);
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
        scrollSensitivity = config.scrollSensitivity * config.brakingFactor;
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
        if (dx || dy) relMoveMose({ dx, dy });
      }
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

  uIOhook.on("mousemove", (e) => {
    if (appActive) {
      const x = base.get("mouseStates.x") ?? e.x;
      const y = base.get("mouseStates.y") ?? e.y;
      const dx = e.x - x ?? base.get("mouseStates.dx") ?? 0;
      const dy = e.y - y ?? base.get("mouseStates.dy") ?? 0;
      const dt = e.time - base.get("mouseStates.time") ?? 0;
      base.set("mouseStates", {
        ...e,
        dx,
        dy,
        dt,
      });
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
