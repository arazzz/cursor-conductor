import path from "path";
import { uIOhook } from "uiohook-napi";
import { unregisterGlobalShortcut, uIOhookStop } from "./actions.js";
import { __dirname, logger } from "./helpers.js";
import base from "./base.js";

export const inactivateApp = ({ config = {} }) => {
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

export default inactivateApp;
