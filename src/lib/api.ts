/**
 * API 层：直连 OpenAI 兼容接口（浏览器 fetch，需服务商允许 CORS）。
 * - 转写：POST {baseUrl}/audio/transcriptions（Whisper 系）
 * - 总结：POST {baseUrl}/chat/completions
 */
import type { BackgroundInfo, SttConfig, SummaryConfig } from '../config/constants'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.status ? `${e.message}（HTTP ${e.status}）` : e.message
  if (e instanceof TypeError) {
    // fetch 网络层失败：连接被拒 / DNS 失败 / 代理拦截 / 混合内容等，统一翻译成可操作的提示
    return '网络请求失败（Failed to fetch）：请检查网络连接与代理设置，并确认 Base URL 可访问（可在浏览器地址栏直接打开验证）；若配置指向本地服务（如 localhost），请确认该服务已启动'
  }
  if (e instanceof Error) return e.message
  return String(e)
}

export function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError'
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data?.error?.message || data?.message || res.statusText
  } catch {
    return res.statusText
  }
}

/** 组合外部取消信号 + 120s 超时（AbortSignal.any 需现代浏览器） */
function combinedSignal(signal?: AbortSignal): AbortSignal {
  const S = globalThis.AbortSignal as typeof AbortSignal & { any?: (...s: AbortSignal[]) => AbortSignal; timeout?: (ms: number) => AbortSignal }
  if (typeof S.any === 'function' && typeof S.timeout === 'function') {
    return S.any([S.timeout(120_000), ...(signal ? [signal] : [])])
  }
  return signal ?? new AbortController().signal
}

/** 从 chat/completions 响应中提取文本内容（兼容字符串与片段数组两种返回） */
function extractContentText(data: { choices?: { message?: { content?: unknown } }[] }): string {
  const content = data.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => (c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : String(c)))
      .join('')
  }
  throw new ApiError('接口返回了无法识别的内容')
}

/** 分片参数：超过接口限制时按 180 秒一段、16kHz 单声道切片。
 * 每片 PCM = 180s × 16kHz × 2B ≈ 5.49MB，Base64 后 ≈ 7.32MB，稳在对话式接口（如 MiMo）10MB 限制内 */
const CHUNK_SECONDS = 180
const CHUNK_SAMPLE_RATE = 16000

/** 转写进度回调（分片时逐段上报） */
export type ProgressFn = (msg: string) => void

/** 转写分片回调：每段（或者单文件）转写完成后拿到该段文字，供前端实时显示。
 *  多次回调会按转写顺序触发，调用方负责把多段文字按顺序拼接成最终 transcript。 */
export type ChunkFn = (chunk: string) => void

/**
 * 音频转文字。按配置的接口协议分流：
 * - transcriptions：POST {baseUrl}/audio/transcriptions，multipart 上传（Whisper 风格）
 * - chat-audio：POST {baseUrl}/chat/completions，音频 base64 放在消息的 input_audio 里（如小米 MiMo）
 * 文件超过「最大文件大小」配置时自动分片转写后合并结果。
 * onChunkText 在每段（单文件视为 1 段）转写完成后立即触发，可用于前端实时打印逐字稿。
 */
export async function transcribeAudio(
  config: SttConfig,
  file: File,
  signal?: AbortSignal,
  onProgress?: ProgressFn,
  onChunkText?: ChunkFn,
): Promise<string> {
  if (!config.baseUrl) throw new ApiError('未配置转写 API 的 Base URL，请前往设置页')
  if (!config.apiKey) throw new ApiError('未配置转写 API Key，请前往设置页')
  if (!config.model) throw new ApiError('未配置转写模型，请前往设置页')

  const limitBytes = Math.max(1, config.maxSizeMb || 25) * 1024 * 1024
  if (file.size <= limitBytes) {
    const text = config.apiType === 'chat-audio' ? await transcribeViaChat(config, file, signal) : await transcribeViaUpload(config, file, signal)
    onChunkText?.(text)
    return text
  }
  return transcribeByChunks(config, file, signal, onProgress, onChunkText)
}

