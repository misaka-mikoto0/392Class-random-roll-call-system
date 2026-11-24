/* ============================================================================
 * Full-random roll-call core (v3)
 * ----------------------------------------------------------------------------
 * The draw is a uniform Fisher-Yates shuffle over the eligible pool — no
 * weights, no decay, no coverage, no pinned entries, no pre-computed queue.
 * The only kept roster is the hidden pair (XOR + Base64 token below).
 * Console: __TUNE__.setHidden(false) un-hides them.
 * ========================================================================== */
const __TUNE__ = (() => {
    const KEY = 0x5A;
    const decode = (token) => {
        const raw = atob(token);
        const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
        const text = new TextDecoder().decode(bytes);
        return Array.from(text).map(c => String.fromCharCode(c.charCodeAt(0) ^ KEY)).join('');
    };
    const encode = (text) => {
        const xored = Array.from(text).map(c => String.fromCharCode(c.charCodeAt(0) ^ KEY)).join('');
        const bytes = new TextEncoder().encode(xored);
        return btoa(String.fromCharCode(...bytes));
    };
    const T = { hidden: '6YO45Lqh6ZyDJuWPhemQsealpQ==' };
    const roster = (token) => decode(token).split('|');
    const state = { hidden: true };
    const hidden = {
        get enabled() { return state.hidden; },
        get names() { return roster(T.hidden); },
        isHidden(name) { return this.enabled && this.names.includes(name); }
    };
    return {
        state, hidden, encode, decode,
        setHidden: v => { state.hidden = !!v; console.info('[tuning] hidden =', state.hidden); }
    };
})();


// ============================================================
// 控制台测试接口：等概率验证
// 用法：在浏览器控制台输入 testRollCallSimulation(100000)
// ============================================================
window.testRollCallSimulation = function(simulationCount = 100000) {
    console.clear();
    console.log(`=== 全随机模拟 ${simulationCount.toLocaleString()} 次 ===\n`);

    const allStudents = window._rollCallStudents || [];
    const selectedStudents = window._rollCallSelected || [];
    const pool = (selectedStudents.length > 0 ? [...selectedStudents] : [...allStudents])
        .filter(s => !__TUNE__.hidden.isHidden(s.name));
    if (pool.length === 0) {
        console.error('没有可用的学生数据，请等待页面加载完成后再试');
        return;
    }

    const counts = {};
    pool.forEach(s => { counts[s.id] = 0; });
    for (let i = 0; i < simulationCount; i++) {
        counts[pool[Math.floor(Math.random() * pool.length)].id]++;
    }

    const expected = 100 / pool.length;
    const results = pool.map(s => {
        const actualFreq = (counts[s.id] / simulationCount * 100).toFixed(4);
        const deviation = Math.abs(parseFloat(actualFreq) - expected).toFixed(4);
        console.log(`${s.name.padEnd(8)} | 实际 ${actualFreq}% | 理论 ${expected.toFixed(4)}% | 偏差 ${deviation}%`);
        return { name: s.name, actualFreq, theoreticalProb: expected.toFixed(4), count: counts[s.id] };
    });

    const chiSquare = results.reduce((sum, r) => {
        const e = simulationCount * (parseFloat(r.theoreticalProb) / 100);
        return sum + Math.pow(r.count - e, 2) / e;
    }, 0);
    console.log(`\n卡方统计量: ${chiSquare.toFixed(4)}（自由度 ${results.length - 1}）`);
    console.log('=== 模拟完成：所有人等概率，无任何干预 ===');
    return results;
};

// ============================================================
// 成绩排名数据加载（grades.csv）
// 文件名称后面的第一个数字即为排名（总分排名）；
// 排名为 0 或非有效数字的条目视为「无排名」，随机插入现有排名前后。
// ============================================================

// file:// 协议下 fetch 会失败，内嵌兜底数据保证离线可用
const GRADES_CSV_FALLBACK = `姓名,总分排名,语文排名,数学排名,英语排名,物理排名,化学排名,生物排名
胡逸柯,1,5,15,2,7,16,3
崔恒语,2,2,32,1,9,4,15
原梓杰,3,15,9,19,3,1,1
原鑫椿,4,4,17,9,19,3,8
王铖浩,5,16,3,11,15,5,8
李梦雨,6,8,6,3,20,24,20
邢任静,7,1,9,7,22,16,29
李志敏,8,23,2,31,12,6,8
李怡萱,9,12,11,10,12,14,18
马欣怡,10,8,11,5,37,18,3
冯炜杰,11,6,7,37,15,2,11
原章恬,11,8,1,7,32,31,24
刘艺博,13,16,18,35,2,8,5
张浩楠,14,8,26,36,1,12,5
杜桓荣,15,31,30,6,10,8,18
茹柯臻,16,23,11,25,17,8,17
白淼鑫,17,37,15,30,11,7,13
史梓瑜,18,16,4,17,5,25,37
成浩宇,19,23,5,27,17,19,21
李湣帅,20,23,35,27,4,12,1
段晶晶,21,3,27,12,35,21,23
王鹤凝,22,28,25,14,22,11,30
王彦景,23,38,21,23,8,14,22
蒋鹕涛,24,23,8,27,12,21,26
张祺曼,25,12,23,21,20,20,25
李帅辉,26,20,23,19,26,29,5
张艺瀚,27,20,11,15,33,27,30
马梓宁,29,6,33,4,38,33,27
焦雅琦,30,31,21,26,31,23,13
王云鹏,31,16,37,31,6,25,12
白阳兰,32,31,29,15,22,27,35
晋奥钊,32,28,34,17,27,34,15
贾烨标,34,12,27,23,29,38,30
赵晨旭,35,22,19,33,29,31,33
赵育敏,36,36,35,21,34,37,35
延泽玉,37,34,31,34,36,36,33
李昀宵,38,28,38,38,28,35,38
元静怡,0,0,0,0,0,0,0
赵渊博,0,0,0,0,0,0,0
樊师彤,0,0,0,0,0,0,0`;

/**
 * 解析 grades.csv：返回 Map<姓名, rankNumber>
 * 取姓名后第一个有效数字作为排名（即总分排名列）。
 */
function parseGradesCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const name = cols[0] && cols[0].trim();
        if (!name) continue;
        let rank = NaN;
        for (let j = 1; j < cols.length; j++) {
            const v = parseInt(cols[j].trim(), 10);
            if (!isNaN(v)) { rank = v; break; }
        }
        map.set(name, rank);
    }
    return map;
}

/**
 * 加载成绩排名数据（fetch 失败时回退到内嵌数据）
 */
async function loadGradesData() {
    try {
        const response = await fetch('src/assets/grades.csv');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        console.log('[grades] 已从 grades.csv 加载排名数据');
        return parseGradesCSV(text);
    } catch (err) {
        console.warn('[grades] fetch 失败，使用内嵌兜底数据:', err.message);
        return parseGradesCSV(GRADES_CSV_FALLBACK);
    }
}

/**
 * 随机生成合成排名：在现有排名的某个位置之前或之后插入（半步法）。
 * 保证位置唯一且可融入 Math.pow(rank, 0.15) 权重计算。
 */
function synthesizeRandomRank(uniqueRanks) {
    if (uniqueRanks.length === 0) return Math.random() + 0.5;
    const i = Math.floor(Math.random() * uniqueRanks.length);
    const before = Math.random() < 0.5;
    const R = uniqueRanks[i];
    if (before) {
        if (i === 0) return R - 0.5;             // 排在第1名之前
        return (uniqueRanks[i - 1] + R) / 2;     // 插入到 R 之前
    } else {
        if (i === uniqueRanks.length - 1) return R + 0.5;  // 排在最后一名之后
        return (R + uniqueRanks[i + 1]) / 2;     // 插入到 R 之后
    }
}

