import { GeminiManager as XBGeminiManager } from "xrblocks/addons/ai/GeminiManager.js";
import * as xb from "xrblocks";

export class GeminiManager extends XBGeminiManager {
  startScreenshotCapture() {
    this.screenshotInterval2 = setInterval(async () => {
      const base64Image = await xb.core.screenshotSynthesizer.getScreenshot(
        /*overlayOnCamera=*/ true
      );
      if (base64Image) {
        const base64Data = base64Image.startsWith("data:")
          ? base64Image.split(",")[1]
          : base64Image;
        try {
          xb.core.ai?.sendRealtimeInput?.({
            video: { data: base64Data, mimeType: "image/png" },
          });
        } catch (error) {
          console.warn(error);
          this.stopGeminiLive();
        }
      }
    }, 1000);
  }
}