/**
 * 段内去重：ASR 在长音频上容易进入循环重复（同一句话反复出现几十次）。
 * 两步走：
 *   1. 句级去重：按句号/问号等强边界切分，长度 ≥ minLen 的句子如果之前出现过就丢弃。
 *      短句（"嗯""好"）不参与去重，避免误伤。
 *   2. 连续子串去重：处理"X X X"模式——同一子串在文本中连续重复 ≥ 2 次，保留 1 份删掉其余。
 *      能抓住没句号的长段循环重复（如"在minio需要把这些呃切片合成...在minio需要把这些呃切片合成..."）。
 */
export function dedupeWithinChunk(text: string, minLen = 15): string {
  if (!text) return text
  let out = dedupeBySentences(text, minLen)
  out = dedupeConsecutiveRepeats(out, minLen)
  return out
}

function dedupeBySentences(text: string, minLen: number): string {
  const sentences = text.split(/(?<=[。！？!?；;])/g)
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of sentences) {
    const trimmed = s.trim()
    if (trimmed.length >= minLen) {
      if (seen.has(trimmed)) continue
      seen.add(trimmed)
    }
    out.push(s)
  }
  return out.join('')
}

function dedupeConsecutiveRepeats(text: string, minLen: number): string {
  // 反复迭代直到没有新的连续重复（处理"X X X X"这种 ≥3 次的）
  let prev: string
  do {
    prev = text
    // 从较长子串开始扫，命中后整段会被截短，短的会被覆盖
    for (let len = Math.min(200, Math.floor(text.length / 2)); len >= minLen; len--) {
      let i = 0
      while (i + len * 2 <= text.length) {
        const a = text.slice(i, i + len)
        // 看从 i+len 开始连续几次等于 a
        let end = i + len
        while (end + len <= text.length && text.slice(end, end + len) === a) {
          end += len
        }
        if (end > i + len) {
          // 命中：删掉 end 之后所有重复
          text = text.slice(0, i + len) + text.slice(end)
          // 不 i++，从去重后位置继续扫（可能还嵌着更短的重复）
        } else {
          i++
        }
      }
    }
  } while (text !== prev)
  return text
}

/**
 * 段间去重：硬切分片时，相邻段的开头常常"幻觉"出前一段末尾的内容（或与前段尾巴重叠），
 * 导致转写稿里同一句话在两段之间出现两次。这里用暴力法找 prev 末尾和 chunk 开头
 * 的最长公共子串（≥ minOverlap 才认为是重叠），把 chunk 头部的重叠部分去掉。
 * 限制搜索范围在 prev 末尾 80 字 / chunk 开头 200 字内，O(80*200) 几乎无开销。
 */
export function stripOverlap(prev: string, chunk: string, minOverlap = 10): string {
  if (!prev || !chunk) return chunk
  const prevTail = prev.slice(-80)
  const chunkHead = chunk.slice(0, 200)
  let best = 0
  for (let i = 0; i < prevTail.length; i++) {
    for (let j = 0; j < chunkHead.length; j++) {
      let k = 0
      while (i + k < prevTail.length && j + k < chunkHead.length && prevTail[i + k] === chunkHead[j + k]) k++
      if (k >= minOverlap && k > best) best = k
    }
  }
  return best > 0 ? chunk.slice(best) : chunk
}

/** 大文件自动分片：解码 → 重采样 16kHz 单声道 → 按时长切片 → 逐段转写 → 合并 */
async function transcribeByChunks(
  config: SttConfig,
  file: File,
  signal?: AbortSignal,
  onProgress?: ProgressFn,
  onChunkText?: ChunkFn,
): Promise<string> {
  let buffer: AudioBuffer
  try {
    buffer = await decodeAudioFile(file)
  } catch {
    throw new ApiError(
      `音频文件超过接口限制（约 ${Math.round((Math.max(1, config.maxSizeMb || 25) * 1024 * 1024) / 1024 / 1024 * 10) / 10}MB），且浏览器无法解码该格式以自动分片，请压缩音频或转成 wav / mp3 后再试`,
    )
  }

  const mono = resampleToMono(buffer, CHUNK_SAMPLE_RATE)
  const chunkSamples = CHUNK_SAMPLE_RATE * CHUNK_SECONDS
  const total = Math.ceil(mono.length / chunkSamples)
  const parts: string[] = []

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const slice = mono.subarray(i * chunkSamples, (i + 1) * chunkSamples)
    const partFile = new File([encodeWav(toInt16(slice), CHUNK_SAMPLE_RATE)], `part-${i + 1}.wav`, { type: 'audio/wav' })
    onProgress?.(`文件超过接口限制，已自动分片：正在转写第 ${i + 1}/${total} 段…`)
    const text =
      config.apiType === 'chat-audio'
        ? await transcribeViaChat(config, partFile, signal)
        : await transcribeViaUpload(config, partFile, signal)
    let chunk = text.trim()
    // 段内去重：去掉 ASR 循环重复的句子
    chunk = dedupeWithinChunk(chunk)
    // 段间去重：去掉与前一段末尾重叠的部分
    if (i > 0 && parts.length > 0) chunk = stripOverlap(parts[parts.length - 1], chunk)
    parts.push(chunk)
    // 实时回调本段文字（供前端边转边显示），即使 chunk 为空也回调，让调用方知道本段已结束
    onChunkText?.(chunk)
  }
  onProgress?.(`分片转写完成，共 ${total} 段`)
  return parts.filter(Boolean).join('\n')
}

