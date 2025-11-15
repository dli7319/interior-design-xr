import { GeminiManager as XBGeminiManager } from "xrblocks/addons/ai/GeminiManager.js";
import * as xb from "xrblocks";

export class GeminiManager extends XBGeminiManager {
  // Increase schedule ahead time.
  scheduleAudioBuffers() {
    const SCHEDULE_AHEAD_TIME = 1.0;
    while (
      this.audioQueue.length > 0 &&
      this.nextAudioStartTime <=
        this.audioContext.currentTime + SCHEDULE_AHEAD_TIME
    ) {
      const audioBuffer = this.audioQueue.shift();
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.onended = () => {
        source.disconnect();
        this.queuedSourceNodes.delete(source);
        this.scheduleAudioBuffers();
      };

      const startTime = Math.max(
        this.nextAudioStartTime,
        this.audioContext.currentTime
      );
      source.start(startTime);
      this.queuedSourceNodes.add(source);
      this.nextAudioStartTime = startTime + audioBuffer.duration;
    }
  }

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
