# DSH 插件目录（DSH Plugin Directory）项目计划

> 一份在 DeepSeek Harness Web GUI 内浏览、分类、搜索并统计 GitHub 上 DSH 插件仓库的可视化页面（以 DSH 插件形态交付）。

**审批状态：待审批**

---

## 1. 目标（Goal）

构建一个 **DSH Web GUI 内插件**，为 GitHub 上日益增多的 DeepSeek Harness（DSH）插件仓库提供一个可视化目录，支持：

1. **分类**：按功能类别、安装形态等多维筛选。
2. **搜索**：按名称 / 作者 / 描述关键词即时检索。
3. **统计**：总数、分类分布、安装形态分布、语言分布、star 分布、最近更新等看板。
4. **自动同步**：数据来自 GitHub `dsh-plugin` topic，由定时任务抓取生成快照，页面读取快照展示。

---

## 2. 调研结论（决策依据）

- DSH 官方推荐插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic，目前约 **1400+** 个仓库打有此标签。
- 该 topic **噪声大**：大量打标仓库并非真正的 DSH 插件（如 PicGo-Core、claude-paper、各类 awesome 列表等）。
- 插件存在两种安装形态：
  - **npm bundle**：`package.json` 声明 `dsh.bundle` + `cordis.patch.yml`（经典形态）。
  - **仓库插件**：`.dsh-plugin` 目录 + `config.yaml`（较新形态，如 `dsh-external/whale-girl`）。
  - 另有 **Web 客户端插件**：`package.json` 声明 `dsh.client`（本插件即属此类）。
- GitHub Search API 每条结果自带 `stargazers_count / forks_count / language / topics / license / description / created_at / pushed_at / archived / fork`，足够支撑分类、搜索与统计。
- DSH 客户端插件接入方式（已从 harness 源码核实）：
  - `package.json` 声明 `dsh.client`（`platform: 'web'` + `inject` 依赖）并导出 `exports["./client"]`。
  - 打包产物在浏览器侧注册 factory，`apply(ctx)` 中通过 `ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({...}, Component))` 挂载页面。
  - 参考实现：`packages/client/ui-settings-plugin-inventory`。

---

## 3. 已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 产品形态 | DSH Web GUI 内页面/插件（注册到「设置 → 插件」的 tab） |
| 数据架构 | 构建时快照 + 定时刷新（GitHub Actions 抓取生成静态 JSON） |
| 插件判定 | 自动收录 + 质量评分（启发式打分，噪声靠低分沉底而非硬删） |
| 分类维度 | 功能类别、安装形态、活跃度与质量（不含编程语言作为主维度，语言仅作统计展示） |
| 界面语言 | 中英双语（中文为主，插件描述保留原文） |

---

## 4. 架构

