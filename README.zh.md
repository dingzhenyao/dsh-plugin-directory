# dsh-plugin-directory

DeepSeek Harness（DSH）Web GUI 的插件目录。它在「设置 → 插件」中渲染一个
**插件目录** tab，用于浏览、搜索、筛选和对比 GitHub 上带有
[`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 的仓库——包括每个插件的
安装命令、功能类别、安装形态、语言、许可证、Star 数和质量分。

English docs: [`README.md`](./README.md)。

## 安装

本插件自身就是一个 DSH 插件，使用 `dsh` CLI 安装：

**npm**

```sh
dsh plugin add dsh-plugin-directory
```

**git**（发布到 GitHub 组织/用户下后）

```sh
dsh plugin add github:dingzhenyao/dsh-plugin-directory
```

**手动 / 本地目录**

```sh
dsh plugin --profile <profile-name> add ./dsh-plugin-directory
```

安装后打开 DSH Web GUI，进入「设置 → 插件 → 插件目录」即可查看。

### 版本兼容

本插件兼容 DeepSeek Harness `0.1.0-rc.5`（源码 checkout）与 `0.1.0-rc.6`（npm）。
客户端 peer 依赖声明为 `>=0.1.0-rc.5 <0.2.0`，因此本地 `pnpm dsh` 源码运行和
npm 安装的 `dsh` 都能满足。

## 使用

该 tab 基于 `dsh-plugin` topic 数据快照在浏览器端运行：

- **搜索** — 按插件名称、作者或描述过滤；同时触发 GitHub 实时搜索（见下文）。
- **类别多选** — 可同时组合任意数量的功能类别（工具、技能、记忆、视觉、界面皮肤、
  MCP、编排、命令行/终端、网页、智能体、其他）。
- **安装形态筛选** — 限定为插件包 / 仓库 / 客户端 / 未知。
- **分组维度切换** — 按功能类别、安装形态、语言或 Star 档位分组卡片（默认不分组）。
- **排序** — 按质量分、Star 数或最近更新（默认按 Star）。
- **统计看板** — 插件总数，以及按类别、安装形态、语言、Star 档位的分布。
- **一键安装** — 卡片「安装」按钮复制该插件安装命令，**仅当插件自身 README 记录了
  真实 `dsh` 安装命令时才显示**（见下方提取策略）。
- **我的插件** — 目录下方的个人管理面板。点击「安装」即记录该插件；也可手动添加
  （来源仓库 `owner/repo` 为必填），并可移除或刷新已有条目。列表保存在浏览器
  `localStorage` 的 `dsh-plugin-directory:installed` 键下（见下文说明）。
- **刷新** — 手动刷新按钮从 CDN 重新拉取最新快照。

## 安装方式提取策略

每条被收录插件都带有 `install` 字段，说明其安装方式，按以下优先级提取：

1. **插件自身 README** — 在插件 README 中找到的第一条真实安装调用即作为安装命令，
   并保留该行作为片段。可识别的形式包括 `dsh plugin add <target>`、
   `dsh plugin --profile <name> add <target>`、
   `pnpm dsh plugin [--profile <name>] add <target>`，以及裸 `.dsh-plugin`
   引用（`github:<owner>/<repo>#<ref>&path:/.dsh-plugin`）；仅在行文中提及
   而没有具体目标的，忽略。
2. **`package.json` 信号** — README 中没有安装命令，但插件清单声明了
   `dsh.client` 或 `dsh.bundle` 时，使用其 npm 包名：`dsh plugin add <package-name>`。
3. **`.dsh-plugin` 目录** — 仓库型插件（无 client/bundle 清单）从仓库安装：
   `dsh plugin add github:<owner>/<repo>&path:/.dsh-plugin`。
4. **回退** — 以上均不适用时：`dsh plugin add github:<owner>/<repo>`。

「安装」按钮**仅在第 1 种情况（README 真检测到命令）时显示**。派生命令（第 2–4 种）
会记录在条目上备用，但绝不显示按钮——因此 README 未说明如何安装的仓库不会被给出
一个猜测的安装按钮。

## 数据同步

- `data/plugins.json` 与 `data/meta.json` 由 `sync-data` GitHub Actions 工作流每
  **6 小时**（cron `0 */6 * * *`）从 `dsh-plugin` topic 抓取并重新生成，有变化时
  自动提交回默认分支。
- `pnpm sync` 手动触发同一管线（深度检查结果缓存在 `data/.inspect-cache.json`，
  仓库 `pushed_at` 未变时复用）。
- `data/overrides.json` 用于人工纠偏基于关键词的类别分类，键为 `owner/repo`。
- 数据快照打包进客户端作为离线兜底，tab 运行时从 CDN 刷新（见下文）。

## 运行时刷新与实时搜索

- **CDN 刷新** — 打开时，tab 从 jsDelivr 拉取最新快照
  （`https://cdn.jsdelivr.net/gh/dingzhenyao/dsh-plugin-directory@main/data`）；
  成功则替换内置快照并显示上次同步日期，失败（离线）则静默保留内置快照。
  owner（`dingzhenyao`）是托管 `dsh-plugin-directory` 仓库的 GitHub 账户名，
  为**单一固定值**、构建时写入、所有安装者共用（非每用户各自账户）。jsDelivr
  对 GitHub 文件返回 `Access-Control-Allow-Origin: *`。
- **实时搜索** — 输入搜索词时同时向 GitHub Search API 查询 `topic:dsh-plugin`
  匹配仓库（防抖、20 条），去重后以「实时结果」区块追加展示。实时结果无 README
  检测，因此不显示安装按钮；限流/失败时降级为仅本地结果并给出提示。

## 我的插件（宿主文件管理）

「我的插件」面板记录你通过本目录管理的插件，数据由**宿主数据文件**
`$DSH_HOME/storages/dsh-plugin-directory/installed.json` 承载，通过 Typert
Remote（`ctx.remote.pluginManager.*`）从浏览器写入：

- 点击卡片「安装」按钮即添加该插件（来源记为 `github:<owner>/<repo>`，方式为
  `search`）。
- 「添加」接受手动来源仓库 —— `owner/repo` 或 `github:owner/repo`，非法
  `owner/repo` 会被拒绝（方式为 `manual`），显示名取仓库名。
- 「更新」刷新条目时间戳（重新安装）；「删除」删除条目。
- 「同步状态」读取 harness 的**真实 Loader 清单**（内置只读 `pluginInventory`
  Remote），在每条上显示徽章：**已安装**（含启用/加载失败/加载中细化）、**已禁用**、
  **未安装** 或 **状态未知**（清单不可用）。匹配以 Loader 的 `moduleName` 对台账
  id/source，带唯一 basename 回退——因此同一项目用 npm 安装也能对上记录的 git 来源。
  清单每 30 秒自动重读一次（也可点「同步状态」手动刷新）。

台账仅是记账：它记录你触发过安装的插件（以及手动添加项），**不会**真正执行
`dsh plugin add`/remove，也不会把真实安装状态回写进文件——真实状态通过清单同步
实时显示，而非持久化。

### Remote 工作原理

宿主导出 `PluginManagerGateway`（继承 `TypertRemoteService`，带
`@Remote('list' | 'add' | 'delete' | 'update')` 方法）。宿主网关通过其 SRC
回退（`resolveSrcDescriptor`）发现它——无需生成 `./typert` 清单。客户端半边
手写对应的 `TYPERT_REMOTE` 贡献（`src/client/remote.ts`），使用 **strict** zod
codec（客户端网关拒绝 `src-json`），经 `ctx.remote.$mount(...)` 挂载后，tab 调用
`ctx.remote.pluginManager.*`。真实安装状态来自 harness 自带的只读
`ctx.remote.pluginInventory` Remote（由 `@deepseek-ai/dsh-api-remotes` 挂载）。

浏览器端需注入 `@deepseek-ai/dsh-api-remotes`（它提供 `ctx.remote`）；宿主构建
通过 tsdown transform（`ts.transpileModule`）降级标准 `@Remote` 装饰器，使方法
标记在运行时正确注册。

校验辅助函数（`isSourceRepo` / `normalizeSource`）在宿主
（`src/data/installed.ts`）与客户端（`src/data/installed-types.ts`）间共用。

## 开发

```sh
pnpm install
pnpm build       # tsdown → lib/index.js（宿主端）+ lib/client.js（浏览器端）
pnpm test        # vitest
pnpm sync        # 从 GitHub dsh-plugin topic 刷新 data/
pnpm typecheck   # tsc --noEmit
```

在 DSH 文件沙箱中，vite 的 Windows realpath 探测会触发被抑制的子进程，因此测试需
通过 shim 运行：

```sh
NODE_OPTIONS=--require=./scripts/vitest-sandbox.cjs pnpm test
```

## 已知限制

- **类别标签语言** — 固定文案（tab 名、按钮、占位符）会随界面语言即时生效，但
  类别/安装形态标签字典在页面打开时读取：切换语言后需重新打开该 tab 才能看到
  更新后的标签。
- **「我的插件」是记账，状态实时显示** — 面板把「你触发过安装的插件」和手动添加项
  写入宿主数据文件，但不把 harness 的真实安装状态回写；每条上的已安装/已禁用/加载
  失败徽章通过「同步状态」从 Loader 清单实时读取，因此本目录之外的安装只有在
  `moduleName` 匹配到某条记录时才会显示出来。
- **CDN 缓存延迟** — jsDelivr 对快照缓存约 12 小时，CI 新提交最长约 18 小时才会
  反映到 CDN 刷新；最新仓库由实时搜索补齐。
- **未认证搜索限额** — 实时搜索从浏览器直连 GitHub 搜索 API（未认证，10 次/分），
  已做防抖，限流时降级为本地结果；同步管线在 CI 中带 `GITHUB_TOKEN`（见
  `.github/workflows/sync.yml`）。
- **CDN 需仓库已发布** — CDN 刷新与 git 安装行指向
  `github.com/dingzhenyao/dsh-plugin-directory`；在该仓库尚未推送至 GitHub 前，
  tab 会静默回退到内置快照。若仓库迁移，改 `src/client/data.ts`（`CDN_BASE`）。

## License

MIT
