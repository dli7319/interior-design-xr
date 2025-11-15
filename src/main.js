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
  
    // 👇 添加任务状态管理
    this.isProcessing = false;  // 是否有任务正在执行
    this.currentTask = null;     // 当前任务名称

    this.setupGeminiLive();
    // this.testImageToBase64();
    // this.loadTestMesh();
    // this.loadGeneratedModel(MESHY_TEST_MODEL);

    // For testing only. Calls generateImage after 10 seconds.
    // setTimeout(() => {
    //   this.generateImage();
    // }, 10000);
  }

  /**
   * 检查是否可以执行新任务
   */
  canStartTask() {
    return !this.isProcessing;
  }

  /**
   * 开始任务（加锁）
   */
  startTask(taskName) {
    if (this.isProcessing) {
      throw new Error(
        `无法启动新任务 "${taskName}"。当前正在执行: ${this.currentTask}。请等待完成后再试。`
      );
    }
    this.isProcessing = true;
    this.currentTask = taskName;
    console.log(`🔒 任务已锁定: ${taskName}`);
  }

  /**
   * 结束任务（解锁）
   */
  endTask() {
    console.log(`🔓 任务已完成: ${this.currentTask}`);
    this.isProcessing = false;
    this.currentTask = null;
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
    const enableDrawingTool = new EnableDrawingTool(
      this.enableDrawing.bind(this)
    );
    const regenerateWithSketchTool = new RegenerateWithSketchTool(
      this.captureAndRegenerateImage.bind(this)
    );
    const generateMeshTool = new GenerateMeshTool(
      this.generateMesh.bind(this)
    );
    geminiManager.tools.push(generateImageTool);
    geminiManager.tools.push(enableDrawingTool);
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



  /**
     * 拍截图并重新生成图片（通过 Tool 调用）
     */
  async captureAndRegenerateImage() {
    this.startTask("重新生成图片");
    try {
      console.log("\n📸 开始拍截图...");
      
      // 检查是否有当前图片
      if (!this.imageData) {
        throw new Error("没有当前图片。请先生成一张家具图片。");
      }
      
      // 检查是否启用了画笔
      if (!this.blackPainter) {
        console.warn("⚠️ 画笔未启用，将直接拍摄当前场景");
      }
      
      // 使用 xrblocks 的截图功能
      const screenshotBase64 = await xb.core.screenshotSynthesizer.getScreenshot();
      console.log("✅ 截图完成！");
      console.log("截图数据长度:", screenshotBase64.length);
      
      // 发送到 Gemini 重新生成图片
      await this.regenerateImageWithSketch(screenshotBase64);
      
    } catch (error) {
      console.error("❌ 拍截图出错:", error);
      throw error; // 向 Tool 抛出错误，让 Gemini 知道
    } finally {
      this.endTask();
    }
  }




  /**
     * 把截图发送给 Gemini，生成新图片
     */
  async regenerateImageWithSketch(screenshotBase64) {
    console.log("\n🤖 发送截图给 Gemini...");
    
    if (!xb.core.ai.isAvailable()) {
      console.error("❌ AI 不可用");
      return;
    }

    try {
      const ai = xb.core.ai.model.ai;
      
      // 准备图片数据（去掉 data:image/png;base64, 前缀）
      const base64Data = screenshotBase64.split(',')[1];
      
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
      console.log("📝 Prompt:", prompt);
      
      // 发送图片和文字给 Gemini
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data
                }
              }
            ]
          }
        ],
      });
      console.log("📦 Gemini 响应:", response);
      
      // 提取生成的新图片
      if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        for (const part of firstCandidate?.content?.parts || []) {
          if (part.inlineData) {
            const newImageData = "data:image/png;base64," + part.inlineData.data;
            console.log("✅ Gemini 生成了新图片！");
            
            // 👇 清除画笔的内容
            this.clearPainterStrokes();

            // 更新显示
            this.updateImagePreview(newImageData);
            
            // 更新当前图片数据，以便后续生成 3D 模型
            this.imageData = newImageData;
            
            return;
          }
        }
      }
      
      console.error("❌ Gemini 没有返回图片");

    } catch (error) {
      console.error("❌ 发送给 Gemini 出错:", error);
    }
  }



  /**
     * 清除画笔的所有线条
     */
  clearPainterStrokes() {
    if (this.blackPainter) {
      console.log("🧹 清除画笔线条...");
      
      // 移除画笔对象
      this.remove(this.blackPainter);
      
      // 如果需要清理资源
      if (this.blackPainter.painters) {
        for (const painter of this.blackPainter.painters) {
          if (painter.mesh) {
            // 清理几何体和材质
            if (painter.mesh.geometry) {
              painter.mesh.geometry.dispose();
            }
            if (painter.mesh.material) {
              painter.mesh.material.dispose();
            }
          }
        }
      }
      
      // 重置引用
      this.blackPainter = null;
      
      console.log("✅ 画笔线条已清除！");
    }
  }



  /**
   * 更新图片预览
   */
  updateImagePreview(newImageData) {
    console.log("🖼️ 更新图片预览...");
    
    // 移除旧的预览
    if (this.previewPanel) {
      this.remove(this.previewPanel);
      this.previewPanel.dispose();
      this.previewPanel = null;
    }
    
    // 创建新的预览
    const panel = new xb.SpatialPanel();
    panel.add(
      new xb.ImageView({
        src: newImageData,
      })
    );
    this.add(panel);
    this.previewPanel = panel;
    
    console.log("✅ 图片预览已更新！");
  }


  /**
     * 启用绘画工具（通过 Gemini Tool 调用）
     */
  enableDrawing() {
    console.log("🎨 启用绘画工具...");
    
    if (this.blackPainter) {
      console.log("⚠️ 画笔已经启用");
      return;
    }
    
    // 启用画笔
    this.blackPainter = new Painter();
    this.add(this.blackPainter);
    console.log("✅ 画笔已启用！用手柄的 trigger 按钮画画");
  }



  async generateImage(furniture = "bookshelf") {
    // 👇 开始任务前检查
    this.startTask("生成图片");

    try {
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

        console.log("✅ 图片生成成功！");
        console.log("💡 提示：你可以让 Gemini 启用画笔来修改设计");
      } else {
        console.error("Gemini did not return an image");
      }
    } catch (error) {
      console.error("❌ 生成图片出错:", error);
      throw error;
    } finally {
      this.endTask();
    }
  }

  async generateMesh() {
    // 👇 开始任务前检查（这个任务最耗时）
    this.startTask("生成 3D 模型");
    
    try {
      console.log("🔨 开始生成 3D 模型...");
      console.log("⏰ 这个过程可能需要 3-5 分钟，请耐心等待...");
      
      // 检查是否有图片数据
      if (!this.imageData) {
        throw new Error("没有图片数据。请先生成一张家具图片。");
      }
      
      // 创建 Meshy 任务
      console.log("📤 发送图片到 Meshy AI...");
      const taskId = await this.createMeshyTask(this.imageData);
      console.log("✅ Meshy 任务已创建，Task ID:", taskId);

      // 轮询任务状态
      console.log("⏳ 开始监控任务进度（这可能需要几分钟）...");
      const modelUrl = await this.pollTaskStatus(taskId);

      // 加载生成的 3D 模型
      console.log("🎨 加载 3D 模型到场景中...");
      await this.loadGeneratedModel(modelUrl);
      
      console.log("🎉 3D 模型生成完成！");
      
    } catch (error) {
      console.error("❌ 生成 3D 模型失败:", error);
      throw error;
    } finally {
      // 👇 无论成功失败都要解锁
      this.endTask();
    }
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
