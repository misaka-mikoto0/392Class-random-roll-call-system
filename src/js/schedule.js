/**
 * 固定上课时间配置（单一数据源）
 * --------------------------------------------------------------
 * 该常量是整个系统判断「上课时间」的唯一权威配置：
 *   - ScheduleManager 读取它用于课表 UI 渲染
 *   - ClassTimeGuard    读取它用于时间合法性判断 / 数据过滤
 *   - HistoryStore      借助 ClassTimeGuard 完成入记录前的校验
 *   - 油猴脚本          通过 window.classTimeGuard 间接读取
 * 修改这里即同步影响所有依赖方，避免多处硬编码导致不一致。
 * 字段说明：
 *   - name     : 节次显示名
 *   - start/end: 起止时间，格式 'HH:MM'（24 小时制）
 *   - duration : 单节时长（分钟），仅用于统计展示，不参与判断
 * 边界约定：判断时采用 [start, end)，即含上课时刻、不含下课时刻。
 */
const DEFAULT_PERIODS = Object.freeze([
    { name: '第1节', start: '05:45', end: '07:10', duration: 85 },
    { name: '第2节', start: '08:05', end: '08:50', duration: 45 },
    { name: '第3节', start: '09:00', end: '09:45', duration: 45 },
    { name: '第4节', start: '10:20', end: '11:05', duration: 45 },
    { name: '第5节', start: '11:15', end: '12:00', duration: 45 },
    { name: '第6节', start: '14:30', end: '15:15', duration: 45 },
    { name: '第7节', start: '15:25', end: '16:10', duration: 45 },
    { name: '第8节', start: '16:20', end: '17:05', duration: 45 },
    { name: '第9节', start: '17:35', end: '18:20', duration: 45 },
    { name: '第10节', start: '19:00', end: '19:50', duration: 50 },
    { name: '第11节', start: '20:00', end: '20:50', duration: 50 },
    { name: '第12节', start: '21:00', end: '22:00', duration: 60 }
]);

/**
 * 构建元数据（每次发版时手动更新 BUILD_VERSION / BUILD_DATE）
 * --------------------------------------------------------------
 * 设计动机：
 *   - 静态站点没有「构建脚本」自动注入版本号，因此把版本号作为代码常量写在
 *     源代码中，作为「构建时快照」写入页面 footer，便于判断用户正在使用哪
 *     一版前端（特别适合：多人部署到不同机器 / 通过 file:// 打开本地副本的场景）。
 *   - 除静态信息外，还结合 document.lastModified（HTTP Last-Modified 或
 *     文件系统修改时间）做动态补充，作为辅助判断。
 * 命名约定：BUILD_VERSION 采用「语义化版本 + 后缀」，例如：
 *   - 2.4.0        ：正式里程碑版本
 *   - 2.4.0-rc.1   ：预发布
 *   - 2.4.0+fix.1  ：补丁（兼容 CSP，不用 BUILD_META 的 plus）
 * BUILD_DATE 格式严格为 YYYY-MM-DD（ISO 8601），配合 currentDate 环境值保证
 * 日期永远是发布当天。
 */
const BUILD_META = Object.freeze({
    /** 语义化版本号：每次发版或功能有显著变化时递增 */
    VERSION: '2.4.0',
    /** 构建日期（YYYY-MM-DD）：与代码最后一次打包/发布日期保持一致 */
    BUILD_DATE: '2026-08-16',
    /** 简短变更摘要，用于控制台输出提示（不显示在 UI 上） */
    RELEASE_NOTES: [
        '提取 DEFAULT_PERIODS 单一数据源 + ClassTimeGuard 上课时间守卫',
        '新增 HistoryStore 规范化历史存储（带校验 + 审计日志）',
        '抽取流程接入上课时间校验 + 双存储镜像写入',
        '新增 Tampermonkey 历史记录编辑器油猴脚本',
        '页脚新增构建元数据展示（版本 / 日期 / 最近修改时间）'
    ]
});

