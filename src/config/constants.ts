/**
 * 全局常量：窗口清单、服务商预设、默认配置、默认提示词。
 * 注意：总结模型输出的「一级标题」必须与 WINDOWS 中的标题一致，
 * 解析器（markdown.ts）与默认提示词（buildDefaultPrompt）共用这一份清单，避免不同步。
 */

export interface WindowDef {
  key: string
  title: string
  description: string
}

/** 结果页窗口清单（9 个） */
export const WINDOWS: WindowDef[] = [
  { key: 'questions', title: '面试问题总结', description: '面试官问了哪些问题，按主题分类整理' },
  { key: 'weaknesses', title: '薄弱/错误总结', description: '逻辑不清、答非所问、知识盲区等，标注原文依据' },
  { key: 'strengths', title: '表现亮点', description: '回答得当、结构清晰的地方' },
  { key: 'suggestions', title: '改进建议', description: '针对薄弱点的具体可执行建议' },
  { key: 'score', title: '综合评分', description: '分维度评分与总评（Markdown 表格）' },
  { key: 'communication', title: '沟通表达分析', description: '口头禅、停顿、语速、语气等' },
  { key: 'pattern', title: '提问模式与追问分析', description: '面试官的提问风格与考察重点' },
  { key: 'checklist', title: '下次准备清单', description: '针对下次面试的准备项（Checklist）' },
  { key: 'transcript', title: '完整逐字稿', description: '转写全文（前端直接填入，不经过总结模型）' },
]

/** 需要总结模型生成的窗口（完整逐字稿由前端直接填入，避免模型重复输出长文本浪费 token） */
export const MODEL_WINDOWS: WindowDef[] = WINDOWS.filter((w) => w.key !== 'transcript')

/** 生成默认 System Prompt：窗口标题与解析器共用同一份清单 */
export function buildDefaultPrompt(): string {
  const headings = MODEL_WINDOWS.map((w) => `# ${w.title}`).join('\n')
  return [
    '你是一名资深的面试复盘教练。用户会提供一场面试录音的逐字稿，以及可选的面试背景信息。',
    '请基于逐字稿内容进行专业、客观、具体的复盘，帮助用户改进下一次面试表现。',
    '',
    '输出要求：',
    '1. 严格按以下顺序输出各窗口内容，每个窗口必须且只能以一级标题（# 开头）开始，一级标题文字必须与下方给出的窗口名完全一致；',
    '2. 不要输出任何其他一级标题，不要输出开头引言、结尾总结或其他多余文字；',
    '3. 内容使用规范的 Markdown 语法（列表、加粗、表格、代码块等），分点、具体、可执行；引用逐字稿原文时用「」标注；',
    '4. 每个窗口都要有实质内容；某个窗口确实没有可写内容时，写：（无）。',
    '',
    '【面试问题总结】窗口特别要求（重要，必须严格遵守）：',
    '- 按**时间顺序**逐题列出**每一道**面试官问的问题；',
    '- **绝对不要**把多道问题合并成"项目类问题""技术类问题""HR 类问题"等主题分类，必须一题一项；',
    '- 用有序列表，每题一行：`1. <问题描述>` `2. <问题描述>` `3. <问题描述>` ……；',
    '- 自我介绍、寒暄等非问题性对话不计入编号；',
    '- 哪怕面试官追问的相似问题，也要分别列出，不要合并。',
    '',
    '需要输出的窗口：',
    headings,
  ].join('\n')
}

/** 服务商预设（OpenAI 兼容接口）。选择预设只填充 Base URL 与默认模型，其余可手动修改 */
export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  sttModel: string
  summaryModel: string
  apiType?: SttApiType
  note: string
}

/** 仅暴露给 STT 下拉的服务商 id 列表 */
export const STT_PROVIDER_IDS = ['mimo', 'custom'] as const

export const PROVIDERS: ProviderPreset[] = [
  {
    id: 'mimo',
    name: 'MiMo（小米）',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    sttModel: 'mimo-v2.5-asr',
    summaryModel: '',
    apiType: 'chat-audio',
    note: '语音识别为对话式接口，仅支持 wav / mp3，Base64 后 ≤10MB（约合源文件 7.5MB），建议把最大文件大小改为 7',
  },
  { id: 'custom', name: '自定义', baseUrl: '', sttModel: '', summaryModel: '', note: '填写任意 OpenAI 兼容接口' },
  // 备用服务商（暂未在 STT 下拉中暴露，可在自定义或总结中使用）
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', sttModel: 'whisper-1', summaryModel: 'gpt-4o-mini', note: '' },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', sttModel: 'whisper-large-v3-turbo', summaryModel: 'llama-3.3-70b-versatile', note: '转写速度快，有免费额度' },
  { id: 'siliconflow', name: 'SiliconFlow 硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', sttModel: 'FunAudioLLM/SenseVoiceSmall', summaryModel: 'Qwen/Qwen2.5-72B-Instruct', note: '国内可直连，有免费模型' },
  { id: 'deepseek', name: 'DeepSeek（仅总结）', baseUrl: 'https://api.deepseek.com/v1', sttModel: '', summaryModel: 'deepseek-chat', note: '不提供语音转文字，仅适合作总结模型' },
]

export const LANGUAGES: { value: string; label: string }[] = [
  { value: '', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'yue', label: '粤语' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
]

/** 转写接口协议：Whisper 风格上传接口 / 对话式音频输入接口（如小米 MiMo） */
export type SttApiType = 'transcriptions' | 'chat-audio'

export interface SttConfig {
  providerId: string
  baseUrl: string
  apiKey: string
  model: string
  /** 识别语言，'' 表示不传（由服务商自动检测） */
  language: string
  /** 接口协议 */
  apiType: SttApiType
  /** 允许上传的最大文件大小（MB），按服务商限制设置（默认 25，MiMo 等对话式接口通常更小） */
  maxSizeMb: number
}

export interface SummaryConfig {
  providerId: string
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export interface AppConfig {
  stt: SttConfig
  summary: SummaryConfig
}

export interface BackgroundInfo {
  position: string
  company: string
  round: string
  note: string
}

export const EMPTY_BACKGROUND: BackgroundInfo = { position: '', company: '', round: '', note: '' }

export function defaultConfig(): AppConfig {
  return {
    stt: {
      providerId: 'mimo',
      baseUrl: 'https://api.xiaomimimo.com/v1',
      apiKey: '',
      model: 'mimo-v2.5-asr',
      language: '',
      apiType: 'chat-audio',
      maxSizeMb: 7,
    },
    summary: {
      providerId: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt: buildDefaultPrompt(),
    },
  }
}

export const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm', 'aac', 'opus']
export const ALLOWED_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.flac,.ogg,.webm,.aac,.opus'
