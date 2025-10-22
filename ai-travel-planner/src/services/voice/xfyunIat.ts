/**
 * XFYun IAT (Real-time ASR) front-end client
 * - Auth per https://www.xfyun.cn/doc/asr/voicedictation/API.html#接口调用流程
 * - WS: wss://iat-api.xfyun.cn/v2/iat
 * - Audio: 16kHz, 16bit PCM, mono, base64 frames with status 0/1/2
 */
type Callbacks = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error | string) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

function toRFC1123Date(d = new Date()): string {
  // GMT format, e.g. Mon, 06 Jan 2020 02:28:01 GMT
  return d.toUTCString();
}

async function hmacSHA256Base64Sync(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const algo = { name: 'HMAC', hash: 'SHA-256' } as HmacImportParams;
  const rawKey = enc.encode(key);
  const rawData = enc.encode(data);
  const k = await window.crypto.subtle.importKey('raw', rawKey, algo, false, ['sign']);
  const sig = await window.crypto.subtle.sign('HMAC', k, rawData);
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Audio utilities
function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  const targetRate = 16000;
  if (inputSampleRate === targetRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const sampleRateRatio = inputSampleRate / targetRate;
  const newLength = Math.round(input.length / sampleRateRatio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const s = accum / count;
    result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function pcm16ToBase64(pcm: Int16Array): string {
  // Convert to binary string then base64
  let binary = '';
  const bytes = new Uint8Array(pcm.buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class XFYunIAT {
  static async testConnection(opts: { appId: string; apiKey: string; apiSecret: string; timeoutMs?: number }): Promise<{ ok: boolean; message: string }> {
    try {
      const client = new XFYunIAT(opts);
      const url = await client.buildWsUrl();
      const timeout = Math.max(2000, Math.min(opts.timeoutMs || 5000, 10000));
      return await new Promise((resolve) => {
        let done = false;
        const ws = new WebSocket(url);
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          try { ws.close(); } catch {}
          resolve({ ok: false, message: '连接超时' });
        }, timeout);

        ws.onopen = () => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          try { ws.close(); } catch {}
          resolve({ ok: true, message: '连接成功' });
        };

        ws.onmessage = (evt) => {
          // 尝试解析服务端错误
          try {
            const data = JSON.parse((evt as MessageEvent).data as any);
            if (data && typeof data.code === 'number' && data.code !== 0) {
              const msg = data.message || `错误码: ${data.code}`;
              if (done) return;
              done = true;
              window.clearTimeout(timer);
              try { ws.close(); } catch {}
              resolve({ ok: false, message: `服务端返回错误：${msg}` });
            }
          } catch {}
        };

        ws.onerror = () => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve({ ok: false, message: 'WebSocket错误（鉴权或网络）' });
        };

        ws.onclose = (ev) => {
          // 如果未成功 open 就 close，返回更详细关闭原因
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          const reason = (ev && (ev as CloseEvent).reason) ? (ev as CloseEvent).reason : '连接被关闭';
          // 统一提示，保留具体 reason 以便排查
          resolve({ ok: false, message: reason || '连接被关闭' });
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误';
      return { ok: false, message: msg };
    }
  }

  private appId: string;
  private apiKey: string;
  private apiSecret: string;
  private ws?: WebSocket;
  private audioCtx?: AudioContext;
  private processor?: ScriptProcessorNode;
  private source?: MediaStreamAudioSourceNode;
  private started = false;
  private closed = false;
  private callbacks: Callbacks;
  private sendTimer?: number;

  constructor(opts: { appId: string; apiKey: string; apiSecret: string }, cb: Callbacks = {}) {
    this.appId = opts.appId;
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.callbacks = cb;
  }

  private async buildWsUrl(): Promise<string> {
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = toRFC1123Date();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signatureSha = await hmacSHA256Base64Sync(this.apiSecret, signatureOrigin);
    const authorization = `hmac api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const params = new URLSearchParams({
      authorization: btoa(authorization),
      date,
      host,
    });
    return `wss://${host}${path}?${params.toString()}`;
  }

  private sendFrame(status: 0 | 1 | 2, audioBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const frame: any = {
      common: { app_id: this.appId },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        vinfo: 1,
        vad_eos: 5000,
      },
      data: {
        status,
        format: 'audio/L16;rate=16000;channel=1',
        encoding: 'raw',
        audio: audioBase64,
      },
    };
    this.ws.send(JSON.stringify(frame));
  }

  private handleWsMessage = (evt: MessageEvent) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.code !== 0) {
        this.callbacks.onError?.(new Error(data.message || `xfyun error: ${data.code}`));
        return;
      }
      const ws = data.data?.result?.ws;
      if (Array.isArray(ws)) {
        let text = '';
        ws.forEach((blk: any) => {
          blk.cw?.forEach((cw: any) => { if (cw.w) text += cw.w; });
        });
        const isFinal = data.data?.result?.ls === true; // last sentence flag
        if (isFinal) this.callbacks.onFinal?.(text);
        else this.callbacks.onInterim?.(text);
      }
    } catch (e) {
      this.callbacks.onError?.(e as any);
    }
  };

  private async initAudio() {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioCtx.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated but widely supported; bufferSize 4096 for stability
    const bufferSize = 4096;
    this.processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (!this.started) return;
      const input = e.inputBuffer.getChannelData(0);
      // audioCtx is already 16k; still convert to PCM16
      const pcm = downsampleTo16k(input, this.audioCtx!.sampleRate);
      const b64 = pcm16ToBase64(pcm);
      // status: first frame should be 0, then 1; we implement by sending 0 once
      if (this.sendTimer === undefined) {
        this.sendFrame(0, b64);
        this.sendTimer = window.setTimeout(() => { /* marker to indicate started */ }, 0);
      } else {
        this.sendFrame(1, b64);
      }
    };
    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  async start() {
    if (this.started) return;
    this.closed = false;
    const url = await this.buildWsUrl();
    this.ws = new WebSocket(url);
    this.ws.onopen = async () => {
      try {
        await this.initAudio();
        this.started = true;
        this.callbacks.onStart?.();
      } catch (e) {
        this.callbacks.onError?.(e as any);
        this.stop();
      }
    };
    this.ws.onmessage = this.handleWsMessage;
    this.ws.onerror = (_event: Event) => {
      this.callbacks.onError?.(new Error('WebSocket error'));
    };
    this.ws.onclose = () => {
      this.callbacks.onEnd?.();
      this.cleanup();
    };
  }

  stop() {
    if (this.closed) return;
    this.closed = true;
    this.started = false;
    // send final frame
    try {
      this.sendFrame(2, '');
    } catch {}
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.close(); } catch {}
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.processor) {
      try { this.processor.disconnect(); } catch {}
      this.processor.onaudioprocess = null as any;
      this.processor = undefined;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = undefined;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = undefined;
    }
    if (this.sendTimer !== undefined) {
      window.clearTimeout(this.sendTimer);
      this.sendTimer = undefined;
    }
  }
}
