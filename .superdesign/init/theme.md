# Theme — Interview_Notes

Framework: React 18 + Vite 5 + TypeScript, plain CSS (single `src/styles.css` file), no CSS framework. Routing is in-app state (`page` field in `appStore`), no React Router.

## Part 1 — Compact token summary

### Color tokens (from `:root` in `src/styles.css`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#f5f6fa` | App background (light cool gray) |
| `--card` | `#ffffff` | Card / panel surface |
| `--border` | `#e4e7ee` | Hairline borders, dividers |
| `--text` | `#1f2430` | Primary text |
| `--text-2` | `#6b7280` | Secondary / muted text |
| `--primary` | `#4f6ef7` | Brand accent (indigo-blue) |
| `--primary-weak` | `#eef1fe` | Tinted backgrounds, hover, active states |
| `--green` | `#16a34a` | Success / done states |
| `--red` | `#dc2626` | Error / fail states |
| `--amber` | `#d97706` | Warning / caution |
| `--shadow` | `0 1px 3px rgba(16,24,40,.06), 0 4px 16px rgba(16,24,40,.06)` | Default card shadow (very soft) |

Additional named backgrounds not in tokens but used directly:
- `#fafbfc` — sidebar background
- `#f8fafc` — streaming transcript box
- `#f4f6fb` — table header / input hover
- `#f0f2f7` — button ghost hover
- `#fffbeb` — notice card (warning)
- `#fef2f2` — error box background

### Typography
- Font stack (body): `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif`
- Monospace: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Cascadia Mono, Consolas, monospace`
- Base size: `14px` / line-height `1.6`
- Scale (visible in source): `20px` page title, `16px` card title, `15px` h3/h4, `14px` body, `13px` small, `12px` hint, `11px` meta

### Spacing & shape
- Card padding: `20px`
- Section gap: `16px`
- Border radius: `--radius = 12px` (cards), `10px` (chips, transcript), `8px` (buttons, inputs), `6px` (small buttons, fields)
- Max content width: `1200px` (`.main`)

### Shadows
- Card default: very soft, two-layer (1px sharp + 4px diffuse)
- No dark mode (single light theme)

### Layout grid
- Sidebar: `260px` expanded, `60px` collapsed
- Result grid: `repeat(auto-fill, minmax(400px, 1fr))` — 2-up on desktop, 1-up on mobile
- Form grid: `repeat(auto-fill, minmax(220px, 1fr))`
- Mobile breakpoint: `768px` (sidebar becomes overlay) and `640px` (main padding shrinks, grid collapses to 1 col)

## Part 2 — Raw source

### `src/styles.css` (full file, 956 lines)

```css
:root {
  --bg: #f5f6fa;
  --card: #ffffff;
  --border: #e4e7ee;
  --text: #1f2430;
  --text-2: #6b7280;
  --primary: #4f6ef7;
  --primary-weak: #eef1fe;
  --green: #16a34a;
  --red: #dc2626;
  --amber: #d97706;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(16, 24, 40, 0.06), 0 4px 16px rgba(16, 24, 40, 0.06);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
}

/* ---------- 布局 ---------- */
.app { min-height: 100vh; display: flex; flex-direction: column; }

.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}

.brand { font-weight: 700; font-size: 16px; }

.topbar nav { display: flex; gap: 4px; }

.topbar nav button {
  border: none; background: none;
  padding: 8px 14px; border-radius: 8px;
  cursor: pointer; color: var(--text-2); font-size: 14px;
}
.topbar nav button:hover { background: #f0f2f7; }
.topbar nav button.active {
  background: var(--primary-weak);
  color: var(--primary);
  font-weight: 600;
}

.main {
  flex: 1; width: 100%;
  max-width: 1200px;
  margin: 0 auto; padding: 24px;
  min-width: 0;
}
.app-body { flex: 1; display: flex; align-items: stretch; min-height: 0; }

/* ---------- 侧边栏（复盘历史）---------- */
.sidebar {
  width: 260px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: #fafbfc;
  display: flex; flex-direction: column;
  transition: width 0.18s ease;
  position: sticky; top: 57px;
  align-self: flex-start;
  height: calc(100vh - 57px);
}
.sidebar.collapsed { width: 60px; }
.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--border);
}
.sidebar.collapsed .sidebar-header { display: none; }
.sidebar-title { font-size: 14px; font-weight: 600; margin: 0; color: var(--text); }
.sidebar-toggle {
  border: 1px solid var(--border); background: #fff;
  border-radius: 6px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--text-2); font-size: 14px;
  line-height: 1; padding: 0;
  transition: background 0.15s, color 0.15s;
}
.sidebar-toggle:hover { background: var(--primary-weak); color: var(--primary); }
.sidebar.collapsed .sidebar-toggle {
  margin: 14px auto 0; width: 36px; height: 36px; font-size: 18px; position: relative;
}
.sidebar-badge {
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; margin: 8px auto 0;
  border-radius: 11px;
  background: var(--primary); color: #fff;
  font-size: 12px; font-weight: 600;
}
.sidebar-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
  color: var(--text-2); padding: 24px 16px; font-size: 13px;
}
.sidebar-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.6; }
.sidebar-empty-sub { font-size: 12px; color: var(--text-2); margin-top: 4px; opacity: 0.7; }