/**
 * 课表管理器
 * 功能：解析课表CSV、匹配当前时间、计算周次轮换、渲染课程信息
 */
class ScheduleManager {
    constructor() {
        this.scheduleData = null;
        this.error = null;
        // 共享 DEFAULT_PERIODS 引用，避免重复定义导致配置漂移
        this.periods = DEFAULT_PERIODS;
        // 基准日期：2026年6月19日为第二周周一（月份从0开始）
        this.baseDate = new Date(2026, 5, 19);
    }

    /**
     * 加载课表文件
     */
    async loadSchedule() {
        try {
            const response = await fetch('src/assets/课表.csv');
            if (!response.ok) {
                throw new Error('\u65e0\u6cd5\u52a0\u8f7d\u8bfe\u8868\u6587\u4ef6: ' + response.status);
            }
            const text = await response.text();
            this.scheduleData = this.parseCSV(text);
            this.error = null;
        } catch (err) {
            this.error = err.message;
            console.error('\u8bfe\u8868\u52a0\u8f7d\u5931\u8d25:', err);
        }
    }

    /**
     * 解析CSV文本
     * @param {string} text - CSV原始文本
     * @returns {Object} 解析后的课表数据
     */
    parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) {
            throw new Error('\u8bfe\u8868\u6587\u4ef6\u4e3a\u7a7a');
        }

        const headers = lines[0].split(',');
        const data = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',');
            const dayKey = cols[0];
            const courses = {};

            for (let j = 1; j < headers.length; j++) {
                const header = headers[j].trim();
                const value = cols[j] ? cols[j].trim() : '';
                courses[header] = value;
            }
            data[dayKey] = courses;
        }
        return data;
    }

    /**
     * 计算当前是第几周
     * @param {Date} date - 目标日期，默认为当前时间
     * @returns {number} 周次（从1开始）
     */
    getWeekNumber(date) {
        date = date || new Date();
        var msPerDay = 24 * 60 * 60 * 1000;
        var daysDiff = Math.floor((date.getTime() - this.baseDate.getTime()) / msPerDay);
        return 2 + Math.floor(daysDiff / 7);
    }

    /**
     * 根据日期获取对应的课表日期键值
     * @param {Date} date - 目标日期
     * @returns {string|null} 日期键值，周日返回null
     */
    getDayKey(date) {
        date = date || new Date();
        var day = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
        var weekNumber = this.getWeekNumber(date);

        if (day >= 1 && day <= 5) {
            var weekdays = ['周一', '周二', '周三', '周四', '周五'];
            return weekdays[day - 1];
        } else if (day === 6) {
            var satIndex = ((weekNumber - 1) % 4 + 4) % 4;
            var saturdays = ['周六一', '周六二', '周六三', '周六四'];
            return saturdays[satIndex];
        } else {
            return null; // 周日无课
        }
    }

    /**
     * 根据时间获取当前节次
     * @param {Date} time - 目标时间
     * @returns {Object|null} 节次信息，不在上课时间返回null
     */
    getCurrentPeriod(time) {
        time = time || new Date();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var totalMinutes = hours * 60 + minutes;

        for (var i = 0; i < this.periods.length; i++) {
            var startParts = this.periods[i].start.split(':');
            var endParts = this.periods[i].end.split(':');
            var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
            var endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

            if (totalMinutes >= startMin && totalMinutes < endMin) {
                return {
                    index: i + 1,
                    name: this.periods[i].name,
                    start: this.periods[i].start,
                    end: this.periods[i].end,
                    duration: this.periods[i].duration,
                    remainingMinutes: endMin - totalMinutes
                };
            }
        }
        return null;
    }

    /**
     * 获取下一节课
     * @param {Date} time - 目标时间
     * @returns {Object|null} 下一节信息，无则返回null
     */
    getNextPeriod(time) {
        time = time || new Date();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var totalMinutes = hours * 60 + minutes;

        for (var i = 0; i < this.periods.length; i++) {
            var startParts = this.periods[i].start.split(':');
            var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
            if (totalMinutes < startMin) {
                return {
                    index: i + 1,
                    name: this.periods[i].name,
                    start: this.periods[i].start,
                    end: this.periods[i].end
                };
            }
        }
        return null;
    }

    /**
     * 获取当前课程信息
     * @returns {Object} 课程状态信息
     */
    getCurrentCourse() {
        if (this.error) {
            return { status: 'error', message: this.error };
        }
        if (!this.scheduleData) {
            return { status: 'error', message: '\u8bfe\u8868\u6570\u636e\u672a\u52a0\u8f7d' };
        }

        var now = new Date();
        var dayKey = this.getDayKey(now);
        var weekNumber = this.getWeekNumber(now);

        if (!dayKey) {
            return {
                status: 'rest',
                weekNumber: weekNumber,
                message: '\u4eca\u65e5\u4f11\u606f\uff0c\u65e0\u8bfe\u7a0b\u5b89\u6392'
            };
        }

        var daySchedule = this.scheduleData[dayKey];
        if (!daySchedule) {
            return {
                status: 'error',
                weekNumber: weekNumber,
                message: '\u672a\u627e\u5230 ' + dayKey + ' \u7684\u8bfe\u7a0b\u5b89\u6392'
            };
        }

        var period = this.getCurrentPeriod(now);
        if (!period) {
            var nextPeriod = this.getNextPeriod(now);
            return {
                status: 'break',
                weekNumber: weekNumber,
                day: dayKey,
                message: '\u5f53\u524d\u4e0d\u5728\u4e0a\u8bfe\u65f6\u95f4',
                nextPeriod: nextPeriod
            };
        }

        var courseName = daySchedule[period.name] || '\u672a\u77e5\u8bfe\u7a0b';

        return {
            status: 'active',
            weekNumber: weekNumber,
            day: dayKey,
            period: period,
            courseName: courseName
        };
    }
}

