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
dsh plugin add github:<owner>/dsh-plugin-directory
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

该 tab 基于打包进客户端的 `dsh-plugin` topic 数据快照，完全在浏览器端运行：

- **搜索** — 按插件名称、作者或描述过滤。
- **类别多选** — 可同时组合任意数量的功能类别（工具、技能、记忆、视觉、界面皮肤、
  MCP、编排、命令行/终端、网页、智能体、其他）。
- **安装形态筛选** — 限定为插件包 / 仓库 / 客户端 / 未知。
- **分组维度切换** — 按功能类别、安装形态、语言或 Star 档位分组卡片。
- **排序** — 按质量分、Star 数或最近更新。
- **统计看板** — 插件总数，以及按类别、安装形态、语言、Star 档位的分布。
- **一键安装** — 每张卡片的「安装」按钮复制该插件的安装命令（见下方提取策略）。

## 安装方式提取策略

每条被收录插件都带有 `install` 字段，说明其安装方式，按以下优先级提取：

1. **插件自身 README** — 在插件 README 中找到的第一条真实 `dsh plugin add
   <target>` 调用（目标为单个无空格的 token，如 npm 包名、`github:owner/repo`
   或路径）即作为安装命令，并保留该行作为片段；仅在行文中提及 `dsh plugin add`
   而没有具体目标的，忽略。
2. **`package.json` 信号** — README 中没有安装命令，但插件清单声明了
   `dsh.client` 或 `dsh.bundle` 时，使用其 npm 包名：`dsh plugin add <package-name>`。
3. **`.dsh-plugin` 目录** — 仓库型插件（无 client/bundle 清单）从仓库安装：
   `dsh plugin add github:<owner>/<repo>&path:/.dsh-plugin`。
4. **回退** — 以上均不适用时：`dsh plugin add github:<owner>/<repo>`。

每张卡片上的「安装」按钮复制的正是该解析结果。

## 数据同步

- `data/plugins.json` 与 `data/meta.json` 由 `sync-data` GitHub Actions 工作流每
  **6 小时**（cron `0 */6 * * *`）从 `dsh-plugin` topic 抓取并重新生成，有变化时
  自动提交回默认分支。
- `pnpm sync` 手动触发同一管线（深度检查结果缓存在 `data/.inspect-cache.json`，
  仓库 `pushed_at` 未变时复用）。
- `data/overrides.json` 用于人工纠偏基于关键词的类别分类，键为 `owner/repo`。
- 数据快照在构建时打包进客户端，tab 运行时无需网络。

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
- **未认证搜索限额** — 同步管线使用 GitHub 搜索 API；CI 中带 `GITHUB_TOKEN`
  运行（见 `.github/workflows/sync.yml`），但未带 token 的手动 `pnpm sync`
  很快会耗尽未认证速率限额。

## License

MIT
