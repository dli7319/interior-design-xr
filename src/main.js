import "xrblocks/addons/simulator/SimulatorAddons.js";

import * as THREE from "three";
import * as xb from "xrblocks";

import { GeminiManager } from "./GeminiManager.js";
import { SpawnInEffect } from "./SpawnInEffect.js";
import { BoundingBoxCreator } from "./BoundingBoxCreator.js";
import { GenerateImageTool } from "./gemini_tools/GenerateImageTool.js";
const MESHY_API_KEY = "msy_KfucWecXQglhW2iIWbs6pUCRST1IqOGJPPBg";
const GEMINI_BOOKSHELF_IMAGE = "./gemini_bookshelf.png";
const CORSPROXY_PREFIX = "https://corsproxy.io/?url=";
const MESHY_TEST_MODEL =
  "https://assets.meshy.ai/b374fcb7-0ea2-4bb2-a1f3-8f7c26a2c47e/tasks/019a864d-b626-7e0c-9ef4-baea287d8a11/output/model.glb?Expires=1763449268&Signature=DF2Cz4IwfyWxRCKNruRPXTJfmYoikdztEg3MNiC0~gWtUzKoMuJmnd1TJOs3O5r3qxZ1WqhoZYi14XDN8sBHZVynxn-P-N-G6u1eDmKYMFchO-NGPjAkvf6SXYbnrqdXcEqnjBfbBfpWzE4dK9i2X6ZyLZxk-5mjCiXTW5vvb6WtcojZNrLd4~pi0ZP2ODzwrJnpg-06VLKUVfsJSTxgaQJWJ0rIlyUeJtTIe~7G0Ce1N13Dh1rtEOg2w2f90vxpqGXCsjuFcxToMKIybgJ7HXrMEZB43yBBhZgPAk2rI9oexx7qqhtTQ~gqseAZvubZJsQCQsfo7MpdSaEcVf0WTw__&Key-Pair-Id=KL5I0C8H7HX83";

class InteriorDesignApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, /*intensity=*/ 3));
    this.boundingBoxCreator = new BoundingBoxCreator();
    this.add(this.boundingBoxCreator);
    this.setupGeminiLive();
    // this.testImageToBase64();
    // this.loadTestMesh();
    // this.loadGeneratedModel(MESHY_TEST_MODEL);

    // For testing only. Calls generateImage after 10 seconds.
    // setTimeout(() => {
    //   this.generateImage();
    // }, 10000);
  }

  setupGeminiLive() {
    if (!xb.core.ai.isAvailable()) {
      console.error("AI is not available");
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

    geminiManager.tools.push(generateImageTool);

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

  async testImageToBase64() {
    try {
      console.log("1. 开始加载图片:", GEMINI_BOOKSHELF_IMAGE);

      // 加载图片
      const response = await fetch(GEMINI_BOOKSHELF_IMAGE);
      console.log("2. Fetch 响应状态:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(
          `加载图片失败: ${response.status} - ${response.statusText}`
        );
      }

      // 转换成 blob
      const blob = await response.blob();
      console.log("3. 图片 Blob 信息:");
      console.log("   - 大小:", blob.size, "字节");
      console.log("   - 类型:", blob.type);

      // 转换成 base64
      console.log("4. 开始转换成 base64...");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log("5. ✅ Base64 转换成功！");
      console.log("   - 总长度:", base64.length, "字符");
      console.log("   - 前100个字符:", base64.substring(0, 100) + "...");
      console.log("\n完整的 Base64 字符串:");
      console.log(base64);
      const taskId = await this.createMeshyTask(base64);
      console.log("taskId", taskId);

      // 轮询任务状态并获取模型 URL
      const modelUrl = await this.pollTaskStatus(taskId);

      // 加载生成的 3D 模型
      await this.loadGeneratedModel(modelUrl);
    } catch (error) {
      console.error("❌ 错误:", error);
      console.error("错误详情:", error.message);
    }
  }

  /**
   * 调用 Meshy API - 基于官方文档
   */
  async createMeshyTask(base64Image) {
    console.log("\n🚀 开始调用 Meshy API...");

    try {
      const headers = {
        Authorization: `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json",
      };

      const payload = {
        image_url: base64Image, // base64 data URI
        enable_pbr: true,
        should_remesh: true,
        should_texture: true,
      };

      console.log("📤 发送请求...");

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
        throw new Error(`API 错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("📦 API 响应:", data);

      const taskId = data.result;
      console.log("✅ Task 创建成功！Task ID:", taskId);

      return taskId;
    } catch (error) {
      console.error("❌ Meshy API 错误:", error);
      throw error;
    }
  }

  /**
   * 轮询任务状态 - 基于官方文档和Python代码
   */
  async pollTaskStatus(taskId) {
    console.log("\n⏳ 开始轮询任务状态...");

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
          throw new Error(`轮询失败: ${response.status}`);
        }

        // Python: task = response.json()
        task = await response.json();

        // Python: if task["status"] == "SUCCEEDED"
        if (task.status === "SUCCEEDED") {
          console.log("✅ Task 完成！");
          break;
        }

        // Python: print("task status:", task["status"], ...)
        console.log(
          `📊 Task 状态: ${task.status} | 进度: ${task.progress}% | 5秒后重试...`
        );

        // Python: time.sleep(5)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error("❌ 轮询错误:", error);
        throw error;
      }
    }

    // Python: model_url = task["model_urls"]["glb"]
    const modelUrl = task.model_urls.glb;
    console.log("🔗 模型 URL:", modelUrl);

    return modelUrl;
  }

  /**
   * 加载生成的 3D 模型
   */
  async loadGeneratedModel(modelUrl) {
    console.log("\n🎨 开始加载生成的 3D 模型...");

    const modelviewer = new xb.ModelViewer({});
    xb.initScript(modelviewer);
    await modelviewer.loadGLTFModel({
      onSceneLoaded: (scene) => {
        modelviewer.add(new SpawnInEffect(scene));
      },
      data: {
        scale: { x: 1, y: 1, z: 1 },
        model: CORSPROXY_PREFIX + modelUrl,
      },
      renderer: xb.core.renderer,
      addOcclusionToShader: true,
    });
    this.add(modelviewer);
    modelviewer.position.set(0, 1.0, -1.5);

    console.log("🎉 模型已添加到场景中！");
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

  async generateImage(furniture = "bookshelf") {
    console.log("Generate Image");
    if (!xb.core.ai.isAvailable()) {
      console.error("AI is not available");
      return;
    }

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
      if (this.previewPanel) {
        this.remove(this.previewPanel);
        this.previewPanel.dispose();
        this.previewPanel = null;
      }
      const panel = new xb.SpatialPanel();
      panel.add(
        new xb.ImageView({
          src: this.imageData,
        })
      );
      this.add(panel);
      this.previewPanel = panel;
    } else {
      console.error("Gemini did not return an image");
    }
  }

  async generateMesh() {
    console.log("Generate mesh");
    const taskId = await this.createMeshyTask(this.imageData);
    console.log("taskId", taskId);

    // 轮询任务状态并获取模型 URL
    const modelUrl = await this.pollTaskStatus(taskId);

    // 加载生成的 3D 模型
    await this.loadGeneratedModel(modelUrl);
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