/**
 * 课表UI渲染器
 */
class ScheduleUI {
    constructor(manager) {
        this.manager = manager;
        this.container = null;
        this.timerId = null;
    }

    /**
     * 绑定DOM容器
     * @param {HTMLElement} container - 显示容器
     */
    bind(container) {
        this.container = container;
    }

    /**
     * 格式化时间，将分钟转为时分显示
     */
    formatTime(minutes) {
        if (minutes < 60) {
            return minutes + '\u5206\u949f';
        }
        var h = Math.floor(minutes / 60);
        var m = minutes % 60;
        if (m === 0) {
            return h + '\u5c0f\u65f6';
        }
        return h + '\u5c0f\u65f6' + m + '\u5206';
    }

    /**
     * 渲染课程信息
     */
    render() {
        if (!this.container) return;

        var info = this.manager.getCurrentCourse();
        var html = '';

        if (info.status === 'error') {
            html = this.renderError(info.message);
        } else if (info.status === 'rest') {
            html = this.renderRest(info);
        } else if (info.status === 'break') {
            html = this.renderBreak(info);
        } else if (info.status === 'active') {
            html = this.renderActive(info);
        } else {
            html = this.renderError('\u672a\u77e5\u72b6\u6001');
        }

        this.container.innerHTML = html;
    }

    renderError(message) {
        return '<div class="schedule-error">' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<span>' + message + '</span>' +
            '</div>';
    }

    renderRest(info) {
        return '<div class="schedule-rest">' +
            '<div class="schedule-status-icon"><i class="fas fa-mug-hot"></i></div>' +
            '<div class="schedule-status-text">' + info.message + '</div>' +
            '<div class="schedule-meta">\u7b2c ' + info.weekNumber + ' \u5468 \u00b7 \u5468\u65e5</div>' +
            '</div>';
    }

    renderBreak(info) {
        var html = '<div class="schedule-break">' +
            '<div class="schedule-status-icon"><i class="fas fa-coffee"></i></div>' +
            '<div class="schedule-status-text">' + info.message + '</div>' +
            '<div class="schedule-meta">' + info.day + ' \u00b7 \u7b2c ' + info.weekNumber + ' \u5468</div>';

        if (info.nextPeriod) {
            html += '<div class="schedule-next">' +
                '<span class="schedule-next-label">\u4e0b\u4e00\u8282:</span>' +
                '<span class="schedule-next-name">' + info.nextPeriod.name + '</span>' +
                '<span class="schedule-next-time">' + info.nextPeriod.start + '</span>' +
                '</div>';
        }

        html += '</div>';
        return html;
    }

