import { app } from "electron";
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

const logger = consola.withTag("main");
let appActive = false;

const updateMousePosition = ({ dx = 0, dy = 0 }) => {
  const { x, y } = robot.getMousePos();
  robot.moveMouse(x + dx, y + dy);
};

const onActive = () => {
  logger.info("App is active");
  // Turn all bindings into registered global shortcuts when app is active; otherwise unregister them to prevent conflict
  Object.keys(config.bindings).forEach((key) => {
    switch (key) {
      case "up":
        registerGlobalShortcut(config.bindings[key], () => {
          updateMousePosition({ dy: -1 });
        });
        break;
      case "down":
        registerGlobalShortcut(config.bindings[key], () => {
          updateMousePosition({ dy: 1 });
        });
        break;
      case "left":
        registerGlobalShortcut(config.bindings[key], () => {
          updateMousePosition({ dx: -1 });
        });
        break;
      case "right":
        // robot.keyTap("right");
        registerGlobalShortcut(config.bindings[key], () => {
          updateMousePosition({ dx: 1 });
        });
        break;
      case "mb1":
        registerGlobalShortcut(config.bindings[key], () => {
          robot.mouseClick("left");
        });
        break;
      case "mb2":
        registerGlobalShortcut(config.bindings[key], () => {
          robot.mouseClick("right");
        });
        break;
      case "mb3":
        registerGlobalShortcut(config.bindings[key], () => {
          robot.mouseClick("middle");
        });
        break;
      case "brake":
        registerGlobalShortcut(config.bindings[key], () => {});
        break;
      case "scroll":
        registerGlobalShortcut(config.bindings[key], () => {});
        break;
      default:
        logger.warn(`Unknown key ${key}`);
        break;
    }
  });
};

const onInactive = () => {
  logger.info("App is inactive");
  // Unregister all global shortcuts when app is inactive
  Object.keys(config.bindings).forEach((key) => {
    unregisterGlobalShortcut(config.bindings[key]);
  });
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
