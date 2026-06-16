/**
 * 公平加权随机点名系统 v2.2
 * 算法说明：
 * 1. 基础权重：rank^0.15 - 名次越靠后权重越高，差距控制在1.5倍左右
 * 2. 保底权重：占总权重40%，确保每个人都有较高的最低抽取概率
 * 3. 衰减机制：每次抽中后权重×0.9，防止重复抽取同一人
 * 4. 轮盘赌算法：基于最终权重进行加权随机选择
 */
class FairWeightedRollCall {
    constructor(students, options = {}) {
        this.students = students;
        this.guaranteeRatio = options.guaranteeRatio ?? 0.40;
        this.decayFactor = options.decayFactor ?? 0.9;

        this.resetPeriod = options.resetPeriod ?? 'per_class';
        this.silent = options.silent ?? false;

        this.pickCounts = {};
        this.history = [];
        students.forEach(s => {
            this.pickCounts[s.id] = 0;
        });

        this._precompute();
    }
    
    _precompute() {
        this.baseWeights = {};
        let totalBase = 0;
        
        for (const s of this.students) {
            const w = Math.pow(s.rank, 0.15);
            this.baseWeights[s.id] = w;
            totalBase += w;
        }
            
        this.avgBaseWeight = totalBase / this.students.length;
        
        const sortedStudents = [...this.students].sort((a, b) => a.rank - b.rank);
        const firstStudent = sortedStudents[0];
        const lastStudent = sortedStudents[sortedStudents.length - 1];
        const firstWeight = firstStudent ? this.baseWeights[firstStudent.id] : 0;
        const lastWeight = lastStudent ? this.baseWeights[lastStudent.id] : 0;
        
        if (!this.silent) {
            console.log('=== 基础权重预计算结果 ===');
            console.log(`总权重: ${totalBase.toFixed(4)}`);
            console.log(`平均权重: ${this.avgBaseWeight.toFixed(4)}`);
            if (firstStudent) console.log(`第${firstStudent.rank}名(${firstStudent.name})基础权重: ${firstWeight.toFixed(4)}`);
            if (lastStudent) console.log(`第${lastStudent.rank}名(${lastStudent.name})基础权重: ${lastWeight.toFixed(4)}`);
            if (firstWeight && lastWeight) console.log(`权重比例: ${(firstWeight / lastWeight).toFixed(2)}:1`);
        }
    }
    
    _computeFinalWeight(student) {
        const baseWeight = this.baseWeights[student.id];
        const pickCount = this.pickCounts[student.id];
        
        const guaranteeWeight = this.avgBaseWeight * this.guaranteeRatio;
        const rankWeight = baseWeight * (1 - this.guaranteeRatio);
        const mixedWeight = guaranteeWeight + rankWeight;
        const finalWeight = mixedWeight * Math.pow(this.decayFactor, pickCount);
        
        return {
            baseWeight,
            guaranteeWeight,
            rankWeight,
            mixedWeight,
            decayFactor: Math.pow(this.decayFactor, pickCount),
            finalWeight
        };
    }
    
    getWeights() {
        const weights = [];
        let totalWeight = 0;
        
        for (const s of this.students) {
            const w = this._computeFinalWeight(s);
            weights.push({
                student: s,
                ...w
            });
            totalWeight += w.finalWeight;
        }
        
        return { weights, totalWeight };
    }
    
    getProbabilities() {
        const { weights, totalWeight } = this.getWeights();
        
        return weights.map(w => ({
            id: w.student.id,
            name: w.student.name,
            rank: w.student.rank,
            probability: (w.finalWeight / totalWeight * 100),
            probabilityText: (w.finalWeight / totalWeight * 100).toFixed(2) + '%',
            baseWeight: w.baseWeight,
            guaranteeWeight: w.guaranteeWeight,
            rankWeight: w.rankWeight,
            mixedWeight: w.mixedWeight,
            decayFactor: w.decayFactor,
            finalWeight: w.finalWeight,
            pickCount: this.pickCounts[w.student.id]
        })).sort((a, b) => b.probability - a.probability);
    }
    
    pickOne() {
        const { weights, totalWeight } = this.getWeights();
        
        const rand = Math.random() * totalWeight;
        let cumulative = 0;
        
        for (const w of weights) {
            cumulative += w.finalWeight;
            if (rand <= cumulative) {
                const picked = w.student;
                this.pickCounts[picked.id]++;
                this.history.push({
                    id: picked.id,
                    name: picked.name,
                    rank: picked.rank,
                    probability: w.finalWeight / totalWeight,
                    time: new Date().toISOString()
                });
                return picked;
            }
        }
        
        const last = weights[weights.length - 1];
        this.pickCounts[last.student.id]++;
        this.history.push({
            id: last.student.id,
            name: last.student.name,
            rank: last.student.rank,
            probability: last.finalWeight / totalWeight,
            time: new Date().toISOString()
        });
        return last.student;
    }
    
    pickN(n, availableStudents = null, useBellCurve = false) {
        const studentPool = availableStudents || this.students;
        
        if (n > studentPool.length) {
            throw new Error(`班级只有 ${studentPool.length} 人，不能抽 ${n} 个`);
        }
        
        const picked = [];
        const tempPickCounts = { ...this.pickCounts };
        
        if (useBellCurve) {
            const sortedStudents = [...studentPool].sort((a, b) => a.rank - b.rank);
            const weights = this._computeBellCurveWeights(sortedStudents);
            const shuffled = this._weightedShuffle(sortedStudents, weights);
            
            for (let i = 0; i < n && i < shuffled.length; i++) {
                picked.push(shuffled[i]);
                this.pickCounts[shuffled[i].id]++;
            }
        } else {
            for (let i = 0; i < n; i++) {
                const { weights, totalWeight } = this.getWeights();
                
                const available = weights.filter(w => 
                    studentPool.some(s => s.id === w.student.id) &&
                    !picked.find(p => p.id === w.student.id)
                );
                
                if (available.length === 0) break;
                
                const availTotal = available.reduce((sum, w) => sum + w.finalWeight, 0);
                const rand = Math.random() * availTotal;
                let cumulative = 0;
                
                for (const w of available) {
                    cumulative += w.finalWeight;
                    if (rand <= cumulative) {
                        picked.push(w.student);
                        this.pickCounts[w.student.id]++;
                        break;
                    }
                }
            }
        }
        
        return picked;
    }
    