    renderActive(info) {
        var html = '<div class="schedule-active">' +
            '<div class="schedule-course-name">' + info.courseName + '</div>' +
            '<div class="schedule-period">' +
            '<span class="schedule-period-name">' + info.period.name + '</span>' +
            '<span class="schedule-period-time">' + info.period.start + ' - ' + info.period.end + '</span>' +
            '</div>' +
            '<div class="schedule-countdown">' +
            '<i class="fas fa-hourglass-half"></i>' +
            '<span>\u5269\u4f59 ' + this.formatTime(info.period.remainingMinutes) + '</span>' +
            '</div>' +
            '<div class="schedule-meta">' + info.day + ' \u00b7 \u7b2c ' + info.weekNumber + ' \u5468</div>' +
            '</div>';
        return html;
    }

    /**
     * 启动定时刷新
     * @param {number} interval - 刷新间隔（毫秒），默认30秒
     */
    start(interval) {
        interval = interval || 30000;
        this.stop();
        this.render();
        var self = this;
        this.timerId = setInterval(function() {
            self.render();
        }, interval);
    }

    /**
     * 停止定时刷新
     */
    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

/**
 * 初始化课表模块
 */
async function initSchedule() {
    var scheduleContent = document.getElementById('schedule-content');
    if (!scheduleContent) return;

    scheduleContent.innerHTML = '<div class="schedule-loading"><i class="fas fa-spinner fa-spin"></i> \u6b63\u5728\u52a0\u8f7d\u8bfe\u8868...</div>';

    var manager = new ScheduleManager();
    await manager.loadSchedule();

    var ui = new ScheduleUI(manager);
    ui.bind(scheduleContent);
    ui.start(30000); // 每30秒刷新一次
}

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSchedule);
} else {
    initSchedule();
}

// ============================================================
// 上课时间守卫（ClassTimeGuard）
// ------------------------------------------------------------
// 职责：
//   1. 读取 DEFAULT_PERIODS 中定义的固定上课时间配置（与周几无关）
//   2. 提供「时间是否在上课范围内」的判断逻辑（核心 API：isInClassTime）
//   3. 提供「过滤非上课时间产生的数据」的批量方法（filterValidRecords）
//   4. 提供「记录前校验」API（validateForRecord），供 HistoryStore 调用
// 设计原则：
//   - 单一职责：只关心时间合法性，不关心课程名 / 周次
//   - 无副作用：不修改 ScheduleManager，不读写 localStorage
//   - 可独立测试：所有方法均为纯函数（基于入参 time 计算）
// 边界策略（可配置）：
//   - startInclusive=true  : 时刻 = 09:00 视为已上课
//   - endInclusive=false   : 时刻 = 09:45 视为已下课
//   默认 [start, end) 与学校「下课铃响即结束」的常识一致
// ============================================================
class ClassTimeGuard {
    /**
     * @param {Array} periods 节次配置数组；缺省时使用 DEFAULT_PERIODS
     * @param {Object} options { startInclusive?, endInclusive? }
     */
    constructor(periods, options = {}) {
        const src = Array.isArray(periods) ? periods : DEFAULT_PERIODS;
        // 深拷贝并预计算「分钟数」提升判断性能（避免每次 split/parseInt）
        this._periods = src.map(p => {
            const [sh, sm] = String(p.start).split(':').map(n => parseInt(n, 10));
            const [eh, em] = String(p.end).split(':').map(n => parseInt(n, 10));
            return {
                name: p.name,
                start: p.start,
                end: p.end,
                duration: p.duration,
                startMin: sh * 60 + sm,
                endMin: eh * 60 + em
            };
        });
        this.startInclusive = options.startInclusive !== false;
        this.endInclusive = options.endInclusive === true;
    }