```
┌──────────────────────────────────────────────────────────────┐
│  数据管线（GitHub Actions 定时运行，产静态快照）                │
│                                                              │
│  scripts/sync.ts                                             │
│   1. 抓取 topic:dsh-plugin（分页，最多 ~1000 条）              │
│   2. 启发式去噪 + 质量评分                                     │
│   3. 深度检测（package.json / .dsh-plugin）→ 安装形态          │
│   4. 关键词 + overrides 判定 → 功能类别                        │
│   5. 写 data/plugins.json + data/meta.json                   │
└──────────────────────────────┬───────────────────────────────┘
                               │ 提交回仓库
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  DSH 客户端插件（dsh-plugin-directory，bundle + client）        │
│                                                              │
│  cordis.patch.yml → 插入行 name: dsh-plugin-directory         │
│  src/client/index.ts → 注册 settings.plugins.tab             │
│  src/client/DirectoryTab.tsx → 加载快照，渲染：                │
│     搜索框 / 分类筛选 / 安装形态筛选 / 排序                     │
│     统计看板 / 仓库卡片（跳 GitHub）                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 技术栈

- TypeScript + React 18（与 DSH 客户端包一致）。
- DSH 客户端包：`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-client-ui-primitives`（作为 peerDependencies，宿主提供）。
- 打包：`tsdown`（与 DSH 包一致）。
- 数据管线：Node 24 + `octokit`（或原生 fetch + `GITHUB_TOKEN`）。
- CI：GitHub Actions 定时工作流（如每 6 小时）+ 手动触发。

---

## 6. 目录结构（拟）

```
dsh-plugin-manage/
├── package.json              # name: dsh-plugin-directory；dsh.bundle + dsh.client
├── cordis.patch.yml          # 插入行：- id: dsh-plugin-directory, name: dsh-plugin-directory
├── tsdown.config.ts
├── src/
│   ├── client/
│   │   ├── index.ts          # apply(ctx)：locale.register + slots.inject('settings.plugins.tab')
│   │   ├── DirectoryTab.tsx  # 主界面组件
│   │   ├── locales.ts        # zh/en 词典
│   │   └── *.module.css
│   └── index.ts              # 宿主侧入口（最小实现）
├── data/
│   ├── plugins.json          # 生成快照
│   ├── meta.json             # 同步时间戳 / 计数
│   └── overrides.json        # 人工分类覆盖表（可维护）
├── scripts/
│   ├── sync.ts               # 管线主入口
│   ├── classify.ts           # 功能类别判定
│   ├── score.ts              # 质量评分
│   └── inspect.ts            # 安装形态深度检测（带缓存）
├── tests/
│   ├── classify.test.ts
│   ├── score.test.ts
│   └── DirectoryTab.client.spec.tsx
├── .github/workflows/sync.yml
└── docs/plan.md
```

---

## 7. 数据模型（`data/plugins.json` 单条）

```ts
interface PluginEntry {
  id: string            // "owner/repo"
  name: string
  owner: string
  htmlUrl: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  license: string | null      // SPDX 标识或 null
  stars: number
  forks: number
  createdAt: string
  pushedAt: string
  archived: boolean
  fork: boolean
  category: FunctionCategory  // 见下
  installForm: InstallForm    // 'bundle' | 'repo' | 'client' | 'unknown'
  score: number               // 0..100 质量分
}

type FunctionCategory =
  | 'tool' | 'skill' | 'memory' | 'vision' | 'ui-skin'
  | 'mcp' | 'orchestration' | 'cli-tui' | 'web' | 'agent' | 'other'

type InstallForm = 'bundle' | 'repo' | 'client' | 'unknown'
```

`data/meta.json`：`{ syncedAt, total, byCategory, byInstallForm, byLanguage, byStarBucket }`（供统计看板直接用，避免前端重复计算）。

---

## 8. 分类与评分规则（启发式，v1）

**功能类别**（关键词命中 `name + description + topics`，`overrides.json` 可覆盖）：

| 类别 | 关键词示例 |
|---|---|
| vision | vision, ocr, image, screenshot, 视觉, 看图, 截图 |
| memory | memory, knowledge, recall, 记忆, 知识库 |
| skill | skill, 技能 |
| ui-skin | skin, theme, whale, pet, 皮肤, 主题, 宠物, sidebar |
| mcp | mcp, model context protocol |
| cli-tui | tui, cli, terminal, 终端 |
| orchestration | agent team, orchestration, workflow, 编排, 多智能体 |
| web | browser, search, web, 浏览器, 搜索 |
| tool | 兜底：明确是工具类 |
| other | 无法判定 |

**安装形态**（深度检测，结果缓存）：

- 抓取默认分支 `package.json`：有 `dsh.bundle` → `bundle`；有 `dsh.client` → `client`。
- 仓库树含 `.dsh-plugin/` → `repo`。
- 均无 → `unknown`。
- 为控制 API 限额，仅对「通过轻量预筛（名称/描述含 dsh/deepseek-harness/plugin）且 `pushed_at` 有变化」的仓库做深度检测，并缓存。

**质量评分**（0..100，可调权重）：

- `stars` 对数归一（权重高）
- 有 `description` / 有 `license` / 有 README（深度检测时顺带判断）
- 近 90 天有 `push`
- 非 `archived`、非 `fork`
- 命中安装形态（`bundle/repo/client`）额外加分

---

## 9. 里程碑与任务

### M0 — 项目脚手架（交付：可空转的插件骨架）
- [ ] 初始化 package.json / tsdown / tsconfig / vitest。
- [ ] 写 `cordis.patch.yml` + 最小 `src/index.ts` + 最小 `src/client/index.ts`（注册空 tab，能显示占位文案）。
- [ ] 在 harness 运行实例中验证 tab 能出现（见「验证方式」）。

### M1 — 数据管线（交付：`scripts/sync.ts` 产出 `plugins.json`）
- [ ] `sync.ts`：Search API 分页抓取 `topic:dsh-plugin`。
- [ ] `classify.ts` + `score.ts`（纯函数，带单测）。
- [ ] `inspect.ts`：安装形态深度检测 + 缓存。
- [ ] 生成 `plugins.json` + `meta.json`；首次跑出一份真实快照（seed 数据）。
- [ ] `.github/workflows/sync.yml` 定时 + 手动触发。

### M2 — 前端界面（交付：完整可视化页面）
- [ ] 统计看板（总数 / 分类 / 安装形态 / 语言 / star 分布）。
- [ ] 搜索框 + 分类/安装形态筛选 + 排序（质量分 / star / 最近更新）。
- [ ] 仓库卡片列表（含安装形态徽章、分类徽章、跳转 GitHub）。
- [ ] 中英双语 `locales.ts`。
- [ ] 加载态 / 空态 / 错误态。

### M3 — 测试与收尾（交付：可发布）
- [ ] `classify/score` 单测；`DirectoryTab` 客户端组件测试。
- [ ] 真实快照回归验证（页面渲染 1400 仓库不卡顿）。
- [ ] README（安装 `dsh plugin add github:.../dsh-plugin-directory` + 说明）。

---

## 10. 验证方式

- **宿主侧**：用 harness 检出目录运行 `pnpm dsh web`，通过 `--patch` 或临时 profile 挂载本插件，访问 `http://127.0.0.1:3080` 的「设置 → 插件」确认 tab 渲染、搜索/筛选/统计可用。
- **数据侧**：单测覆盖 `classify/score`；`sync.ts` 跑通并产出可读的 `plugins.json`。
- **界面**：客户端组件测试（`@testing-library/react`，参考 `ui-settings-plugin-inventory/tests/*.client.spec.tsx`）。