.history-list { list-style: none; margin: 0; padding: 8px 0; overflow-y: auto; flex: 1; }
.history-item {
  padding: 10px 14px; cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.12s, border-color 0.12s; position: relative;
}
.history-item:hover { background: #fff; }
.history-item.current { background: #fff; border-left-color: var(--primary); }
.history-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.history-name {
  font-size: 13px; font-weight: 500; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1; min-width: 0;
}
.history-delete {
  border: none; background: transparent; color: var(--text-2);
  cursor: pointer; font-size: 18px; line-height: 1;
  padding: 0 4px; border-radius: 4px; opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}
.history-item:hover .history-delete, .history-delete:focus { opacity: 1; }
.history-delete:hover { color: #e53935; background: #fee; }
.history-meta { display: flex; gap: 4px; font-size: 11px; color: var(--text-2); }

@media (max-width: 768px) {
  .sidebar:not(.collapsed) {
    position: fixed; z-index: 20; top: 57px;
    height: calc(100vh - 57px);
    box-shadow: 4px 0 12px rgba(0, 0, 0, 0.08);
  }
}

.footer { text-align: center; color: var(--text-2); font-size: 12px; padding: 16px; }

.page { display: flex; flex-direction: column; gap: 16px; }
.page-title { margin: 0 0 4px; font-size: 20px; }
.page-sub { margin: 0 0 12px; color: var(--text-2); }

/* ---------- 卡片 ---------- */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}
.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.card-title { margin: 0; font-size: 16px; }
.card-desc { margin: 2px 0 0; font-size: 12px; color: var(--text-2); }
.card-body { min-height: 24px; }
.placeholder { color: var(--text-2); font-size: 13px; }

/* 结果窗口网格 */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; align-items: start; }
.window-card { display: flex; flex-direction: column; }
.window-card .card-body { max-height: 420px; overflow-y: auto; padding-right: 4px; }

/* ---------- Markdown 内容 ---------- */
.md-body h1, .md-body h2, .md-body h3, .md-body h4 { margin: 14px 0 8px; line-height: 1.4; }
.md-body h1 { font-size: 18px; }
.md-body h2 { font-size: 16px; }
.md-body h3, .md-body h4 { font-size: 15px; }
.md-body p { margin: 6px 0; }
.md-body ul, .md-body ol { margin: 6px 0; padding-left: 22px; }
.md-body li { margin: 3px 0; }
.md-body strong { font-weight: 600; }
.md-body code { background: #f1f2f6; padding: 1px 5px; border-radius: 4px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.md-body pre { background: #f6f7fa; padding: 12px; border-radius: 8px; overflow-x: auto; }
.md-body pre code { background: none; padding: 0; }
.md-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; }
.md-body th, .md-body td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
.md-body th { background: #f4f6fb; }
.md-body blockquote { border-left: 3px solid var(--primary); margin: 8px 0; padding: 2px 12px; color: var(--text-2); background: var(--primary-weak); border-radius: 0 6px 6px 0; }

/* ---------- 按钮 ---------- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--border); background: #fff; color: var(--text); padding: 7px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; }
.btn:hover:not(:disabled) { background: #f4f6fb; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: #3d5be6; }
.btn-ghost { border-color: transparent; background: transparent; color: var(--text-2); }
.btn-ghost:hover:not(:disabled) { background: #f0f2f7; color: var(--text); }
.btn-sm { padding: 4px 10px; font-size: 13px; border-radius: 6px; }
.btn-lg { padding: 10px 28px; font-size: 15px; }
.btn-link { border: none; background: none; color: var(--primary); padding: 0; font-size: inherit; cursor: pointer; text-decoration: underline; }
.btn.copied { color: var(--green); border-color: rgba(22, 163, 74, 0.4); background: rgba(22, 163, 74, 0.08); }
.btn-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.btn-row.center { justify-content: center; }

/* ---------- 表单 ---------- */
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px 16px; }
.field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.field-wide { grid-column: 1 / -1; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 400; cursor: pointer; min-height: 36px; }
.checkbox-row input[type='checkbox'] { width: 16px; height: 16px; margin: 0; cursor: pointer; }
.streaming-transcript { margin-top: 18px; border: 1px solid var(--border); border-radius: 10px; background: #f8fafc; overflow: hidden; }
.streaming-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 600; color: var(--text); background: #fff; }
.streaming-meta { font-size: 12px; font-weight: 400; color: var(--text-2); }
.streaming-content { margin: 0; padding: 12px 14px; max-height: 360px; overflow-y: auto; font-family: ui-monospace, 'SF Mono', 'Menlo', 'Cascadia Mono', 'Consolas', monospace; font-size: 13px; line-height: 1.6; color: var(--text); white-space: pre-wrap; word-break: break-word; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text); }
.field-hint { font-size: 12px; color: var(--text-2); }
.field input, .field select, .field textarea { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 14px; font-family: inherit; background: #fff; color: var(--text); outline: none; width: 100%; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.12); }
.prompt-area { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.5; resize: vertical; }

/* ---------- 首页上传区 ---------- */
.dropzone { border: 2px dashed #c6cde0; border-radius: var(--radius); padding: 44px 24px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; background: #fbfcfe; }
.dropzone:hover, .dropzone.dragover { border-color: var(--primary); background: var(--primary-weak); }
.dropzone-icon { font-size: 40px; }
.dropzone-text { font-size: 15px; font-weight: 600; margin-top: 8px; }
.dropzone-sub { font-size: 12px; color: var(--text-2); margin-top: 4px; }
.file-chip { display: inline-flex; align-items: center; gap: 10px; background: var(--primary-weak); border: 1px solid rgba(79, 110, 247, 0.3); border-radius: 10px; padding: 10px 14px; }
.file-name { font-weight: 600; }
.file-size { color: var(--text-2); font-size: 13px; }
.error-text { color: var(--red); font-size: 13px; margin: 8px 0 0; }
.warn-text { color: var(--amber); font-size: 13px; margin: 0; }
.hint-text { color: var(--text-2); font-size: 13px; margin: 16px 0 0; text-align: center; }
.bg-details { margin-top: 16px; border-top: 1px dashed var(--border); padding-top: 12px; }
.bg-details summary { cursor: pointer; color: var(--text-2); font-size: 14px; user-select: none; }
.bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px 16px; margin-top: 12px; }
.start-row { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-top: 20px; }
.banner { background: var(--primary-weak); border: 1px solid rgba(79, 110, 247, 0.25); border-radius: 10px; padding: 10px 16px; font-size: 14px; display: flex; align-items: center; gap: 4px; }
.intro-card { background: var(--card); }
.intro-list { margin: 8px 0 0; padding-left: 20px; }
.intro-list li { margin: 4px 0; }
.intro-note { color: var(--text-2); font-size: 13px; margin: 10px 0 0; }

/* ---------- 处理进度 ---------- */
.steps { list-style: none; display: flex; align-items: center; justify-content: center; gap: 10px; margin: 24px 0; padding: 0; flex-wrap: wrap; }
.step { display: flex; align-items: center; gap: 10px; }
.step-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border); color: var(--text-2); font-size: 14px; font-weight: 700; background: #fff; flex-shrink: 0; }
.step.running .step-dot { border-color: var(--primary); color: var(--primary); animation: pulse 1.2s ease-in-out infinite; }
.step.done .step-dot { border-color: var(--green); color: var(--green); }
.step.failed .step-dot { border-color: var(--red); color: var(--red); }
@keyframes pulse { 50% { box-shadow: 0 0 0 6px rgba(79, 110, 247, 0.15); } }
.step-label { font-weight: 600; white-space: nowrap; }
.step-detail { font-size: 12px; color: var(--text-2); max-width: 320px; }
.step-line { width: 48px; height: 2px; background: var(--border); }
.step-line.done { background: var(--green); }
.error-box { background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 10px; padding: 14px 16px; margin-top: 8px; }
.error-title { font-weight: 600; margin: 0 0 4px; }

/* ---------- 结果页 ---------- */
.result-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.empty-state { text-align: center; padding: 48px 24px; }
.empty-state .btn { margin-top: 8px; }

/* ---------- 测试结果 / 提示 ---------- */
.test-result { font-size: 13px; margin: 0; }
.test-result.ok { color: var(--green); }
.test-result.fail { color: var(--red); }
.diag-box { margin-top: 12px; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; background: #fbfcfe; }
.diag-title { margin: 0 0 6px; font-size: 12px; color: var(--text-2); }
.diag-list { margin: 0; padding-left: 0; list-style: none; font-size: 13px; }
.diag-list li { margin: 4px 0; padding: 4px 8px; border-radius: 6px; }
.diag-list li.ok { background: rgba(22, 163, 74, 0.07); color: var(--green); }
.diag-list li.fail { background: rgba(220, 38, 38, 0.07); color: var(--red); }
.notice-card { background: #fffbeb; border-color: rgba(217, 119, 6, 0.3); }

/* ---------- 响应式 ---------- */
@media (max-width: 640px) {
  .main { padding: 16px; }
  .grid { grid-template-columns: 1fr; }
  .result-header { flex-direction: column; align-items: flex-start; }
}
```

### Tailwind / CSS-in-JS
- None. The project uses plain CSS with CSS variables. No `tailwind.config.*` exists.
