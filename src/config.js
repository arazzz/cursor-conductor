import { reverseObject } from "./helpers.js";

export const config = {
  sensitivity: 5,
  scrollSensitivity: 2,
  brakingFactor: 0.5,
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
