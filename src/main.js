import "xrblocks/addons/simulator/SimulatorAddons.js";

import * as THREE from "three";
import * as xb from "xrblocks";
import { Painter } from "./Painter.js";
import { SpawnInEffect } from "./SpawnInEffect.js";

const CORSPROXY_PREFIX = "https://corsproxy.io/?url=";
const MESHY_TEST_MODEL =
  CORSPROXY_PREFIX +
  "https://assets.meshy.ai/b374fcb7-0ea2-4bb2-a1f3-8f7c26a2c47e/tasks/019a864d-b626-7e0c-9ef4-baea287d8a11/output/model.glb?Expires=1763449268&Signature=DF2Cz4IwfyWxRCKNruRPXTJfmYoikdztEg3MNiC0~gWtUzKoMuJmnd1TJOs3O5r3qxZ1WqhoZYi14XDN8sBHZVynxn-P-N-G6u1eDmKYMFchO-NGPjAkvf6SXYbnrqdXcEqnjBfbBfpWzE4dK9i2X6ZyLZxk-5mjCiXTW5vvb6WtcojZNrLd4~pi0ZP2ODzwrJnpg-06VLKUVfsJSTxgaQJWJ0rIlyUeJtTIe~7G0Ce1N13Dh1rtEOg2w2f90vxpqGXCsjuFcxToMKIybgJ7HXrMEZB43yBBhZgPAk2rI9oexx7qqhtTQ~gqseAZvubZJsQCQsfo7MpdSaEcVf0WTw__&Key-Pair-Id=KL5I0C8H7HX83";

class InteriorDesignApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, /*intensity=*/ 3));
    const painter = new Painter();
    this.add(painter);
  }

  async loadTestMesh() {
    const modelviewer = new xb.ModelViewer({});
    await modelviewer.loadGLTFModel({
      onSceneLoaded: (scene) => {
        console.log("scene loaded!", scene);
        modelviewer.add(new SpawnInEffect(scene));
      },
      data: {
        scale: { x: 1, y: 1, z: 1 },
        model: MESHY_TEST_MODEL,
      },
      renderer: xb.core.renderer,
    });
    this.add(modelviewer);
    modelviewer.position.set(0, 1.0, -1.5);
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