---

## 11. 风险与应对

| 风险 | 应对 |
|---|---|
| GitHub Search API 单查询上限 ~1000 条（topic 有 1400+） | v1 覆盖 top-1000（按相关度）；后续用 `stars:`/`created:` 分段查询补齐 |
| 速率限制（搜索 30/min、核心 5000/hr with token） | 使用 `GITHUB_TOKEN`、深度检测限流 + 按 `pushed_at` 缓存、定时而非实时 |
| topic 噪声大、误判 | 质量评分沉底 + 安装形态信号 + `overrides.json` 人工纠偏 |
| DSH 处于开发者预览、API 可能破坏性变更 | 对齐 harness 检出 `0.1.0-rc.x` 版本；升级时重跑验证 |
| 宿主包版本对齐 | 开发期 link 兄弟 harness 检出，或从 npm 装 `@deepseek-ai/dsh-*@0.1.0-rc.x` |

---

## 12. 需求补充（审批后新增，2026-08-14）

1. **一键部署/安装**：每张插件卡片提供「安装」按钮，按检测到的安装形态展示并一键复制安装命令。
   - `bundle`（npm 包）：`dsh plugin add <npm-package-name>`（取 package.json 的 `name`）。
   - `repo`（`.dsh-plugin` 仓库插件）：`dsh plugin add github:owner/repo#<ref>&path:/.dsh-plugin`。
   - `client`：同 npm 包形态，`dsh plugin add <name>`。
   - `unknown`：回退 `dsh plugin add github:owner/repo`。
   - v1 以「展示 + 一键复制」实现；真实在浏览器内执行 `dsh` 命令需宿主侧 shell，留待 v2。
2. **安装方式写入 README（提取）**：数据管线从每个被收录插件的自身 README 提取安装片段（匹配 `dsh plugin add` / `npm i` / `.dsh-plugin` 等模式），存入 `plugins.json` 的 `install` 字段并在卡片展示；本仓库 README 同时记录该提取规则与策略。**Ruling：** 「所收录插件的安装方式需写在 README 内」解读为「从插件自身 README 提取安装方式并在目录中展示 + 本仓库 README 说明策略」，而非把 1400 条命令塞进单个 README。
3. **分类方式供给用户选择**：分类不作为唯一硬编码标签，而是（a）功能类别以多选筛选 chips 呈现，用户自主勾选；（b）提供「分组维度」切换（功能类别 / 安装形态 / 编程语言 / 星级档位），用户选择按哪种方式归类查看。