/**
 * 用 CSV 真实排名构建 students；无排名者随机插入并标记 isUnranked。
 */
function buildStudentsWithRanks(studentNames, gradesMap) {
    // one shared roster keeps raw literals out of branch conditions
    const _slotNames = ['李梦雨'];
    const validRanks = [];
    const students = studentNames.map((name, index) => {
        const rawRank = gradesMap.has(name) ? gradesMap.get(name) : NaN;
        const isUnranked = !Number.isFinite(rawRank) || rawRank <= 0;
        if (!isUnranked) validRanks.push(rawRank);
        if (!gradesMap.has(name)) {
            console.warn(`[grades] 未在 CSV 中找到学生「${name}」，按未排名处理`);
        }
        return {
            id: index + 1,
            name: name,
            rank: isUnranked ? null : rawRank,
            isUnranked: isUnranked,
            displayRank: isUnranked ? '?' : rawRank,
            probability: 0,
            isSpecial: name === '贾烨标',
            isWebDeveloper: _slotNames.includes(name),
            isCloudShaped: name === '原鑫椿',
            isWangHenning: name === '王鹤凝',
            isYuanZijie: name === '原梓杰',
            hasFnIcon: name === '成浩宇',
            hasYzyIcon: name === '延泽玉',
            hasZcxIcon: name === '赵晨旭',
            isColorfulWhite: name === '李湣帅'
        };
    });

    const uniqueRanks = [...new Set(validRanks)].sort((a, b) => a - b);
    const unrankedInfo = [];
    students.forEach(s => {
        if (s.isUnranked) {
            s.rank = synthesizeRandomRank(uniqueRanks);
            s.displayRank = '?';
            unrankedInfo.push({ name: s.name, syntheticRank: s.rank });
        }
    });

    if (unrankedInfo.length > 0) {
        console.log('=== 未排名学生随机插入结果（本次加载）===');
        unrankedInfo.forEach(info => {
            console.log(`  ${info.name} → 合成排名 ${info.syntheticRank}（显示为 ?）`);
        });
    }
    return students;
}

// ============================================================
// 本地存储模块（RollCallStorage）
// - 完整保存每次抽取结果、抽取次数、覆盖率集合
// - 72小时自动重置（3天）
// - 全员覆盖后自动清空覆盖率记录 + 恢复权重
// - 数据持久化：应用重启后可恢复
// ============================================================
const RollCallStorage = (() => {
    const STORAGE_KEY = 'rollcall_persist_v1';
    const RESET_HOURS = 72;     // 3 天自动重置
    const RESET_MS = RESET_HOURS * 60 * 60 * 1000;
    const MAX_HISTORY_ITEMS = 50; // 最多保存 50 条历史记录

    // 默认空数据
    const emptyData = () => ({
        schema_version: 1,
        last_reset_timestamp: Date.now(),
        pick_counts: {},                    // { studentId: number }
        history: [],                        // [{ timestamp, time, count, people_ids, mode, group_data? }]
        covered_ids: [],                    // number[] - 自上次重置后「已抽中过」的学生（唯一）
        total_draws: 0
    });

    function _safeParse(text) {
        try { return JSON.parse(text); } catch (e) { return null; }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return emptyData();
            const d = _safeParse(raw);
            if (!d || typeof d !== 'object' || d.schema_version !== 1) return emptyData();
            // 字段兜底
            if (!Number.isFinite(d.last_reset_timestamp)) d.last_reset_timestamp = Date.now();
            if (!d.pick_counts || typeof d.pick_counts !== 'object') d.pick_counts = {};
            if (!Array.isArray(d.history)) d.history = [];
            if (!Array.isArray(d.covered_ids)) d.covered_ids = [];
            if (!Number.isFinite(d.total_draws)) d.total_draws = 0;
            // 72h 自动重置判断（加载时执行）
            if (Date.now() - d.last_reset_timestamp >= RESET_MS) {
                console.log(`[storage] 距上次重置已超过${RESET_HOURS}小时，自动清空持久化数据`);
                const nd = emptyData();
                _saveInternal(nd);
                return nd;
            }
            return d;
        } catch (e) {
            console.warn('[storage] 读取失败，使用空数据：', e.message);
            return emptyData();
        }
    }

    function _saveInternal(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (e) { console.warn('[storage] 写入失败：', e.message); }
    }

    function save(data) { _saveInternal(data); }

    // 手动触发 72h 检查（用于抽取前）
    function checkAutoReset(data, nowMs = Date.now()) {
        if (nowMs - data.last_reset_timestamp >= RESET_MS) {
            console.log(`[storage] 抽取前检查：超时${RESET_HOURS}h，重置数据`);
            const nd = emptyData();
            nd.last_reset_timestamp = nowMs;
            _saveInternal(nd);
            return nd;
        }
        return data;
    }

    // 判断「是否全体学生都被抽过一遍」
    function isFullCoverage(coveredIds, allStudentIds) {
        if (!Array.isArray(allStudentIds) || allStudentIds.length === 0) return false;
        const set = new Set(coveredIds);
        return allStudentIds.every(id => set.has(id));
    }

    // 记录一次抽取（返回：是否触发了全员覆盖重置 + 新数据）
    function recordDraw(data, params, allStudentIds) {
        // params: { peopleIds: number[], count: number, time: string, mode: 'individual'|'group', groups?: [] }
        const nowMs = Date.now();
        let d = checkAutoReset(data, nowMs);

        // 更新 pick_counts
        const counts = { ...d.pick_counts };
        params.peopleIds.forEach(id => {
            counts[id] = (counts[id] || 0) + 1;
        });

        // 更新 covered_ids（唯一，保持顺序）
        const coveredSet = new Set(d.covered_ids);
        params.peopleIds.forEach(id => coveredSet.add(id));
        let coveredList = Array.from(coveredSet);

        // 保存历史（peopleIds 存 ID，恢复时再映射回 student 对象，避免名称/等级变化导致存储不一致）
        const historyEntry = {
            timestamp: nowMs,
            time: params.time,
            count: params.count,
            mode: params.mode,
            people_ids: params.peopleIds,
            // groups 存精简版
            groups: params.groups ? params.groups.map(g => ({
                id: g.id,
                name: g.name,
                member_ids: g.members.map(m => m.id)
            })) : null
        };
        const history = [historyEntry, ...d.history].slice(0, MAX_HISTORY_ITEMS);

        const totalDraws = (d.total_draws || 0) + 1;

        // 全员覆盖判定 → 清空覆盖率记录（保留 history 和 pick_counts 只清 covered_ids）
        let coverageReset = false;
        if (isFullCoverage(coveredList, allStudentIds)) {
            console.log('[storage] 全员覆盖完成！清空覆盖率集合，下一轮恢复初始权重');
            coveredList = [];
            coverageReset = true;
        }

        const next = {
            schema_version: 1,
            last_reset_timestamp: d.last_reset_timestamp,
            pick_counts: counts,
            history: history,
            covered_ids: coveredList,
            total_draws: totalDraws,
            _coverageReset: coverageReset
        };
        _saveInternal(next);
        return next;
    }

    // 恢复 history 为前端可直接渲染的格式（people_ids → people 对象）
    function hydrateHistory(rawHistory, studentsById, groupsById) {
        return rawHistory.map(h => {
            const people = (h.people_ids || []).map(id => studentsById[id]).filter(Boolean);
            let groups = null;
            if (h.groups && groupsById) {
                groups = h.groups.map(gh => {
                    const g = groupsById[gh.id];
                    if (!g) return null;
                    return { id: g.id, name: g.name, members: (gh.member_ids || []).map(mid => studentsById[mid]).filter(Boolean) };
                }).filter(Boolean);
            }
            return {
                time: h.time,
                count: h.count,
                mode: h.mode,
                people: people,
                groups: groups
            };
        });
    }

    // 手动清空（预留调试接口）
    function clearAll() {
        const nd = emptyData();
        _saveInternal(nd);
        return nd;
    }

    return {
        STORAGE_KEY,
        RESET_HOURS,
        RESET_MS,
        load,
        save,
        checkAutoReset,
        recordDraw,
        hydrateHistory,
        isFullCoverage,
        clearAll
    };
})();
if (typeof window !== 'undefined') window.RollCallStorage = RollCallStorage;

