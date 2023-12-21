import { reverseObject } from "./helpers.js";

export const config = {
  sensitivity: 2,
  scrollSensitivity: 2,
  brakingFactor: 0.5,
  inertia: 0.8,
  acceleration: 2,
  maxSpeed: 5,
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
