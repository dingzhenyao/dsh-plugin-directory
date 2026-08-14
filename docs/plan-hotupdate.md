# DSH 插件目录 v2 实施计划：热更新 + 安装按钮门控 + 搜索实时热更新

> 审批状态：待审批（2026-08-14）

## 1. 目标

在现有插件上新增三个能力：

1. **CDN 热更新**：目录数据运行时从 CDN 拉取最新快照，无需重装插件即可更新。
2. **安装按钮门控**：仅当仓库 README 正则检测到真实的 `dsh` 安装方式/命令时，才显示「安装」按钮；否则不显示。
3. **搜索实时热更新**：搜索时触发对 GitHub 的实时查询，推送「最新 + 最匹配」的仓库（超越本地快照范围）。

## 2. 现状与根因

- **数据是「构建时快照」**：`src/client/data.ts` 用 `import plugins from '../../data/plugins.json'`，把 200 条快照**内联进 `lib/client.js`**（227KB）。浏览器运行时**零网络请求**，所以数据不会自动更新——要 `pnpm sync` + `pnpm build` + 重装才生效。
- **安装按钮「永远显示」**：`PluginCard` 只要 `install.command !== null` 就显示按钮；而 `installFromReadme` 在 README 无命令时会回退派生命令（`dsh plugin add github:owner/repo`），所以几乎每个卡片都有按钮，即使该仓库根本没写安装方法。
- **搜索只查本地快照**：`filterAndSort` 只过滤内存里的 200 条，搜不到「快照之外」的新仓库。

## 3. 方案

### 3.1 特性一：CDN 热更新

**架构**：内置快照兜底 + CDN 后台刷新。

```
浏览器启动 ──► 立即用内置快照渲染（离线可用、秒开）
           └─► 后台 fetch CDN 快照（jsDelivr）
                 ├─ 成功 → 替换为远程数据 + 显示 syncedAt
                 └─ 失败 → 保持内置快照（静默回退）
```

- `src/client/data.ts` 改为：
  - `FALLBACK = { plugins, meta }`（继续 import 内置 JSON，作兜底）。
  - `fetchRemote(base): Promise<Snapshot | null>`：`fetch(base + '/plugins.json')` 与 `meta.json`，非 2xx/解析失败 → `null`。
- CDN 地址：`https://cdn.jsdelivr.net/gh/<owner>/dsh-plugin-directory@main/data`（jsDelivr 对 GitHub 文件返回 `Access-Control-Allow-Origin: *`，浏览器可跨域直读）。`<owner>` 为发布后真实 owner，先做常量占位、可配置。
- `DirectoryTab`：挂载后 `fetchRemote` 后台刷新；成功后 `setState` 换成远程数据；顶部显示 `meta.syncedAt`（本地化时间）。加「刷新」按钮手动触发。
- 说明：jsDelivr 约 12h 缓存；CI 每 6h commit 新快照后，最长 ~18h 生效——作为「自动更新」已够，若需分钟级再走特性三的实时查询。

### 3.2 特性二：安装按钮门控

**核心**：`install.source === 'readme'` 才显示按钮（其余 source 一律隐藏）。

- `src/data/inspect.ts` 增强 `installFromReadme` 的正则，识别更多 `dsh` 安装方式：
  - `dsh plugin add <target>`（现有，保留单目标 token 校验）
  - `dsh plugin --profile <name> add <target>`
  - `pnpm dsh plugin add <target>`（源码方式）
  - `.dsh-plugin` config 片段：含 `&path:/.dsh-plugin` 或 `github:<owner>/<repo>#<ref>&path:/.dsh-plugin` 的行
  - 命中任一 → `source='readme'`；都未命中 → `source='derived'`（且不显示按钮）
- `PluginCard.tsx`：把「显示安装区」的条件从 `command !== null` 改为 `install.source === 'readme'`。
- 数据层不变：`install.command` 仍保留派生值（供未来/调试），但 UI 不展示。
- **代价（按你要求执行）**：一个规范的 npm bundle 插件（`dsh.bundle` + 已发布名）若 README 没写安装命令，也不会显示按钮——这是你明确要求的「仅 README 检测到才显示」。

### 3.3 特性三：搜索实时热更新

**核心**：搜索（防抖后）触发 GitHub Search API 实时查询，返回「最新最匹配」仓库，与本地结果合并展示。

```
用户输入 query（防抖 300ms）
   └─► 本地 filterAndSort（快照内匹配）
   └─► 实时：GET api.github.com/search/repositories?q=<query>+topic:dsh-plugin
          ├─ 成功 → 映射为「轻量 PluginEntry[]」+ 标注「实时」
          └─ 403/限流 → 提示限流，仅显示本地结果
   └─► 按 id 去重合并，实时结果排在本地之后（或独立分区）
```

