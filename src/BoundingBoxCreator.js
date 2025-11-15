import * as THREE from "three";
import * as xb from "xrblocks";

// Reusable vectors/quaternions/matrices for performance
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();

const MIN_DIMENSION = 0.005;
const INITIAL_HEIGHT = 0.1; // 10cm initial height
const ROTATION_SENSITIVITY = 3.0; // Meters of height change per unit of sine-pitch

/**
 * A script for creating depth-aware 3D bounding boxes in two stages:
 * 1. Draw the base quad on a surface (Start Point -> Current Point defines W x L).
 * 2. Extrude the base vertically (Controller Rotation defines H).
 *
 * MODIFIED: Box is XZ plane aligned. Extrusion is driven by Controller Pitch. Initial height is 10cm.
 */
export class BoundingBoxCreator extends xb.Script {
  constructor() {
    super();

    this.state = "IDLE"; // IDLE, DRAWING_BASE, EXTRUDING
    this.startPoint = new THREE.Vector3(); // Corner anchor for drawing base
    this.surfaceNormal = new THREE.Vector3();
    this.boxRotation = new THREE.Quaternion();

    // Extrusion tracking variables
    this.initialHeight = 0;
    this.initialPitch = 0; // Stores the initial vertical component of the controller's forward vector

    this.currentBoxMesh = null;
    this.boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x4285f4, // Blue
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.EXTRUDE_COLOR = 0xf4b400; // Yellow/Orange
    this.FINAL_COLOR = 0x34a853; // Green
  }

  init() {
    xb.showReticleOnDepthMesh(true);
  }

  // --- Interaction Handlers ---

  onSelectStart(event) {
    const controller = event.target;
    const intersection = xb.core.user.select(
      xb.core.depth.depthMesh,
      controller
    );

    if (this.state === "IDLE") {
      // 1. Start Drawing Base
      if (intersection) {
        this.startDrawingBase(intersection);
        return;
      }

      // 2. Start Extrusion
      controller.updateMatrixWorld(true);
      xb.core.input._setRaycasterFromController(controller);
      const boxIntersections = xb.core.input.raycaster.intersectObject(
        this,
        true
      );

      if (boxIntersections.length > 0) {
        let targetMesh = boxIntersections[0].object;

        while (targetMesh && targetMesh.parent !== this) {
          targetMesh = targetMesh.parent;
        }

        if (
          targetMesh &&
          targetMesh.userData.isBase &&
          !targetMesh.userData.isExtruded
        ) {
          this.startExtrusion(targetMesh, controller);
        }
      }
    }
  }

  onSelecting(event) {
    const controller = event.target;

    if (this.state === "DRAWING_BASE") {
      const intersection = xb.core.user.select(
        xb.core.depth.depthMesh,
        controller
      );
      if (intersection) {
        this.updateBase(intersection.point);
      }
    } else if (this.state === "EXTRUDING") {
      this.updateExtrusion(controller);
    }
  }

  onSelectEnd() {
    if (this.state === "DRAWING_BASE") {
      this.state = "IDLE";
      if (this.currentBoxMesh) {
        this.currentBoxMesh.userData.isBase = true;
        this.currentBoxMesh.userData.isExtruded = false;
        this.currentBoxMesh.material.color.setHex(
          this.boxMaterial.color.getHex()
        );
        this.currentBoxMesh = null;
      }
    } else if (this.state === "EXTRUDING") {
      this.state = "IDLE";
      if (this.currentBoxMesh) {
        this.currentBoxMesh.userData.isExtruded = true;
        this.currentBoxMesh.material.color.setHex(this.FINAL_COLOR);
        this.currentBoxMesh = null;
        this.dispatchEvent({
          type: "boundingBoxCreated",
          box: this.currentBoxMesh,
        });
      }
    }
  }

  // --- Stage 1: Draw Base Methods ---

