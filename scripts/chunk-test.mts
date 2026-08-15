/** 临时单测：分片转写的纯函数（重采样 / Int16 转换 / WAV 编码 / 分片大小），跑完即弃 */
import { resampleToMono, toInt16, encodeWav } from '../src/lib/api.ts'

let failed = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

// 1. 重采样：时长比例正确（44.1kHz → 16kHz，约 2.756 倍缩短）
{
  const rate = 44100
  const seconds = 10
  const ch = new Float32Array(rate * seconds).fill(0.5)
  const buf = { sampleRate: rate, numberOfChannels: 1, length: ch.length, getChannelData: () => ch }
  const out = resampleToMono(buf, 16000)
  check('重采样：长度 = ceil(10s × 16k)', out.length === Math.ceil((rate * seconds * 16000) / rate))
  check('重采样：幅度保持不变（0.5）', Math.abs(out[0] - 0.5) < 1e-6)
}

// 2. 多声道取平均（左 0.2 右 1.0 → 0.6）
{
  const ch0 = new Float32Array(16000).fill(0.2)
  const ch1 = new Float32Array(16000).fill(1.0)
  const buf = { sampleRate: 16000, numberOfChannels: 2, length: 16000, getChannelData: (i: number) => (i === 0 ? ch0 : ch1) }
  const out = resampleToMono(buf, 16000)
  check('重采样：双声道取平均', Math.abs(out[100] - 0.6) < 1e-6)
}

// 3. toInt16 裁剪与符号
{
  const s = toInt16(new Float32Array([-1, -0.5, 0, 0.5, 1, 2]))
  check('toInt16：范围裁剪', s[0] === -32768 && s[5] === 32767)
  check('toInt16：零点正确', s[2] === 0)
  check('toInt16：正负不对称（-32768/32767）', s[1] === -16384 && s[3] === 16384)
}

// 4. WAV 编码：44 字节头 + PCM
{
  const samples = toInt16(new Float32Array(160).fill(0))
  const wav = encodeWav(samples, 16000)
  const v = new DataView(wav)
  const tag = (o: number, len: number) => String.fromCharCode(...new Uint8Array(wav, o, len))
  check('WAV：RIFF/WAVE 标记', tag(0, 4) === 'RIFF' && tag(8, 4) === 'WAVE')
  check('WAV：大小 = 44 + 数据', wav.byteLength === 44 + samples.length * 2)
  check('WAV：采样率字段', v.getUint32(24, true) === 16000)
  check('WAV：单声道 16bit', v.getUint16(22, true) === 1 && v.getUint16(34, true) === 16)
}

// 5. 分片大小核算：180s × 16kHz × 2B = 5,760,000B（≈5.49MB）→ Base64 ≈7.32MB < 10MB
{
  const pcmBytes = 180 * 16000 * 2
  const base64Bytes = Math.ceil(pcmBytes / 3) * 4
  check('分片：每片 Base64 ≈7.32MB < 10MB 限制', base64Bytes <= 10 * 1024 * 1024)
  check('分片：每片 PCM 约 5.49MB', Math.round((pcmBytes / 1024 / 1024) * 100) / 100 === 5.49)
}

console.log(failed === 0 ? '\n全部通过 ✓' : `\n${failed} 个用例失败 ✗`)
process.exit(failed === 0 ? 0 : 1)
