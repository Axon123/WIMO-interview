# Routes — Interview_Notes

The app has **no React Router**. Routing is a single `page` field in the global `appStore` (Zustand-style hand-rolled store in `src/store/appStore.ts`), with one of four values: `'home' | 'processing' | 'results' | 'settings'`. The switch happens in `src/App.tsx`.

## Route table

| Page state value | URL path | Component | What it renders |
|---|---|---|---|
| `'home'` | (no URL — SPA, default) | `src/pages/HomePage.tsx` | Upload zone + background info + "开始分析" CTA |
| `'processing'` | (no URL) | `src/pages/ProcessingPage.tsx` | 3-step pipeline indicator + live transcript + cancel/retry |
| `'results'` | (no URL) | `src/pages/ResultsPage.tsx` | Result header + 2-up grid of `WindowCard`s |
| `'settings'` | (no URL) | `src/pages/SettingsPage.tsx` | STT config card + Summary config card + Config management + Privacy notice |

## Where the route is set

`src/App.tsx` is the router:

```tsx
{page === 'home' && <HomePage />}
{page === 'processing' && <ProcessingPage />}
{page === 'results' && <ResultsPage />}
{page === 'settings' && <SettingsPage />}
```

`page` is read from `appStore`; navigation is done imperatively via `appStore.set({ page: 'home' })` (or `processing` / `results` / `settings`) — most commonly in button `onClick` handlers. The topbar "首页" / "设置" buttons are the global navigation entry points; "首页" also returns the user from processing/results.

## Key page summaries

- **HomePage** — Single-column upload form inside one `.card`. Dashed `.dropzone` (click or drag-and-drop), optional "面试背景信息" collapsible with 4 fields (position, company, round select, note), and a right-aligned "开始分析" button (disabled until a file is selected and both APIs are configured). May render a top banner "已有一次分析结果 →" if the user revisits after a previous run.
- **ProcessingPage** — Single card with a `<StepsProgress>` showing 3 horizontal steps (上传音频 → 音频转文字 → AI 总结复盘), an optional `.streaming-transcript` monospace box that fills as transcription chunks arrive, an error box with retry/back if any step fails, and a "取消" / "返回首页" button.
- **ResultsPage** — Top `.result-header` card (title + analyzed-at time + bg chips + 4 action buttons: 复制全部 / 导出 .md / 重新总结 / 重新分析), then a `.grid` of up to 9 `WindowCard`s (questions, weaknesses, strengths, suggestions, score, communication, pattern, checklist, transcript, plus optional `__unmatched`). Empty-state if no data.
- **SettingsPage** — `<h1>设置</h1>` + sub-text, then 4 cards stacked: STT config (8 fields incl. provider/apiType/baseUrl/apiKey/model/language/maxSize/MiMo dev-proxy), Summary config (provider/baseUrl/apiKey/model/temperature/maxTokens/systemPrompt), Config management (export/import JSON), Privacy notice (warning card).
