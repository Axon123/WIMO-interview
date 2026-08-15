# Design System — Interview_Notes (Modern Minimal)

This is the design intent that all Superdesign-generated drafts should follow. The current product uses a light, low-contrast "indigo on cool gray" SaaS look; the **target** is a **modern minimal** overhaul — fewer borders, more whitespace, tighter type, a single calm accent, and subtle motion.

## 1. Product context

- **Product**: 面试录音复盘助手 (Interview Recording Review Assistant) — a privacy-first, browser-only web app. Users upload an interview audio file, an AI transcribes it (STT), then summarizes it into 8 review windows. All config and history live in `localStorage`; no backend.
- **Primary user**: a Chinese-speaking job seeker who records their mock or real interviews and wants structured self-review (questions asked, weaknesses, strengths, suggestions, score, communication patterns, follow-up checklist, full transcript).
- **Jobs to be done**:
  1. Upload an audio file quickly (drag-drop, see warnings before starting).
  2. Watch the pipeline run with a calm, informative progress view.
  3. Read the review windows in a clean grid and copy/export each as Markdown to their note tool.
  4. Configure STT and Summary APIs independently (OpenAI-compatible).
  5. Browse past review sessions in a left rail.
- **Platform**: desktop-first, 1200px main column, responsive down to mobile (sidebar becomes overlay, grid collapses to 1 col).

## 2. Visual direction — Modern Minimal

**One-liner**: calm, breathable, restrained. Single accent, generous spacing, low surface noise, friendly type.

### Principles
- **Whitespace is the layout.** Cards have larger internal padding (24–32px) and more separation (24–32px between cards). Sections breathe.
- **One accent color.** Use a single brand color (deep indigo or near-black) for the active state, primary action, and links. Reserve color for state (success/error/warning) only.
- **Borders are quieter.** Replace hard 1px hairlines with a slightly off-white separator or a barely-there 1px in `--border` (`#e4e7ee` or even lighter). Drop the dashed borders.
- **Shadows are softer / fewer.** Use a single low-spread shadow (e.g. `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)`) only on elevated surfaces; default cards can be flat with a hairline border.
- **Type is the hierarchy.** Title sizes step more clearly (e.g. 28 / 18 / 14). Body is 14/1.6. Numbers (step counts, char counts) use tabular figures.
- **Motion is purposeful and brief.** Hover and state changes use 120–180ms ease-out; no bouncy or attention-grabbing animation. The processing "pulse" becomes a calmer breath (longer period, gentler expansion).
- **Iconography is line-only.** Replace emoji-as-icon with a small set of 1.5–2px stroke line icons (lucide / heroicons / feather style). The 🎙️ brand mark can stay as a custom monogram or a single line icon at the topbar.

### Color tokens (proposed for the redesign)

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#fafafa` | Off-white app background, not blue-gray |
| `--surface` | `#ffffff` | Cards |
| `--surface-muted` | `#f5f5f5` | Sidebar / input backgrounds |
| `--border` | `#eaeaea` | Hairline, even lighter than current |
| `--border-strong` | `#d4d4d4` | Inputs, focus rings, dividers |
| `--text` | `#0a0a0a` | Near-black, not blue-tinted |
| `--text-2` | `#737373` | Muted |
| `--text-3` | `#a3a3a3` | Hint / disabled |
| `--accent` | `#4f46e5` | Single deep indigo (one shade, not a scale) |
| `--accent-weak` | `#eef2ff` | Tinted backgrounds (active, hover) |
| `--accent-fg` | `#ffffff` | On-accent text |
| `--success` | `#16a34a` | Same as current |
| `--danger` | `#dc2626` | Same as current |
| `--warning` | `#d97706` | Same as current |
| `--radius-sm` | `6px` | Chips, small buttons |
| `--radius` | `10px` | Inputs, buttons |
| `--radius-lg` | `16px` | Cards, dropzone |
| `--shadow-sm` | `0 1px 2px rgba(10,10,10,.04)` | Hover/elevation |
| `--shadow` | `0 1px 2px rgba(10,10,10,.04), 0 8px 24px rgba(10,10,10,.04)` | Cards, popovers |
| `--space-1` | `4px` | Tight |
| `--space-2` | `8px` | Inline |
| `--space-3` | `12px` | Component |
| `--space-4` | `16px` | Card padding (sm) |
| `--space-6` | `24px` | Card padding (default) |
| `--space-8` | `32px` | Section gap (default) |
| `--space-10` | `40px` | Hero / top spacing |
| `--space-12` | `48px` | Page padding top/bottom |

### Type scale

| Role | Size | Weight | Letter spacing |
|---|---|---|---|
| Display (page hero) | 28px | 600 | -0.01em |
| H1 (page title) | 22px | 600 | -0.005em |
| H2 (card title) | 16px | 600 | 0 |
| Body | 14px | 400 | 0 |
| Small / meta | 13px | 400 | 0 |
| Hint | 12px | 400 | 0 |
| Micro (timestamps, counts) | 11px | 500, tabular-nums | 0.01em |

