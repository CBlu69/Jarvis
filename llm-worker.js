// جارویس — کارگر مغز زبانی آفلاین (WebLLM روی WebGPU)
// مدل فقط بار اول دانلود می‌شود و در کش مرورگر می‌ماند.
import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.85";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