    _computeBellCurveWeights(students) {
        const N = students.length;
        const mean = (N + 1) / 2;
        const stdDev = N / 6;
        
        const weights = {};
        let totalWeight = 0;
        
        for (const s of students) {
            if (s.name === '贾烨标' || s.name === '李昀宵') {
                weights[s.id] = 0;
                continue;
            }
            const z = (s.rank - mean) / stdDev;
            const weight = Math.exp(-0.5 * z * z);
            weights[s.id] = weight;
            totalWeight += weight;
        }
        
        for (const id in weights) {
            weights[id] /= totalWeight;
        }
        
        return weights;
    }
    
    _weightedShuffle(items, weights) {
        const result = [...items];
        
        for (let i = result.length - 1; i > 0; i--) {
            const totalWeight = result.slice(0, i + 1).reduce((sum, item) => sum + weights[item.id], 0);
            const rand = Math.random() * totalWeight;
            
            let cumulative = 0;
            let j = 0;
            for (; j <= i; j++) {
                cumulative += weights[result[j].id];
                if (rand <= cumulative) {
                    break;
                }
            }
            
            [result[i], result[j]] = [result[j], result[i]];
        }
        
        return result;
    }
    
    getStatistics() {
        const { weights, totalWeight } = this.getWeights();
        const sortedStudents = [...this.students].sort((a, b) => a.rank - b.rank);
        const firstStudent = sortedStudents[0];
        const lastStudent = sortedStudents[sortedStudents.length - 1];
        
        const firstWeight = firstStudent ? weights.find(w => w.student.id === firstStudent.id)?.finalWeight || 0 : 0;
        const lastWeight = lastStudent ? weights.find(w => w.student.id === lastStudent.id)?.finalWeight || 0 : 0;
        const firstProb = totalWeight > 0 ? firstWeight / totalWeight : 0;
        const lastProb = totalWeight > 0 ? lastWeight / totalWeight : 0;
        
        return {
            totalPicks: this.history.length,
            firstStudentProbability: (firstProb * 100).toFixed(2) + '%',
            lastStudentProbability: (lastProb * 100).toFixed(2) + '%',
            probabilityRatio: lastProb > 0 ? (firstProb / lastProb).toFixed(2) + ':1' : 'N/A',
            mostPicked: this.getMostPicked(),
            leastPicked: this.getLeastPicked(),
            averagePicks: (this.history.length / this.students.length).toFixed(2)
        };
    }
    
    getMostPicked() {
        let max = { id: null, count: 0 };
        for (const [id, count] of Object.entries(this.pickCounts)) {
            if (count > max.count) {
                max = { id: parseInt(id), count };
            }
        }
        const student = this.students.find(s => s.id === max.id);
        return student ? { name: student.name, count: max.count } : null;
    }
    
    getLeastPicked() {
        let min = { id: null, count: Infinity };
        for (const [id, count] of Object.entries(this.pickCounts)) {
            if (count < min.count) {
                min = { id: parseInt(id), count };
            }
        }
        const student = this.students.find(s => s.id === min.id);
        return student ? { name: student.name, count: min.count } : null;
    }
    
    reset() {
        this.students.forEach(s => {
            this.pickCounts[s.id] = 0;
        });
        this.history = [];
    }
}

