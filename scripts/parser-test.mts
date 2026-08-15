/** 临时单测：验证 markdown 解析器（node --experimental-strip-types 直接跑，跑完即弃） */
import { parseSummary } from '../src/lib/markdown.ts'
import type { WindowSpec } from '../src/lib/markdown.ts'

const specs: WindowSpec[] = [
  { key: 'questions', title: '面试问题总结' },
  { key: 'weaknesses', title: '薄弱/错误总结' },
  { key: 'strengths', title: '表现亮点' },
  { key: 'suggestions', title: '改进建议' },
  { key: 'score', title: '综合评分' },
  { key: 'communication', title: '沟通表达分析' },
  { key: 'pattern', title: '提问模式与追问分析' },
  { key: 'checklist', title: '下次准备清单' },
]

let failed = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

// 1. 标准输出：key 与窗口清单一致
{
  const r = parseSummary(
    [
      '# 面试问题总结',
      '- 问题一',
      '- 问题二',
      '',
      '# 薄弱/错误总结',
      '1. 答非所问',
      '',
      '# 表现亮点',
      '（无）',
    ].join('\n'),
    specs,
  )
  check('标准：面试问题总结 → questions key', r.windows['questions'] === '- 问题一\n- 问题二')
  check('标准：薄弱/错误总结 → weaknesses key', r.windows['weaknesses'] === '1. 答非所问')
  check('标准：表现亮点保留（无）', r.windows['strengths'] === '（无）')
  check('标准：无多余窗口', Object.keys(r.windows).length === 3)
  check('标准：无 unmatched', r.unmatched.length === 0)
}

// 2. 容错：标题带「窗口1：」前缀和中文冒号
{
  const r = parseSummary('# 窗口1：面试问题总结：\n内容A\n\n# 薄弱/错误总结。\n内容B', specs)
  check('容错：窗口1：前缀', r.windows['questions'] === '内容A')
  check('容错：结尾句号', r.windows['weaknesses'] === '内容B')
}

// 3. 未匹配标题 + 开头引言
{
  const r = parseSummary('这是开头引言\n\n# 不存在的窗口\n内容X\n\n# 面试问题总结\n内容Y', specs)
  check('未知标题进入 unmatched', r.unmatched.length === 2)
  check('未知标题内容保留', r.unmatched[0].includes('内容X'))
  check('开头引言保留', r.unmatched.some((u) => u.includes('这是开头引言')))
  check('已知窗口仍解析', r.windows['questions'] === '内容Y')
}

// 4. 代码块包裹
{
  const r = parseSummary('```markdown\n# 面试问题总结\n内容\n```', specs)
  check('代码块包裹可解析', r.windows['questions'] === '内容')
}

// 5. 二级标题不切分
{
  const r = parseSummary('# 综合评分\n## 维度一\n9 分\n## 维度二\n8 分', specs)
  check('二级标题留在窗口内', r.windows['score'] === '## 维度一\n9 分\n## 维度二\n8 分')
}

// 6. 无一级标题
{
  const r = parseSummary('纯文本没有标题', specs)
  check('无标题时全部进 unmatched', r.unmatched.length === 1 && r.unmatched[0].includes('纯文本'))
  check('无标题时无窗口', Object.keys(r.windows).length === 0)
}

console.log(failed === 0 ? '\n全部通过 ✓' : `\n${failed} 个用例失败 ✗`)
process.exit(failed === 0 ? 0 : 1)
