import * as xb from "xrblocks";

export class EnableDrawingTool extends xb.Tool {
  constructor(enableDrawingFunction) {
    super({
      name: "enableDrawing",
      description:
        "This function enables a drawing tool that allows the user to sketch modifications on the generated furniture image. The user can use VR controllers to draw in 3D space to indicate changes they want to make to the furniture design. Call this after an image has been generated and the user expresses interest in modifying or sketching on it.",
      parameters: {
        type: "OBJECT",
        properties: {},
        required: [],
      },
    });
    this.enableDrawingFunction = enableDrawingFunction;
  }

  async execute(args) {
    console.log("EnableDrawingTool called");
    try {
      await this.enableDrawingFunction();
      return { 
        success: true, 
        data: "Drawing tool enabled. User can now sketch modifications using VR controllers." 
      };
    } catch (error) {
      console.error("Enable drawing failed:", error);
      return { success: false, error: error.message };
    }
  }
}