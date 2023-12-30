/**
 * @file /src/lib/activateApp.js
 *  - Activates the app by registering global shortcuts and starting the uIOhook instance.
 */
import path from "path";
import { uIOhook } from "uiohook-napi";
import { registerGlobalShortcut, uIOhookStart } from "./actions.js";
import { __dirname, logger } from "./helpers.js";
import { mouseMovementHandler, mouseToggle } from "./mouseActions.js";
import base from "./base.js";

/**
 * Activates the app.
 *
 * @param {object} config - The configuration object for the app.
 * @param {string} config.keyboardListenerHotkeys - The hotkeys for toggling modes.
 * @param {string} config.bindings - The global shortcuts for the app.
 * @param {string} config.reverseBindings - The reverse bindings for the app.
 * @param {boolean} config.bindings.scroll - The scroll binding for the app.
 * @param {boolean} config.bindings.brake - The brake binding for the app.
 * @return {void} This function does not return any value.
 */
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
      const currentKey = updatedBaseKey.split(".")[1];
      const currentKeyName = config.reverseBindings[currentKey];
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
        const isCurrentKey = currentKeyName === keyName;
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
            if (isCurrentKey) {
              if (keyIsActive) mouseToggle(key, "down", "left");
              else if (!keyIsActive) mouseToggle(key, "up", "left");
            }
            break;
          case "mb2":
            if (isCurrentKey) {
              if (keyIsActive) mouseToggle(key, "down", "right");
              else if (!keyIsActive) mouseToggle(key, "up", "right");
            }
            break;
          case "mb3":
            if (isCurrentKey) {
              if (keyIsActive) mouseToggle(key, "down", "middle");
              else if (!keyIsActive) mouseToggle(key, "up", "middle");
            }
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
