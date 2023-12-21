import { reverseObject } from "./helpers.js";

export const config = {
  sensitivity: 20,
  brakingFactor: 0.2,
  scrollSensitivity: 2,
  scrollBrakingFactor: 0.5,
  // inertia: 0.9,
  // acceleration: 5,
  // maxSpeed: 5,
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