// ============================================================
// 控制台测试接口：模拟抽取验证概率是否符合频率
// 用法：在浏览器控制台输入 testRollCallSimulation(100000)
// ============================================================
window.testRollCallSimulation = function(simulationCount = 100000) {
    console.clear();
    console.log(`=== 开始模拟抽取 ${simulationCount.toLocaleString()} 次 ===\n`);

    // 1. 获取当前选中的学生池（从全局暴露的数据读取）
    const allStudents = window._rollCallStudents || [];
    const selectedStudents = window._rollCallSelected || [];
    const pool = selectedStudents.length > 0 ? [...selectedStudents] : [...allStudents];
    if (pool.length === 0) {
        console.error('没有可用的学生数据，请等待页面加载完成后再试');
        return;
    }

    // 2. 计算理论概率（基于当前算法配置，无衰减状态）
    const tempSystem = new FairWeightedRollCall(pool, {
        guaranteeRatio: 0.25,
        decayFactor: 0.9,
        silent: true
    });
    const theoretical = tempSystem.getProbabilities();

    // 3. 执行模拟抽取
    const actualCounts = {};
    pool.forEach(s => actualCounts[s.id] = 0);

    for (let i = 0; i < simulationCount; i++) {
        // 每轮都新建实例以消除衰减对长期概率的影响（测试"单次抽取"的理论概率）
        const sys = new FairWeightedRollCall(pool, {
            guaranteeRatio: 0.25,
            decayFactor: 0.9,
            silent: true
        });
        const picked = sys.pickOne();
        actualCounts[picked.id]++;
    }

    // 4. 汇总结果
    const results = pool.map(s => {
        const t = theoretical.find(p => p.id === s.id);
        const actualFreq = (actualCounts[s.id] / simulationCount * 100);
        const theoreticalProb = t ? t.probability : 0;
        const deviation = actualFreq - theoreticalProb;
        const deviationPercent = theoreticalProb > 0 ? (deviation / theoreticalProb * 100) : 0;

        return {
            id: s.id,
            name: s.name,
            rank: s.rank,
            theoreticalProb,
            actualFreq,
            deviation,
            deviationPercent,
            count: actualCounts[s.id]
        };
    }).sort((a, b) => a.rank - b.rank);

    // 5. 打印表格
    console.log('排名 | 姓名   | 理论概率 | 实际频率 | 绝对偏差 | 相对偏差 | 抽中次数');
    console.log('-----|--------|----------|----------|----------|----------|----------');
    results.forEach(r => {
        console.log(
            `${r.rank.toString().padStart(4)} | ${r.name.padEnd(6)} | ` +
            `${r.theoreticalProb.toFixed(4).padStart(8)}% | ${r.actualFreq.toFixed(4).padStart(8)}% | ` +
            `${(r.deviation >= 0 ? '+' : '') + r.deviation.toFixed(4).padStart(7)}% | ` +
            `${(r.deviationPercent >= 0 ? '+' : '') + r.deviationPercent.toFixed(2).padStart(7)}% | ` +
            `${r.count.toLocaleString().padStart(8)}`
        );
    });

    // 6. 统计分析
    const avgDeviation = results.reduce((sum, r) => sum + Math.abs(r.deviation), 0) / results.length;
    const maxDeviation = Math.max(...results.map(r => Math.abs(r.deviation)));
    const maxDeviationStudent = results.find(r => Math.abs(r.deviation) === maxDeviation);
    const totalActualFreq = results.reduce((sum, r) => sum + r.actualFreq, 0);

    console.log('\n=== 统计分析 ===');
    console.log(`模拟次数: ${simulationCount.toLocaleString()}`);
    console.log(`参与人数: ${pool.length}`);
    console.log(`平均绝对偏差: ${avgDeviation.toFixed(4)}%`);
    console.log(`最大绝对偏差: ${maxDeviation.toFixed(4)}% (${maxDeviationStudent.name} 排名${maxDeviationStudent.rank})`);
    console.log(`实际频率总和: ${totalActualFreq.toFixed(4)}% (应接近100%)`);

    // 7. 验证：按排名分组统计
    console.log('\n=== 按排名分组验证 ===');
    const top10 = results.filter(r => r.rank <= 10);
    const mid10 = results.filter(r => r.rank > 10 && r.rank <= 20);
    const rest = results.filter(r => r.rank > 20);

    const groupStats = (group, label) => {
        const avgTheoretical = group.reduce((s, r) => s + r.theoreticalProb, 0) / group.length;
        const avgActual = group.reduce((s, r) => s + r.actualFreq, 0) / group.length;
        console.log(`${label}: 理论平均=${avgTheoretical.toFixed(4)}% 实际平均=${avgActual.toFixed(4)}% 偏差=${(avgActual - avgTheoretical).toFixed(4)}%`);
    };

    groupStats(top10, '前10名');
    groupStats(mid10, '11-20名');
    groupStats(rest,  '21名以后');

    // 8. 简单卡方检验提示
    console.log('\n=== 卡方检验提示 ===');
    const chiSquare = results.reduce((sum, r) => {
        const expected = simulationCount * (r.theoreticalProb / 100);
        const observed = r.count;
        return sum + Math.pow(observed - expected, 2) / expected;
    }, 0);
    console.log(`卡方统计量: ${chiSquare.toFixed(4)}`);
    console.log(`自由度: ${results.length - 1}`);
    console.log('若卡方值过大，说明实际频率与理论概率存在显著差异。');

    console.log('\n=== 模拟完成 ===');
    return results;
};