/** 浏览器解码音频文件（wav / mp3 / m4a / ogg / flac 等浏览器支持的格式） */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext()
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer())
  } finally {
    void ctx.close()
  }
}

/** 供 node 单测使用的 AudioBuffer 最小接口 */
export interface AudioLike {
  sampleRate: number
  numberOfChannels: number
  length: number
  getChannelData(channel: number): Float32Array
}

/** 重采样为单声道（多声道取平均，线性插值），输出目标采样率 */
export function resampleToMono(buffer: AudioLike, targetRate: number): Float32Array {
  const inRate = buffer.sampleRate
  const nCh = buffer.numberOfChannels
  const nIn = buffer.length
  const nOut = Math.ceil((nIn * targetRate) / inRate)
  const out = new Float32Array(nOut)
  const ratio = inRate / targetRate
  for (let i = 0; i < nOut; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, nIn - 1)
    const frac = pos - i0
    let sum = 0
    for (let ch = 0; ch < nCh; ch++) {
      const data = buffer.getChannelData(ch)
      sum += data[i0] * (1 - frac) + data[i1] * frac
    }
    out[i] = sum / nCh
  }
  return out
}

/** Float32 [-1,1] → Int16 PCM */
export function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
  }
  return out
}

/** Whisper 风格：multipart 上传接口 */
async function transcribeViaUpload(config: SttConfig, file: File, signal?: AbortSignal): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('model', config.model)
  fd.append('response_format', 'json')
  if (config.language) fd.append('language', config.language)

  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: fd,
    signal: combinedSignal(signal),
  })
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status)
  const data = (await res.json()) as { text?: string }
  const text = (data.text ?? '').trim()
  if (!text) throw new ApiError('转写返回了空结果，请检查音频是否包含有效语音')
  return text
}

/** 对话式接口：音频以 base64 data URL 形式放入消息内容（如小米 MiMo 的 input_audio） */
async function transcribeViaChat(config: SttConfig, file: File, signal?: AbortSignal): Promise<string> {
  const audioData = await fileToBase64DataUrl(file)
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: audioData } }] }],
    stream: false,
  }
  // MiMo 等对话式接口用 asr_options.language 指定识别语言
  if (config.language) body.asr_options = { language: config.language }

  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal: combinedSignal(signal),
  })
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status)
  const text = extractContentText((await res.json()) as { choices?: { message?: { content?: unknown } }[] }).trim()
  if (!text) throw new ApiError('转写返回了空结果，请检查音频是否包含有效语音')
  return text
}

/** 文件转 base64 data URL（分块拼接，避免大文件时栈溢出）。
 * MIME 按扩展名映射，不信任 file.type：浏览器常把 wav 标成 audio/x-wav、
 * mp3 标成 audio/mp3，而对话式接口（如 MiMo）要求 audio/wav / audio/mpeg。 */