    /** 工厂方法：从 ScheduleManager 实例构建 */
    static fromScheduleManager(manager, options = {}) {
        if (!manager || !Array.isArray(manager.periods)) {
            throw new Error('ClassTimeGuard.fromScheduleManager 需要有效的 ScheduleManager');
        }
        return new ClassTimeGuard(manager.periods, options);
    }

    /** 将 Date / 时间戳 / 字符串统一转换为「当天总分钟数」 */
    _toMinutes(time) {
        const d = (time instanceof Date) ? time : new Date(time);
        if (isNaN(d.getTime())) return -1;
        return d.getHours() * 60 + d.getMinutes();
    }

    /**
     * 判断给定时间是否处于任意一节课的上课时间范围内
     * 注意：与周几完全无关，仅按时间段判断
     * @param {Date|number|string} time
     * @returns {boolean}
     */
    isInClassTime(time = new Date()) {
        const total = this._toMinutes(time);
        if (total < 0) return false;
        for (const p of this._periods) {
            const startOk = this.startInclusive ? total >= p.startMin : total > p.startMin;
            const endOk = this.endInclusive ? total <= p.endMin : total < p.endMin;
            if (startOk && endOk) return true;
        }
        return false;
    }

    /**
     * 获取当前时间所处的节次信息
     * @returns {Object|null} { index, name, start, end, duration, remainingMinutes }
     */
    getActivePeriod(time = new Date()) {
        const total = this._toMinutes(time);
        if (total < 0) return null;
        for (let i = 0; i < this._periods.length; i++) {
            const p = this._periods[i];
            const startOk = this.startInclusive ? total >= p.startMin : total > p.startMin;
            const endOk = this.endInclusive ? total <= p.endMin : total < p.endMin;
            if (startOk && endOk) {
                return {
                    index: i + 1,
                    name: p.name,
                    start: p.start,
                    end: p.end,
                    duration: p.duration,
                    remainingMinutes: p.endMin - total
                };
            }
        }
        return null;
    }

    /**
     * 记录前校验：返回是否可入记录 + 节次上下文
     * @returns {{ valid: boolean, reason: string, period: Object|null, iso: string }}
     */
    validateForRecord(time = new Date()) {
        const d = (time instanceof Date) ? time : new Date(time);
        const period = this.getActivePeriod(d);
        if (period) {
            return { valid: true, reason: 'in_class_time', period, iso: d.toISOString() };
        }
        return { valid: false, reason: 'outside_class_time', period: null, iso: d.toISOString() };
    }

    /**
     * 过滤记录数组，仅保留上课时间产生的记录
     * 兼容两种字段：timestamp(毫秒) / recorded_at_iso(ISO) / time('HH:MM:SS')
     * @param {Array} records
     * @returns {Array} 过滤后的新数组（不修改原数组）
     */
    filterValidRecords(records = []) {
        return records.filter(r => {
            const t = this._extractDate(r);
            if (!t) return false;
            return this.isInClassTime(t);
        });
    }

    /** 从记录对象中尽可能还原出 Date */
    _extractDate(record) {
        if (!record) return null;
        if (Number.isFinite(record.timestamp)) return new Date(record.timestamp);
        if (record.recorded_at_iso) return new Date(record.recorded_at_iso);
        if (typeof record.time === 'string' && record.time.includes(':')) {
            // 仅 'HH:MM:SS' 时用今天补齐
            const d = new Date();
            const parts = record.time.split(':').map(n => parseInt(n, 10));
            d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
            return d;
        }
        return null;
    }
}

