import "xrblocks/addons/simulator/SimulatorAddons.js";

import * as THREE from "three";
import * as xb from "xrblocks";

import { GeminiManager } from "./GeminiManager.js";
import { SpawnInEffect } from "./SpawnInEffect.js";
import { BoundingBoxCreator } from "./BoundingBoxCreator.js";
import { Painter } from "./Painter.js";
import { GenerateImageTool } from "./gemini_tools/GenerateImageTool.js";
import { EnableDrawingTool } from "./gemini_tools/EnableDrawingTool.js";
import { RegenerateWithSketchTool } from "./gemini_tools/RegenerateWithSketchTool.js";
import { GenerateMeshTool } from "./gemini_tools/GenerateMeshTool.js";
import { DisableDrawingTool } from "./gemini_tools/DisableDrawingTool.js";
const MESHY_API_KEY = "msy_KfucWecXQglhW2iIWbs6pUCRST1IqOGJPPBg";
const GEMINI_BOOKSHELF_IMAGE = "./gemini_bookshelf.png";
const CORSPROXY_PREFIX = "https://corsproxy.io/?url=";
const MESHY_TEST_MODEL =
  "https://assets.meshy.ai/b374fcb7-0ea2-4bb2-a1f3-8f7c26a2c47e/tasks/019a864d-b626-7e0c-9ef4-baea287d8a11/output/model.glb?Expires=1763449268&Signature=DF2Cz4IwfyWxRCKNruRPXTJfmYoikdztEg3MNiC0~gWtUzKoMuJmnd1TJOs3O5r3qxZ1WqhoZYi14XDN8sBHZVynxn-P-N-G6u1eDmKYMFchO-NGPjAkvf6SXYbnrqdXcEqnjBfbBfpWzE4dK9i2X6ZyLZxk-5mjCiXTW5vvb6WtcojZNrLd4~pi0ZP2ODzwrJnpg-06VLKUVfsJSTxgaQJWJ0rIlyUeJtTIe~7G0Ce1N13Dh1rtEOg2w2f90vxpqGXCsjuFcxToMKIybgJ7HXrMEZB43yBBhZgPAk2rI9oexx7qqhtTQ~gqseAZvubZJsQCQsfo7MpdSaEcVf0WTw__&Key-Pair-Id=KL5I0C8H7HX83";

const missingGeminiKeyWarningElement = document.getElementById(
  "missing-gemini-key-warning"
);
const missingGeminiKeyUrlElement = document.getElementById(
  "missing-gemini-key-url"
);

class InteriorDesignApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, /*intensity=*/ 3));
    this.boundingBoxCreator = new BoundingBoxCreator();
    this.add(this.boundingBoxCreator);

    // Add task status management
    this.isProcessing = false; // Whether a task is currently executing
    this.currentTask = null; // Current task name

    this.setupGeminiLive();
    // this.testImageToBase64();
    // this.loadTestMesh();
    // this.loadGeneratedModel(MESHY_TEST_MODEL);

    this.boundingBoxCreator.addEventListener("boundingBoxCreated", () => {
      this.sendMessageToGeminiLive(
        "[System Message] The user has created a new bounding box. Confirm with the user before generating an image."
      );
    });

    // For testing only. Calls generateImage after 10 seconds.
    // setTimeout(() => {
    //   this.generateImage();
    // }, 10000);
  }

  /**
   * Check if a new task can be started
   */
  canStartTask() {
    return !this.isProcessing;
  }

  /**
   * Start a task (lock)
   */
  startTask(taskName) {
    if (this.isProcessing) {
      throw new Error(
        `Cannot start new task "${taskName}". Currently executing: ${this.currentTask}. Please wait for completion.`
      );
    }
    this.isProcessing = true;
    this.currentTask = taskName;
    console.log(`Task locked: ${taskName}`);
  }

  /**
   * End a task (unlock)
   */
  endTask() {
    console.log(`Task completed: ${this.currentTask}`);
    this.isProcessing = false;
    this.currentTask = null;
  }

  setupGeminiLive() {
    if (xb.core.ai.isAvailable()) {
      missingGeminiKeyWarningElement.style.display = "none";
    } else {
      console.error("AI is not available");
      missingGeminiKeyWarningElement.style.display = "flex";
      const clientUrl = new URL("", window.location.href);
      clientUrl.searchParams.set("key", "GEMINI_KEY_HERE");
      missingGeminiKeyUrlElement.innerHTML = clientUrl.href;
      return;
    }
    xb.core.ai.isAvailable = () => true;
    const geminiManager = new GeminiManager();
    xb.initScript(geminiManager);
    this.add(geminiManager);
    this.geminiManager = geminiManager;

    const model = "gemini-live-2.5-flash-preview";

    const generateImageTool = new GenerateImageTool(
      this.generateImage.bind(this)
    );
    const enableDrawingTool = new EnableDrawingTool(
      this.enableDrawing.bind(this)
    );
    const disableDrawingTool = new DisableDrawingTool(
      this.disableDrawingTool.bind(this)
    );
    const regenerateWithSketchTool = new RegenerateWithSketchTool(
      this.captureAndRegenerateImage.bind(this)
    );
    const generateMeshTool = new GenerateMeshTool(this.generateMesh.bind(this));
    geminiManager.tools.push(generateImageTool);
    geminiManager.tools.push(enableDrawingTool);
    geminiManager.tools.push(disableDrawingTool);
    geminiManager.tools.push(regenerateWithSketchTool);
    geminiManager.tools.push(generateMeshTool);
    const liveParams = {
      tools: [{ googleSearch: {} }],
    };

    // Start Gemini Live in 1 second.
    setTimeout(async () => {
      console.log("Starting Gemini Live");
      await geminiManager.startGeminiLive({ liveParams, model });
      console.log("Started Gemini Live");
    }, 1000);
  }

  sendMessageToGeminiLive(message) {
    const gemini = xb.core.ai.model;
    if (gemini) {
      gemini.sendRealtimeInput({ text: message });
      return true;
    }
    return false;
  }

  async testImageToBase64() {
    try {
      console.log("1. Starting to load image:", GEMINI_BOOKSHELF_IMAGE);

      // Load image
      const response = await fetch(GEMINI_BOOKSHELF_IMAGE);
      console.log("2. Fetch response status:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(
          `Failed to load image: ${response.status} - ${response.statusText}`
        );
      }

      // Convert to blob
      const blob = await response.blob();
      console.log("3. Image Blob info:");
      console.log("   - Size:", blob.size, "bytes");
      console.log("   - Type:", blob.type);

      // Convert to base64
      console.log("4. Starting base64 conversion...");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log("5. Base64 conversion successful!");
      console.log("   - Total length:", base64.length, "characters");
      console.log("   - First 100 characters:", base64.substring(0, 100) + "...");
      console.log("\nComplete Base64 string:");
      console.log(base64);
      const taskId = await this.createMeshyTask(base64);
      console.log("taskId", taskId);

      // Poll task status and get model URL
      const modelUrl = await this.pollTaskStatus(taskId);

      // Load the generated 3D model
      await this.loadGeneratedModel(modelUrl);
    } catch (error) {
      console.error("Error:", error);
      console.error("Error details:", error.message);
    }
  }

  /**
   * Call Meshy API - based on official documentation
   */
  async createMeshyTask(base64Image) {
    console.log("\nStarting Meshy API call...");

    try {
      const headers = {
        Authorization: `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json",
      };

      const payload = {
        image_url: base64Image, // base64 data URI
        enable_pbr: false,
        should_remesh: false,
        should_texture: true,
      };

      console.log("Sending request...");

      const response = await fetch(
        "https://api.meshy.ai/openapi/v1/image-to-3d",
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("API response:", data);

      const taskId = data.result;
      console.log("Task created successfully! Task ID:", taskId);

      return taskId;
    } catch (error) {
      console.error("Meshy API error:", error);
      throw error;
    }
  }

  /**
   * Poll task status - based on official documentation and Python code
   */
  async pollTaskStatus(taskId, progressCallback) {
    console.log("\nStarting task status polling...");

    const headers = {
      Authorization: `Bearer ${MESHY_API_KEY}`,
    };

    let task = null;

    // Python: while True
    while (true) {
      try {
        // Python: response = requests.get(...)
        const response = await fetch(
          `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        // Python: task = response.json()
        task = await response.json();

        // Python: if task["status"] == "SUCCEEDED"
        if (task.status === "SUCCEEDED") {
          console.log("Task completed!");
          break;
        }

        // Python: print("task status:", task["status"], ...)
        console.log(
          `Task status: ${task.status} | Progress: ${task.progress}% | Retrying in 5 seconds...`
        );

        if (progressCallback) {
          progressCallback(task.progress);
        }

        // Python: time.sleep(5)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error("Polling error:", error);
        throw error;
      }
    }

    // Python: model_url = task["model_urls"]["glb"]
    const modelUrl = task.model_urls.glb;
    console.log("Model URL:", modelUrl);

    return modelUrl;
  }

  /**
   * Load the generated 3D model
   */
  async loadGeneratedModel(modelUrl) {
    console.log("\nStarting to load generated 3D model...");

    // Get the user-drawn bounding box
    const boundingBox = this.boundingBoxCreator.children[0];

    const modelviewer = new xb.ModelViewer({});
    xb.initScript(modelviewer);

    // Load the model
    await modelviewer.loadGLTFModel({
      onSceneLoaded: (scene) => {
        modelviewer.add(new SpawnInEffect(scene));
      },
      data: {
        scale: { x: 1, y: 1, z: 1 }, // Load at 1x scale first to calculate bounds
        model: CORSPROXY_PREFIX + modelUrl,
      },
      renderer: xb.core.renderer,
      addOcclusionToShader: true,
    });

    this.add(modelviewer);

    // ALIGNMENT LOGIC START
    if (boundingBox) {
      // 1. Match Position and Rotation
      // BoundingBoxCreator uses a pivot at the bottom-center of the box,
      // and ModelViewer (by default) aligns the model's bottom-center to (0,0,0).
      // Therefore, we can simply copy the transforms.
      modelviewer.position.copy(boundingBox.position);
      modelviewer.position.y += 0.05; // Move the mesh slightly up.
      modelviewer.quaternion.copy(boundingBox.quaternion);

      // 2. Match Scale
      // Get the actual size of the loaded GLTF model (unscaled)
      const modelSize = new THREE.Vector3();
      // ModelViewer automatically calculates 'bbox' during loadGLTFModel
      modelviewer.bbox.getSize(modelSize);

      // Get the target size from the user's bounding box
      // (Since BoundingBoxCreator uses a 1x1x1 geometry, .scale represents actual dimensions)
      const targetSize = boundingBox.scale;

      // Calculate ratio to stretch model to fit the box exactly
      // Check for zeros to prevent Infinity
      if (modelSize.x > 0 && modelSize.y > 0 && modelSize.z > 0) {
        modelviewer.scale.set(
          targetSize.x / modelSize.x,
          targetSize.y / modelSize.y,
          targetSize.z / modelSize.z
        );
      }

      this.boundingBoxCreator.clearMeshes();
      if (this.previewPanel) {
        this.remove(this.previewPanel);
        this.previewPanel.dispose();
        this.previewPanel = null;
      }
    }
    // ALIGNMENT LOGIC END

    console.log("Model added to scene!");
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

  /**
   * Capture screenshot and regenerate image (called via Tool)
   */
  async captureAndRegenerateImage() {
    this.startTask("Regenerate image");
    try {
      console.log("\nStarting screenshot capture...");

      // Check if there is a current image
      if (!this.imageData) {
        throw new Error("No current image. Please generate a furniture image first.");
      }

      // Check if painter is enabled
      if (!this.blackPainter) {
        console.warn("Painter not enabled, will capture current scene directly");
      }

      // Use xrblocks screenshot functionality
      const screenshotBase64 =
        await xb.core.screenshotSynthesizer.getScreenshot();
      console.log("Screenshot completed!");
      console.log("Screenshot data length:", screenshotBase64.length);

      // Send to Gemini to regenerate image
      await this.regenerateImageWithSketch(screenshotBase64);
    } catch (error) {
      console.error("Screenshot error:", error);
      throw error; // Throw error to Tool so Gemini knows
    } finally {
      this.endTask();
    }
  }

  /**
   * Send screenshot to Gemini to generate new image
   */
  async regenerateImageWithSketch(screenshotBase64) {
    console.log("\nSending screenshot to Gemini...");

    if (!xb.core.ai.isAvailable()) {
      console.error("AI not available");
      return;
    }

    this.disableDrawingTool();

    try {
      const ai = xb.core.ai.model.ai;

      // Prepare image data (remove data:image/png;base64, prefix)
      const base64Data = screenshotBase64.split(",")[1];

      const prompt = `
        Look at this image containing a furniture item with hand-drawn sketches overlaid on it. 
        Based on the sketch modifications, generate a NEW image of ONLY the updated furniture piece.

        CRITICAL REQUIREMENTS:
        - Generate ONLY the furniture itself (no drawing tools, lines, strokes, or UI elements)
        - Do NOT include any background, hands, controllers, or other objects
        - The furniture should incorporate the design changes suggested by the sketches
        - Generate at a 3/4 viewing angle for best visibility
        - Output should be a clean product image with white or transparent background
        - Maintain the approximate size and proportions of the original furniture
              `.trim();
      console.log("Prompt:", prompt);

      // Send image and text to Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });
      console.log("Gemini response:", response);

      // Extract the generated new image
      if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        for (const part of firstCandidate?.content?.parts || []) {
          if (part.inlineData) {
            const newImageData =
              "data:image/png;base64," + part.inlineData.data;
            console.log("Gemini generated new image!");

            // Clear painter strokes
            this.clearPainterStrokes();

            // Update display
            this.updateImagePreview(newImageData);

            // Update current image data for subsequent 3D model generation
            this.imageData = newImageData;

            return;
          }
        }
      }

      console.error("Gemini did not return an image");
    } catch (error) {
      console.error("Error sending to Gemini:", error);
    }
  }

  /**
   * Clear all painter strokes
   */
  clearPainterStrokes() {
    if (this.blackPainter) {
      console.log("Clearing painter strokes...");

      // Remove painter object
      this.remove(this.blackPainter);

      // Clean up resources if needed
      if (this.blackPainter.painters) {
        for (const painter of this.blackPainter.painters) {
          if (painter.mesh) {
            // Clean up geometry and material
            if (painter.mesh.geometry) {
              painter.mesh.geometry.dispose();
            }
            if (painter.mesh.material) {
              painter.mesh.material.dispose();
            }
          }
        }
      }

      // Reset reference
      this.disableDrawingTool();

      console.log("Painter strokes cleared!");
    }
  }

  /**
   * Update image preview
   */
  updateImagePreview(newImageData) {
    console.log("Updating image preview...");

    // Remove old preview
    if (this.previewPanel) {
      this.remove(this.previewPanel);
      this.previewPanel.dispose();
      this.previewPanel = null;
    }

    // Create new preview
    const panel = new xb.SpatialPanel();
    const camera = xb.core.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );
    const distance = 0.8; // 0.8 meters away
    const spawnPos = camera.position
      .clone()
      .add(forward.multiplyScalar(distance));

    panel.position.copy(spawnPos);
    panel.quaternion.copy(camera.quaternion);
    const grid = panel.addGrid();
    grid.addRow({ weight: 0.8 }).add(
      new xb.ImageView({
        src: newImageData,
      })
    );
    const progressText = new xb.TextView({
      text: "Mesh generation not started",
    });
    grid.addRow({ weight: 0.2 }).add(progressText);
    panel.setMeshProgress = (progress) => {
      progressText.text = `Mesh generation: ${progress}%`;
    };
    this.add(panel);
    this.previewPanel = panel;

    console.log("Image preview updated!");
  }

  /**
   * Enable drawing tool (called via Gemini Tool)
   */
  enableDrawing() {
    console.log("Enabling drawing tool...");

    if (this.blackPainter) {
      console.log("Painter already enabled");
      return;
    }

    // Enable painter
    this.blackPainter = new Painter();
    this.add(this.blackPainter);
    if (this.previewPanel) {
      // Prevent dragging the panel while drawing.
      this.previewPanel.draggable = false;
    }
    console.log("Painter enabled! Use controller trigger button to draw");
  }

  async generateImage(furniture = "bookshelf") {
    // Check before starting task
    this.startTask("Generate image");

    try {
      console.log("Generate Image");
      if (!xb.core.ai.isAvailable()) {
        console.error("AI is not available");
        return;
      }
      this.clearPainterStrokes();
      this.disableDrawingTool();

      const boundingBox = this.boundingBoxCreator.children[0];
      if (!boundingBox) {
        throw new Error("No current bounding box");
      }
      const width = boundingBox.scale.x.toFixed(2);
      const height = boundingBox.scale.y.toFixed(2);
      const depth = boundingBox.scale.z.toFixed(2);

      const ai = xb.core.ai.model.ai;
      const prompt = `Examine the following image and generate an image of a ${furniture} that has a size of ${width}x${height}x${depth} (width, height, depth) meters. Generate the requested furniture without any background. Prefer to generate at a 3/4 angle.`;
      console.log("Generate Image Prompt:", prompt);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [prompt],
      });
      console.log("response", response);
      if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        for (const part of firstCandidate?.content?.parts || []) {
          if (part.inlineData) {
            this.imageData = "data:image/png;base64," + part.inlineData.data;
          }
        }
      }
      if (this.imageData) {
        this.updateImagePreview(this.imageData);

        console.log("Image generation successful!");
        console.log("Tip: You can ask Gemini to enable the painter to modify the design");
      } else {
        console.error("Gemini did not return an image");
      }
    } catch (error) {
      console.error("Image generation error:", error);
      throw error;
    } finally {
      this.endTask();
    }
  }

  async generateMesh() {
    // Check before starting task (this is the most time-consuming task)
    this.startTask("Generate 3D model");

    try {
      console.log("Starting 3D model generation...");
      console.log("This process may take 3-5 minutes, please be patient...");

      // Check if image data exists
      if (!this.imageData) {
        throw new Error("No image data. Please generate a furniture image first.");
      }

      // Create Meshy task
      console.log("Sending image to Meshy AI...");
      const taskId = await this.createMeshyTask(this.imageData);
      console.log("Meshy task created, Task ID:", taskId);

      // Poll task status
      console.log("Monitoring task progress (this may take a few minutes)...");
      const modelUrl = await this.pollTaskStatus(taskId, (progress) => {
        if (this.previewPanel) {
          this.previewPanel.setMeshProgress(progress);
        }
      });

      // Load the generated 3D model
      console.log("Loading 3D model into scene...");
      await this.loadGeneratedModel(modelUrl);

      console.log("3D model generation complete!");
    } catch (error) {
      console.error("3D model generation failed:", error);
      throw error;
    } finally {
      // Unlock regardless of success or failure
      this.endTask();
    }
  }

  disableDrawingTool() {
    if (this.blackPainter) {
      this.remove(this.blackPainter);
      this.blackPainter.dispose();
    }
    this.blackPainter = null;
    xb.core.input.controllers.forEach((element) => {
      element.traverse((child) => {
        if (child.name == "pivot") {
          child.removeFromParent();
          child.material.dispose();
        }
      });
    });
    xb.core.input.pivotsEnabled = false;
  }
}

/**
 * Entry point for the application.
 */
function start() {
  const options = new xb.Options();
  options.enableCamera();
  options.enableDepth();
  options.enableAI();
  options.depth.depthTexture.enabled = true;
  options.depth.occlusion.enabled = true;
  options.simulator.instructions.enabled = false;
  xb.add(new InteriorDesignApp());
  xb.init(options);
}

document.addEventListener("DOMContentLoaded", start);