async function fileToBase64DataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mimeForFile(file)};base64,${btoa(bin)}`
}

function mimeForFile(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'wav') return 'audio/wav'
  return file.type || 'audio/wav'
}

/** AI 总结（Chat Completions 兼容） */
export async function summarize(
  config: SummaryConfig,
  transcript: string,
  background: BackgroundInfo,
  signal?: AbortSignal,
): Promise<string> {
  if (!config.baseUrl) throw new ApiError('未配置总结 API 的 Base URL，请前往设置页')
  if (!config.apiKey) throw new ApiError('未配置总结 API Key，请前往设置页')
  if (!config.model) throw new ApiError('未配置总结模型，请前往设置页')

  const bgLines: string[] = []
  if (background.position) bgLines.push(`- 应聘职位：${background.position}`)
  if (background.company) bgLines.push(`- 目标公司：${background.company}`)
  if (background.round) bgLines.push(`- 面试轮次：${background.round}`)
  if (background.note) bgLines.push(`- 备注：${background.note}`)

  const parts: string[] = []
  if (bgLines.length) parts.push(`面试背景信息：\n${bgLines.join('\n')}`)
  parts.push(`以下是本次面试的逐字稿：\n\n${transcript}`)

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: parts.join('\n\n') },
    ],
    stream: false,
  }
  if (Number.isFinite(config.temperature)) body.temperature = config.temperature
  if (Number.isFinite(config.maxTokens) && config.maxTokens > 0) body.max_tokens = config.maxTokens

  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal: combinedSignal(signal),
  })
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status)
  return extractContentText((await res.json()) as { choices?: { message?: { content?: unknown } }[] }).trim()
}

/** 总结连接测试：发一条最小请求验证连通性 */
export async function testSummaryConnection(config: SummaryConfig): Promise<string> {
  if (!config.baseUrl || !config.apiKey || !config.model) throw new ApiError('请先填写完整的 Base URL / API Key / 模型')
  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: '请只回复：连接成功' }], max_tokens: 16 }),
    signal: combinedSignal(),
  })
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status)
  return '连接成功'
}

/** 转写连接测试：本地合成一段 1 秒测试音，走真实转写接口验证连通性 */
export async function testSttConnection(config: SttConfig): Promise<string> {
  await transcribeAudio(config, await makeToneFile())
  return '连接成功'
}

/** 用 Web Audio 合成 1 秒正弦波 WAV，用于转写连通性测试（纯本地，不产生网络流量） */
async function makeToneFile(): Promise<File> {
  const sampleRate = 16000
  const seconds = 1
  const n = sampleRate * seconds
  const samples = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = Math.round(0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0x7fff)
  }
  const wav = encodeWav(samples, sampleRate)
  return new File([wav], 'test-tone.wav', { type: 'audio/wav' })
}

/** 网络诊断结果项 */
export interface DiagItem {
  name: string
  ok: boolean
  detail: string
}

/**
 * 网络诊断：分别用小请求体 / 大请求体 / 大请求体+超时信号直连转写接口，
 * 用于区分「网络层问题（Failed to fetch）」与「配置/服务器问题（HTTP 状态码）」。
 * 只要服务器有响应（任何 HTTP 状态码）即视为网络通。
 */
export async function runNetworkDiagnostics(config: SttConfig): Promise<DiagItem[]> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey || 'diag-key'}` }
  const items: DiagItem[] = []

  const run = async (name: string, body: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: signal ?? combinedSignal() })
      items.push({ name, ok: true, detail: `HTTP ${res.status}（服务器已响应${res.status === 401 ? '；若已填真实 Key 仍 401 则 Key 无效' : ''}）` })
    } catch (e) {
      items.push({ name, ok: false, detail: errMsg(e) })
    }
  }

  await run('① 小请求体（无音频）', JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'hi' }] }))
  await run('② 大请求体（60 秒音频）', await makeDiagAudioBody(config.model))
  await run('③ 大请求体 + 超时信号', await makeDiagAudioBody(config.model), combinedSignal())
  return items
}

/** 生成 60 秒 16kHz 单声道 wav 的 chat 请求体（≈2.56MB Base64，用于诊断大请求体场景） */
async function makeDiagAudioBody(model: string): Promise<string> {
  const sampleRate = 16000
  const seconds = 60
  const samples = new Int16Array(sampleRate * seconds)
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.round(0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0x7fff)
  }
  const bytes = new Uint8Array(encodeWav(samples, sampleRate))
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return JSON.stringify({
    model,
    messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:audio/wav;base64,${btoa(bin)}` } }] }],
  })
}

/** Int16 PCM + 44 字节 WAV 头编码（单声道） */
export function encodeWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  writeStr(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, samples[i], true)
  return buf
}
