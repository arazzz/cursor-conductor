import { app } from "electron";
import { uIOhook, UiohookKey } from "uiohook-napi";
import robot from "@jitsi/robotjs";
import consola from "consola";
import base from "./base.js";
import config from "./config.js";
import {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  registerKeyboardListener,
  unregisterAllGlobalShortcuts,
} from "./actions.js";
import { reverseObject } from "./helpers.js";

const logger = consola.withTag("main");
const keyMap = reverseObject(UiohookKey);

let appActive = false;

const updateMousePosition = ({ dx = 0, dy = 0 }) => {
  const { x, y } = robot.getMousePos();
  robot.moveMouse(x + dx, y + dy);
};

const onActive = () => {
  logger.info("App is active");
  // Turn all bindings into registered global shortcuts when app is active; otherwise unregister them to prevent conflict
  Object.keys(config.bindings).forEach((key) => {
    registerGlobalShortcut(config.bindings[key], () => {});
  });

  uIOhook.start();

  base.subscribe(({ key: givenKey, value, changed }) => {
    if (appActive && givenKey.includes("keyStates")) {
      const keyStates = base.get("keyStates");
      logger.box(keyStates);
      // logger.info(`key: ${givenKey}, value: ${value}, changed: ${changed}`);
      // const key = givenKey.replace("keyStates.", "");
      // const keyIsActive = value;
      // const configKey = config.reverseBindings[key];
      // let dx = 0;
      // let dy = 0;
      // switch (configKey) {
      //   case "up":
      //     if (keyIsActive) dy += -1;
      //     break;
      //   case "down":
      //     if (keyIsActive) dy += 1;
      //     break;
      //   case "left":
      //     if (keyIsActive) dx += -1;
      //     break;
      //   case "right":
      //     if (keyIsActive) dx += 1;
      //     break;
      //   case "mb1":
      //     if (keyIsActive) robot.mouseToggle("down", "left");
      //     break;
      //   case "mb2":
      //     if (keyIsActive) robot.mouseToggle("down", "right");
      //     break;
      //   case "mb3":
      //     if (keyIsActive) robot.mouseToggle("down", "middle");
      //     break;
      //   case "brake":
      //     break;
      //   case "scroll":
      //     break;
      //   default:
      //     logger.warn(`Unknown key ${configKey}`);
      //     break;
      // }
      // if (dx || dy) updateMousePosition({ dx, dy });
    }
  });
};

const onInactive = () => {
  logger.info("App is inactive");
  // Unregister all global shortcuts when app is inactive
  Object.keys(config.bindings).forEach((key) => {
    unregisterGlobalShortcut(config.bindings[key]);
  });

  uIOhook.stop();
};

app.whenReady().then(() => {
  registerKeyboardListener();
  base.onChange("isKeyboardListenerActive", () => {
    appActive = !appActive;
    if (appActive) onActive();
    else onInactive();
  });
});

app.on("will-quit", () => unregisterAllGlobalShortcuts());

uIOhook.on("keydown", (e) => {
  const key = keyMap[String(e.keycode)];
  if (appActive && Object.keys(config.reverseBindings).includes(key)) {
    if (!key) logger.warn(`Unknown key ${e?.keycode}`);
    if (key) base.set(`keyStates.${key}`, true);
  }
});

uIOhook.on("keyup", (e) => {
  const key = keyMap[String(e.keycode)];
  if (appActive && Object.keys(config.reverseBindings).includes(key)) {
    if (!key) logger.warn(`Unknown key ${e?.keycode}`);
    if (key) base.set(`keyStates.${key}`, false);
  }
});
