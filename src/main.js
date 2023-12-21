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

const relMoveMose = ({ dx: _dx = 0, dy: _dy = 0 }) => {
  const { x, y } = robot.getMousePos();
  logger.info(base.get("keyStates"));

  const lastTime = base.get("lastTime") ?? Date.now();
  base.set("lastTime", Date.now());
  let dt = Date.now() - lastTime + 0.0001;
  let ds = !base.get("keyStates.scroll") ? base.get("ds") : config.dm;
  let mu = base.get("keyStates.brake") ? config.get("br") : base.get("mu");
  let f0 = mu == 1 ? 0 : Math.exp(-mu * dt);
  let f1 = mu == 0 ? dt : (1 - f0) / mu;
  let f2 = mu == 0 ? dt ** 2 : (dt - f1) / mu;
  let ax =
    (base.get("keyStates.left") ? -1 : 0) +
    (base.get("keyStates.right") ? 1 : 0);
  let ay =
    (base.get("keyStates.up") ? -1 : 0) + (base.get("keyStates.down") ? 1 : 0);
  let a0 =
    ax ** 2 + ay ** 2 > 0 ? base.get("a0") / Math.sqrt(ax ** 2 + ay ** 2) : 0;
  let dx = f2 * a0 * ax + f1 * base.get("vx");
  let dy = f2 * a0 * ay + f1 * base.get("vy");
  let vx = f1 * a0 * ax + f0 * base.get("vx");
  let vy = f1 * a0 * ay + f0 * base.get("vy");
  dx = dx * ds + base.get("rx");
  dy = dy * ds + base.get("ry");
  if (a0 == 0 && 1 / ds > vx ** 2 + vy ** 2) {
    vx = 0;
    vy = 0;
  } else {
    vx = vx;
    vy = vy;
  }
  base.set("rx", dx - _.round(dx));
  base.set("ry", dy - _.round(dy));
  base.set("vx", vx);
  base.set("vy", vy);
  base.set("ds", ds);
  base.set("a0", a0);
  base.set("mu", mu);
  base.set("vx", vx);
  base.set("vy", vy);

  logger.box({
    dt,
    ds,
    mu,
    a0,
    vx,
    vy,
    ax,
    ay,
    dx,
    dy,
    x,
    y,
    lastTime,
    f0,
    f1,
    f2,
  });

  const new_x = _.round(x + dx);
  const new_y = _.round(y + dy);
  robot.moveMouse(new_x, new_y);
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
