import * as xb from "xrblocks";

export class GenerateImageTool extends xb.Tool {
  constructor(generateImageFunction) {
    super({
      name: "generateImage",
      description:
        "This function generates an image of furniture from the 3D bounding box provided by the user. It works by preparing a custom prompt and sending that to Nano Banana image generator. The image will be shown to the user after it is generated. If a bounding box is not detected, this function will throw an error, You should tell the user to draw a 3D bounding box if one is not available.",
      parameters: {
        type: "OBJECT",
        properties: {
          furniture: {
            type: "STRING",
            description:
              'The name of the furniture to generate. This should be a single word or phrase that fits in the sentence: "generate an image of a {furniture} that has a size of ..". Examples: bookshelf, coffee table.',
          },
        },
        required: ["furniture"],
      },
    });
    this.generateImageFunction = generateImageFunction;
  }

  async execute(args) {
    console.log("GenerateImageToolCalled:", args);
    const furniture = args.furniture;
    if (!furniture) {
      return { success: false, error: "Furniture argument missing" };
    }
    try {
      await this.generateImageFunction(furniture);
      return { success: true, data: "Image generated successfully" };
    } catch (error) {
      console.log("Generate image function failed with error:", error);
      return { success: false, error: error };
    }
  }
}
