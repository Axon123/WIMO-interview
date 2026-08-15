# Extractable Components — Interview_Notes

Components that are worth lifting into Superdesign `DraftComponent` (Petite-Vue templates) so they appear consistently across every generated page. The `extractable-components.md` is read by the design flow **before** drafting; design calls automatically use these via `<sd-component>` tags.

## Layout components (extract first — these are on every page)

### AppShell
- Source: `src/App.tsx` (the whole 42-line component, with topbar + main + footer)
- Category: layout
- Description: Top bar with brand + nav (首页 / 设置), and a footer note. Pages slot into the `<main>` area.
- Extractable props:
  - `activeNav` (`'home' | 'settings'`, default `'home'`) — which top-nav button shows as active. Note the original treats `home | processing | results` all as "首页" active.
  - `brandText` (`string`, default `'🎙️ 面试录音复盘助手'`)
  - `footerText` (`string`, default `'配置、逐字稿与复盘结果仅保存在本浏览器，不会上传到任何服务器。'`)
- Hardcoded: page switcher, button labels ("首页", "设置"), the 🎙️ emoji.

### Sidebar
- Source: `src/components/Sidebar.tsx` (~112 lines)
- Category: layout
- Description: Left rail of past analysis records. Expand/collapse, list of items with name / time / char count, delete-on-hover, empty state.
- Extractable props:
  - `items` (`Array<{id: string; fileName: string; analyzedAt: number; chars: number; current?: boolean}>`)
  - `collapsed` (`boolean`, default `false`)
  - `emptyText` (`string`, default empty-state strings)
- Hardcoded: emoji icons (📚, 🎙️), toggle glyph («), delete glyph (×), all copy text, time-formatter ("刚刚 / N 分钟前 …"), 260px / 60px widths, hover styles, breakpoint behavior.

## Basic / shared components (extract after layout)

### Card
- Source: implicit — there is no React component, only the `.card` class in `src/styles.css:310-316`. Worth extracting as a visual primitive.
- Category: basic
- Description: White surface with 1px border, 12px radius, soft 2-layer shadow, 20px padding.
- Extractable props:
  - `title` (`string`)
  - `description` (`string`)
  - `actions` (slot for right-side buttons)
  - `variant` (`'default' | 'warning' | 'error'`, default `'default'`) — `warning` → `#fffbeb` + amber border, `error` → `#fef2f2` + red border
- Hardcoded: shadow, radius, padding, border colors.

### WindowCard
- Source: `src/components/WindowCard.tsx` (~41 lines)
- Category: basic (used many times in a single grid)
- Description: Title + description + Markdown body + a "复制" top-right button. Shows "（未生成）" placeholder when content is empty.
- Extractable props:
  - `title` (`string`)
  - `description` (`string`)
  - `content` (`string`) — markdown
- Hardcoded: the "（未生成）" placeholder, the `📋 复制` / `已复制 ✓` button labels, 420px max body height with scroll.

### FormField
- Source: `src/components/FormField.tsx` (~16 lines)
- Category: basic
- Description: Vertical label + input + optional hint. Used many times in the Settings page.
- Extractable props:
  - `label` (`string`)
  - `hint` (`string`)
- Hardcoded: spacing, label weight (600), hint color (muted).

### CopyButton
- Source: `src/components/CopyButton.tsx` (~26 lines)
- Category: basic
- Description: Ghost button that copies text and shows "已复制 ✓" feedback for 2s.
- Extractable props:
  - `text` (`string`) — what to copy
  - `label` (`string`, default `'复制'`)
- Hardcoded: 2-second success window, the 📋 emoji prefix, the green success palette.

### StepsProgress
- Source: `src/components/StepsProgress.tsx` (~35 lines)
- Category: basic
- Description: 3-step horizontal pipeline (dots + labels + connecting lines), each with a status.
- Extractable props:
  - `steps` (`Array<{label: string; status: 'pending' | 'running' | 'done' | 'failed'; detail?: string}>`)
- Hardcoded: 32px dot, 48px connector, "pulse" keyframe animation for running, ✓/✕ glyphs.

## Skip extraction (not worth it)

- **Button** / **Input** / **Select** / **Checkbox** / **Textarea** — these are styled directly via the global `.btn` / `.field input` etc. classes. They are too primitive to deserve a DraftComponent; inline them in drafts.
- **No state-management primitives** are needed (the page is the unit of work; the components above are pure presentational).