## 13. 验收标准

1. 在 DSH Web GUI「设置 → 插件」中可见「插件目录」tab，中英双语切换正常。
2. 能按功能类别、安装形态筛选；按名称/描述/作者搜索；按质量分/star/最近更新排序。
3. 分类由用户可选：功能类别多选 chips + 分组维度切换均可用。
4. 每张卡片展示安装命令并支持一键复制；安装方式来自 README 提取或按形态派生。
5. 统计看板展示总数与多维分布，数据与 `plugins.json` 一致。
6. `pnpm test` 全绿；数据管线可重复运行、幂等。
7. 提供 README（含一键安装说明与安装方式提取策略）。

---

# 实施任务分解（Task 级）

> 每节为 `### Task N:` 标题，供 subagent-driven-development 的 `task-brief` 提取。Global Constraints 见下。

## Global Constraints

- 包名固定 `dsh-plugin-directory`；`package.json` 需声明 `dsh.bundle`（`patch: ./cordis.patch.yml`）与 `dsh.client`（`platform: 'web'`），并导出 `exports["./client"]`。
- ESM：`"type": "module"`；导入用包名，本地相对导入带 `.ts`/`.tsx` 后缀。
- React 18；`@deepseek-ai/dsh-*` 客户端包作为 peerDependencies（宿主提供）+ devDependencies（本地构建/类型检查）。
- 打包用 `tsdown`；测试用 `vitest` + `@testing-library/react`（客户端组件）。
- 中英双语：所有面向用户的文案走 `locales.ts` 的 `zh`/`en` 词典，不得硬编码。
- 数据管线输出 `data/plugins.json`（`PluginEntry[]`）与 `data/meta.json`（`MetaFile`），幂等（同输入同输出）。
- 分类为**用户可选**：功能类别多选 chips + 分组维度切换，不做唯一硬编码标签。
- 安装命令来自 README 提取或按形态派生，卡片提供一键复制。
- 提交粒度：每个 Task 至少一个独立 commit；commit message 用 `feat:`/`fix:`/`chore:` 前缀。

## 数据模型（跨任务契约，`src/data/types.ts`）

```ts
export type FunctionCategory =
  | 'tool' | 'skill' | 'memory' | 'vision' | 'ui-skin'
  | 'mcp' | 'orchestration' | 'cli-tui' | 'web' | 'agent' | 'other'

export type InstallForm = 'bundle' | 'repo' | 'client' | 'unknown'

export interface InstallInfo {
  form: InstallForm
  command: string | null
  packageName?: string
  source: 'readme' | 'package-json' | 'derived'
  snippet?: string
}

export interface PluginEntry {
  id: string
  name: string
  owner: string
  htmlUrl: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  license: string | null
  stars: number
  forks: number
  createdAt: string
  pushedAt: string
  archived: boolean
  fork: boolean
  category: FunctionCategory
  install: InstallInfo
  score: number
}

export interface MetaFile {
  syncedAt: string
  total: number
  byCategory: Record<FunctionCategory, number>
  byInstallForm: Record<InstallForm, number>
  byLanguage: Record<string, number>
  byStarBucket: Record<string, number>
}
```

---

### Task 1: 本地仓库与脚手架

**Files:**
- Create: `package.json`、`tsconfig.json`、`tsdown.config.ts`、`vitest.config.ts`、`.gitignore`、`.npmrc`、`cordis.patch.yml`
- Create: `src/index.ts`、`src/client/index.ts`、`src/client/locales.ts`、`src/client/DirectoryTab.tsx`、`src/client/DirectoryTab.module.css`
- Create: `tests/client/smoke.client.spec.tsx`
- Create: `data/.gitkeep`、`scripts/.gitkeep`

**Interfaces:**
- Produces: 可安装的包 `dsh-plugin-directory`；`cordis.patch.yml` 含 `- insert: [{ id: dsh-plugin-directory, name: dsh-plugin-directory }]`；`src/client/index.ts` 注册 `settings.plugins.tab`（id `directory`，order 20，label 走 locale）；`DirectoryTab` 渲染占位文案 `t('placeholder')`。

