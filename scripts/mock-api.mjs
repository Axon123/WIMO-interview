/**
 * 临时 mock：本地模拟 OpenAI 兼容接口（转写 + 总结），用于 E2E 冒烟测试，测完即弃。
 * 启动：node scripts/mock-api.mjs  （监听 8787 端口）
 */
import { createServer } from 'node:http'

const SAMPLE_TRANSCRIPT = `面试官：你好，请先做个自我介绍。
候选人：我是张三，有五年前端开发经验，做过电商和 SaaS 项目。
面试官：讲讲你最有挑战的一个项目。
候选人：是去年做的权限系统重构，涉及多租户，比较有挑战。
面试官：如果让你重新做一遍，你会怎么改进？
候选人：会先做更充分的技术调研，减少返工。`

const SAMPLE_SUMMARY = `# 面试问题总结
- 自我介绍与项目经历介绍
- 最有挑战的项目（追问：挑战点、改进方向）

# 薄弱/错误总结
1. 自我介绍缺乏结构化表达，信息密度低；
2. 对「权限系统重构」的挑战描述偏笼统，未说明技术难点。

# 表现亮点
- 回答「重做一遍会怎么改进」时给出了具体改进方向，态度积极。

# 改进建议
- 用 STAR 框架组织项目经历：情境 → 任务 → 行动 → 结果；
- 自我介绍控制在 60 秒内，突出与岗位匹配的关键词。

# 综合评分
| 维度 | 得分 |
| --- | --- |
| 逻辑表达 | 7 / 10 |
| 技术深度 | 6 / 10 |
| 项目阐述 | 7 / 10 |
| 沟通应变 | 8 / 10 |

**总分：7 / 10** — 整体表现良好，主要短板是项目经历的结构化表达。

# 沟通表达分析
- 整体语速适中，无明显口头禅；
- 有两处较长停顿，出现在被追问时。

# 提问模式与追问分析
- 面试官偏好对项目经历进行深挖式追问；
- 高频考察点：项目难点、改进空间。

# 下次准备清单
- [ ] 用 STAR 框架重写项目经历讲稿
- [ ] 准备 2 个失败案例
- [ ] 复习权限系统相关知识点（RBAC、多租户隔离）`

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/v1/audio/transcriptions') {
    let size = 0
    req.on('data', (c) => (size += c.length))
    req.on('end', () => {
      console.log(`[mock] transcriptions, body ~${size}B`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ text: SAMPLE_TRANSCRIPT }))
    })
    return
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      console.log(`[mock] chat/completions, body ~${body.length}B`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: SAMPLE_SUMMARY } }],
        }),
      )
    })
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(8787, () => console.log('mock OpenAI API listening on http://localhost:8787'))
