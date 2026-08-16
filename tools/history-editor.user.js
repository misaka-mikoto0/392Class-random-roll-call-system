// ==UserScript==
// @name         392班点名系统 · 历史记录编辑器
// @namespace    https://github.com/392Class/random-roll-call
// @version      1.0.0
// @description  访问并修改 392 班随机点名系统的历史记录，提供可视化界面、审计日志与撤销能力，所有修改可追溯。
// @author       392班开发组
// @match        file:///*/index.html*
// @match        file:///*/392Class-random-roll-call-system-main*
// @match        *://*/*/index.html*
// @match        *://localhost/*/index.html*
// @match        *://127.0.0.1/*/index.html*
// @icon         data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📜</text></svg>
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

/* global window, document, localStorage */

/*
 * ============================================================
 *  油猴脚本：历史记录编辑器
 * ------------------------------------------------------------
 *  功能概览：
 *    1. 读取 window.historyStore（schedule.js 暴露的单例）中的规范化记录
 *    2. 提供浮窗 UI：记录列表 / 审计日志 / 设置 三个 Tab
 *    3. 支持新增、编辑、删除记录；所有写操作走 HistoryStore API
 *       → 自动写入 audit_log，实现「可追溯」
 *    4. 支持「撤销最近一次」操作（基于 audit_log）
 *    5. 支持切换「允许越界抽取」总开关（window._allowOutOfClassDraws）
 *
 *  设计要点：
 *    - @grant none：脚本运行在页面上下文，直接访问 window.historyStore
 *    - 所有写操作都通过 store.add/update/remove/undoLast，绝不绕过去直接改 localStorage
 *    - CSS 自带、加前缀 `rc-hist-`，避免污染宿主页面样式
 *    - 字段验证：编辑时间会触发 classTimeGuard 重新校验，UI 即时显示是否合法
 *
 *  使用方法：
 *    1. 在 Tampermonkey 中安装本脚本
 *    2. 浏览器扩展设置里允许「访问文件网址」（file:// 协议必须）
 *    3. 打开点名系统页面，右下角会出现「📜历史」浮窗按钮
 *
 *  注意：
 *    - 若 window.historyStore 不可用（schedule.js 未加载），脚本会提示并退出
 *    - 删除/清空操作会保留 audit_log，便于事后追溯
 * ============================================================
 */