- [ ] **Step 1:** `git init`，写 `.gitignore`（`node_modules/`、`lib/`、`dist/`、`.superpowers/`、`coverage/`）。
- [ ] **Step 2:** 写 `package.json`：`name: dsh-plugin-directory`，`type: module`，`exports["./client"]` 指向 `./lib/client.js`，`dsh.bundle.patch: ./cordis.patch.yml`，`dsh.client: { platform: 'web', inject: ['@deepseek-ai/dsh-client-runtime','@deepseek-ai/dsh-client-ui-settings','@deepseek-ai/dsh-client-locale','@deepseek-ai/dsh-client-ui-slots'] }`；scripts 含 `build: tsdown`、`test: vitest run`；peer/devDependencies 放 `@deepseek-ai/dsh-client-*`、`react@^18.2.0`、`react-dom@^18.2.0`、`@deepseek-ai/cordis`。
- [ ] **Step 3:** `pnpm install`（若 `@deepseek-ai/dsh-*@0.1.0-rc.x` 未发布，则改用兄弟检出 `D:\deepseek harness\deepseek-harness` 的 workspace 链接，并在报告中说明）。
- [ ] **Step 4:** 写 `src/client/index.ts`：`export const inject = ['slots','locale']`；`apply(ctx)` 内 `ctx.locale.register(NS, {zh, en})` 后 `ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({ name: 'settings.plugins.tab', id: 'directory', order: 20, label: () => t('tab'), locale: NS }, DirectoryTab))`。
- [ ] **Step 5:** 写 `locales.ts`（含 `tab`、`placeholder` 的 zh/en）；`DirectoryTab` 渲染 `<div data-directory>{t('placeholder')}</div>`。
- [ ] **Step 6:** 写 `smoke.client.spec.tsx`：渲染 `DirectoryTab`，断言占位文案出现。
- [ ] **Step 7:** `pnpm test`（全绿）、`pnpm build`（产出 `lib/client.js`）。
- [ ] **Step 8:** Commit `chore: scaffold dsh-plugin-directory`。

---

### Task 2: 数据模型与类别表

**Files:**
- Create: `src/data/types.ts`（上述数据模型，原样）
- Create: `src/data/constants.ts`
- Test: `tests/data/constants.test.ts`

**Interfaces:**
- Consumes: 无（首个数据层任务）
- Produces: `types.ts` 的 `FunctionCategory`/`InstallForm`/`InstallInfo`/`PluginEntry`/`MetaFile`；`constants.ts` 导出 `CATEGORY_LABEL: Record<FunctionCategory, {zh: string; en: string}>`、`INSTALL_FORM_LABEL: Record<InstallForm, {zh: string; en: string}>`、`STAR_BUCKETS: [number, string][]`（档位如 `[0,'0-9']、[10,'10-49']、[50,'50-199']、[200,'200-999']、[1000,'1000+']`）、`starBucket(n: number): string`。

- [ ] **Step 1:** 写失败测试：断言 `CATEGORY_LABEL` 覆盖全部 11 个类别、`INSTALL_FORM_LABEL` 覆盖 4 种形态、`starBucket` 边界正确（`starBucket(0)==='0-9'`，`starBucket(999)==='200-999'`，`starBucket(1000)==='1000+'`）。
- [ ] **Step 2:** 运行确认失败。
- [ ] **Step 3:** 实现 `types.ts` + `constants.ts`。
- [ ] **Step 4:** 运行确认通过。**Step 5:** Commit `feat: data model and category tables`。

---

### Task 3: 质量评分 `score.ts`

**Files:**
- Create: `src/data/score.ts`
- Test: `tests/data/score.test.ts`

**Interfaces:**
- Consumes: `InstallForm`（types）
- Produces: `scoreRepo(input: ScoreInput, now?: Date): number`（0..100，整数，四舍五入）

```ts
export interface ScoreInput {
  stars: number
  description: string | null
  license: string | null
  hasReadme: boolean
  pushedAt: string
  archived: boolean
  fork: boolean
  installForm: InstallForm
}
```