// ============================================================
// 历史记录规范化存储（HistoryStore）
// ------------------------------------------------------------
// 设计目标：
//   1. 统一数据格式：所有记录遵循 schema_version=2 的结构
//   2. 统一存储路径：localStorage 键 'rollcall_history_v2'
//   3. 统一访问方式：add / update / remove / query / getAuditLog
//   4. 强制数据验证：写入前由 ClassTimeGuard 校验，默认拒绝非上课时间数据
//   5. 可追溯：所有写操作记录到 audit_log，支持 undoLast 回滚
// 与 RollCallStorage（script.js 中已存在）的关系：
//   - RollCallStorage 仍承担「权重记忆 / 覆盖率」职责
//   - HistoryStore 承担「规范化历史记录 + 验证 + 审计」职责
//   - 抽取流程先调 RollCallStorage.recordDraw，再镜像写入 HistoryStore.add
// schema:
// {
//   schema_version: 2,
//   records: [{
//     id, timestamp, recorded_at_iso, display_time,
//     period: { index, name, start, end } | null,
//     is_valid: boolean, invalid_reason: string | null,
//     mode: 'individual' | 'group',
//     count: number,
//     people_ids: number[],
//     groups: [{ id, name, member_ids }] | null,
//     note: string
//   }],
//   audit_log: [{ action, record_id, before, after, operator, timestamp, iso }]
// }
// ============================================================
class HistoryStore {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'rollcall_history_v2';
        this.maxRecords = options.maxRecords || 200;
        this.maxAuditLog = options.maxAuditLog || 100;
        this._guard = null; // 通过 setGuard 注入 ClassTimeGuard
    }

    /** 注入 ClassTimeGuard，启用写入前校验 */
    setGuard(guard) {
        this._guard = guard;
        return this;
    }

    _emptyData() {
        return { schema_version: 2, records: [], audit_log: [] };
    }

    _safeParse(text) {
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    /** 读取并校验 schema，损坏数据自动回退为空结构 */
    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return this._emptyData();
            const d = this._safeParse(raw);
            if (!d || typeof d !== 'object' || d.schema_version !== 2) return this._emptyData();
            if (!Array.isArray(d.records)) d.records = [];
            if (!Array.isArray(d.audit_log)) d.audit_log = [];
            return d;
        } catch (e) {
            console.warn('[HistoryStore] 读取失败：', e.message);
            return this._emptyData();
        }
    }

    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('[HistoryStore] 写入失败：', e.message);
            return false;
        }
    }

    /** 生成短型唯一 ID */
    _generateId() {
        return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    /**
     * 规范化一条记录：补齐缺省字段、执行时间校验
     * @param {Object} partial 部分字段（timestamp/display_time/mode/count/...）
     * @returns {Object} 完整记录
     */
    normalize(partial = {}) {
        const time = partial.timestamp ? new Date(partial.timestamp) : new Date();
        const validation = this._guard
            ? this._guard.validateForRecord(time)
            : { valid: true, reason: 'no_guard', period: null };

        const displayTime = partial.display_time ||
            `${String(time.getHours()).padStart(2, '0')}:` +
            `${String(time.getMinutes()).padStart(2, '0')}:` +
            `${String(time.getSeconds()).padStart(2, '0')}`;

        return {
            id: partial.id || this._generateId(),
            timestamp: time.getTime(),
            recorded_at_iso: time.toISOString(),
            display_time: displayTime,
            period: validation.period ? {
                index: validation.period.index,
                name: validation.period.name,
                start: validation.period.start,
                end: validation.period.end
            } : null,
            // 如果调用方显式指定了 is_valid，则尊重其值（用于强制覆盖场景）
            is_valid: partial.is_valid !== undefined
                ? !!partial.is_valid
                : validation.valid,
            invalid_reason: validation.valid ? null : validation.reason,
            mode: partial.mode === 'group' ? 'group' : 'individual',
            count: Number.isFinite(partial.count)
                ? partial.count
                : (Array.isArray(partial.people_ids) ? partial.people_ids.length : 0),
            people_ids: Array.isArray(partial.people_ids) ? partial.people_ids.slice() : [],
            groups: Array.isArray(partial.groups)
                ? partial.groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    member_ids: Array.isArray(g.member_ids)
                        ? g.member_ids.slice()
                        : (Array.isArray(g.members) ? g.members.map(m => m.id) : [])
                }))
                : null,
            note: partial.note || ''
        };
    }

    /**
     * 添加一条记录（带验证机制）
     * @param {Object} partial
     * @param {Object} options { forceAcceptInvalid?: boolean, operator?: string }
     * @returns {{ ok: boolean, reason: string, record: Object|null }}
     */
    add(partial = {}, options = {}) {
        const record = this.normalize(partial);
        // 数据验证机制：默认拒绝非上课时间的记录
        if (!record.is_valid && !options.forceAcceptInvalid) {
            return { ok: false, reason: record.invalid_reason || 'invalid', record };
        }

        const data = this.load();
        data.records.unshift(record);
        if (data.records.length > this.maxRecords) {
            data.records = data.records.slice(0, this.maxRecords);
        }
        this._appendAudit(data, {
            action: 'add',
            record_id: record.id,
            before: null,
            after: record,
            operator: options.operator || 'system'
        });
        this.save(data);
        return { ok: true, reason: 'added', record };
    }

    /**
     * 更新记录（修改时间会触发重新校验）
     */
    update(recordId, patch = {}, options = {}) {
        const data = this.load();
        const idx = data.records.findIndex(r => r.id === recordId);
        if (idx < 0) return { ok: false, reason: 'not_found' };

        const before = data.records[idx];
        const after = Object.assign({}, before, patch);

        // 修改时间相关字段时，重新走一遍校验
        if (patch.timestamp !== undefined || patch.display_time !== undefined) {
            const recheck = this._guard
                ? this._guard.validateForRecord(new Date(after.timestamp))
                : null;
            if (recheck) {
                after.period = recheck.period ? {
                    index: recheck.period.index,
                    name: recheck.period.name,
                    start: recheck.period.start,
                    end: recheck.period.end
                } : null;
                after.is_valid = recheck.valid;
                after.invalid_reason = recheck.valid ? null : recheck.reason;
            }
        }

        data.records[idx] = after;
        this._appendAudit(data, {
            action: 'update',
            record_id: recordId,
            before,
            after,
            operator: options.operator || 'manual'
        });
        this.save(data);
        return { ok: true, reason: 'updated', record: after };
    }

    /**
     * 删除记录
     */
    remove(recordId, options = {}) {
        const data = this.load();
        const idx = data.records.findIndex(r => r.id === recordId);
        if (idx < 0) return { ok: false, reason: 'not_found' };
        const [removed] = data.records.splice(idx, 1);
        this._appendAudit(data, {
            action: 'remove',
            record_id: recordId,
            before: removed,
            after: null,
            operator: options.operator || 'manual'
        });
        this.save(data);
        return { ok: true, reason: 'removed', record: removed };
    }

    /**
     * 查询记录
     * @param {Object} filter { onlyValid?, onlyInvalid?, mode?, periodName?, limit? }
     */
    query(filter = {}) {
        let records = this.load().records.slice();
        if (filter.onlyValid) records = records.filter(r => r.is_valid);
        if (filter.onlyInvalid) records = records.filter(r => !r.is_valid);
        if (filter.mode) records = records.filter(r => r.mode === filter.mode);
        if (filter.periodName) records = records.filter(r => r.period && r.period.name === filter.periodName);
        if (Number.isFinite(filter.limit)) records = records.slice(0, filter.limit);
        return records;
    }

    /** 获取审计日志（最新在前） */
    getAuditLog() {
        return this.load().audit_log.slice();
    }

    _appendAudit(data, entry) {
        data.audit_log.unshift(Object.assign({}, entry, {
            timestamp: Date.now(),
            iso: new Date().toISOString()
        }));
        if (data.audit_log.length > this.maxAuditLog) {
            data.audit_log = data.audit_log.slice(0, this.maxAuditLog);
        }
    }

    /**
     * 撤销最近一次操作（基于审计日志）
     * 支持 add / update / remove 三种动作的回滚
     */
    undoLast() {
        const data = this.load();
        const last = data.audit_log[0];
        if (!last) return { ok: false, reason: 'no_history' };

        if (last.action === 'add') {
            const idx = data.records.findIndex(r => r.id === last.record_id);
            if (idx >= 0) data.records.splice(idx, 1);
        } else if (last.action === 'remove') {
            if (last.before) data.records.unshift(last.before);
        } else if (last.action === 'update') {
            const idx = data.records.findIndex(r => r.id === last.record_id);
            if (idx >= 0 && last.before) data.records[idx] = last.before;
        }
        // 弹出已回滚的审计条目，避免无限回滚链
        data.audit_log.shift();
        this.save(data);
        return { ok: true, reason: 'undone' };
    }

    /** 清空所有记录（保留审计日志，便于追溯） */
    clearAll(options = {}) {
        const data = this.load();
        const before = data.records.slice();
        data.records = [];
        this._appendAudit(data, {
            action: 'clear',
            record_id: null,
            before,
            after: null,
            operator: options.operator || 'manual'
        });
        this.save(data);
        return data;
    }
}

