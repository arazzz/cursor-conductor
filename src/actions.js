import { globalShortcut } from "electron";
import base from "./base.js";
import assert from "assert";
import config from "./config.js";
import { colors, logger } from "./helpers.js";

// const mainKeyboardListenerHotkey = config.keyboardListenerHotkeys[0];

// export const registerKeyboardListener = () => {
//   const ret = globalShortcut.register(mainKeyboardListenerHotkey, () =>
//     base.set("isKeyboardListenerActive", !base.get("isKeyboardListenerActive"))
//   );
//   assert(ret, "registration failed");
//   assert(
//     globalShortcut.isRegistered(mainKeyboardListenerHotkey),
//     "registration failed"
//   );
// };

export const registerKeyboardListener = () => {
  const registerKeyboardListenerInner = (callback = () => {}) => {
    const ret = globalShortcut.register(hotkey, callback);
    assert(ret, "registration failed");
    assert(globalShortcut.isRegistered(hotkey), "registration failed");
  };

  Object.keys(config.keyboardListenerHotkeys).forEach((hotkeyFunc) => {
    const hotkey = config.keyboardListenerHotkeys[hotkeyFunc];
    switch (hotkeyFunc) {
      case "toggleActivation":
        registerKeyboardListenerInner(() => {
          base.set(
            "isKeyboardListenerActive",
            !base.get("isKeyboardListenerActive")
          );
        });
        break;
      case "activateMode1":
        registerKeyboardListenerInner(() => {
          base.set("currentMode", 1);
        });
        break;
      case "activateMode2":
        registerKeyboardListenerInner(() => {
          base.set("currentMode", 2);
        });
        break;
      default:
        break;
    }
  });
};

export const registerGlobalShortcut = (key, callback) => {
  base.set(`globalShortcuts.${key}`, {
    key,
    callback,
    ret: null,
    register: () => {
      // logger.info(`Registering global shortcut: ${key}`);
      base.set(`keyStates.${key}`, false);
      const ret = globalShortcut.register(key, callback);
      base.set(`globalShortcuts.${key}.ret`, ret);
      assert(ret, "registration failed");
      assert(globalShortcut.isRegistered(key), "registration failed");
    },
    unregister: () => {
      // logger.info(`Unregistering global shortcut: ${key}`);
      base.set(`keyStates.${key}`, false);
      const ret = globalShortcut.unregister(key);
      base.set(`globalShortcuts.${key}.ret`, ret);
      assert(!globalShortcut.isRegistered(key), "unregistration failed");
    },
    isRegistered: () => globalShortcut.isRegistered(key),
  });
  base.get(`globalShortcuts.${key}`).register();
};

export const unregisterGlobalShortcut = (key) =>
  base.get(`globalShortcuts.${key}`).unregister();

export const unregisterAllGlobalShortcuts = () => {
  logger.log(colors.red("Unregistering all global shortcuts..."));
  globalShortcut.unregisterAll();
};

export const uIOhookStop = (uIOhook) => {
  if (!base.get("isUIOhookRunning")) return;
  uIOhook.stop();
  base.set("isUIOhookRunning", false);
};

export const uIOhookStart = (uIOhook) => {
  if (base.get("isUIOhookRunning")) return;
  uIOhook.start();
  base.set("isUIOhookRunning", true);
};