- [ ] **Step 1:** 写失败测试：满分样例（高 star、有 desc/license/readme、近 90 天 push、非 archived/fork、installForm 非 unknown）≥ 90；全空样例（0 star、无 desc/license/readme、archived、fork、unknown）≤ 20；`installForm !== 'unknown'` 比 `unknown` 同条件下分更高；`pushedAt` 超过 365 天显著降分。
- [ ] **Step 2:** 运行确认失败。
- [ ] **Step 3:** 实现：`stars` 用 `log10` 归一（权重最高），其余布尔项各计分，`installForm` 加分，`pushedAt` 按距今天数线性衰减，clamp 到 `[0,100]`。
- [ ] **Step 4:** 运行确认通过。**Step 5:** Commit `feat: quality scoring`。

---

### Task 4: 功能类别 `classify.ts`

**Files:**
- Create: `src/data/classify.ts`
- Test: `tests/data/classify.test.ts`

**Interfaces:**
- Consumes: `FunctionCategory`（types）
- Produces:
```ts
export function classifyRepo(
  input: { name: string; description: string | null; topics: string[] },
  overrides: Record<string, FunctionCategory>,
): FunctionCategory
```
- 语义：`overrides`（key 为 `owner/repo` id）优先；否则对 `name+description+topics` 小写文本做关键词命中（类别→关键词表见计划 §8），首个命中即返回；无命中返回 `'other'`。

- [ ] **Step 1:** 写失败测试：`overrides` 命中优先；`vision`（含 `ocr`）、`memory`（含 `recall`）、`mcp`（含 `model context protocol`）、`ui-skin`（含 `皮肤`）、`cli-tui`（含 `tui`）各命中一例；无关键词→`other`；大小写不敏感。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现关键词表与匹配。**Step 4:** 运行确认通过。**Step 5:** Commit `feat: function-category classification`。

---

### Task 5: 安装形态与安装方式 `inspect.ts`

**Files:**
- Create: `src/data/inspect.ts`
- Test: `tests/data/inspect.test.ts`

**Interfaces:**
- Consumes: `InstallForm`、`InstallInfo`（types）
- Produces:
```ts
export interface PackageManifest { name?: string; dsh?: { bundle?: unknown; client?: unknown } }
export function installFromPackageJson(pkg: PackageManifest, id: string): InstallInfo
export function installFromReadme(readme: string, id: string, form: InstallForm): InstallInfo
export function normalizeForm(pkg: PackageManifest, hasDsPlugin: boolean): InstallForm
```
- 语义：`normalizeForm`：`dsh.client`→`client`，`dsh.bundle`→`bundle`，`hasDsPlugin`→`repo`，否则 `unknown`。`installFromPackageJson`：bundle/client 用 `pkg.name` 生成 `dsh plugin add <name>`（无 name 则 `dsh plugin add github:<id>`，source `derived`）。`installFromReadme`：从 README 提取首个 `dsh plugin add ...`（或 `npm i -g <pkg>`）命令作为 `command` + `snippet`，source `readme`；未命中则回退派生命令。

- [ ] **Step 1:** 写失败测试：覆盖 4 种形态归一；package.json 有 name 生成 `dsh plugin add <name>`；README 含 `dsh plugin add github:a/b#ref&path:/.dsh-plugin` 时提取该命令且 `source==='readme'`；README 无命令时回退派生且 `source==='derived'`。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现（含正则提取）。**Step 4:** 运行确认通过。**Step 5:** Commit `feat: install-form detection and README install extraction`。

---

### Task 6: 同步管线 `sync.ts`

**Files:**
- Create: `src/data/sync.ts`、`src/data/github.ts`
- Test: `tests/data/sync.test.ts`（用 fixture JSON 模拟 GitHub 响应，不触网）
- Modify: `package.json`（加 `scripts.sync` 与 `octokit` 依赖）

**Interfaces:**
- Consumes: `scoreRepo`、`classifyRepo`、`installFromPackageJson`、`installFromReadme`、`normalizeForm`、类型
- Produces: `sync(args): Promise<void>`，读 `GITHUB_TOKEN`（可选）；写入 `data/plugins.json`（按 score 降序）与 `data/meta.json`。`github.ts` 暴露 `fetchTopicRepos(token?): Promise<RawRepo[]>`（分页抓 `topic:dsh-plugin`，去重、去 fork 可选）、`fetchPackageJson(id, ref?): Promise<PackageManifest | null>`、`fetchReadme(id, ref?): Promise<string | null>`、`hasDsPluginDir(id, ref?): Promise<boolean>`。

