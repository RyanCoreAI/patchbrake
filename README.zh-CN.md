# PatchBrake

[English](README.md) | [简体中文](README.zh-CN.md)

PatchBrake 是一个给 AI 生成代码“踩刹车”的本地 CLI 工具。

Claude Code、Codex、Cursor、Copilot 这类 AI 编码工具能很快改代码，但一些风险很容易藏在 diff 里：密钥被写进代码、测试被删、GitHub Actions 权限被放大、危险数据库迁移、Agent 配置被改坏。

PatchBrake 做的事情很简单：在你 commit 前扫描这次 git diff，找出明显危险的改动。

```bash
npx patchbrake scan --staged
```

![PatchBrake demo](assets/demo.gif)

No LLM. No dashboard. No code upload. 只扫描这次 diff。

## 适用场景

- 你经常用 Claude Code、Codex、Cursor、Copilot 生成或修改代码。
- 你想在 commit 前快速检查这次改动有没有明显风险。
- 你希望 CI 能挡住 secret 泄露、删测试、权限放大这类低级但严重的问题。
- 你不想把代码上传到 SaaS，也不想让工具调用 LLM 分析你的仓库。

## 快速开始

前置条件：

- 已安装 Node.js 20+ 和 npm。`npx` 是 npm 自带的命令。
- 已安装 Git，并且在你要扫描的项目仓库里运行命令。

让 AI 工具改完代码后，把改动加入暂存区：

```bash
git add .
npx patchbrake scan --staged
```

如果 PatchBrake 报出 error，先修掉这次 diff，再提交：

```bash
git commit -m "feat: ..."
```

需要固定版本时：

```bash
npx patchbrake@0.2.0 scan --staged
```

也可以全局安装：

```bash
npm install -g patchbrake
patchbrake scan --staged
```

## 它能检查什么

- `secret-leak`：新增 API key、token、private key、`.env` 风险。
- `deleted-tests`：测试文件被删除，或者测试用例 / 断言被删。
- `workflow-permissions`：GitHub Actions 权限被放大，例如 `write-all`。
- `migration-risk`：危险 migration，例如 `DROP`、`TRUNCATE`、无 `WHERE` 的 `DELETE`。
- `prompt-config-drift`：`AGENTS.md`、`CLAUDE.md`、`.cursor/rules`、prompt 或策略文件变化。
- beta 规则：auth guard 删除、危险 npm script、危险 shell 命令、依赖风险。

## 示例输出

```text
PatchBrake found 3 risky diff finding(s).
Scanned 3 file(s), skipped 0 file(s), ran 9 rule(s).

ERROR secret-leak src/config.ts:1
  Possible OpenAI API key added in this diff.
  > OPENAI_API_KEY="sk-...redacted"
  Fix: Remove the value from git history, rotate it if real, and load it from environment or CI secrets.

ERROR deleted-tests tests/auth.test.ts
  Test file deleted in this diff.
  Fix: Keep the test or add replacement coverage in the same change.

WARN workflow-permissions .github/workflows/release.yml:3
  Workflow permission was widened to write scope.
  > permissions: write-all
  Fix: Restrict the permission to the minimum read/write scope needed for this job.
```

## 它不是什么

PatchBrake 有意保持很窄的边界：

- 不是 AI PR Reviewer。
- 不是 SaaS。
- 不是完整 SAST。
- 不上传代码。
- 不调用 LLM。
- 不替代 CodeQL、Semgrep、Snyk 或人工 review。

它只做一件事：扫描这次 diff，抓明显、可解释、适合阻断的风险信号。

## 常用命令

扫描 staged diff：

```bash
npx patchbrake scan --staged
```

扫描 PR / commit range：

```bash
npx patchbrake scan --base origin/main --head HEAD
```

输出 JSON：

```bash
npx patchbrake scan --staged --format json --output patchbrake-report.json
```

输出 SARIF：

```bash
npx patchbrake scan --base origin/main --head HEAD --format sarif --output patchbrake.sarif
```

创建配置文件：

```bash
npx patchbrake init
```

## 进一步了解

- [Demo case](docs/demo-case.md)：一个可复现的 secret、删测试、Actions 权限放大示例。
- [Reproducible demo cases](docs/demo-cases/README.md)：5 个可复制运行的 AI diff 风险示例。
- [Comparison](docs/comparison.md)：PatchBrake 和 AI PR reviewer、secret scanner、SAST 的区别。

## 配置方式

PatchBrake 会读取当前目录下的 `.patchbrakerc.json` 或 `patchbrake.config.json`。

```json
{
  "failOn": "error",
  "outputFormat": "text",
  "rules": {
    "secret-leak": "error",
    "workflow-permissions": "warn",
    "migration-risk": "warn",
    "prompt-config-drift": "warn"
  }
}
```

## GitHub Action

在 PR 中使用：

```yaml
name: PatchBrake
on:
  pull_request:

permissions:
  contents: read

jobs:
  patchbrake:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: RyanCoreAI/patchbrake@v0.2.0
        with:
          base: origin/${{ github.base_ref }}
          head: HEAD
          version: "0.2.0"
          fail-on: error
```

GitHub Action 默认采用 CI 安全模式：不加载仓库里的自定义规则、不让新增的 `patchbrake-ignore*` 直接压制 finding，并且遇到新增 ignore 注释会失败。

## 适合哪些人

- 经常让 AI 工具直接改代码的个人开发者。
- 想给 AI 生成 PR 加一道本地检查的团队。
- 维护开源项目、希望减少明显危险 diff 混进主分支的人。
- 需要一个轻量 CI safety gate，但不想引入 SaaS 或复杂平台的人。

## 贡献方式

最有价值的反馈不是夸奖，而是：

1. 误报 false positive。
2. 真实危险 diff。
3. 希望新增的规则。

可以直接在 GitHub 提 issue，或者带着最小复现 diff 说明你期望 PatchBrake 如何判断。