  startDrawingBase(intersection) {
    this.state = "DRAWING_BASE";
    this.startPoint.copy(intersection.point);

    // Force the Box Up vector to be World Up (0, 1, 0), ignoring the surface normal.
    this.surfaceNormal.set(0, 1, 0);
    const boxUp = this.surfaceNormal;

    // 1. Calculate the rotation based on Camera Yaw only.
    const cameraForward = _v1
      .set(0, 0, -1)
      .applyQuaternion(xb.core.camera.quaternion);

    // Flatten the camera vector onto the XZ plane
    cameraForward.y = 0;
    cameraForward.normalize();

    if (cameraForward.lengthSq() < 1e-6) {
      cameraForward.set(0, 0, -1);
    }

    const boxRight = _v2.crossVectors(boxUp, cameraForward).normalize();
    const boxForward = _v1.crossVectors(boxRight, boxUp).normalize();

    _m1.makeBasis(boxRight, boxUp, boxForward);
    this.boxRotation.setFromRotationMatrix(_m1);

    // 2. Create Mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    this.clearMeshes();
    this.currentBoxMesh = new THREE.Mesh(geometry, this.boxMaterial.clone());
    this.currentBoxMesh.position.copy(this.startPoint);
    this.currentBoxMesh.quaternion.copy(this.boxRotation);

    // Initialize with specific height
    this.currentBoxMesh.scale.set(MIN_DIMENSION, INITIAL_HEIGHT, MIN_DIMENSION);

    this.add(this.currentBoxMesh);
  }

  updateBase(currentPoint) {
    if (!this.currentBoxMesh) return;

    const localPoint = currentPoint
      .clone()
      .sub(this.startPoint)
      .applyQuaternion(_q1.copy(this.boxRotation).invert());

    const width = localPoint.x;
    const length = localPoint.z;

    // Maintain INITIAL_HEIGHT during base drawing
    this.currentBoxMesh.scale.set(
      Math.max(MIN_DIMENSION, Math.abs(width)),
      INITIAL_HEIGHT,
      Math.max(MIN_DIMENSION, Math.abs(length))
    );

    const halfWidthLocal = this.currentBoxMesh.scale.x * 0.5 * Math.sign(width);
    const halfLengthLocal =
      this.currentBoxMesh.scale.z * 0.5 * Math.sign(length);

    const shiftVectorLocal = _v1.set(halfWidthLocal, 0, halfLengthLocal);
    const shiftVectorWorld = shiftVectorLocal.applyQuaternion(this.boxRotation);

    this.currentBoxMesh.position.copy(this.startPoint).add(shiftVectorWorld);
  }

  // --- Stage 2: Extrusion Methods ---

  startExtrusion(boxMesh, controller) {
    this.state = "EXTRUDING";
    this.currentBoxMesh = boxMesh;

    boxMesh.material.color.setHex(this.EXTRUDE_COLOR);

    // 1. Store the initial height.
    this.initialHeight = boxMesh.scale.y;

    // 2. Store the initial Pitch (vertical component of the forward vector).
    // This effectively captures the angle relative to the horizon.
    const forward = _v1.set(0, 0, -1).applyQuaternion(controller.quaternion);
    this.initialPitch = forward.y;
  }

  updateExtrusion(controller) {
    if (!this.currentBoxMesh) return;

    // 1. Get current controller pitch.
    const forward = _v1.set(0, 0, -1).applyQuaternion(controller.quaternion);
    const currentPitch = forward.y;

    // 2. Calculate delta pitch from start.
    // (Positive delta means controller is tilted UP relative to start)
    const pitchDelta = currentPitch - this.initialPitch;

    // 3. Map pitch delta to height change.
    let newHeight = this.initialHeight + pitchDelta * ROTATION_SENSITIVITY;

    // 4. Apply clamping and update scale.
    newHeight = Math.max(MIN_DIMENSION, newHeight);
    this.currentBoxMesh.scale.y = newHeight;
  }

  clearMeshes() {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.isMesh) {
        child.material.dispose();
        this.remove(child);
      }
    }
  }
}
