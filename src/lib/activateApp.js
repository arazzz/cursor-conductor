import path from "path";
import { uIOhook } from "uiohook-napi";
import { registerGlobalShortcut, uIOhookStart } from "./actions.js";
import { __dirname, logger } from "./helpers.js";
import { mouseMovementHandler, mouseToggle } from "./mouseActions.js";
import base from "./base.js";

export const activateApp = ({ config = {} }) => {
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

  base.subscribe(({ key: updatedBaseKey }) => {
    if (base.get("isAppActive") && updatedBaseKey.includes("keyStates")) {
      // const currentKey = updatedBaseKey.split(".")[1];
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
            if (keyIsActive) mouseToggle("down", "left");
            else if (!keyIsActive) mouseToggle("up", "left");
            break;
          case "mb2":
            if (keyIsActive) mouseToggle("down", "right");
            else if (!keyIsActive) mouseToggle("up", "right");
            break;
          case "mb3":
            if (keyIsActive) mouseToggle("down", "middle");
            else if (!keyIsActive) mouseToggle("up", "middle");
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
        config,
      });
    }
  });
};

export default activateApp;
