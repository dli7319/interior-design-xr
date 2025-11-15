import * as xb from "xrblocks";

export class DisableDrawingTool extends xb.Tool {
  constructor(disableDrawingFunction) {
    super({
      name: "disableDrawing",
      description: "This function disable the drawing tool.",
      parameters: {
        type: "OBJECT",
        properties: {},
        required: [],
      },
    });
    this.disableDrawingFunction = disableDrawingFunction;
  }

  async execute(args) {
    console.log("DisableDrawingTool called");
    try {
      await this.disableDrawingFunction();
      return {
        success: true,
        data: "Drawing tool enabled. User can now sketch modifications using VR controllers.",
      };
    } catch (error) {
      console.error("Enable drawing failed:", error);
      return { success: false, error: error.message };
    }
  }
}
