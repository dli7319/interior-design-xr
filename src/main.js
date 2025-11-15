import "xrblocks/addons/simulator/SimulatorAddons.js";

import * as THREE from "three";
import * as xb from "xrblocks";
import { Painter } from "./Painter.js";

class InteriorDesignApp extends xb.Script {
  init() {
    const painter = new Painter();
    this.add(painter);
  }
}

/**
 * Entry point for the application.
 */
function start() {
  const options = new xb.Options();
  options.simulator.instructions.enabled = false;
  xb.add(new InteriorDesignApp());
  xb.init(options);
}

document.addEventListener("DOMContentLoaded", start);