- **共享映射**：抽取 `src/data/map.ts` 提供 `searchItemToEntry(item, now): PluginEntry`（复用 `classify.ts` 分类 + `score.ts` 评分；实时结果 `install.form='unknown'`、`source='derived'`，因此不显示安装按钮——与特性二一致）。
- **实时客户端**：`src/client/liveSearch.ts` 提供 `searchLive(query): Promise<PluginEntry[]>`，用浏览器 `fetch`（GitHub API 支持 CORS），`q=<query> topic:dsh-plugin`，`per_page=20`。
- **触发与限流**：防抖 300ms；未认证 search 10 次/分 → 内存缓存（同 query 5 分钟内复用）+ 403 时降级提示。实时结果用 `data-live` 标记、显示「实时结果 · 可能未收录」徽标。
- 实时结果无 README 检测 → 无安装按钮，仅「去 GitHub 看」链接。

## 4. 任务分解

### Task 1: 抽取共享映射 `src/data/map.ts`
- Create: `src/data/map.ts`（`searchItemToEntry` + 复用 `classifyRepo`/`scoreRepo`）
- Test: `tests/data/map.test.ts`（fixture 搜索结果 → PluginEntry 字段/分类/评分正确、install 为 unknown/derived）

### Task 2: 增强 README 安装方式正则（特性二数据侧）
- Modify: `src/data/inspect.ts`（`readmeCommand` 扩展识别 profile/pnpm/config 片段）
- Test: `tests/data/inspect.test.ts` 新增：profile 形式、pnpm 形式、`.dsh-plugin` config 片段各命中 `source='readme'`；无命令仍 `derived`

### Task 3: 安装按钮门控（特性二 UI 侧）
- Modify: `src/client/PluginCard.tsx`（`install.source === 'readme'` 才渲染安装区）
- Test: `tests/client/card.client.spec.tsx`（derived/package-json 时无按钮，readme 时有按钮）

### Task 4: CDN 热更新（特性一）
- Modify: `src/client/data.ts`（`FALLBACK` + `fetchRemote`）、`src/client/DirectoryTab.tsx`（后台刷新 + 刷新按钮 + syncedAt）、`src/client/locales.ts`（`refreshing/refreshFailed/refreshedAt/refresh` 文案）、`src/client/index.ts`（注入 cdnBase）
- Test: `tests/client/directory.client.spec.tsx`（fetch mock：成功替换数据/失败回退）

### Task 5: 搜索实时热更新（特性三）
- Create: `src/client/liveSearch.ts`；Modify: `DirectoryTab.tsx`（防抖 300ms 触发 + 合并 + 实时徽标 + 限流提示）、`locales.ts`
- Test: `tests/client/live.client.spec.tsx`（mock fetch：结果映射/合并/去重/403 降级）

### Task 6: 收尾
- `pnpm build`（`lib/client.js` 应显著减小，因数据改为运行时拉取、内置快照仍打包兜底）→ 挂载到 rc.5 harness 实测
- 更新 `README.md`/`README.zh.md`（CDN 热更新说明 + 安装按钮门控规则 + 实时搜索说明）

## 5. 风险与应对

| 风险 | 应对 |
|---|---|
| jsDelivr ~12h 缓存，更新不够及时 | 特性三实时查询兜底「最新」；CI 每 6h commit |
| 未认证 GitHub 搜索限流 10/min | 防抖 + 同 query 5min 内存缓存 + 403 降级提示 |
| 实时结果无 README 检测 → 无安装按钮 | 属预期（特性二规则）；卡片仍可跳 GitHub |
| `<owner>` 占位（仓库未发布） | CDN 地址做成常量/可配置，发布后替换即可，本地测试用 mock |
| 数据从 bundle 迁出后离线不可用 | 保留内置快照兜底，离线仍完整可用 |

## 6. 验收标准

1. 内置快照可离线秒开；联网时后台自动拉 CDN 快照并显示 `syncedAt`；「刷新」按钮可手动重拉。
2. 只有 README 检测到真实 `dsh` 安装命令的卡片显示「安装」按钮；派生/无命令的不显示。
3. 输入搜索词（防抖后）触发 GitHub 实时查询，结果与本地合并、标注「实时」；限流时降级提示且不崩。
4. `pnpm test` 全绿（含新增用例）；`pnpm build` 通过；挂载 rc.5 harness 实测可用。
