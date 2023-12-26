import { app, Menu, nativeImage, Tray } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { gracefulExit } from "exit-hook";
import path from "path";
import url from "url";
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
import applyFixes from "./fixes.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
applyFixes();

const keyMap = reverseObject(UiohookKey);

let tray = null;
let appActive = false;

robot.setMouseDelay(0);
robot.setKeyboardDelay(0);

let velocityX = 0;
let velocityY = 0;
const friction = 0.9; // You can adjust this value for different inertia effects
const acceleration = 1; // You can adjust this value for different acceleration effects
const decay = 0.99; // You can adjust this value for different decay effects

const relMoveMouse = ({ dx = 0, dy = 0, brakeIsActive = false }) => {
  const frictionApplied = brakeIsActive ? 0.8 : friction;

  const relMoveMouseInterval = setInterval(() => {
    const { x: x0, y: y0 } = robot.getMousePos();

    // Apply inertia
    velocityX *= frictionApplied;
    velocityY *= frictionApplied;

    // Apply exponential decay
    velocityX *= decay;
    velocityY *= decay;

    const x1 = Math.round(x0 + velocityX);
    const y1 = Math.round(y0 + velocityY);

    robot.moveMouse(x1, y1);

    // Reset velocity
    if (Math.abs(velocityX) < 1) velocityX = 0;
    if (Math.abs(velocityY) < 1) velocityY = 0;

    if (velocityX === 0 && velocityY === 0) {
      clearInterval(relMoveMouseInterval);
    }
  }, 1000 / 60); // Run the function 60 times per second

  // Apply acceleration
  velocityX += dx * acceleration;
  velocityY += dy * acceleration;

  return () => clearInterval(relMoveMouseInterval);
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
      // const currentKeyName = config.reverseBindings[currentKey];
      const keyStates = base.get("keyStates");
      const keys = Object.keys(keyStates);
      // const allKeyStatesAreFalse = keys.every((key) => !keyStates[key]);
      // if (allKeyStatesAreFalse) return;

      let dx = 0;
      let dy = 0;
      let sensitivity = config.sensitivity;
      let scrollSensitivity = config.scrollSensitivity;
      let scrollIsActive = false;
      let brakeIsActive = false;
      if (keyStates[config.bindings["scroll"]]) scrollIsActive = true;
      if (keyStates[config.bindings["brake"]]) {
        brakeIsActive = true;
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
            if (keyIsActive && !scrollIsActive) dy += -1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(0, 1 * scrollSensitivity);
            break;
          case "down":
            if (keyIsActive && !scrollIsActive) dy += 1 * sensitivity;
            else if (keyIsActive && scrollIsActive)
              robot.scrollMouse(0, -1 * scrollSensitivity);
            break;
          case "left":
            if (keyIsActive && !scrollIsActive) dx += -1 * sensitivity;
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
      if (dx || dy) relMoveMouse({ dx, dy, brakeIsActive });
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

  if (!tray) {
    const iconPath = path.join(__dirname, "./assets/logo.png");
    tray = new Tray(
      nativeImage.createFromPath(iconPath).resize({ width: 256 })
    );
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Config",
        click: () => {
          // shell.openPath("/path/to/config/file");
        },
      },
    ]);
    tray.setToolTip("Cursor Conductor");
    tray.setContextMenu(contextMenu);
  }

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