(function historyEditorUserscript() {
    'use strict';

    // ---------- 1. 等待 window.historyStore 就绪 ----------
    const READY_TIMEOUT_MS = 8000;
    const POLL_INTERVAL_MS = 250;

    function waitForReady() {
        return new Promise((resolve) => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (window.historyStore && window.classTimeGuard) {
                    clearInterval(timer);
                    resolve(true);
                } else if (Date.now() - start > READY_TIMEOUT_MS) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, POLL_INTERVAL_MS);
        });
    }

    // ---------- 2. CSS 样式（自包含、加前缀） ----------
    const STYLE_ID = 'rc-hist-editor-style';
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        // 复用页面主题色（如果可用），否则使用兜底色
        const css = `
        .rc-hist-fab {
            position: fixed; right: 24px; bottom: 90px; z-index: 99998;
            width: 56px; height: 56px; border-radius: 50%;
            background: var(--tx-primary, #07C160); color: #fff;
            border: none; cursor: pointer; font-size: 22px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.18);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .rc-hist-fab:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 10px 24px rgba(0,0,0,0.22); }
        .rc-hist-fab.rc-hist-active { background: var(--tx-secondary, #147BFF); }

        .rc-hist-overlay {
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.42);
            display: none; align-items: center; justify-content: center;
            font-family: var(--tx-font-family, -apple-system, 'Microsoft YaHei', sans-serif);
        }
        .rc-hist-overlay.rc-hist-open { display: flex; }

        .rc-hist-panel {
            width: min(820px, 92vw); height: min(640px, 88vh);
            background: var(--tx-bg-primary, #fff); border-radius: 16px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.25);
            display: flex; flex-direction: column; overflow: hidden;
        }
        .rc-hist-header {
            padding: 14px 20px; background: var(--tx-primary-light, #E8F8EF);
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid var(--tx-border, #E5E6EB);
        }
        .rc-hist-title { font-size: 16px; font-weight: 600; color: var(--tx-text-primary, #1D2129); display: flex; align-items: center; gap: 8px; }
        .rc-hist-close { background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--tx-text-secondary, #86909C); padding: 4px 8px; border-radius: 6px; }
        .rc-hist-close:hover { background: rgba(0,0,0,0.06); color: var(--tx-error, #FF4757); }

        .rc-hest-tabs { display: flex; gap: 4px; padding: 8px 16px 0; background: var(--tx-bg-secondary, #F7F8FA); border-bottom: 1px solid var(--tx-border, #E5E6EB); }
        .rc-hist-tab { padding: 8px 16px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: var(--tx-text-secondary, #86909C); border-radius: 6px 6px 0 0; border-bottom: 2px solid transparent; }
        .rc-hist-tab.rc-hist-active { color: var(--tx-primary, #07C160); border-bottom-color: var(--tx-primary, #07C160); font-weight: 600; background: var(--tx-bg-primary, #fff); }

        .rc-hist-toolbar { padding: 10px 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; background: var(--tx-bg-primary, #fff); border-bottom: 1px solid var(--tx-border-light, #F2F3F5); }
        .rc-hist-btn { padding: 6px 12px; border: 1px solid var(--tx-border, #E5E6EB); background: var(--tx-bg-primary, #fff); color: var(--tx-text-primary, #1D2129); border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; }
        .rc-hist-btn:hover { background: var(--tx-bg-hover, #F2F3F5); border-color: var(--tx-primary, #07C160); }
        .rc-hist-btn.rc-hist-primary { background: var(--tx-primary, #07C160); color: #fff; border-color: var(--tx-primary, #07C160); }
        .rc-hist-btn.rc-hist-primary:hover { background: var(--tx-primary-dark, #06AD56); }
        .rc-hist-btn.rc-hist-danger { color: var(--tx-error, #FF4757); border-color: var(--tx-error, #FF4757); }
        .rc-hist-btn.rc-hist-danger:hover { background: var(--tx-error, #FF4757); color: #fff; }
        .rc-hist-btn.rc-hist-danger:disabled { opacity: 0.4; cursor: not-allowed; }
        .rc-hist-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .rc-hist-toolbar .rc-hist-spacer { flex: 1; }
        .rc-hist-stat { font-size: 12px; color: var(--tx-text-secondary, #86909C); }

        .rc-hist-body { flex: 1; overflow: auto; padding: 12px 16px; }
        .rc-hist-empty { text-align: center; padding: 48px 20px; color: var(--tx-text-tertiary, #C9CDD4); }
        .rc-hist-empty i { font-size: 32px; display: block; margin-bottom: 8px; }

        .rc-hist-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .rc-hist-table th { text-align: left; padding: 8px 10px; background: var(--tx-bg-tertiary, #EDEFF2); color: var(--tx-text-secondary, #86909C); font-weight: 600; font-size: 12px; position: sticky; top: 0; }
        .rc-hist-table td { padding: 8px 10px; border-bottom: 1px solid var(--tx-border-light, #F2F3F5); vertical-align: top; }
        .rc-hist-table tr:hover td { background: var(--tx-bg-hover, #F2F3F5); }
        .rc-hist-tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
        .rc-hist-tag-valid { background: var(--tx-primary-light, #E8F8EF); color: var(--tx-primary, #07C160); }
        .rc-hist-tag-invalid { background: #FFF1F0; color: var(--tx-error, #FF4757); }
        .rc-hist-tag-mode-ind { background: #E8F3FF; color: var(--tx-secondary, #147BFF); }
        .rc-hist-tag-mode-grp { background: #FFF4E6; color: var(--tx-accent, #FF6B35); }
        .rc-hist-row-actions { display: flex; gap: 4px; }
        .rc-hist-icon-btn { padding: 2px 6px; border: 1px solid var(--tx-border, #E5E6EB); background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .rc-hist-icon-btn:hover { background: var(--tx-bg-hover, #F2F3F5); }
        .rc-hist-icon-btn.rc-hist-del:hover { background: var(--tx-error, #FF4757); color: #fff; border-color: var(--tx-error, #FF4757); }
        .rc-hist-period-cell { color: var(--tx-text-secondary, #86909C); font-size: 12px; }
        .rc-hist-period-name { color: var(--tx-text-primary, #1D2129); font-weight: 500; }

        .rc-hist-audit-item { padding: 10px 12px; border-left: 3px solid var(--tx-primary, #07C160); background: var(--tx-bg-secondary, #F7F8FA); margin-bottom: 8px; border-radius: 0 6px 6px 0; font-size: 12px; }
        .rc-hist-audit-item.rc-hist-action-remove { border-left-color: var(--tx-error, #FF4757); }
        .rc-hist-audit-item.rc-hist-action-update { border-left-color: var(--tx-warning, #FF9F43); }
        .rc-hist-audit-item.rc-hist-action-clear { border-left-color: var(--tx-text-tertiary, #C9CDD4); }
        .rc-hist-audit-meta { color: var(--tx-text-secondary, #86909C); margin-bottom: 4px; }
        .rc-hist-audit-diff { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; font-size: 11px; color: var(--tx-text-primary, #1D2129); white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow: auto; background: #fff; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--tx-border-light, #F2F3F5); }

        .rc-hist-settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--tx-border-light, #F2F3F5); }
        .rc-hist-settings-label h4 { margin: 0 0 4px; font-size: 14px; color: var(--tx-text-primary, #1D2129); }
        .rc-hist-settings-label p { margin: 0; font-size: 12px; color: var(--tx-text-secondary, #86909C); }
        .rc-hist-switch { position: relative; display: inline-block; width: 42px; height: 24px; }
        .rc-hist-switch input { opacity: 0; width: 0; height: 0; }
        .rc-hist-switch-slider { position: absolute; cursor: pointer; inset: 0; background: #ccc; transition: 0.3s; border-radius: 24px; }
        .rc-hist-switch-slider::before { position: absolute; content: ''; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; transition: 0.3s; border-radius: 50%; }
        .rc-hist-switch input:checked + .rc-hist-switch-slider { background: var(--tx-primary, #07C160); }
        .rc-hist-switch input:checked + .rc-hist-switch-slider::before { transform: translateX(18px); }

        /* 编辑模态框 */
        .rc-hist-modal {
            position: fixed; inset: 0; z-index: 100000;
            background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center;
        }
        .rc-hist-modal.rc-hist-open { display: flex; }
        .rc-hist-modal-box { width: min(520px, 92vw); background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
        .rc-hist-modal-title { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: var(--tx-text-primary, #1D2129); }
        .rc-hist-field { margin-bottom: 12px; }
        .rc-hist-field label { display: block; font-size: 12px; color: var(--tx-text-secondary, #86909C); margin-bottom: 4px; }
        .rc-hist-field input, .rc-hist-field select, .rc-hist-field textarea {
            width: 100%; padding: 8px 10px; border: 1px solid var(--tx-border, #E5E6EB); border-radius: 6px; font-size: 13px; font-family: inherit; box-sizing: border-box;
        }
        .rc-hist-field input:focus, .rc-hist-field select:focus, .rc-hist-field textarea:focus { outline: none; border-color: var(--tx-primary, #07C160); }
        .rc-hist-validation { padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; }
        .rc-hist-validation.rc-hist-ok { background: var(--tx-primary-light, #E8F8EF); color: var(--tx-primary, #07C160); }
        .rc-hist-validation.rc-hist-bad { background: #FFF1F0; color: var(--tx-error, #FF4757); }
        .rc-hist-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

        .rc-hist-toast {
            position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
            background: rgba(29,33,41,0.92); color: #fff; padding: 10px 18px;
            border-radius: 8px; font-size: 13px; z-index: 100001;
            opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: none;
        }
        .rc-hist-toast.rc-hist-show { opacity: 1; transform: translateX(-50%) translateY(-4px); }
        `;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);

        // 顺便引入 FontAwesome（页面已经引入，但 file:// 模式下可能未生效，做兜底）
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            fa.crossOrigin = 'anonymous';
            document.head.appendChild(fa);
        }
    }

    // ---------- 3. UI 状态 ----------
    const state = {
        activeTab: 'records',     // records | audit | settings
        filter: 'all',            // all | valid | invalid
        editingId: null,          // 当前正在编辑的记录 id（null=未编辑）
    };

    // ---------- 4. 工具函数 ----------
    function toast(message, duration = 2200) {
        let el = document.getElementById('rc-hist-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'rc-hist-toast';
            el.className = 'rc-hist-toast';
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('rc-hist-show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => el.classList.remove('rc-hist-show'), duration);
    }

    function fmtTime(ms) {
        if (!ms) return '-';
        const d = new Date(ms);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function peopleIdsToText(record) {
        if (record.mode === 'group' && record.groups) {
            return record.groups.map(g => `${g.name || '#'+g.id}(${(g.member_ids||[]).join('|')})`).join(', ');
        }
        return (record.people_ids || []).join(', ');
    }

    function getStore() { return window.historyStore; }
    function getGuard() { return window.classTimeGuard; }

    // ---------- 5. 渲染：记录列表 ----------
    function renderRecords(body) {
        const store = getStore();
        const filter = {};
        if (state.filter === 'valid') filter.onlyValid = true;
        if (state.filter === 'invalid') filter.onlyInvalid = true;
        const records = store.query(filter);

        if (records.length === 0) {
            body.innerHTML = `<div class="rc-hist-empty">
                <i class="fas fa-inbox"></i>
                <p>暂无记录</p>
                <p style="font-size:12px;margin-top:6px;">点击下方「+ 新增」补录一条记录</p>
            </div>`;
            return;
        }

        const rows = records.map(r => {
            const validTag = r.is_valid
                ? `<span class="rc-hist-tag rc-hist-tag-valid"><i class="fas fa-check"></i> 有效</span>`
                : `<span class="rc-hist-tag rc-hist-tag-invalid"><i class="fas fa-ban"></i> 越界</span>`;
            const modeTag = r.mode === 'group'
                ? `<span class="rc-hist-tag rc-hist-tag-mode-grp">小组</span>`
                : `<span class="rc-hist-tag rc-hist-tag-mode-ind">个人</span>`;
            const periodCell = r.period
                ? `<div class="rc-hist-period-name">${r.period.name}</div><div class="rc-hist-period-cell">${r.period.start} - ${r.period.end}</div>`
                : `<div class="rc-hist-period-cell">非上课时间</div>`;
            return `
                <tr data-id="${r.id}">
                    <td>
                        <div>${r.display_time || '-'}</div>
                        <div class="rc-hist-period-cell">${fmtTime(r.timestamp)}</div>
                    </td>
                    <td>${periodCell}</td>
                    <td>${modeTag} <span class="rc-hist-period-cell">×${r.count}</span></td>
                    <td style="max-width:240px;word-break:break-all;">${peopleIdsToText(r)}</td>
                    <td>${validTag}${r.invalid_reason ? `<div class="rc-hist-period-cell">${r.invalid_reason}</div>` : ''}</td>
                    <td>
                        <div class="rc-hist-row-actions">
                            <button class="rc-hist-icon-btn" data-act="edit"><i class="fas fa-edit"></i></button>
                            <button class="rc-hist-icon-btn rc-hist-del" data-act="del"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        body.innerHTML = `
            <table class="rc-hist-table">
                <thead>
                    <tr>
                        <th>时间</th><th>节次</th><th>模式/人数</th><th>人员</th><th>状态</th><th>操作</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

        // 绑定行操作
        body.querySelectorAll('tr[data-id]').forEach(tr => {
            const id = tr.dataset.id;
            tr.querySelector('[data-act="edit"]').addEventListener('click', () => openEditModal(id));
            tr.querySelector('[data-act="del"]').addEventListener('click', () => deleteRecord(id));
        });
    }

    // ---------- 6. 渲染：审计日志 ----------
    function renderAudit(body) {
        const logs = getStore().getAuditLog();
        if (logs.length === 0) {
            body.innerHTML = `<div class="rc-hist-empty">
                <i class="fas fa-scroll"></i><p>暂无审计记录</p>
            </div>`;
            return;
        }
        const items = logs.map(entry => {
            const actionLabel = {
                add: '新增', update: '修改', remove: '删除', clear: '清空'
            }[entry.action] || entry.action;
            const diff = entry.after
                ? JSON.stringify(entry.after, null, 2)
                : (entry.before ? JSON.stringify(entry.before, null, 2) : '(空)');
            return `
                <div class="rc-hist-audit-item rc-hist-action-${entry.action}">
                    <div class="rc-hist-audit-meta">
                        <strong>${actionLabel}</strong> · ${entry.operator || 'system'} · ${fmtTime(entry.timestamp)}
                        ${entry.record_id ? `· ID: <code>${entry.record_id}</code>` : ''}
                    </div>
                    <div class="rc-hist-audit-diff">${diff}</div>
                </div>`;
        }).join('');
        body.innerHTML = items;
    }

    // ---------- 7. 渲染：设置 ----------
    function renderSettings(body) {
        const store = getStore();
        const data = store.load();
        const allowOut = !!window._allowOutOfClassDraws;
        const validCount = data.records.filter(r => r.is_valid).length;
        const invalidCount = data.records.length - validCount;

        body.innerHTML = `
            <div class="rc-hist-settings-row">
                <div class="rc-hist-settings-label">
                    <h4>允许越界抽取</h4>
                    <p>开启后，非上课时间也可触发抽取（记录会标记为「越界」）。默认关闭。</p>
                </div>
                <label class="rc-hist-switch">
                    <input type="checkbox" id="rc-hist-toggle-out" ${allowOut ? 'checked' : ''}>
                    <span class="rc-hist-switch-slider"></span>
                </label>
            </div>
            <div class="rc-hist-settings-row">
                <div class="rc-hist-settings-label">
                    <h4>存储信息</h4>
                    <p>键名：<code>${store.storageKey}</code><br>
                       记录数：${data.records.length}（有效 ${validCount} / 越界 ${invalidCount}）<br>
                       审计日志：${data.audit_log.length} 条
                    </p>
                </div>
            </div>
            <div class="rc-hist-settings-row">
                <div class="rc-hist-settings-label">
                    <h4>上课时间配置</h4>
                    <p>共 ${(window.DEFAULT_PERIODS || []).length} 节课时段；最早 ${(window.DEFAULT_PERIODS||[])[0]?.start} 起，最晚 ${(window.DEFAULT_PERIODS||[]).slice(-1)[0]?.end} 止</p>
                </div>
            </div>
            <div class="rc-hist-settings-row">
                <div class="rc-hist-settings-label">
                    <h4>数据导出</h4>
                    <p>将当前所有记录导出为 JSON 文件（不影响存储）</p>
                </div>
                <button class="rc-hist-btn" id="rc-hist-export"><i class="fas fa-download"></i> 导出</button>
            </div>
            <div class="rc-hist-settings-row">
                <div class="rc-hist-settings-label">
                    <h4 style="color:var(--tx-error,#FF4757);">危险操作</h4>
                    <p>清空所有记录（保留审计日志，可追溯；不可恢复，请谨慎）</p>
                </div>
                <button class="rc-hist-btn rc-hist-danger" id="rc-hist-clear-all"><i class="fas fa-eraser"></i> 清空全部</button>
            </div>
        `;

        body.querySelector('#rc-hist-toggle-out').addEventListener('change', (e) => {
            window._allowOutOfClassDraws = e.target.checked;
            toast(`越界抽取已${e.target.checked ? '开启' : '关闭'}`);
        });
        body.querySelector('#rc-hist-export').addEventListener('click', exportData);
        body.querySelector('#rc-hist-clear-all').addEventListener('click', clearAllWithConfirm);
    }

    // ---------- 8. 渲染：面板 ----------
    function renderPanel() {
        const body = document.getElementById('rc-hist-body');
        if (state.activeTab === 'records') renderRecords(body);
        else if (state.activeTab === 'audit') renderAudit(body);
        else renderSettings(body);

        // 同步 Tab 高亮
        document.querySelectorAll('.rc-hist-tab').forEach(t => {
            t.classList.toggle('rc-hist-active', t.dataset.tab === state.activeTab);
        });
        // 同步过滤器按钮
        document.querySelectorAll('.rc-hist-btn[data-filter]').forEach(b => {
            b.classList.toggle('rc-hist-primary', b.dataset.filter === state.filter);
        });
        // 工具栏统计
        const store = getStore();
        const all = store.query();
        const stat = document.getElementById('rc-hist-stat');
        if (stat) {
            const validCount = all.filter(r => r.is_valid).length;
            stat.textContent = `共 ${all.length} 条（有效 ${validCount} / 越界 ${all.length - validCount}）`;
        }
    }

    // ---------- 9. 编辑模态框 ----------
    function openEditModal(id) {
        const store = getStore();
        const records = store.query();
        const record = records.find(r => r.id === id);
        if (!record) { toast('未找到该记录'); return; }
        state.editingId = id;

        const modal = document.getElementById('rc-hist-modal');
        const dt = new Date(record.timestamp);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

        modal.querySelector('.rc-hist-modal-box').innerHTML = `
            <h3 class="rc-hist-modal-title"><i class="fas fa-edit"></i> 编辑记录</h3>
            <div class="rc-hist-validation" id="rc-hist-validation">正在校验...</div>
            <div class="rc-hist-field">
                <label>抽取时间</label>
                <input type="datetime-local" id="rc-hist-f-time" value="${local}">
            </div>
            <div class="rc-hist-field">
                <label>模式</label>
                <select id="rc-hist-f-mode">
                    <option value="individual" ${record.mode === 'individual' ? 'selected' : ''}>个人</option>
                    <option value="group" ${record.mode === 'group' ? 'selected' : ''}>小组</option>
                </select>
            </div>
            <div class="rc-hist-field">
                <label>抽取人数</label>
                <input type="number" id="rc-hist-f-count" min="1" value="${record.count}">
            </div>
            <div class="rc-hist-field">
                <label>人员 ID（逗号分隔，例如 1,2,3）</label>
                <input type="text" id="rc-hist-f-people" value="${(record.people_ids || []).join(',')}">
            </div>
            <div class="rc-hist-field">
                <label>备注</label>
                <textarea id="rc-hist-f-note" rows="2">${record.note || ''}</textarea>
            </div>
            <div class="rc-hist-modal-actions">
                <button class="rc-hist-btn rc-hist-danger" id="rc-hist-m-del"><i class="fas fa-trash"></i> 删除</button>
                <button class="rc-hist-btn" id="rc-hist-m-cancel">取消</button>
                <button class="rc-hist-btn rc-hist-primary" id="rc-hist-m-save"><i class="fas fa-save"></i> 保存</button>
            </div>
        `;
        modal.classList.add('rc-hist-open');

        const timeInput = modal.querySelector('#rc-hist-f-time');
        const validate = () => {
            const v = timeInput.value;
            const d = v ? new Date(v) : new Date();
            const result = getGuard().validateForRecord(d);
            const box = modal.querySelector('#rc-hist-validation');
            if (result.valid) {
                box.className = 'rc-hist-validation rc-hist-ok';
                box.innerHTML = `<i class="fas fa-check-circle"></i> 处于上课时间 · ${result.period.name} (${result.period.start}-${result.period.end})`;
            } else {
                box.className = 'rc-hist-validation rc-hist-bad';
                box.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 不在上课时间，保存后该记录将标记为「越界」`;
            }
        };
        timeInput.addEventListener('input', validate);
        validate();

        modal.querySelector('#rc-hist-m-cancel').addEventListener('click', closeEditModal);
        modal.querySelector('#rc-hist-m-del').addEventListener('click', () => {
            closeEditModal();
            deleteRecord(id);
        });
        modal.querySelector('#rc-hist-m-save').addEventListener('click', saveEdit);
    }

    function openAddModal() {
        state.editingId = null;
        const modal = document.getElementById('rc-hist-modal');
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

        modal.querySelector('.rc-hist-modal-box').innerHTML = `
            <h3 class="rc-hist-modal-title"><i class="fas fa-plus"></i> 新增记录</h3>
            <div class="rc-hist-validation" id="rc-hist-validation">正在校验...</div>
            <div class="rc-hist-field">
                <label>抽取时间</label>
                <input type="datetime-local" id="rc-hist-f-time" value="${localNow}">
            </div>
            <div class="rc-hist-field">
                <label>模式</label>
                <select id="rc-hist-f-mode">
                    <option value="individual">个人</option>
                    <option value="group">小组</option>
                </select>
            </div>
            <div class="rc-hist-field">
                <label>抽取人数</label>
                <input type="number" id="rc-hist-f-count" min="1" value="1">
            </div>
            <div class="rc-hist-field">
                <label>人员 ID（逗号分隔，例如 1,2,3）</label>
                <input type="text" id="rc-hist-f-people" placeholder="1,2,3">
            </div>
            <div class="rc-hist-field">
                <label>备注</label>
                <textarea id="rc-hist-f-note" rows="2" placeholder="可选，例如「补录上周三第5节缺席同学」"></textarea>
            </div>
            <div class="rc-hist-modal-actions">
                <button class="rc-hist-btn" id="rc-hist-m-cancel">取消</button>
                <button class="rc-hist-btn rc-hist-primary" id="rc-hist-m-save"><i class="fas fa-save"></i> 保存</button>
            </div>
        `;
        modal.classList.add('rc-hist-open');

        const timeInput = modal.querySelector('#rc-hist-f-time');
        const validate = () => {
            const v = timeInput.value;
            const d = v ? new Date(v) : new Date();
            const result = getGuard().validateForRecord(d);
            const box = modal.querySelector('#rc-hist-validation');
            if (result.valid) {
                box.className = 'rc-hist-validation rc-hist-ok';
                box.innerHTML = `<i class="fas fa-check-circle"></i> 处于上课时间 · ${result.period.name} (${result.period.start}-${result.period.end})`;
            } else {
                box.className = 'rc-hist-validation rc-hist-bad';
                box.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 不在上课时间。新增时将强制接受（标记为「越界」），便于补录历史。`;
            }
        };
        timeInput.addEventListener('input', validate);
        validate();

        modal.querySelector('#rc-hist-m-cancel').addEventListener('click', closeEditModal);
        modal.querySelector('#rc-hist-m-save').addEventListener('click', saveEdit);
    }

    function closeEditModal() {
        document.getElementById('rc-hist-modal').classList.remove('rc-hist-open');
        state.editingId = null;
    }

    function saveEdit() {
        const modal = document.getElementById('rc-hist-modal');
        const time = modal.querySelector('#rc-hist-f-time').value;
        const mode = modal.querySelector('#rc-hist-f-mode').value;
        const count = parseInt(modal.querySelector('#rc-hist-f-count').value, 10) || 1;
        const peopleStr = modal.querySelector('#rc-hist-f-people').value.trim();
        const note = modal.querySelector('#rc-hist-f-note').value.trim();
        const people_ids = peopleStr
            ? peopleStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n))
            : [];

        const ts = time ? new Date(time).getTime() : Date.now();

        if (state.editingId) {
            // 编辑：update 内部会重新校验
            const result = getStore().update(state.editingId, {
                timestamp: ts,
                display_time: (() => {
                    const d = new Date(ts);
                    const pad = n => String(n).padStart(2, '0');
                    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                })(),
                mode, count, people_ids, note
            }, { operator: 'tampermonkey' });
            toast(result.ok ? '已保存（修改已记入审计日志）' : `保存失败：${result.reason}`);
        } else {
            // 新增：forceAcceptInvalid=true 允许补录越界记录
            const result = getStore().add({
                timestamp: ts,
                display_time: (() => {
                    const d = new Date(ts);
                    const pad = n => String(n).padStart(2, '0');
                    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                })(),
                mode, count, people_ids, note
            }, { forceAcceptInvalid: true, operator: 'tampermonkey' });
            toast(result.ok ? '已新增（已记入审计日志）' : `新增失败：${result.reason}`);
        }
        closeEditModal();
        renderPanel();
    }

    function deleteRecord(id) {
        if (!confirm('确认删除该条记录？此操作可被「撤销」恢复。')) return;
        const result = getStore().remove(id, { operator: 'tampermonkey' });
        toast(result.ok ? '已删除（可通过「撤销」恢复）' : `删除失败：${result.reason}`);
        renderPanel();
    }

    function undoLast() {
        const result = getStore().undoLast();
        toast(result.ok ? '已撤销最近一次操作' : `无法撤销：${result.reason}`);
        renderPanel();
    }

    function clearAllWithConfirm() {
        if (!confirm('确认清空所有记录？\n\n此操作不可被「撤销」恢复，但审计日志会保留本次清空动作以便追溯。')) return;
        getStore().clearAll({ operator: 'tampermonkey' });
        toast('已清空全部记录');
        renderPanel();
    }

    function exportData() {
        const data = getStore().load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rollcall-history-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('已导出 JSON 文件');
    }

    // ---------- 10. 主入口 ----------
    function buildPanelHTML() {
        return `
        <div class="rc-hist-overlay" id="rc-hist-overlay">
            <div class="rc-hist-panel">
                <div class="rc-hist-header">
                    <div class="rc-hist-title"><i class="fas fa-history"></i> 历史记录编辑器</div>
                    <button class="rc-hist-close" id="rc-hist-close" title="关闭"><i class="fas fa-times"></i></button>
                </div>
                <div class="rc-hest-tabs">
                    <button class="rc-hist-tab rc-hist-active" data-tab="records"><i class="fas fa-list"></i> 记录列表</button>
                    <button class="rc-hist-tab" data-tab="audit"><i class="fas fa-scroll"></i> 审计日志</button>
                    <button class="rc-hist-tab" data-tab="settings"><i class="fas fa-cog"></i> 设置</button>
                </div>
                <div class="rc-hist-toolbar" id="rc-hist-toolbar">
                    <button class="rc-hist-btn" data-filter="all">全部</button>
                    <button class="rc-hist-btn" data-filter="valid">仅有效</button>
                    <button class="rc-hist-btn" data-filter="invalid">仅越界</button>
                    <div class="rc-hist-spacer"></div>
                    <span class="rc-hist-stat" id="rc-hist-stat"></span>
                    <button class="rc-hist-btn rc-hist-primary" id="rc-hist-add"><i class="fas fa-plus"></i> 新增</button>
                    <button class="rc-hist-btn" id="rc-hist-undo"><i class="fas fa-undo"></i> 撤销</button>
                    <button class="rc-hist-btn" id="rc-hist-refresh"><i class="fas fa-sync"></i> 刷新</button>
                </div>
                <div class="rc-hist-body" id="rc-hist-body"></div>
            </div>
        </div>
        <div class="rc-hist-modal" id="rc-hist-modal">
            <div class="rc-hist-modal-box"></div>
        </div>`;
    }

    function attachListeners() {
        const fab = document.getElementById('rc-hist-fab');
        const overlay = document.getElementById('rc-hist-overlay');

        fab.addEventListener('click', () => {
            const open = overlay.classList.toggle('rc-hist-open');
            fab.classList.toggle('rc-hist-active', open);
            if (open) renderPanel();
        });

        document.getElementById('rc-hist-close').addEventListener('click', () => {
            overlay.classList.remove('rc-hist-open');
            fab.classList.remove('rc-hist-active');
        });

        // Tab 切换
        document.querySelectorAll('.rc-hist-tab').forEach(t => {
            t.addEventListener('click', () => {
                state.activeTab = t.dataset.tab;
                renderPanel();
            });
        });

        // 过滤按钮
        document.querySelectorAll('.rc-hist-btn[data-filter]').forEach(b => {
            b.addEventListener('click', () => {
                state.filter = b.dataset.filter;
                renderPanel();
            });
        });

        // 工具栏动作
        document.getElementById('rc-hist-add').addEventListener('click', openAddModal);
        document.getElementById('rc-hist-undo').addEventListener('click', undoLast);
        document.getElementById('rc-hist-refresh').addEventListener('click', () => {
            renderPanel();
            toast('已刷新');
        });

        // 点击遮罩关闭编辑模态
        document.getElementById('rc-hist-modal').addEventListener('click', (e) => {
            if (e.target.id === 'rc-hist-modal') closeEditModal();
        });

        // 监听 localStorage 被外部修改（如系统抽取后），自动刷新面板
        window.addEventListener('storage', (e) => {
            if (e.key === getStore().storageKey && overlay.classList.contains('rc-hist-open')) {
                renderPanel();
            }
        });

        // Esc 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('rc-hist-modal');
                if (modal.classList.contains('rc-hist-open')) {
                    closeEditModal();
                } else if (overlay.classList.contains('rc-hist-open')) {
                    overlay.classList.remove('rc-hist-open');
                    fab.classList.remove('rc-hist-active');
                }
            }
        });
    }

    // ---------- 11. 启动 ----------
    waitForReady().then((ready) => {
        if (!ready) {
            console.warn('[history-editor] window.historyStore 未就绪，脚本不启动。请确认 schedule.js 已加载。');
            return;
        }
        injectStyles();

        // 挂载浮窗按钮
        const fab = document.createElement('button');
        fab.id = 'rc-hist-fab';
        fab.className = 'rc-hist-fab';
        fab.title = '打开历史记录编辑器';
        fab.innerHTML = '<i class="fas fa-scroll"></i>';
        document.body.appendChild(fab);

        // 挂载面板 HTML
        const container = document.createElement('div');
        container.innerHTML = buildPanelHTML();
        // 注意：脚本可能多次执行（页面重载），逐个 append 避免 innerHTML 重复
        while (container.firstChild) document.body.appendChild(container.firstChild);

        attachListeners();
        console.log('%c[history-editor] 已加载。点击右下角浮窗按钮打开。', 'color:#07C160;font-weight:bold;');
    });
})();
