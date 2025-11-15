import * as THREE from "three";
import * as xb from "xrblocks";

// Reusable vectors/quaternions/matrices for performance
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();

const MIN_DIMENSION = 0.005;

/**
 * A script for creating depth-aware 3D bounding boxes in two stages:
 * 1. Draw the base quad on a surface (Start Point -> Current Point defines W x L).
 * 2. Extrude the base vertically (Controller movement defines H).
 */
export class BoundingBoxCreator extends xb.Script {
  constructor() {
    super();

    this.state = "IDLE"; // IDLE, DRAWING_BASE, EXTRUDING
    this.startPoint = new THREE.Vector3(); // Corner anchor for drawing base
    this.extrusionPivot = new THREE.Vector3(); // Fixed world position of the base center
    this.surfaceNormal = new THREE.Vector3();
    this.boxRotation = new THREE.Quaternion();

    // Extrusion tracking variables
    // New: Stores the initial signed projection distance of the controller onto the UpVector
    this.initialControllerProjection = 0;
    this.extrusionUpVector = new THREE.Vector3(); // The world UP direction for extrusion

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

    this.add(new THREE.DirectionalLight(0xffffff, 1.5).position.set(0, 2, 1));
    this.add(new THREE.AmbientLight(0x404040));
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
      }
    }
  }

  // --- Stage 1: Draw Base Methods ---

  startDrawingBase(intersection) {
    this.state = "DRAWING_BASE";
    this.startPoint.copy(intersection.point);
    this.surfaceNormal.copy(intersection.normal || _v1.set(0, 1, 0));

    // 1. Calculate the rotation to be flush with the surface AND face the camera (yaw).
    const cameraYawForward = _v1
      .set(0, 0, -1)
      .applyQuaternion(xb.core.camera.quaternion);
    const projectedForward = _v2
      .copy(cameraYawForward)
      .sub(
        _v1
          .copy(this.surfaceNormal)
          .multiplyScalar(cameraYawForward.dot(this.surfaceNormal))
      )
      .normalize();

    if (projectedForward.lengthSq() < 1e-6) {
      projectedForward
        .copy(_v1.set(0, 0, -1))
        .sub(
          _v2
            .copy(this.surfaceNormal)
            .multiplyScalar(_v1.dot(this.surfaceNormal))
        )
        .normalize();
    }

    const boxUp = this.surfaceNormal;
    const boxRight = _v1.crossVectors(boxUp, projectedForward).normalize();
    const boxForward = _v2.crossVectors(boxRight, boxUp).normalize();

    _m1.makeBasis(boxRight, boxUp, boxForward);
    this.boxRotation.setFromRotationMatrix(_m1);

    // 2. Create Mesh: Geometry pivot is at the center of the base (0, 0, 0)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    this.currentBoxMesh = new THREE.Mesh(geometry, this.boxMaterial.clone());
    this.currentBoxMesh.position.copy(this.startPoint);
    this.currentBoxMesh.quaternion.copy(this.boxRotation);
    this.currentBoxMesh.scale.set(MIN_DIMENSION, MIN_DIMENSION, MIN_DIMENSION);

    this.add(this.currentBoxMesh);
  }

  updateBase(currentPoint) {
    if (!this.currentBoxMesh) return;

    // Transform current point relative to startPoint into the box's local space
    const localPoint = currentPoint
      .clone()
      .sub(this.startPoint)
      .applyQuaternion(_q1.copy(this.boxRotation).invert());

    const width = localPoint.x;
    const length = localPoint.z;

    // 1. Update Scale (Dimensions)
    this.currentBoxMesh.scale.set(
      Math.max(MIN_DIMENSION, Math.abs(width)),
      MIN_DIMENSION,
      Math.max(MIN_DIMENSION, Math.abs(length))
    );

    // 2. Update Position (Anchor): Center the box mesh over the fixed startPoint corner.
    const halfWidthLocal = this.currentBoxMesh.scale.x * 0.5 * Math.sign(width);
    const halfLengthLocal =
      this.currentBoxMesh.scale.z * 0.5 * Math.sign(length);

    const shiftVectorLocal = _v1.set(halfWidthLocal, 0, halfLengthLocal);

    const shiftVectorWorld = shiftVectorLocal.applyQuaternion(this.boxRotation);

    // New position is the start point + the calculated offset (corner to center translation)
    this.currentBoxMesh.position.copy(this.startPoint).add(shiftVectorWorld);
  }

  // --- Stage 2: Extrusion Methods ---

  startExtrusion(boxMesh, controller) {
    this.state = "EXTRUDING";
    this.currentBoxMesh = boxMesh;

    boxMesh.material.color.setHex(this.EXTRUDE_COLOR);

    // 1. Determine the fixed bottom-center point (the Extrusion Pivot).
    this.extrusionPivot.copy(boxMesh.position);
    // Calculate the vector from center to base plane
    const baseOffsetVector = _v1
      .set(0, boxMesh.scale.y / 2, 0)
      .applyQuaternion(boxMesh.quaternion);
    this.extrusionPivot.sub(baseOffsetVector); // Fixed world position of the base center.

    // 2. Determine the fixed world UP vector (normal direction).
    this.extrusionUpVector.set(0, 1, 0).applyQuaternion(boxMesh.quaternion);

    // 3. Store the initial height.
    this.initialHeight = boxMesh.scale.y;

    // 4. Store the initial signed projection distance of the controller's position
    //    relative to the extrusion pivot (base plane).
    controller.getWorldPosition(_v1);
    // Vector from pivot to controller
    const pivotToController = _v2.copy(_v1).sub(this.extrusionPivot);
    // Projection of that vector onto the extrusionUpVector gives the initial signed distance.
    this.initialControllerProjection = pivotToController.dot(
      this.extrusionUpVector
    );
  }

  updateExtrusion(controller) {
    if (!this.currentBoxMesh) return;

    // 1. Get the current controller world position.
    controller.getWorldPosition(_v1);

    // 2. Calculate vector from pivot to current controller position.
    const pivotToController = _v2.copy(_v1).sub(this.extrusionPivot);

    // 3. Calculate the current signed projection distance of the controller onto the UpVector.
    const currentControllerProjection = pivotToController.dot(
      this.extrusionUpVector
    );

    // 4. Calculate the movement delta relative to the initial projection.
    // The amount the controller has moved perpendicular to the base plane.
    const movementDelta =
      currentControllerProjection - this.initialControllerProjection;

    // 5. Determine the new total height.
    // New height is the initial height + the controller's signed movement delta.
    let newHeight = this.initialHeight + movementDelta;

    // 6. Apply clamping and correct final height.
    newHeight = Math.max(MIN_DIMENSION, newHeight);

    // 7. Apply new height to scale.
    this.currentBoxMesh.scale.y = newHeight;
  }
}
