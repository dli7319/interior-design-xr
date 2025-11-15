import * as xb from "xrblocks";

export class RegenerateWithSketchTool extends xb.Tool {
  constructor(regenerateFunction) {
    super({
      name: "regenerateWithSketch",
      description:
        "This function captures a screenshot of the current scene (including the furniture image and any sketches the user has drawn), then uses AI to generate a new furniture image that incorporates the sketch modifications. The output will be a clean furniture image without drawing tools or UI elements. Call this after the user has finished drawing their modifications and wants to see the updated furniture design.",
      parameters: {
        type: "OBJECT",
        properties: {
          waitSeconds: {
            type: "NUMBER",
            description:
              "Optional: Number of seconds to wait before taking the screenshot. This gives the user time to finish drawing. Default is 0 (immediate).",
          },
        },
        required: [],
      },
    });
    this.regenerateFunction = regenerateFunction;
  }

  async execute(args) {
    console.log("RegenerateWithSketchTool called:", args);
    const waitSeconds = args.waitSeconds || 0;
    
    try {
      if (waitSeconds > 0) {
        console.log(`⏰ Waiting ${waitSeconds} seconds before capturing...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      }
      
      await this.regenerateFunction();
      return { 
        success: true, 
        data: "Screenshot captured and new furniture image generated successfully based on sketches." 
      };
    } catch (error) {
      console.error("Regenerate with sketch failed:", error);
      return { success: false, error: error.message };
    }
  }
}