Font stack: keep the existing system-font stack (`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif`).

### Iconography
- Use a single 24px grid, 1.5px stroke, rounded line caps. Suggested set: mic, gear, upload-cloud, file-audio, copy, check, x, chevron-down, chevron-right, refresh-cw, download, alert-triangle, info, clock, list-checks.
- Brand mark: a single custom monogram or a 24px mic glyph in the topbar. Optional accent dot in `--accent`.

### Component patterns
- **Buttons**: a single `.btn` base. `.btn-primary` is solid accent with white text. `.btn-ghost` is transparent with `--text-2` text, hovers to `--surface-muted`. `.btn-link` is underline-on-hover only. All have the same height (36px default, 40px `.btn-lg`, 28px `.btn-sm`) and `--radius`.
- **Inputs**: 40px tall, `--radius`, 1px `--border-strong` border, focus ring = 3px `--accent-weak` halo. Same border, no inner shadow.
- **Cards**: white, 1px `--border`, `--radius-lg`, `--space-6` padding, optional `--shadow` on hover only.
- **Dropzone**: dashed 2px `--border-strong`, `--radius-lg`, 64–80px padding y, centered icon + 1-line primary text + 1-line hint. Dragover → border becomes `--accent` and background becomes `--accent-weak`.
- **Steps**: 40px numbered circles, 4px line between them, current step uses `--accent` ring + 1.5s breath animation. Done steps use `--success` check.
- **Sidebar items**: 1-line filename (truncate with ellipsis), 1-line meta (time · chars), left 2px border transparent → `--accent` when current. Hover background is `--surface-muted`.
- **Markdown body**: tighter line-height (1.65), code blocks get a `--surface-muted` background and 6px radius, blockquote keeps the `--accent` left bar.

### Layout
- Main column: still `max-width: 1200px; padding: 32px`.
- Topbar: 56px tall, white with 1px bottom border, no blur. Brand on the left, nav as text links with active state.
- Sidebar: 240px expanded (slightly narrower than before), 56px collapsed. Background `--surface-muted`. 1px right border, no internal separators.
- Footer: 1 short line, 12px `--text-2`, padding 24px.

### Motion
- Default transition: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out), 160ms for hovers and small state changes, 240ms for layout changes.
- Step "breath": `box-shadow: 0 0 0 0 var(--accent-weak) → 0 0 0 8px transparent` over 1.6s infinite.
- Streaming transcript: smooth scroll-to-bottom on new chunk; no caret blink or flashy loader.

## 3. Page-level guidance

### HomePage
- The dropzone is the hero. Centered, generous padding (80–120px vertical), single-line primary text, sub-line as small hint.
- Background-info `<details>` becomes an inline `+ 添加面试背景` disclosure that opens a 4-field grid; fields stay simple, no chrome.
- `开始分析` is a wide primary button, right-aligned, with a subtle "需要先完成 API 配置" hint above it.
- "已有一次分析结果 →" banner becomes a thin info row, not a filled card.

### ProcessingPage
- 3-step pipeline horizontally centered, current step is larger and accented, completed steps show a check, pending steps are muted.
- Streaming transcript: a single monospace panel, monospaced font, soft surface, no header chrome, just a tiny "📝 实时转写 · 1,234 字" meta line above.
- Error state: a single inline error panel, not a red box; "重试" + "返回首页" inline.
- Cancel button is a quiet ghost, bottom center.

### ResultsPage
- Header: title + meta on the left, actions as a row of ghost buttons on the right (or a "···" overflow menu to reduce visual weight).
- Cards: 2-up grid, each card has a 1-line title and a small description, no border, just a hairline divider above the markdown body. Markdown body is the hero.
- Empty state: centered mic glyph + 1 line + a single primary CTA.

### SettingsPage
- Two equal cards (STT / Summary) stacked, each with a tight 2-column form grid. Fields have a label + optional hint, no card-internal sectioning.
- Provider dropdown is a native select styled to look like an input.
- "测试连接" / "网络诊断" / "导出/导入配置" actions are inline ghost buttons below each card.
- Privacy notice becomes a single bordered info card with a left accent bar (not yellow).
- API key inputs are password fields with a "显示" toggle.

## 4. Do / Don't

**Do**
- Lean on whitespace and a single accent.
- Use 1.5–2px stroke line icons.
- Tabular figures for counts and timestamps.
- Mobile-first responsive: stack the steps, stack the grid, collapse the sidebar to an overlay.

**Don't**
- Don't use the dashed `💠` emoji-as-icon style for actions.
- Don't use multi-color gradients or "AI glass" glow effects.
- Don't put colored fills behind the cards (no `primary-weak` panels).
- Don't add big hero illustrations; the dropzone icon and the mic brand mark are the only ornament.
- Don't change the core data model or copy; this is a visual + interaction refresh.