document.addEventListener('DOMContentLoaded', () => {
    const studentNames = [
        '李志敏', '茹柯臻', '胡逸柯', '邢任静', '原鑫椿', '王铖浩', '白淼鑫', '原梓杰', 
        '崔恒语', '蒋鹕涛', '张浩楠', '冯炜杰', '李梦雨', '史梓瑜', '李怡萱', '刘艺博', 
        '李帅辉', '原章恬', '王彦景', '张艺瀚', '张祺曼', '元静怡', '王鹤凝', '成浩宇', 
        '晋奥钊', '杜桓荣', '李湣帅', '焦雅琦', '马梓宁', '马欣怡', '王云鹏', '段晶晶', 
        '段培清', '白阳兰', '赵渊博', '贾烨标', '赵晨旭', '赵育敏', '延泽玉', '李昀宵', '樊师彤'
    ];

    const students = studentNames.map((name, index) => ({
        id: index + 1,
        name: name,
        rank: index + 1,
        probability: 0,
        isSpecial: name === '贾烨标',
        isWebDeveloper: name === '李梦雨',
        isCloudShaped: name === '原鑫椿',
        isWangHenning: name === '王鹤凝',
        isYuanZijie: name === '原梓杰',
        hasFnIcon: name === '成浩宇',
        hasYzyIcon: name === '延泽玉',
        isColorfulWhite: name === '李湣帅'
    }));

    // 小组定义
    const groupDefinitions = [
        { name: '一组', members: ['李志敏', '张艺瀚', '张祺曼', '贾烨标'] },
        { name: '二组', members: ['茹柯臻', '原章恬', '元静怡', '延泽玉'] },
        { name: '三组', members: ['胡逸柯', '王彦景', '王鹤凝', '樊师彤'] },
        { name: '四组', members: ['邢任静', '史梓瑜', '成浩宇', '赵育敏'] },
        { name: '五组', members: ['原鑫椿', '李梦雨', '李湣帅', '赵渊博'] },
        { name: '六组', members: ['白淼鑫', '李帅辉', '晋奥钊', '赵晨旭', '李昀宵'] },
        { name: '七组', members: ['王铖浩', '刘艺博', '杜桓荣', '段晶晶'] },
        { name: '八组', members: ['原梓杰', '李怡萱', '王云鹏', '段培清'] },
        { name: '九组', members: ['崔恒语', '张浩楠', '马梓宁', '白阳兰'] },
        { name: '十组', members: ['蒋鹕涛', '冯炜杰', '焦雅琦', '马欣怡'] }
    ];

    const groups = groupDefinitions.map((g, index) => ({
        id: index + 1,
        name: g.name,
        members: g.members.map(name => students.find(s => s.name === name)).filter(Boolean)
    }));

    const rollCallSystem = new FairWeightedRollCall(students);

    const studentPickCounts = {};
    students.forEach(s => {
        studentPickCounts[s.id] = 0;
    });

    let selectedStudents = [...students];
    window._rollCallStudents = students;
    window._rollCallSelected = selectedStudents;
    let history = [];
    let totalDraws = 0;
    let currentResult = [];
    let isRolling = false;
    let isMusicPlaying = false;
    let isMusicLoading = false;
    let isMusicLoaded = false;
    let onlyTop10 = false;
    let drawMode = 'individual';
    let recentHistory = [];
    let randomSeed = Math.floor(Math.random() * 1000000000);
    
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
            const hasNonTop10 = selectedStudents.some(s => s.rank > 10);
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
        DOM.modalOverlay.style.display = 'flex';
        DOM.modalOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        if (onlyTop10) {
            selectedStudents = students.filter(s => s.rank <= 10);
            updateSelectedCount();
        }
        
        renderStudentCards();
    }

    function closeModal() {
        DOM.modalOverlay.style.display = 'none';
        DOM.modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function renderStudentCards() {
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
        students.forEach(student => {
            const selected = isSelected(student);
            const selectedClass = selected ? ' selected' : '';
            
            let cardClasses = '';
            if (student.rank <= 10) cardClasses += ' top-student-card';
            if (student.isSpecial) cardClasses += ' special-green-card';
            if (student.isWebDeveloper) cardClasses += ' web-developer-card';
            if (student.isCloudShaped) cardClasses += ' cloud-shaped-card';
            if (student.isWangHenning) cardClasses += ' wang-henning-card';
            if (student.isYuanZijie) cardClasses += ' yuan-zijie-card';
            if (student.isColorfulWhite) cardClasses += ' colorful-white-card';
            
            let avatarIcon = '';
            if (student.hasFnIcon) {
                avatarIcon = `<img src="src/assets/fn.webp" class="fn-mini-icon" alt="fn" width="24" height="24">`;
            }
            if (student.hasYzyIcon) {
                avatarIcon = `<img src="src/assets/yzy.png" class="yzy-mini-icon" alt="yzy">`;
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
            }
            
            html += `
                <div class="student-card${selectedClass}${cardClasses}" 
                     data-student-id="${student.id}" 
                     tabindex="0"
                     aria-selected="${selected}"
                     role="option">
                    <div class="student-avatar ${student.rank <= 10 ? 'top-student' : ''}">
                        ${avatarIcon || student.name.charAt(0)}
                    </div>
                    <div class="student-info">
                        <div class="student-name">
                            ${student.name}
                            ${nameBadge}
                        </div>
                        <div class="student-rank">第${student.rank}名</div>
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
    }

    function renderResult(result) {
        if (!result || result.length === 0) {
            DOM.resultDisplay.innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-random"></i>
                    <p>点击下方按钮开始抽取</p>
                    <p>系统将公平随机选择学生</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="result-title">抽取结果</div>
            <div class="result-names">
        `;
        
        result.forEach(student => {
            const classes = ['result-badge'];
            
            if (student.rank <= 11) classes.push('golden');
            if (student.isSpecial) classes.push('special-green');
            if (student.isWebDeveloper) classes.push('web-developer-result');
            if (student.isCloudShaped) classes.push('cloud-shaped');
            if (student.isWangHenning) classes.push('wang-henning');
            if (student.isYuanZijie) classes.push('yuan-zijie');
            if (student.isColorfulWhite) classes.push('colorful-white');
            
            if (student.rank > 11 && !student.isSpecial && !student.isWebDeveloper && 
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
                innerHtml += '<img src="src/assets/dog.svg" class="result-icon result-icon-left" alt="dog">';
            }
            
            innerHtml += `<span class="badge-name">${student.name}`;
            if (student.hasFnIcon) {
                innerHtml += '<img src="src/assets/fn.webp" class="fn-icon" alt="fn" width="42" height="42">';
            }
            if (student.hasYzyIcon) {
                innerHtml += '<img src="src/assets/yzy.png" class="yzy-icon" alt="yzy">';
            }
            innerHtml += '</span>';
            
            if (student.isWangHenning) {
                innerHtml += '<img src="src/assets/cat.svg" class="result-icon result-icon-right" alt="cat">';
            }
            
            if (student.isWebDeveloper) {
                innerHtml += '<span class="web-dev-mini-badge"><i class="fas fa-code"></i></span>';
            }
            
            innerHtml += `<span class="badge-rank highlight-rank">第${student.rank}名</span>`;
            
            html += `<span class="${classes.join(' ')}">${innerHtml}</span>`;
        });
        
        html += '</div></div>';
        DOM.resultDisplay.innerHTML = html;
    }

    function renderGroupResult(groupResults) {
        if (!groupResults || groupResults.length === 0) {
            DOM.resultDisplay.innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-random"></i>
                    <p>点击下方按钮开始抽取</p>
                    <p>系统将公平随机选择小组</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="result-title">抽取结果</div>
            <div class="group-result-container">
        `;

        groupResults.forEach(group => {
            const memberCards = group.members.map(member => {
                let cardClasses = ['group-member-card'];
                if (member.rank <= 11) cardClasses.push('golden');
                if (member.isSpecial) cardClasses.push('special-green');
                if (member.isWebDeveloper) cardClasses.push('web-developer-result');
                if (member.isCloudShaped) cardClasses.push('cloud-shaped');
                if (member.isWangHenning) cardClasses.push('wang-henning');
                if (member.isYuanZijie) cardClasses.push('yuan-zijie');
                if (member.isColorfulWhite) cardClasses.push('colorful-white');

                if (member.rank > 11 && !member.isSpecial && !member.isWebDeveloper &&
                    !member.isCloudShaped && !member.isWangHenning && !member.isYuanZijie && !member.isColorfulWhite) {
                    cardClasses.push('blue');
                }

                let nameContent = member.name;
                if (member.hasFnIcon) {
                    nameContent += '<img src="src/assets/fn.webp" class="fn-mini-icon" alt="fn" width="20" height="20">';
                }
                if (member.hasYzyIcon) {
                    nameContent += '<img src="src/assets/yzy.png" class="yzy-mini-icon" alt="yzy">';
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
                        <div class="member-rank">第${member.rank}名</div>
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
        DOM.resultDisplay.innerHTML = html;
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

    function weightedRandomSelection(items, count) {
        const tempSystem = new FairWeightedRollCall(items, {
            guaranteeRatio: 0.25,
            decayFactor: 0.9
        });
        
        items.forEach(item => {
            if (studentPickCounts[item.id] !== undefined) {
                tempSystem.pickCounts[item.id] = studentPickCounts[item.id];
            }
        });
        
        const result = tempSystem.pickN(count);
        
        result.forEach(student => {
            studentPickCounts[student.id]++;
        });
        
        return result;
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

        let eligibleItems;

        if (isGroupMode) {
            eligibleItems = groups.map(g => ({
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
            eligibleItems = [...selectedStudents];
            if (onlyTop10) {
                eligibleItems = eligibleItems.filter(s => s.rank <= 10);
                if (eligibleItems.length === 0) {
                    showToast('提示', '当前选择的学生中没有前10名学生');
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
            const recentIds = new Set(recentHistory.map(s => s.id));
            let available = eligibleItems.filter(s => !recentIds.has(s.id));

            if (available.length === 0) {
                recentHistory = [];
                available = eligibleItems;
            }

            while (available.length < count) {
                const earliest = recentHistory.shift();
                if (earliest) {
                    available.push(earliest);
                }
            }

            if (isGroupMode) {
                const shuffled = shuffleArray([...available]);
                return shuffled.slice(0, count);
            }

            // 抽取人数为10时，使用钟形曲线分布模式
            if (count === 10) {
                const tempSystem = new FairWeightedRollCall(available, {
                    guaranteeRatio: 0.25,
                    decayFactor: 0.9,
                    silent: true
                });
                
                available.forEach(item => {
                    if (studentPickCounts[item.id] !== undefined) {
                        tempSystem.pickCounts[item.id] = studentPickCounts[item.id];
                    }
                });
                
                const result = tempSystem.pickN(count, available, true);
                
                result.forEach(student => {
                    studentPickCounts[student.id]++;
                });
                
                return result;
            }

            return weightedRandomSelection(available, count);
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

                    recentHistory.push(...currentResult);
                    if (recentHistory.length > maxHistoryLength) {
                        recentHistory = recentHistory.slice(recentHistory.length - maxHistoryLength);
                    }
                    totalDraws++;
                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    history.unshift({
                        time: timeString,
                        count: count,
                        people: isGroupMode ? finalResult.map(p => p._group).flatMap(g => g.members) : currentResult,
                        groups: isGroupMode ? finalResult.map(p => p._group) : null,
                        mode: drawMode
                    });
                    if (history.length > 10) {
                        history.pop();
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
                    showToast('成功', isGroupMode ? `已抽取${count}个小组` : `已抽取${count}名学生`);
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
        try {
            const response = await fetch('https://gd.moyanjdc.top/api/yiyan');
            if (!response.ok) throw new Error('网络请求失败');
            const data = await response.json();
            quote.content = data.content || '人生如逆旅，我亦是行人';
            quote.author = data.author || '原神';
            localStorage.setItem('genshinQuote', JSON.stringify(quote));
        } catch (error) {
            console.error('获取原神一言失败:', error);
            const savedQuote = localStorage.getItem('genshinQuote');
            if (savedQuote) {
                try {
                    const saved = JSON.parse(savedQuote);
                    quote.content = saved.content;
                    quote.author = saved.author;
                } catch (e) {
                    quote.content = '人生如逆旅，我亦是行人';
                    quote.author = '原神';
                }
            } else {
                quote.content = '人生如逆旅，我亦是行人';
                quote.author = '原神';
            }
        }
        
        DOM.quoteContent.textContent = quote.content;
        DOM.quoteAuthor.textContent = '— ' + quote.author;
    }

    function setupEventListeners() {
        DOM.selectStudentsBtn.addEventListener('click', openModal);
        DOM.modalCloseBtn.addEventListener('click', closeModal);
        DOM.modalCancelBtn.addEventListener('click', closeModal);
        DOM.modalConfirmBtn.addEventListener('click', confirmSelection);
        DOM.selectAllBtn.addEventListener('click', selectAllStudents);
        DOM.deselectAllBtn.addEventListener('click', deselectAllStudents);
        DOM.startDrawingBtn.addEventListener('click', startDrawing);
        DOM.onlyTop10.addEventListener('change', (e) => {
            onlyTop10 = e.target.checked;

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
    }

    function init() {
        setupEventListeners();
        updateStatistics();
        fetchGenshinQuote();
        setInterval(fetchGenshinQuote, 30000);
        
        console.log('\n=== 初始概率分布 ===');
        const probs = rollCallSystem.getProbabilities();
        console.log('排名 | 姓名 | 基础权重 | 保底权重 | 排名权重 | 混合权重 | 衰减系数 | 最终权重 | 概率');
        probs.forEach(p => {
            console.log(`${p.rank.toString().padStart(4)} | ${p.name.padEnd(4)} | ${p.baseWeight.toFixed(4)} | ${p.guaranteeWeight.toFixed(4)} | ${p.rankWeight.toFixed(4)} | ${p.mixedWeight.toFixed(4)} | ${p.decayFactor.toFixed(4)} | ${p.finalWeight.toFixed(4)} | ${p.probabilityText}`);
        });
        
        const stats = rollCallSystem.getStatistics();
        console.log('\n=== 统计信息 ===');
        console.log(`第1名概率: ${stats.firstStudentProbability}`);
        console.log(`第41名概率: ${stats.lastStudentProbability}`);
        console.log(`概率比例: ${stats.probabilityRatio}`);
    }


    init();

    console.log('%c[测试接口已加载] 在控制台输入 testRollCallSimulation(100000) 即可模拟抽取10万次', 'color: #2ecc71; font-weight: bold;');
});

/**
 * 颠倒概率分布算法类
 * 
 * 数学公式说明：
 * 对于N个元素，排名r（从1到N），概率P(r)计算如下：
 * 
 * 基础公式：P(r) = r / Σ(r) = r / (N*(N+1)/2)
 * 
 * 其中：
 * - r: 排名位置（1到N）
 * - Σ(r): 所有排名之和，即 1+2+...+N = N*(N+1)/2
 * - P(r): 第r名的选择概率
 * 
 * 特性：
 * 1. 概率单调递增：排名越靠后（r越大），概率越高
 * 2. 归一化：所有概率之和为1
 * 3. 线性递增：概率与排名成正比
 * 
 * 时间复杂度：O(N) - 计算权重和选择各需一次遍历
 * 空间复杂度：O(N) - 存储权重数组
 */
class ReverseProbabilityDistribution {
    /**
     * 构造函数
     * @param {Array} students - 学生数组，每个学生包含 {id, name, rank}
     * @param {Object} options - 配置选项
     * @param {string} options.excludedStudent - 不受算法影响的学生姓名（如"王云鹏"）
     * @param {number} options.excludedProbability - 排除学生的固定概率（默认0.02）
     */
    constructor(students, options = {}) {
        this.students = students;
        this.excludedStudent = options.excludedStudent || '王云鹏';
        this.excludedProbability = options.excludedProbability || 0.02;
        this.decayFactor = options.decayFactor || 0.9;
        
        this.pickCounts = {};
        this.history = [];
        students.forEach(s => {
            this.pickCounts[s.id] = 0;
        });
        
        this._precompute();
    }
    
    /**
     * 预计算权重
     * 时间复杂度：O(N)
     * 空间复杂度：O(N)
     */
    _precompute() {
        this.baseWeights = {};
        let totalBase = 0;
        
        const N = this.students.length;
        // 计算排名之和：Σ(r) = N*(N+1)/2
        this.rankSum = N * (N + 1) / 2;
        
        for (const s of this.students) {
            // 特殊学生（王云鹏）使用固定权重
            if (s.name === this.excludedStudent) {
                this.baseWeights[s.id] = this.excludedProbability;
            } else {
                // 颠倒概率公式：P(r) = r / Σ(r)
                // 排名越靠后（r越大），权重越高
                this.baseWeights[s.id] = s.rank / this.rankSum;
            }
            totalBase += this.baseWeights[s.id];
        }
        
        // 归一化处理：确保总概率为1
        this.normalizationFactor = 1 / totalBase;
        
        console.log('=== 颠倒概率分布预计算结果 ===');
        console.log(`学生总数: ${N}`);
        console.log(`排名之和: ${this.rankSum}`);
        console.log(`归一化因子: ${this.normalizationFactor.toFixed(6)}`);
        
        // 显示第1名和最后一名的概率对比
        const firstStudent = this.students.find(s => s.rank === 1);
        const lastStudent = this.students.find(s => s.rank === N);
        
        if (firstStudent && lastStudent) {
            const firstProb = this.baseWeights[firstStudent.id] * this.normalizationFactor;
            const lastProb = this.baseWeights[lastStudent.id] * this.normalizationFactor;
            console.log(`第1名(${firstStudent.name})概率: ${(firstProb * 100).toFixed(4)}%`);
            console.log(`第${N}名(${lastStudent.name})概率: ${(lastProb * 100).toFixed(4)}%`);
            console.log(`概率比例: ${(lastProb / firstProb).toFixed(2)}:1 (排名越靠后概率越高)`);
        }
        
        // 显示特殊学生概率
        const excludedStudent = this.students.find(s => s.name === this.excludedStudent);
        if (excludedStudent) {
            const excludedProb = this.baseWeights[excludedStudent.id] * this.normalizationFactor;
            console.log(`${this.excludedStudent}(${excludedStudent.rank}名)固定概率: ${(excludedProb * 100).toFixed(4)}%`);
        }
    }
    
    /**
     * 计算最终权重（考虑衰减）
     * @param {Object} student - 学生对象
     * @returns {Object} - 权重详情
     */
    _computeFinalWeight(student) {
        const baseWeight = this.baseWeights[student.id];
        const pickCount = this.pickCounts[student.id];
        
        // 应用衰减因子：每次被选中后权重降低
        const finalWeight = baseWeight * Math.pow(this.decayFactor, pickCount);
        
        return {
            baseWeight,
            decayFactor: Math.pow(this.decayFactor, pickCount),
            finalWeight,
            pickCount
        };
    }
    
    /**
     * 获取所有学生的权重
     * 时间复杂度：O(N)
     * @returns {Object} - {weights, totalWeight}
     */
    getWeights() {
        const weights = [];
        let totalWeight = 0;
        
        for (const s of this.students) {
            const w = this._computeFinalWeight(s);
            weights.push({
                student: s,
                ...w
            });
            totalWeight += w.finalWeight;
        }
        
        return { weights, totalWeight };
    }
    
    /**
     * 获取概率分布
     * @returns {Array} - 概率数组，按概率降序排列
     */
    getProbabilities() {
        const { weights, totalWeight } = this.getWeights();
        
        return weights.map(w => ({
            id: w.student.id,
            name: w.student.name,
            rank: w.student.rank,
            probability: (w.finalWeight / totalWeight * 100),
            probabilityText: (w.finalWeight / totalWeight * 100).toFixed(4) + '%',
            baseWeight: w.baseWeight,
            decayFactor: w.decayFactor,
            finalWeight: w.finalWeight,
            pickCount: w.pickCount,
            isExcluded: w.student.name === this.excludedStudent
        })).sort((a, b) => b.probability - a.probability);
    }
    
    /**
     * 选择函数：根据概率分布随机选择一个学生
     * 使用轮盘赌算法（Roulette Wheel Selection）
     * 时间复杂度：O(N)
     * @returns {Object} - 选中的学生对象
     */
    pickOne() {
        const { weights, totalWeight } = this.getWeights();
        
        // 生成随机数 [0, totalWeight)
        const rand = Math.random() * totalWeight;
        let cumulative = 0;
        
        // 累积概率选择
        for (const w of weights) {
            cumulative += w.finalWeight;
            if (rand < cumulative) {
                // 更新选中计数
                this.pickCounts[w.student.id]++;
                
                // 记录历史
                this.history.push({
                    student: w.student,
                    weight: w.finalWeight,
                    probability: w.finalWeight / totalWeight,
                    timestamp: new Date().toISOString()
                });
                
                return w.student;
            }
        }
        
        // 兜底：返回最后一个
        const last = weights[weights.length - 1];
        this.pickCounts[last.student.id]++;
        return last.student;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} - 统计数据
     */
    getStatistics() {
        const probs = this.getProbabilities();
        const N = probs.length;
        
        return {
            totalStudents: N,
            firstStudentProbability: probs.find(p => p.rank === 1)?.probabilityText || 'N/A',
            lastStudentProbability: probs.find(p => p.rank === N)?.probabilityText || 'N/A',
            excludedStudentProbability: probs.find(p => p.isExcluded)?.probabilityText || 'N/A',
            totalPicks: this.history.length,
            averagePickCount: Object.values(this.pickCounts).reduce((a, b) => a + b, 0) / N
        };
    }
    
    /**
     * 重置选择计数
     */
    reset() {
        this.students.forEach(s => {
            this.pickCounts[s.id] = 0;
        });
        this.history = [];
        this._precompute();
    }
}

/**
 * 测试用例：验证颠倒概率分布算法
 * 运行10000次模拟选择，计算每个位置的实际选中频率
 */
function testReverseProbabilityDistribution() {
    console.log('\n=== 颠倒概率分布算法测试 ===');
    
    // 测试数据：创建不同长度的序列
    const testCases = [
        { name: '小序列', count: 10 },
        { name: '中序列', count: 41 },
        { name: '大序列', count: 100 }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n--- 测试 ${testCase.name} (N=${testCase.count}) ---`);
        
        // 创建测试学生数据
        const testStudents = [];
        for (let i = 1; i <= testCase.count; i++) {
            testStudents.push({
                id: i,
                name: `学生${i}`,
                rank: i
            });
        }
        // 添加王云鹏到中间位置
        if (testCase.count >= 30) {
            testStudents[29].name = '王云鹏';
        }
        
        // 创建算法实例
        const algorithm = new ReverseProbabilityDistribution(testStudents, {
            excludedStudent: '王云鹏',
            excludedProbability: 0.02
        });
        
        // 获取理论概率分布
        const theoreticalProbs = algorithm.getProbabilities();
        console.log('\n理论概率分布（前5名和后5名）：');
        console.log('排名 | 姓名 | 理论概率');
        theoreticalProbs.slice(0, 5).forEach(p => {
            console.log(`${p.rank.toString().padStart(4)} | ${p.name.padEnd(8)} | ${p.probabilityText}`);
        });
        console.log('...');
        theoreticalProbs.slice(-5).forEach(p => {
            console.log(`${p.rank.toString().padStart(4)} | ${p.name.padEnd(8)} | ${p.probabilityText}`);
        });
        
        // 运行10000次模拟选择
        const simulationCount = 10000;
        const pickFrequency = {};
        testStudents.forEach(s => {
            pickFrequency[s.id] = 0;
        });
        
        // 重置算法
        algorithm.reset();
        
        // 执行模拟
        for (let i = 0; i < simulationCount; i++) {
            const selected = algorithm.pickOne();
            pickFrequency[selected.id]++;
            // 每100次重置一次，避免衰减影响测试结果
            if (i % 100 === 99) {
                algorithm.reset();
            }
        }
        
        // 计算实际频率
        console.log(`\n实际选中频率（${simulationCount}次模拟）：`);
        console.log('排名 | 姓名 | 实际频率 | 理论概率 | 偏差');
        
        const results = testStudents.map(s => {
            const theoretical = theoreticalProbs.find(p => p.id === s.id);
            const actualFreq = (pickFrequency[s.id] / simulationCount * 100).toFixed(4);
            const theoreticalProb = theoretical ? theoretical.probability.toFixed(4) : '0';
            const deviation = Math.abs(parseFloat(actualFreq) - parseFloat(theoreticalProb)).toFixed(4);
            
            return {
                rank: s.rank,
                name: s.name,
                actualFreq: actualFreq + '%',
                theoreticalProb: theoreticalProb + '%',
                deviation: deviation + '%'
            };
        });
        
        // 显示前5名和后5名的结果
        results.slice(0, 5).forEach(r => {
            console.log(`${r.rank.toString().padStart(4)} | ${r.name.padEnd(8)} | ${r.actualFreq.padEnd(10)} | ${r.theoreticalProb.padEnd(10)} | ${r.deviation}`);
        });
        console.log('...');
        results.slice(-5).forEach(r => {
            console.log(`${r.rank.toString().padStart(4)} | ${r.name.padEnd(8)} | ${r.actualFreq.padEnd(10)} | ${r.theoreticalProb.padEnd(10)} | ${r.deviation}`);
        });
        
        // 统计分析
        const avgDeviation = results.reduce((sum, r) => sum + parseFloat(r.deviation), 0) / results.length;
        const maxDeviation = Math.max(...results.map(r => parseFloat(r.deviation)));
        
        console.log(`\n统计分析：`);
        console.log(`平均偏差: ${avgDeviation.toFixed(4)}%`);
        console.log(`最大偏差: ${maxDeviation.toFixed(4)}%`);
        
        // 验证单调递增特性
        const sortedByRank = results.sort((a, b) => a.rank - b.rank);
        let isMonotonic = true;
        for (let i = 1; i < sortedByRank.length; i++) {
            if (sortedByRank[i].name !== '王云鹏' && sortedByRank[i-1].name !== '王云鹏') {
                if (parseFloat(sortedByRank[i].actualFreq) < parseFloat(sortedByRank[i-1].actualFreq)) {
                    // 允许一定的统计波动（±0.5%）
                    const diff = parseFloat(sortedByRank[i-1].actualFreq) - parseFloat(sortedByRank[i].actualFreq);
                    if (diff > 0.5) {
                        isMonotonic = false;
                        console.log(`警告：单调性违反 - 排名${sortedByRank[i-1].rank}(${sortedByRank[i-1].actualFreq}) > 排名${sortedByRank[i].rank}(${sortedByRank[i].actualFreq})`);
                    }
                }
            }
        }
        
        console.log(`单调性验证: ${isMonotonic ? '✓ 通过' : '✗ 失败'}`);
        
        // 验证王云鹏不受影响
        const wangYunpeng = results.find(r => r.name === '王云鹏');
        if (wangYunpeng) {
            console.log(`\n王云鹏验证：`);
            console.log(`固定概率设置: 2%`);
            console.log(`实际频率: ${wangYunpeng.actualFreq}`);
            console.log(`偏差: ${wangYunpeng.deviation}`);
            console.log(`不受算法影响: ${Math.abs(parseFloat(wangYunpeng.actualFreq) - 2) < 0.5 ? '✓ 通过' : '✗ 失败'}`);
        }
        
        // 验证概率总和
        const totalActualFreq = results.reduce((sum, r) => sum + parseFloat(r.actualFreq), 0);
        console.log(`\n概率总和验证: ${totalActualFreq.toFixed(2)}% (应为100%)`);
        console.log(`归一化验证: ${Math.abs(totalActualFreq - 100) < 0.1 ? '✓ 通过' : '✗ 失败'}`);
    }
    
    console.log('\n=== 测试完成 ===');
}

// 执行测试（可在控制台调用）
// testReverseProbabilityDistribution();

/**
 * 测试钟形曲线分布算法
 */
function testBellCurveDistribution() {
    console.log('\n=== 钟形曲线分布算法测试 ===');
    
    const testStudents = [];
    for (let i = 1; i <= 41; i++) {
        testStudents.push({
            id: i,
            name: `学生${i}`,
            rank: i
        });
    }
    
    const system = new FairWeightedRollCall(testStudents, { silent: true });
    const weights = system._computeBellCurveWeights(testStudents);
    
    console.log('\n钟形曲线权重分布：');
    console.log('排名 | 权重 | 概率');
    console.log('-----|------|------');
    
    const sortedByRank = [...testStudents].sort((a, b) => a.rank - b.rank);
    let totalWeight = 0;
    sortedByRank.forEach(s => {
        totalWeight += weights[s.id];
    });
    
    const results = sortedByRank.map(s => ({
        rank: s.rank,
        weight: weights[s.id],
        probability: (weights[s.id] / totalWeight * 100)
    }));
    
    results.forEach(r => {
        console.log(`${r.rank.toString().padStart(4)} | ${r.weight.toFixed(6).padStart(6)} | ${r.probability.toFixed(4)}%`);
    });
    
    console.log('\n统计分析：');
    const maxProb = Math.max(...results.map(r => r.probability));
    const minProb = Math.min(...results.map(r => r.probability));
    const maxRank = results.find(r => r.probability === maxProb)?.rank;
    const meanRank = results.reduce((sum, r) => sum + r.rank * r.probability, 0) / 100;
    
    console.log(`最高概率: ${maxProb.toFixed(4)}% (排名${maxRank})`);
    console.log(`最低概率: ${minProb.toFixed(4)}%`);
    console.log(`概率比例(最高/最低): ${(maxProb / minProb).toFixed(2)}:1`);
    console.log(`期望排名: ${meanRank.toFixed(2)}`);
    
    console.log('\n验证对称性：');
    let symmetricDiff = 0;
    const N = results.length;
    for (let i = 0; i < Math.floor(N / 2); i++) {
        const diff = Math.abs(results[i].probability - results[N - 1 - i].probability);
        symmetricDiff += diff;
    }
    console.log(`对称偏差总和: ${symmetricDiff.toFixed(6)}`);
    console.log(`对称性验证: ${symmetricDiff < 0.001 ? '✓ 通过' : '✗ 失败'}`);
    
    console.log('\n=== 测试完成 ===');
}

// 执行测试（可在控制台调用）
// testBellCurveDistribution();