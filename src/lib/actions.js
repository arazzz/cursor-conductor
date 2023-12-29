import { Menu, Tray, globalShortcut, nativeImage } from "electron";
import assert from "assert";
import path from "path";
import base from "./base.js";
import { openConfig } from "../config/config.js";
import { __dirname } from "./helpers.js";

export const registerActivationListener = () => {
  const config = base.get("config");
  const mainKeyboardListenerHotkey =
    config?.keyboardListenerHotkeys?.toggleActivation || "Alt+`";
  const ret = globalShortcut.register(mainKeyboardListenerHotkey, () =>
    base.set("isKeyboardListenerActive", !base.get("isKeyboardListenerActive"))
  );
  assert(ret, "registration failed");
  assert(
    globalShortcut.isRegistered(mainKeyboardListenerHotkey),
    "registration failed"
  );
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

export const unregisterAllGlobalShortcuts = () =>
  globalShortcut.unregisterAll();

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

export const createTray = () => {
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
