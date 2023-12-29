import { app, Menu, nativeImage, Tray } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import { gracefulExit } from "exit-hook";
import path from "path";
import url from "url";
import robot from "@jitsi/robotjs";
import base from "./lib/base.js";
import { config, openConfig } from "./config/config.js";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  registerActivationListener,
  unregisterAllGlobalShortcuts,
  uIOhookStart,
  uIOhookStop,
} from "./lib/actions.js";
import { reverseObject, logger } from "./lib/helpers.js";
import applyFixes from "./lib/fixes.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
applyFixes();

const keyMap = reverseObject(UiohookKey);

let appActive = false;

robot.setMouseDelay(0);
robot.setKeyboardDelay(0);

let velocityX = 0;
let velocityY = 0;

const relMoveMouseWithInertia = ({
  dx = 0,
  dy = 0,
  brakeIsActive = false,
  config: givenConfig = {},
}) => {
  const friction = givenConfig.friction || 0.9;
  const acceleration = givenConfig.acceleration || 1;
  const decay = givenConfig.decay || 0.99;

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

const relMoveMouse = ({ dx = 0, dy = 0 }) => {
  const { x: x0, y: y0 } = robot.getMousePos();
  const x1 = Math.round(x0 + dx);
  const y1 = Math.round(y0 + dy);
  robot.moveMouse(x1, y1);
};

const mouseMovementHandler = ({
  dx = 0,
  dy = 0,
  brakeIsActive = false,
  scrollIsActive = false,
  scrollDx = 0,
  scrollDy = 0,
}) => {
  try {
    const currentMode = base.get("currentMode");
    let sensitivity = config.modes[currentMode].sensitivity;
    let scrollSensitivity = config.modes[currentMode].scrollSensitivity;
    if (brakeIsActive) {
      sensitivity =
        config.modes[currentMode].sensitivity *
        config.modes[currentMode].brakingFactor;
      scrollSensitivity =
        config.modes[currentMode].scrollSensitivity *
        config.modes[currentMode].scrollBrakingFactor;
    }
    if (scrollIsActive) {
      scrollDx *= scrollSensitivity;
      scrollDy *= scrollSensitivity;
      robot.scrollMouse(scrollDx, scrollDy);
    } else if (dx || dy) {
      dx *= sensitivity;
      dy *= sensitivity;
      if (currentMode === 1) {
        relMoveMouse({ dx, dy });
      } else if (currentMode === 2) {
        relMoveMouseWithInertia({
          dx,
          dy,
          brakeIsActive,
          config: config.modes[currentMode],
        });
      }
    }
  } catch (err) {
    logger.error(
      `Failed to move mouse: ${err.message} \n ${err.stack || err.toString()}`
    );
    throw err;
  }
};

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

const createTray = () => {
  if (!base.get("tray")) {
    let tray = null;
    const iconPath = path.join(__dirname, "./assets/logo.png");
    tray = new Tray(
      nativeImage.createFromPath(iconPath).resize({ width: 256 })
    );
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Config",
        click: () => openConfig(),
      },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);
    tray.setToolTip("Cursor Conductor");
    tray.setContextMenu(contextMenu);
    base.set("tray", tray);
  }
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