```ts
export interface RawRepo {
  full_name: string; name: string; owner: string; html_url: string
  description: string | null; homepage: string | null; topics: string[]
  language: string | null; license: { spdx_id: string } | null
  stargazers_count: number; forks_count: number
  created_at: string; pushed_at: string; archived: boolean; fork: boolean
  default_branch: string
}
```

- [ ] **Step 1:** 写失败测试：喂 fixture（含 2 个 RawRepo + mock 的 fetchPackageJson/readme/hasDsPluginDir），断言 `plugins.json` 排序正确、字段完整（category/install/score 非空）、`meta.json` 计数与分布正确；`--inspect-limit 0` 时 install.form 全为 `unknown` 且 source `derived`。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现 `github.ts`（用 `octokit` 或原生 fetch，带 `X-GitHub-Api-Version` 与 token 头）与 `sync.ts`（编排：抓取→去重→评分/分类→受限深度检测（默认 top 200）→写文件；检测结果按 `(id, default_branch)` 缓存到 `data/.inspect-cache.json`，pushedAt 未变则复用）。
- [ ] **Step 4:** 运行确认通过。**Step 5:** Commit `feat: sync pipeline`。

---

### Task 7: CI 工作流与首次 seed 数据

**Files:**
- Create: `.github/workflows/sync.yml`
- Modify: `data/plugins.json`、`data/meta.json`（首次真实快照）、`data/overrides.json`（初始空 `{}` 或少量手工纠偏）
- Create: `data/.inspect-cache.json`（可被 gitignore，仅本地）

**Interfaces:**
- Consumes: `sync` 命令（`pnpm sync`）
- Produces: 真实 `data/plugins.json`（≥ 500 条）与 `data/meta.json`；`sync.yml` 用 `schedule`（每 6 小时）+ `workflow_dispatch`，`GITHUB_TOKEN` 权限 `contents: write`，步骤 `pnpm install`→`pnpm sync`→`git add data/`→commit→push（若无 diff 则跳过）。

- [ ] **Step 1:** 写 `sync.yml`。
- [ ] **Step 2:** 本地运行 `pnpm sync`（带 `GITHUB_TOKEN` 或匿名；深度检测 top 200；若匿名触发限流，减小 inspect-limit 并记录）。产出真实快照，`pnpm test` 仍全绿。
- [ ] **Step 3:** 抽查 `data/meta.json` 计数合理、`plugins.json` 前 10 条按 score 降序且字段齐全。
- [ ] **Step 4:** Commit `feat: seed data and CI sync workflow`。

---

### Task 8: 客户端接入与双语框架

**Files:**
- Create: `src/client/locales.ts`（完整 zh/en 词典：tab/placeholder/loading/empty/error/retry/search/filter/category/installForm/groupBy/sort/install/copy/copied/stats/…）
- Modify: `src/client/index.ts`（register 注册 DirectoryTab，注入 `plugins`+`meta` 数据）
- Modify: `src/client/DirectoryTab.tsx`（加载态/空态/错误态 + 读入快照）
- Test: `tests/client/directory.client.spec.tsx`

**Interfaces:**
- Consumes: `PluginEntry`、`MetaFile`（types）；`data/plugins.json`、`data/meta.json`（构建期 import，需 `resolveJsonModule: true`）
- Produces: `DirectoryTab` 接收 `{ plugins, meta, t }`，展示 loading/empty/error 三态；`apply(ctx)` 完成 slot 注册。

- [ ] **Step 1:** 补全 `locales.ts` 全量词典（zh/en 对称）。
- [ ] **Step 2:** 实现 `DirectoryTab` 三态 + 数据装载（`useEffect` 里异步读 JSON 或直接 import 常量）。
- [ ] **Step 3:** 写组件测试：加载态→ready 态渲染条目数；空数据→空态文案；error 态→重试按钮。
- [ ] **Step 4:** `pnpm test`、`pnpm build` 全绿。**Step 5:** Commit `feat: client entry and bilingual shell`。

---

### Task 9: 统计看板

**Files:**
- Create: `src/client/StatsDashboard.tsx`、`src/client/StatsDashboard.module.css`
- Test: `tests/client/stats.client.spec.tsx`

**Interfaces:**
- Consumes: `MetaFile`
- Produces: `StatsDashboard({ meta, t })` 渲染：总数、按类别分布、按安装形态分布、按语言分布、按星级档分布（用 `CATEGORY_LABEL`/`INSTALL_FORM_LABEL` 本地化标签）。

