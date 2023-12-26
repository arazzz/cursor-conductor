import { reverseObject } from "./helpers.js";

export const config = {
  sensitivity: 20,
  brakingFactor: 0.2,
  scrollSensitivity: 2,
  scrollBrakingFactor: 0.5,
  keyboardListenerHotkeys: {
    toggleActivation: "Alt+`",
    activateMode1: "Alt+`+1",
    activateMode2: "Alt+`+2",
  },
  bindings: {
    up: "I",
    down: "K",
    left: "J",
    right: "L",
    mb1: "F",
    mb2: "E",
    mb3: "R",
    brake: "S",
    scroll: "Space",
  },
};

config.reverseBindings = reverseObject(config.bindings);

export default config;