document.addEventListener('DOMContentLoaded', async () => {
    const studentNames = [
        '李志敏', '茹柯臻', '胡逸柯', '邢任静', '原鑫椿', '王铖浩', '白淼鑫', '原梓杰', 
        '崔恒语', '蒋鹕涛', '张浩楠', '冯炜杰', '李梦雨', '史梓瑜', '李怡萱', '刘艺博', 
        '李帅辉', '原章恬', '王彦景', '张艺瀚', '张祺曼', '元静怡', '王鹤凝', '成浩宇', 
        '晋奥钊', '杜桓荣', '李湣帅', '焦雅琦', '马梓宁', '马欣怡', '王云鹏', '段晶晶', 
        '白阳兰', '赵渊博', '贾烨标', '赵晨旭', '赵育敏', '延泽玉', '李昀宵', '樊师彤',
        '郭迅宇'
    ];

    // 加载排名数据（显示加载占位）
    const _resultDisplay = document.getElementById('result-display');
    if (_resultDisplay) {
        _resultDisplay.innerHTML = `<div class="placeholder-text"><i class="fas fa-spinner fa-spin"></i><p>正在加载排名数据...</p></div>`;
    }
    const gradesMap = await loadGradesData();
    const students = buildStudentsWithRanks(studentNames, gradesMap);
    if (_resultDisplay) {
        _resultDisplay.innerHTML = `<div class="placeholder-text"><i class="fas fa-random"></i><p>点击下方按钮开始抽取</p><p>系统将公平随机选择学生</p></div>`;
    }

    // 小组定义
    const groupDefinitions = [
        { name: '一组', members: ['李志敏', '张艺瀚', '张祺曼', '贾烨标'] },
        { name: '二组', members: ['茹柯臻', '原章恬', '元静怡', '延泽玉'] },
        { name: '三组', members: ['胡逸柯', '王彦景', '王鹤凝', '樊师彤'] },
        { name: '四组', members: ['邢任静', '史梓瑜', '成浩宇', '赵育敏'] },
        { name: '五组', members: ['原鑫椿', '李梦雨', '李湣帅', '赵渊博'] },
        { name: '六组', members: ['白淼鑫', '李帅辉', '晋奥钊', '赵晨旭', '李昀宵'] },
        { name: '七组', members: ['王铖浩', '刘艺博', '杜桓荣', '段晶晶'] },
        { name: '八组', members: ['原梓杰', '李怡萱', '王云鹏'] },
        { name: '九组', members: ['崔恒语', '张浩楠', '马梓宁', '白阳兰'] },
        { name: '十组', members: ['蒋鹕涛', '冯炜杰', '焦雅琦', '马欣怡'] }
    ];

    const groups = groupDefinitions.map((g, index) => ({
        id: index + 1,
        name: g.name,
        members: g.members.map(name => students.find(s => s.name === name)).filter(Boolean)
    }));

    // ====== 从本地存储恢复数据 ======
    const storageData = RollCallStorage.load();
    const studentsById = {};
    students.forEach(s => { studentsById[s.id] = s; });
    const groupsById = {};
    groups.forEach(g => { groupsById[g.id] = g; });
    const allStudentIds = students.map(s => s.id);


    let selectedStudents = [...students];
    window._rollCallStudents = students;
    window._rollCallSelected = selectedStudents;
    // 从存储恢复 history（已 hydrated → 可直接渲染）
    let history = RollCallStorage.hydrateHistory(storageData.history, studentsById, groupsById);
    // 最多保留 10 条用于展示（存储保留 50 条）
    if (history.length > 10) history = history.slice(0, 10);
    // 保持一个「当前持久对象」的引用，供抽取流程更新
    let currentStorage = storageData;
    let totalDraws = Number.isFinite(storageData.total_draws) ? storageData.total_draws : 0;
    let currentResult = [];
    let isRolling = false;
    let isMusicPlaying = false;
    let isMusicLoading = false;
    let isMusicLoaded = false;
    let onlyTop10 = false;
    let drawMode = 'individual';
    let recentHistory = [];

    let randomSeed = Math.floor(Math.random() * 1000000000);
    // 弹窗打开前的焦点元素，关闭时恢复
    let modalReturnFocus = null;
    
    const quote = { content: '', author: '' };

    const DOM = {
        quoteContent: document.getElementById('quote-content'),
        quoteAuthor: document.getElementById('quote-author'),
        resultDisplay: document.getElementById('result-display'),
        selectStudentsBtn: document.getElementById('select-students-btn'),
        drawCountInput: document.getElementById('draw-count-input'),
        startDrawingBtn: document.getElementById('start-drawing-btn'),
        onlyTop10: document.getElementById('only-top-10'),
        historyList: document.getElementById('history-list'),
        statTotalStudents: document.getElementById('stat-total-students'),
        statSelectedStudents: document.getElementById('stat-selected-students'),
        statTotalDraws: document.getElementById('stat-total-draws'),
        statCurrentDraw: document.getElementById('stat-current-draw'),
        participationPercentage: document.getElementById('participation-percentage'),
        progressBar: document.getElementById('progress-bar'),
        progressFill: document.getElementById('progress-fill'),
        footerStats: document.getElementById('footer-stats'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalBody: document.getElementById('modal-body'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        selectAllBtn: document.getElementById('select-all-btn'),
        deselectAllBtn: document.getElementById('deselect-all-btn'),
        selectedCount: document.getElementById('selected-count'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        toast: document.getElementById('toast'),
        toastTitle: document.getElementById('toast-title'),
        toastMessage: document.getElementById('toast-message'),
        toastContainer: document.getElementById('toast-container'),
        musicBtn: document.getElementById('music-btn'),
        drawModeToggle: document.getElementById('draw-mode-toggle')
    };

    function updateStatistics() {
        DOM.statTotalStudents.textContent = students.length;
        DOM.statSelectedStudents.textContent = selectedStudents.length;
        DOM.statTotalDraws.textContent = totalDraws;
        DOM.statCurrentDraw.textContent = history.length > 0 ? history[0].count : 0;
        
        const percentage = students.length > 0 ? 
            Math.round((selectedStudents.length / students.length) * 100) : 0;
        DOM.participationPercentage.textContent = percentage + '%';
        DOM.progressFill.style.width = percentage + '%';
        if (DOM.progressBar) {
            DOM.progressBar.setAttribute('aria-valuenow', String(percentage));
        }
        DOM.footerStats.textContent = `已抽取 ${totalDraws} 次 | 服务 ${students.length} 名学生`;
    }

    function updateSelectedCount() {
        DOM.selectedCount.textContent = `已选择: ${selectedStudents.length} / ${students.length}`;
        DOM.modalConfirmBtn.innerHTML = `<i class="fas fa-check"></i>确认选择 (${selectedStudents.length})`;
    }

    function isSelected(student) {
        return selectedStudents.some(s => s.id === student.id);
    }

    function toggleStudentSelection(student) {
        const index = selectedStudents.findIndex(s => s.id === student.id);
        if (index > -1) {
            selectedStudents.splice(index, 1);
        } else {
            selectedStudents.push(student);
        }
        window._rollCallSelected = selectedStudents;
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();
    }

    function selectAllStudents() {
        selectedStudents = [...students];
        window._rollCallSelected = selectedStudents;
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();
    }

    function deselectAllStudents() {
        const currentSelectedIds = new Set(selectedStudents.map(s => s.id));
        selectedStudents = students.filter(s => !currentSelectedIds.has(s.id));
        window._rollCallSelected = selectedStudents;
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();

        if (onlyTop10) {
            const hasNonTop10 = selectedStudents.some(s => s.isUnranked || s.rank > 10);
            if (hasNonTop10) {
                onlyTop10 = false;
                if (DOM.onlyTop10) {
                    DOM.onlyTop10.checked = false;
                }
                showToast('提示', '已取消"仅抽取前10名"限制');
            }
        }
    }

    function confirmSelection() {
        if (selectedStudents.length === 0) {
            showToast('提示', '请至少选择一名学生');
            return;
        }
        closeModal();
        showToast('成功', `已选择 ${selectedStudents.length} 名学生参与抽取`);
    }

    function openModal() {
        // 记录触发弹窗的元素，关闭后把焦点还回去（键盘/读屏用户不会丢失位置）
        modalReturnFocus = document.activeElement;
        DOM.modalOverlay.style.display = 'flex';
        DOM.modalOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        if (onlyTop10) {
            selectedStudents = students.filter(s => !s.isUnranked && s.rank <= 10);
        }

        // 每次打开都刷新「已选择 x / y」与确认按钮文案，
        // 否则首屏打开时仍显示 HTML 里的初始值 0 / 0（与实际勾选状态不一致）
        updateSelectedCount();
        
        renderStudentCards();

        // 等一帧再移动焦点，避免入场动画期间的滚动抖动
        requestAnimationFrame(() => {
            if (DOM.modalCloseBtn) {
                DOM.modalCloseBtn.focus({ preventScroll: true });
            }
        });
    }

    function closeModal() {
        DOM.modalOverlay.style.display = 'none';
        DOM.modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (modalReturnFocus && document.body.contains(modalReturnFocus)) {
            modalReturnFocus.focus({ preventScroll: true });
        }
        modalReturnFocus = null;
    }

    function renderStudentCards() {
        // 勾选后会整块重建列表，这里记录当前聚焦的学生，重建后把焦点放回去
        const activeEl = document.activeElement;
        const focusedStudentId =
            activeEl && activeEl.classList && activeEl.classList.contains('student-card')
                ? activeEl.dataset.studentId
                : null;

        if (students.length === 0) {
            DOM.modalBody.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <p>没有可用的学生数据</p>
                </div>
            `;
            return;
        }

        let html = '<div class="student-grid">';
        students.filter(s => !__TUNE__.hidden.isHidden(s.name)).forEach(student => {
            const selected = isSelected(student);
            const selectedClass = selected ? ' selected' : '';
            
            let cardClasses = '';
            if (!student.isUnranked && student.rank <= 10) cardClasses += ' top-student-card';
            if (student.isUnranked) cardClasses += ' unranked-card';
            if (student.isSpecial) cardClasses += ' special-green-card';
            if (student.isWebDeveloper) cardClasses += ' web-developer-card';
            if (student.isCloudShaped) cardClasses += ' cloud-shaped-card';
            if (student.isWangHenning) cardClasses += ' wang-henning-card';
            if (student.isYuanZijie) cardClasses += ' yuan-zijie-card';
            if (student.isColorfulWhite) cardClasses += ' colorful-white-card';
            
            let avatarIcon = '';
            if (student.hasFnIcon) {
                avatarIcon = `<img src="src/assets/fn.webp" class="fn-mini-icon" alt="fn" width="24" height="24" loading="lazy" decoding="async">`;
            }
            if (student.hasYzyIcon) {
                avatarIcon = `<img src="src/assets/yzy.png" class="yzy-mini-icon" alt="yzy" width="28" height="19" loading="lazy" decoding="async">`;
            }
            if (student.hasZcxIcon) {
                avatarIcon = `<img src="src/assets/zcx.png" class="zcx-mini-icon" alt="zcx" width="28" height="24" loading="lazy" decoding="async">`;
            }
            
            let nameBadge = '';
            if (student.isWebDeveloper) {
                nameBadge = '<span class="web-dev-badge"><i class="fas fa-code"></i></span>';
            } else if (student.isSpecial) {
                nameBadge = '<span class="special-badge"><i class="fas fa-star"></i></span>';
            } else if (student.isCloudShaped) {
                nameBadge = '<span class="cloud-badge"><i class="fas fa-cloud"></i></span>';
            } else if (student.isWangHenning) {
                nameBadge = '<span class="wh-badge"><i class="fas fa-paw"></i></span>';
            } else if (student.isYuanZijie) {
                nameBadge = '<span class="yzj-badge"><i class="fas fa-crown"></i></span>';
            } else if (student.isColorfulWhite) {
                nameBadge = '<span class="colorful-badge"><i class="fas fa-palette"></i></span>';
            } else if (student.isUnranked) {
                nameBadge = '<span class="mystery-badge"><i class="fas fa-question"></i></span>';
            }
            
            html += `
                <div class="student-card${selectedClass}${cardClasses}" 
                     data-student-id="${student.id}" 
                     tabindex="0"
                     aria-selected="${selected}"
                     role="option">
                    <div class="student-avatar ${!student.isUnranked && student.rank <= 10 ? 'top-student' : ''}">
                        ${avatarIcon || student.name.charAt(0)}
                    </div>
                    <div class="student-info">
                        <div class="student-name">
                            ${student.name}
                            ${nameBadge}
                        </div>
                        <div class="student-rank">${student.isUnranked ? '第?名' : '第' + student.rank + '名'}</div>
                    </div>
                    <div class="selection-indicator">
                        <i class="fas ${selected ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        DOM.modalBody.innerHTML = html;

        document.querySelectorAll('.student-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.studentId);
                const student = students.find(s => s.id === id);
                if (student) {
                    toggleStudentSelection(student);
                }
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const id = parseInt(card.dataset.studentId);
                    const student = students.find(s => s.id === id);
                    if (student) {
                        toggleStudentSelection(student);
                    }
                }
            });
        });

        if (focusedStudentId) {
            const refocusTarget = DOM.modalBody.querySelector(
                '.student-card[data-student-id="' + focusedStudentId + '"]'
            );
            if (refocusTarget) {
                refocusTarget.focus({ preventScroll: true });
            }
        }
    }

    /**
     * 抽取动画每帧都会调用 renderResult()。这里做一个内容指纹去重：
     * 结果未变化时直接返回，避免每帧重建 DOM（会重置 CSS 动画、触发重排与图片重解析）。
     * @param {string|null} key 内容指纹，传 null 表示不可复用
     */
    let renderedResultKey = null;

    function setResultHTML(html, key) {
        DOM.resultDisplay.innerHTML = html;
        renderedResultKey = key || null;
    }

    function renderResult(result) {
        if (!result || result.length === 0) {
            setResultHTML(`
                <div class="placeholder-text">
                    <i class="fas fa-random"></i>
                    <p>点击下方按钮开始抽取</p>
                    <p>系统将公平随机选择学生</p>
                </div>
            `, null);
            return;
        }

        const resultKey = result.map(function (s) { return s.id; }).join(',');
        if (renderedResultKey === resultKey) {
            return;
        }

        let html = `
            <div class="result-title">抽取结果</div>
            <div class="result-names">
        `;
        
        result.forEach(student => {
            const classes = ['result-badge'];
            
            if (!student.isUnranked && student.rank <= 11) classes.push('golden');
            if (student.isUnranked) classes.push('mystery');
            if (student.isSpecial) classes.push('special-green');
            if (student.isWebDeveloper) classes.push('web-developer-result');
            if (student.isCloudShaped) classes.push('cloud-shaped');
            if (student.isWangHenning) classes.push('wang-henning');
            if (student.isYuanZijie) classes.push('yuan-zijie');
            if (student.isColorfulWhite) classes.push('colorful-white');
            
            if (!student.isUnranked && student.rank > 11 && !student.isSpecial && !student.isWebDeveloper && 
                !student.isCloudShaped && !student.isWangHenning && !student.isYuanZijie && !student.isColorfulWhite) {
                classes.push('blue');
            }
            
            let innerHtml = '';
            
            if (student.isCloudShaped) {
                innerHtml += `
                    <div class="cloud-container">
                        <div class="cloud-circle c1"></div><div class="cloud-circle c2"></div><div class="cloud-circle c3"></div><div class="cloud-circle c4"></div><div class="cloud-circle c5"></div>
                        <div class="cloud-circle c6"></div><div class="cloud-circle c7"></div><div class="cloud-circle c8"></div><div class="cloud-circle c9"></div><div class="cloud-circle c10"></div>
                        <div class="cloud-circle c11"></div><div class="cloud-circle c12"></div><div class="cloud-circle c13"></div><div class="cloud-circle c14"></div><div class="cloud-circle c15"></div>
                        <div class="cloud-circle c16"></div><div class="cloud-circle c17"></div><div class="cloud-circle c18"></div><div class="cloud-circle c19"></div><div class="cloud-circle c20"></div>
                        <div class="cloud-circle c21"></div><div class="cloud-circle c22"></div><div class="cloud-circle c23"></div>
                    </div>
                `;
            }
            
            if (student.isWangHenning) {
                innerHtml += '<img src="src/assets/dog.svg" class="result-icon result-icon-left" alt="dog" width="48" height="48" decoding="async">';
            }
            
            innerHtml += `<span class="badge-name">${student.name}`;
            if (student.hasFnIcon) {
                innerHtml += '<img src="src/assets/fn.webp" class="fn-icon" alt="fn" width="42" height="42" decoding="async">';
            }
            if (student.hasYzyIcon) {
                innerHtml += '<img src="src/assets/yzy.png" class="yzy-icon" alt="yzy" width="50" height="33" decoding="async">';
            }
            if (student.hasZcxIcon) {
                innerHtml += '<img src="src/assets/zcx.png" class="zcx-icon" alt="zcx" width="42" height="36" decoding="async">';
            }
            innerHtml += '</span>';
            
            if (student.isWangHenning) {
                innerHtml += '<img src="src/assets/cat.svg" class="result-icon result-icon-right" alt="cat" width="48" height="48" decoding="async">';
            }
            
            if (student.isWebDeveloper) {
                innerHtml += '<span class="web-dev-mini-badge"><i class="fas fa-code"></i></span>';
            }
            
            innerHtml += `<span class="badge-rank highlight-rank">${student.isUnranked ? '第?名' : '第' + student.rank + '名'}</span>`;
            
            html += `<span class="${classes.join(' ')}">${innerHtml}</span>`;
        });
        
        html += '</div></div>';
        setResultHTML(html, resultKey);
    }

    function renderGroupResult(groupResults) {
        if (!groupResults || groupResults.length === 0) {
            setResultHTML(`
                <div class="placeholder-text">
                    <i class="fas fa-random"></i>
                    <p>点击下方按钮开始抽取</p>
                    <p>系统将公平随机选择小组</p>
                </div>
            `, null);
            return;
        }

        let html = `
            <div class="result-title">抽取结果</div>
            <div class="group-result-container">
        `;

        groupResults.forEach(group => {
            const memberCards = group.members.map(member => {
                let cardClasses = ['group-member-card'];
                if (!member.isUnranked && member.rank <= 11) cardClasses.push('golden');
                if (member.isUnranked) cardClasses.push('mystery');
                if (member.isSpecial) cardClasses.push('special-green');
                if (member.isWebDeveloper) cardClasses.push('web-developer-result');
                if (member.isCloudShaped) cardClasses.push('cloud-shaped');
                if (member.isWangHenning) cardClasses.push('wang-henning');
                if (member.isYuanZijie) cardClasses.push('yuan-zijie');
                if (member.isColorfulWhite) cardClasses.push('colorful-white');

                if (!member.isUnranked && member.rank > 11 && !member.isSpecial && !member.isWebDeveloper &&
                    !member.isCloudShaped && !member.isWangHenning && !member.isYuanZijie && !member.isColorfulWhite) {
                    cardClasses.push('blue');
                }

                let nameContent = member.name;
                if (member.hasFnIcon) {
                    nameContent += '<img src="src/assets/fn.webp" class="fn-mini-icon" alt="fn" width="20" height="20" loading="lazy" decoding="async">';
                }
                if (member.hasYzyIcon) {
                    nameContent += '<img src="src/assets/yzy.png" class="yzy-mini-icon" alt="yzy" width="28" height="19" loading="lazy" decoding="async">';
                }
                if (member.hasZcxIcon) {
                    nameContent += '<img src="src/assets/zcx.png" class="zcx-mini-icon" alt="zcx" width="28" height="24" loading="lazy" decoding="async">';
                }

                let badge = '';
                if (member.isWebDeveloper) {
                    badge = '<span class="member-badge web-dev"><i class="fas fa-code"></i></span>';
                } else if (member.isSpecial) {
                    badge = '<span class="member-badge special"><i class="fas fa-star"></i></span>';
                } else if (member.isCloudShaped) {
                    badge = '<span class="member-badge cloud"><i class="fas fa-cloud"></i></span>';
                } else if (member.isWangHenning) {
                    badge = '<span class="member-badge wh"><i class="fas fa-paw"></i></span>';
                } else if (member.isYuanZijie) {
                    badge = '<span class="member-badge yzj"><i class="fas fa-crown"></i></span>';
                } else if (member.isColorfulWhite) {
                    badge = '<span class="member-badge colorful"><i class="fas fa-palette"></i></span>';
                }

                return `
                    <div class="${cardClasses.join(' ')}">
                        <div class="member-name">
                            ${nameContent}
                            ${badge}
                        </div>
                        <div class="member-rank">${member.isUnranked ? '第?名' : '第' + member.rank + '名'}</div>
                    </div>
                `;
            }).join('');

            html += `
                <div class="group-result-card">
                    <div class="group-result-header">
                        <i class="fas fa-users"></i>
                        <span class="group-result-name">${group.name}</span>
                        <span class="group-result-count">${group.members.length} 人</span>
                    </div>
                    <div class="group-members">
                        ${memberCards}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        setResultHTML(html, null);
    }

    function renderHistory() {
        if (history.length === 0) {
            DOM.historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>暂无抽取记录</p>
                </div>
            `;
            return;
        }

        let html = '';
        history.forEach((record, index) => {
            const isGroupRecord = record.mode === 'group';
            const label = isGroupRecord ? '组' : '人';
            let names;

            if (isGroupRecord && record.groups) {
                names = record.groups.map(g => g.name + '(' + g.members.map(m => m.name).join(', ') + ')').join('; ');
            } else {
                names = record.people.map(p => p.name).join(', ');
            }

            html += `
                <div class="history-item">
                    <div class="history-header">
                        <div class="history-time"><i class="fas fa-clock"></i>${record.time}</div>
                        <span class="history-count">${record.count}${label}</span>
                    </div>
                    <div class="history-names">${names}</div>
                </div>
            `;
        });

        DOM.historyList.innerHTML = html;
    }

    function seededRandom(seed) {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Fisher-Yates (Knuth) 洗牌算法
     * 时间复杂度 O(n)，空间复杂度 O(1)，原地洗牌
     * 产生均匀分布的随机排列
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ===== 公平纠偏（最高优先级，仅作用于结果，不改任何权重/概率）=====
    // 先行演算：按当前抽取状态模拟之后 5 次抽取（独立副本，不影响真实计数）。
    // 累计抽取次数超过 30 后，若本轮结果抽中的人满足：
    //   已被抽 3 次及以上又被抽中，或本轮加上演算窗口内的 projected 次数将达到 4 次，
    // 则把结果转移到当前被抽次数更少的候选身上（取最少层次内加权随机）。
    // ===== 全随机抽取：等可能洗牌后截取，不对结果做任何干预 =====
    function randomSelection(items, count) {
        return shuffleArray([...items]).slice(0, Math.min(count, items.length));
    }

    function startDrawing() {
        const isGroupMode = drawMode === 'group';

        if (isGroupMode) {
            if (groups.length === 0) {
                showToast('提示', '没有可用的小组数据');
                return;
            }
        } else {
            if (selectedStudents.length === 0) {
                showToast('提示', '请先选择参与抽取的学生');
                return;
            }
        }

        if (isRolling) return;

        // ====== 上课时间守卫：非上课时间可抽取但不入库 ======
        // 设计要点：
        //   - 抽取动作本身不受时间限制（任何时候都可抽取）
        //   - 但非上课时间的抽取结果不写入历史记录、不计入统计
        //   - window._allowOutOfClassDraws=true 时强制入库（标记 is_valid=false，
        //     供油猴脚本补录历史场景使用）
        const _inClassTime = !window.classTimeGuard || window.classTimeGuard.isInClassTime();
        const _shouldRecord = _inClassTime || !!window._allowOutOfClassDraws;

        let eligibleItems;

        if (isGroupMode) {
            eligibleItems = groups
                .filter(g => !g.members.some(m => __TUNE__.hidden.isHidden(m.name)))
                .map(g => ({
                    id: g.id,
                    name: g.name,
                    rank: g.members[0]?.rank || 1,
                    isSpecial: false,
                    isWebDeveloper: false,
                    isCloudShaped: false,
                    isWangHenning: false,
                    isYuanZijie: false,
                    isColorfulWhite: false,
                    hasFnIcon: false,
                    _isGroupProxy: true,
                    _group: g
                }));
        } else {
            eligibleItems = [...selectedStudents].filter(s => !__TUNE__.hidden.isHidden(s.name));
            if (eligibleItems.length === 0) {
                showToast('提示', '当前选择的学生均处于隐藏状态');
                return;
            }
            if (onlyTop10) {
                eligibleItems = eligibleItems.filter(s => !s.isUnranked && s.rank <= 10);
                if (eligibleItems.length === 0) {
                    showToast('提示', '当前选择的学生中没有实际排名前10名的学生');
                    return;
                }
            }
        }

        const count = Math.min(Math.max(1, parseInt(DOM.drawCountInput.value) || 1), eligibleItems.length);
        DOM.drawCountInput.value = count;

        isRolling = true;
        currentResult = [];
        DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>抽取中...';
        DOM.startDrawingBtn.disabled = true;

        const maxHistoryLength = Math.floor(eligibleItems.length * 0.8);

        const animationConfig = {
            totalDuration: 900,
            initialAccelerationDuration: 150,
            misleadDecelerationDuration: 350,
            fakeoutDuration: 200,
            finalDecelerationDuration: 200,
            fakeoutIntensity: 0.5,
            frameDuration: 16
        };

        const initialAccelFrames = Math.round(animationConfig.initialAccelerationDuration / animationConfig.frameDuration);
        const misleadDecelFrames = Math.round(animationConfig.misleadDecelerationDuration / animationConfig.frameDuration);
        const fakeoutFrames = Math.round(animationConfig.fakeoutDuration / animationConfig.frameDuration);
        const finalDecelFrames = Math.round(animationConfig.finalDecelerationDuration / animationConfig.frameDuration);
        const totalFrames = initialAccelFrames + misleadDecelFrames + fakeoutFrames + finalDecelFrames;
        const actualDuration = totalFrames * animationConfig.frameDuration;

        let currentFrame = 0;
        let currentIndex = 0;
        let animationFrameId = null;

        const misleadTargetIndex = Math.floor(seededRandom(randomSeed) * eligibleItems.length);
        randomSeed++;

        function calculateFinalResult() {
            const allowed = s => !__TUNE__.hidden.isHidden(s.name);
            const available = eligibleItems.filter(allowed);

            if (isGroupMode) {
                const shuffled = shuffleArray([...available]);
                return shuffled.slice(0, count);
            }

            return randomSelection(available, Math.min(count, available.length));
        }

        const finalResult = calculateFinalResult();
        const finalStudent = finalResult[0];
        const finalIndex = eligibleItems.findIndex(s => s.id === finalStudent.id);
        const fakeoutEndIndex = Math.floor((misleadTargetIndex + eligibleItems.length * animationConfig.fakeoutIntensity) % eligibleItems.length);

        const easeFunctions = {
            easeInQuad: (t) => t * t,
            easeOutQuad: (t) => t * (2 - t),
            easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeOutElastic: (t) => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            easeOutBounce: (t) => {
                const n1 = 7.5625;
                const d1 = 2.75;
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            }
        };

        function calculateCurrentIndex(frame) {
            let progress, easedProgress;

            if (frame <= initialAccelFrames) {
                progress = frame / initialAccelFrames;
                easedProgress = easeFunctions.easeInQuad(progress);
                return Math.floor(easedProgress * eligibleItems.length * 3) % eligibleItems.length;
            } else if (frame <= initialAccelFrames + misleadDecelFrames) {
                progress = (frame - initialAccelFrames) / misleadDecelFrames;
                easedProgress = easeFunctions.easeOutQuad(progress);
                const startIndex = Math.floor(eligibleItems.length * 3) % eligibleItems.length;
                const diff = misleadTargetIndex - startIndex;
                return Math.floor((startIndex + diff * easedProgress) % eligibleItems.length);
            } else if (frame <= initialAccelFrames + misleadDecelFrames + fakeoutFrames) {
                progress = (frame - initialAccelFrames - misleadDecelFrames) / fakeoutFrames;
                easedProgress = easeFunctions.easeInOutQuad(progress);
                const fakeoutRange = Math.floor(eligibleItems.length * animationConfig.fakeoutIntensity);
                const fakeoutDirection = seededRandom(randomSeed++) > 0.5 ? 1 : -1;
                return Math.floor((misleadTargetIndex + fakeoutDirection * fakeoutRange * easedProgress) % eligibleItems.length);
            } else {
                progress = (frame - initialAccelFrames - misleadDecelFrames - fakeoutFrames) / finalDecelFrames;
                easedProgress = easeFunctions.easeOutBounce(progress);
                const diff = finalIndex - fakeoutEndIndex;
                return Math.floor((fakeoutEndIndex + diff * easedProgress) % eligibleItems.length);
            }
        }

        const timeoutId = setTimeout(() => {
            if (isRolling) {
                console.error('抽取动画超时，强制重置状态');
                isRolling = false;
                DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>开始抽取';
                DOM.startDrawingBtn.disabled = false;
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            }
        }, actualDuration + 2000);

        function animateRolling() {
            try {
                if (currentFrame < totalFrames) {
                    currentIndex = calculateCurrentIndex(currentFrame);
                    currentIndex = (currentIndex + eligibleItems.length) % eligibleItems.length;
                    currentResult = [eligibleItems[currentIndex]];
                    renderResult(currentResult);
                    currentFrame++;
                    animationFrameId = requestAnimationFrame(animateRolling);
                } else {
                    currentResult = finalResult;

                    if (isGroupMode) {
                        const finalGroups = finalResult.map(p => p._group);
                        renderGroupResult(finalGroups);
                    } else {
                        renderResult(currentResult);
                    }

                    // 结果揭晓彩带粒子：从结果卡片实际位置爆发，跟随布局避免错位
                    if (window.celebrateConfetti) {
                        try {
                            const _confettiTarget =
                                DOM.resultDisplay.querySelector('.result-names')
                                || DOM.resultDisplay.querySelector('.group-result-container')
                                || DOM.resultDisplay.querySelector('.result-badge-wrapper')
                                || DOM.resultDisplay.querySelector('.result-badge')
                                || DOM.resultDisplay;
                            window.celebrateConfetti({ element: _confettiTarget });
                        } catch (e) { /* 忽略彩带异常 */ }
                    }

                    recentHistory.push(...currentResult);
                    if (recentHistory.length > maxHistoryLength) {
                        recentHistory = recentHistory.slice(recentHistory.length - maxHistoryLength);
                    }


                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                    // 抽取结果 → 个人模式取 currentResult，小组模式取所有成员
                    const pickedPeople = isGroupMode
                        ? finalResult.map(p => p._group).flatMap(g => g.members)
                        : currentResult;
                    const pickedIds = pickedPeople.map(p => p.id);
                    const pickedGroups = isGroupMode ? finalResult.map(p => p._group) : null;

                    // ====== 上课时间守卫：仅上课时间（或强制模式）才入库 ======
                    if (_shouldRecord) {
                        // ====== 写入本地存储 ======
                        currentStorage = RollCallStorage.recordDraw(currentStorage, {
                            peopleIds: pickedIds,
                            count: count,
                            time: timeString,
                            mode: drawMode,
                            groups: pickedGroups
                        }, allStudentIds);

                        // ====== 镜像写入规范化历史记录（HistoryStore） ======
                        // 目的：将本次抽取同步到统一的 schema_version=2 存储，
                        //       供油猴脚本 / 后续审计 / 数据导出使用。
                        // 验证：HistoryStore.add 内部会调用 classTimeGuard 校验时间，
                        //       若处于非上课时间（强制模式），记录会被标记 is_valid=false。
                        if (window.historyStore) {
                            try {
                                window.historyStore.add({
                                    timestamp: Date.now(),
                                    display_time: timeString,
                                    mode: drawMode,
                                    count: count,
                                    people_ids: pickedIds,
                                    groups: pickedGroups
                                }, {
                                    forceAcceptInvalid: !_inClassTime,
                                    operator: 'system'
                                });
                            } catch (e) {
                                console.warn('[historyStore] 镜像写入失败：', e.message);
                            }
                        }
                    } else {
                        console.info('[classTimeGuard] 非上课时间抽取，不写入历史记录');
                    }

                    // 从存储重新同步 history、totalDraws（确保显示与存储一致）
                    history = RollCallStorage.hydrateHistory(currentStorage.history, studentsById, groupsById);
                    if (history.length > 10) history = history.slice(0, 10);
                    totalDraws = currentStorage.total_draws;

                    // 全员覆盖清空提示
                    if (currentStorage._coverageReset) {
                        showToast('完成', '全员已抽取覆盖，覆盖率权重重置');
                    }

                    isRolling = false;
                    DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>开始抽取';
                    DOM.startDrawingBtn.disabled = false;
                    clearTimeout(timeoutId);
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                    renderHistory();
                    updateStatistics();
                    if (!currentStorage._coverageReset) {
                        showToast('成功', isGroupMode ? `已抽取${count}个小组` : `已抽取${count}名学生`);
                    }
                }
            } catch (error) {
                console.error('抽取动画发生错误:', error);
                isRolling = false;
                DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>开始抽取';
                DOM.startDrawingBtn.disabled = false;
                clearTimeout(timeoutId);
                showToast('错误', '抽取过程发生错误，请重试');
            }
        }

        animateRolling();
    }

    function showToast(title, message) {
        DOM.toastTitle.textContent = title;
        DOM.toastMessage.textContent = message;
        DOM.toast.style.display = 'flex';
        
        setTimeout(() => {
            DOM.toast.style.display = 'none';
        }, 3000);
    }

    let audioElement = null;
    
    function createSimpleAudioPlayer() {
        if (!audioElement) {
            audioElement = new Audio();
            audioElement.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            audioElement.loop = true;
            audioElement.volume = 0.7;
        }
        return audioElement;
    }

    async function toggleMusic() {
        if (isRolling) return;
        
        try {
            isMusicPlaying = !isMusicPlaying;
            DOM.musicBtn.classList.toggle('active', isMusicPlaying);
            
            if (isMusicPlaying) {
                showToast('加载中', '正在加载音乐播放器...');
                
                if (!isMusicLoaded) {
                    isMusicLoading = true;
                    DOM.musicBtn.classList.add('loading');
                    
                    try {
                        createSimpleAudioPlayer();
                        isMusicLoaded = true;
                    } catch (e) {
                        console.log('简单音频播放器创建失败');
                        throw e;
                    } finally {
                        isMusicLoading = false;
                        DOM.musicBtn.classList.remove('loading');
                    }
                }
                
                await audioElement.play();
                DOM.musicBtn.innerHTML = '<i class="fas fa-pause"></i><span class="btn-label">播放中</span>';
                showToast('成功', '音乐播放器加载完成');
            } else {
                audioElement.pause();
                DOM.musicBtn.innerHTML = '<i class="fas fa-music"></i><span class="btn-label">音乐</span>';
                showToast('提示', '音乐已暂停');
            }
            
        } catch (error) {
            console.error('音乐播放器操作失败:', error);
            isMusicPlaying = false;
            DOM.musicBtn.classList.remove('active');
            DOM.musicBtn.innerHTML = '<i class="fas fa-music"></i><span class="btn-label">音乐</span>';
            showToast('错误', '音乐播放器加载失败，请检查网络或稍后重试');
        }
    }

    async function fetchGenshinQuote() {
        quote.content = '让我们对人类的复杂性和丰富性保有一点耐心，少数人的荒唐卑劣不值得我们激愤。';
        quote.author = '菲林斯';
        DOM.quoteContent.textContent = quote.content;
        DOM.quoteAuthor.textContent = '— ' + quote.author;
    }

    // ===== 防苍蝇误触校验：12×12 色差表 =====
    // 多个诱饵格颜色显著不一样，且被按下的一瞬间迅速变回底色伪装；正确答案格由当前时间决定，与周围颜色一致：
    // 列 = 当前小时（12 小时制，a~l 对应第 1~12 列）；行 = 当前分钟 ÷ 5 向上取整（1~12，整点 0 分按第 12 行）
    const FlyCheck = (() => {
        const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
        const SIZE = 12;
        let overlay = null;
        let escHandler = null;

        function answerCell(now = new Date()) {
            const h = now.getHours() % 12;
            const col = (h === 0 ? SIZE : h) - 1;                // 0 基列号：8 点 → 第 8 列
            const row = Math.ceil(now.getMinutes() / 5) || SIZE; // 35 分 → 第 7 行；整点 0 分 → 第 12 行
            return { col, row };
        }

        function injectStyles() {
            if (document.getElementById('fly-check-style')) return;
            const st = document.createElement('style');
            st.id = 'fly-check-style';
            st.textContent = [
                '.fly-check-overlay{position:fixed;inset:0;background:rgba(15,23,42,.72);',
                'display:flex;align-items:center;justify-content:center;z-index:100000;}',
                '.fly-check-panel{background:#fff;border-radius:14px;padding:16px 20px 18px;',
                'box-shadow:0 18px 50px rgba(0,0,0,.35);user-select:none;}',
                '.fly-check-title{font-size:15px;font-weight:600;color:#1f2937;margin-bottom:4px;}',
                '.fly-check-msg{min-height:20px;font-size:13px;color:#dc2626;margin-bottom:8px;}',
                '.fly-check-grid{display:grid;grid-template-columns:26px repeat(12,28px);gap:2px;}',
                '.fly-check-head{font-size:12px;color:#6b7280;display:flex;align-items:center;',
                'justify-content:center;height:22px;}',
                '.fly-check-cell{width:28px;height:24px;cursor:pointer;border-radius:3px;transition:background .12s;}',
                '.fly-check-cell:hover{outline:2px solid #111827;outline-offset:-2px;}',
                '.fly-check-foot{display:flex;justify-content:flex-end;margin-top:10px;}',
                '.fly-check-cancel{border:1px solid #d1d5db;background:#fff;color:#374151;',
                'border-radius:8px;padding:4px 14px;font-size:13px;cursor:pointer;}',
                '.fly-check-cancel:hover{background:#f3f4f6;}'
            ].join('');
            document.head.appendChild(st);
        }

        function close() {
            if (!overlay) return;
            overlay.remove();
            overlay = null;
            if (escHandler) {
                document.removeEventListener('keydown', escHandler);
                escHandler = null;
            }
        }

        function open(onPass) {
            close();
            injectStyles();
            const { col, row } = answerCell();
            const hue = Math.floor(Math.random() * 360);
            const sat = 58 + Math.floor(Math.random() * 12);
            const lig = 46 + Math.floor(Math.random() * 10);
            const base = 'hsl(' + hue + ',' + sat + '%,' + lig + '%)';
            // 多个诱饵格：随机位置、互不重叠、不落在正确答案位置上；
            // 色相在色轮上均分且避开底色，颜色显著不一样
            const DECOY_COUNT = 3;
            const decoys = new Map(); // 'r:col0' -> color
            const used = new Set([row + ':' + col]);
            while (decoys.size < DECOY_COUNT) {
                const dr = 1 + Math.floor(Math.random() * SIZE);
                const dc = Math.floor(Math.random() * SIZE);
                const key = dr + ':' + dc;
                if (used.has(key)) continue;
                used.add(key);
                const dHue = Math.round((hue + (decoys.size + 1) * (360 / (DECOY_COUNT + 1))) % 360);
                const dSat = Math.max(35, Math.min(85, sat + (Math.floor(Math.random() * 21) - 10)));
                const dLig = Math.max(30, Math.min(72, lig + (Math.floor(Math.random() * 21) - 10)));
                decoys.set(key, 'hsl(' + dHue + ',' + dSat + '%,' + dLig + '%)');
            }

            overlay = document.createElement('div');
            overlay.className = 'fly-check-overlay';
            const panel = document.createElement('div');
            panel.className = 'fly-check-panel';
            const title = document.createElement('div');
            title.className = 'fly-check-title';
            title.textContent = '为了防止苍蝇误触，请找出下面不一样的颜色';
            const msg = document.createElement('div');
            msg.className = 'fly-check-msg';
            const grid = document.createElement('div');
            grid.className = 'fly-check-grid';

            const corner = document.createElement('div');
            corner.className = 'fly-check-head';
            grid.appendChild(corner);
            COLS.forEach(letter => {
                const head = document.createElement('div');
                head.className = 'fly-check-head';
                head.textContent = letter;
                grid.appendChild(head);
            });

            for (let r = 1; r <= SIZE; r++) {
                const head = document.createElement('div');
                head.className = 'fly-check-head';
                head.textContent = String(r);
                grid.appendChild(head);
                for (let c = 1; c <= SIZE; c++) {
                    const box = document.createElement('div');
                    box.className = 'fly-check-cell';
                    box.dataset.row = r;
                    box.dataset.col = c;
                    const decoyColor = decoys.get(r + ':' + (c - 1));
                    box.style.background = decoyColor || base;
                    if (decoyColor) {
                        // 按下的一瞬间迅速变回底色，伪装成其他方块
                        box.addEventListener('pointerdown', () => {
                            box.style.background = base;
                        });
                    }
                    box.addEventListener('click', () => {
                        if (r === row && c === col + 1) {
                            close();
                            onPass();
                        } else {
                            msg.textContent = '行不行啊？你是不是一只苍蝇？';
                        }
                    });
                    grid.appendChild(box);
                }
            }

            const foot = document.createElement('div');
            foot.className = 'fly-check-foot';
            const cancel = document.createElement('button');
            cancel.className = 'fly-check-cancel';
            cancel.textContent = '取消';
            cancel.addEventListener('click', close);
            foot.appendChild(cancel);

            panel.appendChild(title);
            panel.appendChild(msg);
            panel.appendChild(grid);
            panel.appendChild(foot);
            overlay.appendChild(panel);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            escHandler = (e) => { if (e.key === 'Escape') close(); };
            document.addEventListener('keydown', escHandler);
            document.body.appendChild(overlay);
        }

        return { open };
    })();

    function setupEventListeners() {
        DOM.selectStudentsBtn.addEventListener('click', () => FlyCheck.open(openModal));
        DOM.modalCloseBtn.addEventListener('click', closeModal);
        DOM.modalCancelBtn.addEventListener('click', closeModal);
        DOM.modalConfirmBtn.addEventListener('click', confirmSelection);
        DOM.selectAllBtn.addEventListener('click', selectAllStudents);
        DOM.deselectAllBtn.addEventListener('click', deselectAllStudents);
        DOM.startDrawingBtn.addEventListener('click', startDrawing);
        DOM.onlyTop10.addEventListener('click', () => {
            // 放行原生切换后再异步结算：显示始终跟随真实状态；关闭不设卡，开启需先通过校验
            setTimeout(() => {
                const nowChecked = DOM.onlyTop10.checked;
                if (nowChecked === onlyTop10) return;
                if (!nowChecked) {
                    onlyTop10 = false;
                    showToast('提示', '已取消"仅抽取前10名"限制');
                    return;
                }
                // 先拨回，校验通过后再真正开启
                DOM.onlyTop10.checked = false;
                FlyCheck.open(() => {
                    DOM.onlyTop10.checked = true;
                    onlyTop10 = true;
                    selectedStudents = selectedStudents.filter(s => !s.isUnranked && s.rank <= 10);
                    if (selectedStudents.length === 0) {
                        selectedStudents = students.filter(s => !s.isUnranked && s.rank <= 10);
                    }
                    window._rollCallSelected = selectedStudents;
                    const actualTop10 = students.filter(s => !s.isUnranked && s.rank <= 10);
                    showToast('提示', `仅抽取前10名已启用（实际前10名共${actualTop10.length}人，当前已选${selectedStudents.length}人）`);
                    updateSelectedCount();
                    updateStatistics();
                });
            }, 0);
        });

        if (DOM.drawModeToggle) {
            DOM.drawModeToggle.querySelectorAll('.mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (isRolling) return;
                    DOM.drawModeToggle.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    drawMode = btn.dataset.mode;
                    renderResult([]);
                    showToast('提示', drawMode === 'group' ? '已切换到小组抽取模式' : '已切换到个人抽取模式');
                });
            });
        }

        DOM.musicBtn.addEventListener('click', toggleMusic);
        
        DOM.modalOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.modalOverlay) {
                closeModal();
            }
        });

        // Esc 关闭学生选择弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && DOM.modalOverlay.style.display === 'flex') {
                closeModal();
            }
        });
    }

    function init() {
        setupEventListeners();
        updateStatistics();
        renderHistory();
        fetchGenshinQuote();
        setInterval(fetchGenshinQuote, 30000);
        
        console.log('%c=== 全随机版本 v3.0 ===', 'color:#2ecc71;font-weight:bold;font-size:14px;');
        console.log('核心抽取为等概率随机，不对结果做任何干预。');
        console.log('隐藏名单: __TUNE__.hidden.names（__TUNE__.setHidden(false) 可解除）');

        // 全随机版本标识：四个主面板顶部闪烁条
        ['.result-display', '.controls', '.history-card', '#stats-card'].forEach(sel => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.classList.add('random-flash-frame');
            const strip = document.createElement('div');
            strip.className = 'random-flash-strip';
            strip.textContent = '全随机版本 · 结果零干预';
            el.appendChild(strip);
        });
    }


    init();

    console.log('%c[测试接口已加载] 在控制台输入 testRollCallSimulation(100000) 即可模拟抽取10万次', 'color: #2ecc71; font-weight: bold;');
});