- [ ] **Step 1:** 写失败测试：给定 fixture `MetaFile`，断言总数与各分布条目的计数文案出现。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现组件（用语义化 HTML + CSS Module，`data-stat` 属性便于断言）。**Step 4:** 运行确认通过。**Step 5:** Commit `feat: stats dashboard`。

---

### Task 10: 搜索、用户可选分类、排序

**Files:**
- Create: `src/client/FilterBar.tsx`、`src/client/FilterBar.module.css`
- Modify: `src/client/DirectoryTab.tsx`
- Test: `tests/client/filter.client.spec.tsx`

**Interfaces:**
- Consumes: `PluginEntry`、`FunctionCategory`、`InstallForm`、`CATEGORY_LABEL`、`INSTALL_FORM_LABEL`
- Produces: 纯函数 `filterAndSort(plugins, query: string, categories: Set<FunctionCategory>, installForms: Set<InstallForm>, groupBy: GroupBy, sort: SortKey): { groups: GroupResult[]; visible: number }`，其中 `GroupBy = 'category' | 'installForm' | 'language' | 'starBucket'`，`SortKey = 'score' | 'stars' | 'recent'`；`FilterBar` 渲染搜索框、类别多选 chips、安装形态 chips、分组维度切换、排序切换。

- [ ] **Step 1:** 写失败测试：搜索命中 name/description/author；类别多选交集过滤；安装形态过滤；分组维度 `category` 分组正确；排序 `recent`/`stars`/`score` 各自正确；空查询+无过滤返回全量。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现 `filterAndSort` + `FilterBar` + 接入 `DirectoryTab`。
- [ ] **Step 4:** 运行确认通过。**Step 5:** Commit `feat: search, user-selectable classification, sort`。

---

### Task 11: 仓库卡片与一键安装

**Files:**
- Create: `src/client/PluginCard.tsx`、`src/client/PluginCard.module.css`
- Test: `tests/client/card.client.spec.tsx`

**Interfaces:**
- Consumes: `PluginEntry`、`CATEGORY_LABEL`、`INSTALL_FORM_LABEL`
- Produces: `PluginCard({ entry, t })` 渲染名称/作者/描述/star/语言/license/最近更新/分类徽章/安装形态徽章 + 「安装」按钮（展示 `entry.install.command`）+ 一键复制（`navigator.clipboard.writeText`，测试用 mock，复制成功后显示 `t('copied')`）。命令为 null 时不显示按钮。

- [ ] **Step 1:** 写失败测试：卡片渲染 star、分类、安装命令；点击复制调用 clipboard（mock）并显示 copied；`command === null` 时无安装按钮。
- [ ] **Step 2:** 运行确认失败。**Step 3:** 实现 `PluginCard` 并接入列表。**Step 4:** 运行确认通过。**Step 5:** Commit `feat: plugin cards with one-click install`。

---

### Task 12: README 与收尾集成验证

**Files:**
- Create: `README.md`、`README.zh.md`（或双语单文件）
- Modify: 必要的 `package.json`（description/repository/keywords）
- 验证（不产 commit，仅报告）：在 harness 检出运行 `pnpm dsh web`，用 `--patch` 挂载本插件，确认「设置 → 插件 → 插件目录」渲染真实数据、搜索/筛选/分组/统计/复制可用。

**Interfaces:**
- Consumes: 全部既有产出
- Produces: 可发布的 `dsh-plugin-directory`；README 含：简介、一键安装（`dsh plugin add github:<repo>` 或 npm）、安装方式提取策略说明、数据同步说明、开发/测试命令、许可证。

- [ ] **Step 1:** 写 README（中英，覆盖一键安装、安装方式提取策略、同步机制、`pnpm test`/`pnpm build`/`pnpm sync`）。
- [ ] **Step 2:** 集成验证：在 `D:\deepseek harness\deepseek-harness` 运行 `pnpm dsh web`，通过 profile/`--patch` 挂载本包，浏览器打开 `http://127.0.0.1:3080` 确认 tab 与数据（用 playwright 截图/快照留存证据）。
- [ ] **Step 3:** 修复验证中发现的问题，`pnpm test` 全绿。**Step 4:** Commit `docs: README and release polish`。
