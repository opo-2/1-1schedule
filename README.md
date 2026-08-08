# 日程管理应用 — 本地运行指南

## 前置条件

你本机需要安装 **Node.js**（推荐 v18+，项目使用 v22），自带 npm。

## 步骤

### 1. 进入项目目录

```bash
cd C:\Users\lenovo\WorkBuddy\2026-08-06-09-53-11\schedule-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动 Electron 开发模式

```bash
npm run electron:dev
```

这条命令会同时启动两个东西：
- **Vite** 前端开发服务器（`http://localhost:5173`）
- **Electron** 桌面窗口，加载 Vite 页面

### 4. 打包成 exe（可选）

```bash
npm run electron:build
```

输出在 `release/` 目录。

## 文件结构说明

```
schedule-app/
├── index.html          ← 浏览器版原型（无需 npm，双击即用）
├── electron/
│   ├── main.js         ← Electron 主进程（窗口管理、定时弹窗、IPC）
│   └── preload.js      ← 安全的 IPC 桥接
├── src/                ← React 源码（供 Vite 构建）
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── WeekView.tsx
│   │   └── PopupForm.tsx
│   ├── store/
│   │   ├── scheduleStore.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── global.css
└── vite.config.ts
```

## 如果 npm install 报错

1. 检查 node 版本：`node -v`（需要 v16+）
2. 清除缓存重试：`npm cache clean --force && npm install`
3. 如果网络慢，设置国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install
   ```
4. 如果还不行，直接用浏览器打开 `index.html` 原型版，功能完全一致（仅缺少桌面定时弹窗）。

## 浏览器版快捷键

- `Ctrl + P`：手动呼出快捷弹窗（模拟两小时定时弹出）

## 数据导入导出

顶栏有 ↓ 导出和 ↑ 导入按钮：
- **导出**：下载完整备份 JSON（日程 + 周备注 + 心情 + 设置 + 频率统计）
- **导入**：选择备份文件，预览后智能合并（冲突保留较新版本）或完全替换

## 跨设备同步方案分析

### 方案 A：导入导出（已实现）

手动导出 → 传输文件 → 目标机器导入。适合偶尔迁移，不适合日常多机使用。

### 方案 B：同步文件夹（推荐短期方案）

将应用数据目录指向云盘同步文件夹（OneDrive / 坚果云 / Dropbox）。

#### 改动量
Electron `main.js` 中修改一行：`app.getPath('userData')` → 固定路径。

```js
// 当前
dataDir = path.join(app.getPath('userData'), 'schedule-data');

// 改为
dataDir = path.join('D:\\OneDrive\\schedule-data');
// 或更安全：
dataDir = path.join(process.env.USERPROFILE, 'OneDrive', 'schedule-data');
```

#### 云空间成本

| 服务 | 免费空间 | 够用吗 | 备注 |
|------|---------|--------|------|
| **OneDrive** | 5 GB | 绰绰有余（数据文件 < 1 MB） | Windows 自带，最方便 |
| **坚果云** | 免费 1 GB/月上传 | 绰绰有余 | 国内速度快，增量同步 |
| **Dropbox** | 2 GB | 绰绰有余 | 跨平台最好，但需科学上网 |
| **iCloud** | 5 GB | 绰绰有余 | macOS 原生，Windows 可用 |

**结论：零成本。**你的日程数据是纯文本 JSON，几十 KB 的量级，任何免费云盘都完全够用。不存在存储费用问题。

#### 冲突风险
两台机器同时修改数据文件，云盘同步时可能产生冲突副本（如 `events (冲突副本).json`）。概率很低（你必须两台机器同时开着应用且同时写入），即使发生也只是生成副本文件，不会丢数据。

#### 手机端
同步文件夹方案不支持手机直接查看/编辑。如果未来需要手机端访问，需要升级到方案 D（云数据库）。

### 方案 C：Git 自动备份

每次关闭应用自动 commit + push 到私有仓库。有完整版本历史，但需要本地配置 git 和 SSH key。

### 方案 D：云数据库（未来方案）

数据存到 Supabase / 腾讯云开发等，多端实时同步。需要后端开发，适合功能稳定后再做。