// ============================================================
// 全局单例：暴露给 script.js 与油猴脚本使用
// ------------------------------------------------------------
// 设计说明：
//   - classTimeGuard 是「时间合法性」的全局仲裁者
//   - historyStore 是「规范化历史记录」的全局入口
//   - 通过 window._allowOutOfClassDraws 开关可临时允许越界抽取
//     （默认 false：严格阻断非上课时间的抽取请求）
// ============================================================
(function initGlobalInstances() {
    if (typeof window === 'undefined') return;
    // 若已被加载过（热更新场景），避免重复创建
    if (window.classTimeGuard && window.historyStore) return;

    const guard = new ClassTimeGuard(DEFAULT_PERIODS);
    const store = new HistoryStore({ storageKey: 'rollcall_history_v2' }).setGuard(guard);

    window.classTimeGuard = guard;
    window.historyStore = store;
    // 临时允许越界抽取的总开关（油猴脚本可置为 true 进行补录）
    window._allowOutOfClassDraws = false;

    // 暴露构造器本身，便于单元测试 / 扩展
    window.ClassTimeGuard = ClassTimeGuard;
    window.HistoryStore = HistoryStore;
    window.DEFAULT_PERIODS = DEFAULT_PERIODS;
    // 暴露构建元数据，供油猴脚本 / 外部工具读取
    window.BUILD_META = BUILD_META;

    // 渲染页脚构建元信息（在 DOMContentLoaded 后执行，确保 footer 已存在）
    function renderBuildInfo() {
        const versionEl = document.getElementById('build-version');
        const dateEl = document.getElementById('build-date');
        const modEl = document.getElementById('build-last-modified');
        if (!versionEl || !dateEl || !modEl) return;

        versionEl.textContent = 'v' + BUILD_META.VERSION;
        dateEl.textContent = BUILD_META.BUILD_DATE;

        // document.lastModified 格式一般是 MM/DD/YYYY HH:MM:SS（依赖浏览器实现）
        // 做一次防御性解析，失败则显示「未知」
        try {
            const lm = document.lastModified;
            if (lm && lm.trim().length > 0) {
                const d = new Date(lm);
                if (!isNaN(d.getTime())) {
                    const pad = n => String(n).padStart(2, '0');
                    modEl.textContent =
                        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
                        `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                } else {
                    modEl.textContent = lm.slice(0, 20);
                }
            } else {
                modEl.textContent = '未知';
            }
        } catch (e) {
            modEl.textContent = '未知';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBuildInfo, { once: true });
    } else {
        renderBuildInfo();
    }

    // 控制台调试入口
    console.log(
        '%c[ClassTimeGuard / HistoryStore] 已就绪。' +
        ' window.classTimeGuard.isInClassTime() / window.historyStore.query()',
        'color:#07C160;font-weight:bold;'
    );
    console.log(
        `%c[Build] v${BUILD_META.VERSION} · ${BUILD_META.BUILD_DATE}\n变更：\n  - ` +
        BUILD_META.RELEASE_NOTES.join('\n  - '),
        'color:#147BFF;font-weight:bold;'
    );
})();
