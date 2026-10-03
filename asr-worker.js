// جارویس — کارگر تشخیص گفتار آفلاین (Whisper از طریق transformers.js)
// مدل فقط بار اول دانلود می‌شود و در کش مرورگر می‌ماند.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

env.allowLocalModels = false;
env.useBrowserCache = true;

let asr = null;
let device = "wasm";

function post(msg) { self.postMessage(msg); }
const errText = (e) => String((e && e.message) || e);

async function build(model, dev) {
  const opts = {
    device: dev,
    progress_callback: (p) => post({ type: "progress", p }),
  };
  if (dev === "webgpu") {
    opts.dtype = { encoder_model: "fp32", decoder_model_merged: "q4" };
  } else {
    opts.dtype = "q8";
  }
  return await pipeline("automatic-speech-recognition", model, opts);
}

self.onmessage = async (e) => {
  const d = e.data;

  if (d.type === "load") {
    try {
      const wantGpu = !!self.navigator.gpu;
      try {
        asr = await build(d.model, wantGpu ? "webgpu" : "wasm");
        device = wantGpu ? "webgpu" : "wasm";
      } catch (err1) {
        if (!wantGpu) throw err1;
        // WebGPU نشد؛ با CPU (WASM) دوباره امتحان می‌کنیم
        asr = await build(d.model, "wasm");
        device = "wasm";
      }
      post({ type: "ready", model: d.model, device });
    } catch (err) {
      post({ type: "error", message: errText(err) });
    }
    return;
  }

  if (d.type === "transcribe") {
    try {
      if (!asr) throw new Error("مدل شنیدن هنوز بارگذاری نشده.");
      const out = await asr(d.audio, {
        language: "persian",
        task: "transcribe",
        chunk_length_s: 30,
        return_timestamps: false,
      });
      post({ type: "result", id: d.id, text: ((out && out.text) || "").trim() });
    } catch (err) {
      post({ type: "terror", id: d.id, message: errText(err) });
    }
  }
};
