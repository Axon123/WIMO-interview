# Pages — Interview_Notes

Component dependency trees per page, traced by recursively following local imports. Each tree is the **candidate set** for `--context-file` when designing that page; apply the PAYLOAD BUDGET rules in SUPERDESIGN.md (≤~900 line files) when selecting.

## /home (HomePage)

Entry: `src/pages/HomePage.tsx` (~191 lines)

Dependencies:
- `src/store/appStore.ts` — `useApp`, `appStore` (page state, file, background, transcript, windows, analyzedAt, history; methods set/toggleSidebar/loadHistory/removeHistory/addHistory/resetAnalysis)
- `src/config/constants.ts` — `ALLOWED_ACCEPT` (MIME list), `ALLOWED_EXTENSIONS` (`['mp3','wav','m4a','flac','ogg']`), `WINDOWS` (the 9-window array, see below)
- `src/styles.css` — full file 956 lines (use the token summary in theme.md Part 1; pass the file only if a smaller alternative isn't available)

`WINDOWS` array (from `src/config/constants.ts:13-23`) — drives the "分析后你将获得" intro list:
- `questions` — 面试问题总结
- `weaknesses` — 薄弱/错误总结
- `strengths` — 表现亮点
- `suggestions` — 改进建议
- `score` — 综合评分
- `communication` — 沟通表达分析
- `pattern` — 提问模式与追问分析
- `checklist` — 下次准备清单
- `transcript` — 完整逐字稿 (filled client-side, not by the summary model)

The page also implicitly lives inside the App shell, so for full-fidelity reproduction the **App shell + Sidebar + globals** must accompany the page.

For `--context-file` (lean set):
1. `src/styles.css:1-14` (`:root` token block) or the full file if line-bounded
2. `src/pages/HomePage.tsx` (full file, ~191 lines)
3. `src/config/constants.ts:13-23` (WINDOWS array) or full file
4. `src/store/appStore.ts` (state shape only; strip handlers)
5. App shell (`src/App.tsx`, full 42 lines)
6. Sidebar (`src/components/Sidebar.tsx`)

## /processing (ProcessingPage)

Entry: `src/pages/ProcessingPage.tsx` (~208 lines)

Dependencies:
- `src/store/appStore.ts`
- `src/config/constants.ts` — `MODEL_WINDOWS` (likely same shape as `WINDOWS`)
- `src/lib/api.ts` — `transcribeAudio`, `summarize`, `errMsg`, `isAbort` (handler code; strip)
- `src/lib/markdown.ts` — `parseSummary` (handler code; strip)
- `src/components/StepsProgress.tsx` — full file (35 lines; central to the page)

For `--context-file`:
1. `src/styles.css:1-14` (tokens)
2. `src/pages/ProcessingPage.tsx` (full file)
3. `src/components/StepsProgress.tsx` (full file)
4. App shell + Sidebar

## /results (ResultsPage)

Entry: `src/pages/ResultsPage.tsx` (~93 lines)

Dependencies:
- `src/store/appStore.ts`
- `src/config/constants.ts` — `WINDOWS` (drives section order)
- `src/components/WindowCard.tsx` — full file (renders each section)
- `src/components/CopyButton.tsx` — full file (used in header + per-card)
- `src/lib/download.ts` — `downloadText` (handler; strip)

For `--context-file`:
1. `src/styles.css:1-14` (tokens)
2. `src/pages/ResultsPage.tsx` (full file)
3. `src/components/WindowCard.tsx` (full file)
4. `src/components/CopyButton.tsx` (full file)
5. `src/config/constants.ts:13-23` (WINDOWS)
6. App shell + Sidebar

## /settings (SettingsPage)

Entry: `src/pages/SettingsPage.tsx` (~327 lines)

Dependencies:
- `src/store/appStore.ts`
- `src/config/constants.ts` — `AppConfig`, `SttApiType`, `SttConfig`, `SummaryConfig`, `buildDefaultPrompt`, `defaultConfig`, `LANGUAGES`, `PROVIDERS` (the file is the design contract for the forms)
- `src/lib/api.ts` — `errMsg`, `runNetworkDiagnostics`, `testSttConnection`, `testSummaryConnection`, `DiagItem` (handler; strip)
- `src/lib/download.ts` — `downloadText` (handler; strip)
- `src/components/FormField.tsx` — full file (~16 lines)

`SettingsPage` defines two internal components — `SttCard` (~110 lines) and `SummaryCard` (~90 lines) — both as `.card` panels. The page is the largest in the codebase and the most field-dense.

For `--context-file`:
1. `src/styles.css:1-14` (tokens)
2. `src/pages/SettingsPage.tsx` (full file)
3. `src/components/FormField.tsx` (full file)
4. `src/config/constants.ts` (full file — needed for `LANGUAGES` and `PROVIDERS` dropdown content)
5. App shell + Sidebar

## Cross-cutting files (always present in any context)

- `src/App.tsx` (42 lines) — the shell with topbar and page switch.
- `src/components/Sidebar.tsx` — left rail.
- `src/store/appStore.ts` — global state.
- `src/styles.css` — the **only** stylesheet (956 lines). Use the **theme.md Part 1 summary** as the budget-friendly alternative; pass the full file only if you also need the `::after` / `@keyframes` / responsive rules and the budget allows.
