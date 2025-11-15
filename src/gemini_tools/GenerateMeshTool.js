import * as xb from "xrblocks";

export class GenerateMeshTool extends xb.Tool {
  constructor(generateMeshFunction) {
    super({
      name: "generateMesh",
      description:
        "This function converts the current furniture image into a 3D model using Meshy AI. It takes the 2D image and generates a 3D mesh that will be displayed in the XR scene. This process takes several minutes. Call this when the user is satisfied with the furniture image and wants to see it as a 3D model.",
      parameters: {
        type: "OBJECT",
        properties: {},
        required: [],
      },
    });
    this.generateMeshFunction = generateMeshFunction;
  }

  async execute(args) {
    console.log("GenerateMeshTool called");
    try {
      await this.generateMeshFunction();
      return { 
        success: true, 
        data: "3D mesh generation started. This will take a few minutes. The model will appear in the scene when ready." 
      };
    } catch (error) {
      console.error("Generate mesh failed:", error);
      return { success: false, error: error.message };
    }
  }
}