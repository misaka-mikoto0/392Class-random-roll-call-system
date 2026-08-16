# 392 班点名系统 · 工具集

本目录存放面向开发者 / 管理员的辅助工具。当前包含：

| 文件 | 类型 | 用途 |
| --- | --- | --- |
| `history-editor.user.js` | Tampermonkey 油猴脚本 | 提供可视化界面访问、修改、审计历史记录 |

---

## history-editor.user.js

### 安装步骤

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. 进入 Tampermonkey 管理面板 → 「实用工具」→ 导入文件，选择 `history-editor.user.js`；
   或直接拖拽该文件到 Tampermonkey 图标上。
3. **重要**：如果通过 `file://` 协议打开点名系统页面，需要在浏览器扩展管理里
   给 Tampermonkey 勾选「允许访问文件网址」。
4. 打开 `index.html`，右下角会出现 📜 浮窗按钮，点击即可打开编辑器。

### 功能概览

- **记录列表**：查看全部历史记录，支持「全部 / 仅有效 / 仅越界」三种过滤。
- **新增**：补录缺失的历史抽取；时间不在上课时间也会被强制接受（标记为「越界」），
  以便管理员事后补录。
- **编辑**：修改时间、模式、人数、人员 ID、备注；保存时自动重新走上课时间校验。
- **删除**：单条删除，可通过「撤销」恢复。
- **撤销**：回滚最近一次写操作（新增 / 修改 / 删除均支持）。
- **审计日志**：完整记录所有写操作（动作 / 操作者 / 时间 / 前/后快照），
  满足「可追溯性」要求。
- **设置**：
  - 切换「允许越界抽取」总开关（影响页面 `开始抽取` 按钮的拦截行为）。
  - 查看存储键名与统计信息。
  - 导出当前全部记录为 JSON 文件（不影响存储）。
  - 清空全部记录（保留审计日志，便于事后追溯）。

### 数据流

```
页面抽取按钮被点击
   ↓
script.js → startDrawing()
   ↓
window.classTimeGuard.isInClassTime() ── false ──► 默认阻断 + Toast 提示
   │ true (或 _allowOutOfClassDraws=true)
   ↓
执行抽取动画 + 计算最终结果
   ↓
RollCallStorage.recordDraw(...)            ← 旧存储（权重/覆盖率）
   ↓
window.historyStore.add(...)               ← 新规范化存储（带验证+审计）
   ↓
油猴脚本可读取 / 修改
```

### 安全性 / 可追溯性

1. **所有写操作走 HistoryStore API**：油猴脚本绝不直接改 `localStorage`，
   而是调用 `window.historyStore.add/update/remove/undoLast`，这些方法
   内部都会写入 `audit_log`。
2. **审计日志不可绕过**：`audit_log` 与 `records` 同处一个 localStorage 键，
   任何写操作都会先 append 审计条目，再修改记录。
3. **删除可恢复**：`remove` 操作将完整快照存入 `audit_log.before`，
   `undoLast` 可基于此恢复。
4. **越界标记永久可见**：非上课时间的记录始终带 `is_valid=false` 标记，
   过滤查询可一键隔离。

---

## 架构总览

详见 [src/js/schedule.js](../src/js/schedule.js) 末尾的 `ClassTimeGuard` 与 `HistoryStore` 类注释。

### 模块职责

| 模块 | 位置 | 职责 |
| --- | --- | --- |
| `DEFAULT_PERIODS` | `schedule.js` 顶部 | 固定上课时间配置（单一数据源） |
| `ScheduleManager` | `schedule.js` | 课表 CSV 解析、UI 渲染 |
| `ClassTimeGuard` | `schedule.js` 末尾 | 时间合法性判断 + 数据过滤 |
| `HistoryStore` | `schedule.js` 末尾 | 规范化历史记录存储 + 验证 + 审计 |
| `RollCallStorage` | `script.js` | 旧的权重 / 覆盖率存储（保持兼容） |

### 全局单例

```javascript
window.classTimeGuard          // ClassTimeGuard 实例
window.historyStore            // HistoryStore 实例
window._allowOutOfClassDraws   // 越界抽取总开关（默认 false）
window.DEFAULT_PERIODS         // 节次配置常量
window.ClassTimeGuard          // 构造器（供扩展/测试）
window.HistoryStore            // 构造器（供扩展/测试）
```

### HistoryStore Schema (v2)

```jsonc
{
  "schema_version": 2,
  "records": [
    {
      "id": "r_xxx",
      "timestamp": 1780000000000,
      "recorded_at_iso": "2026-...",
      "display_time": "09:12:34",
      "period": { "index": 3, "name": "第3节", "start": "09:00", "end": "09:45" },
      "is_valid": true,
      "invalid_reason": null,            // null | "outside_class_time"
      "mode": "individual",              // "individual" | "group"
      "count": 1,
      "people_ids": [12, 7],
      "groups": null,                    // 或 [{ id, name, member_ids }]
      "note": ""
    }
  ],
  "audit_log": [
    {
      "action": "add",                   // "add" | "update" | "remove" | "clear"
      "record_id": "r_xxx",
      "before": null,                    // 操作前快照（add 时为 null）
      "after": { /* 完整记录 */ },       // 操作后快照（remove/clear 时为 null）
      "operator": "system",              // "system" | "tampermonkey" | "manual"
      "timestamp": 1780000000000,
      "iso": "2026-..."
    }
  ]
}
```

### 控制台调试

```js
// 查看当前是否在上课时间
window.classTimeGuard.isInClassTime()

// 查看当前节次
window.classTimeGuard.getActivePeriod()

// 查询全部有效记录
window.historyStore.query({ onlyValid: true })

// 查看审计日志
window.historyStore.getAuditLog()

// 手动补录一条记录
window.historyStore.add({ timestamp: Date.now(), count: 2, people_ids: [3, 5] },
                        { forceAcceptInvalid: true, operator: 'console' })

// 撤销最近一次操作
window.historyStore.undoLast()
```
