/**
 * 公平加权随机点名系统 v2.1
 * 算法说明：
 * 1. 基础权重：rank^(-1/6.67) - 名次越靠后权重越高，差距控制在1.5倍左右
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
            const w = Math.pow(s.rank, -0.15);
            this.baseWeights[s.id] = w;
            totalBase += w;
        }
            
        this.avgBaseWeight = totalBase / this.students.length;
        
        const sortedStudents = [...this.students].sort((a, b) => a.rank - b.rank);
        const firstStudent = sortedStudents[0];
        const lastStudent = sortedStudents[sortedStudents.length - 1];
        const firstWeight = firstStudent ? this.baseWeights[firstStudent.id] : 0;
        const lastWeight = lastStudent ? this.baseWeights[lastStudent.id] : 0;
        
        console.log('=== 基础权重预计算结果 ===');
        console.log(`总权重: ${totalBase.toFixed(4)}`);
        console.log(`平均权重: ${this.avgBaseWeight.toFixed(4)}`);
        if (firstStudent) console.log(`第${firstStudent.rank}名(${firstStudent.name})基础权重: ${firstWeight.toFixed(4)}`);
        if (lastStudent) console.log(`第${lastStudent.rank}名(${lastStudent.name})基础权重: ${lastWeight.toFixed(4)}`);
        if (firstWeight && lastWeight) console.log(`权重比例: ${(firstWeight / lastWeight).toFixed(2)}:1`);
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
    
    pickN(n, availableStudents = null) {
        const studentPool = availableStudents || this.students;
        
        if (n > studentPool.length) {
            throw new Error(`班级只有 ${studentPool.length} 人，不能抽 ${n} 个`);
        }
        
        const picked = [];
        const tempPickCounts = { ...this.pickCounts };
        
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
        
        return picked;
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
        isColorfulWhite: name === '李湣帅'
    }));

    const rollCallSystem = new FairWeightedRollCall(students);
    
    const studentPickCounts = {};
    students.forEach(s => {
        studentPickCounts[s.id] = 0;
    });

    let selectedStudents = [...students];
    let history = [];
    let totalDraws = 0;
    let currentResult = [];
    let isRolling = false;
    let isMusicPlaying = false;
    let isMusicLoading = false;
    let isMusicLoaded = false;
    let onlyTop11 = false;
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
        onlyTop11: document.getElementById('only-top-11'),
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
        musicBtn: document.getElementById('music-btn')
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
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();
    }

    function selectAllStudents() {
        selectedStudents = [...students];
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();
    }

    function deselectAllStudents() {
        selectedStudents = [];
        renderStudentCards();
        updateSelectedCount();
        updateStatistics();
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
            const webDevClass = student.isWebDeveloper ? ' web-developer' : '';
            const selectedClass = selected ? ' selected' : '';
            
            html += `
                <div class="student-card${selectedClass}${webDevClass}" 
                     data-student-id="${student.id}" 
                     tabindex="0"
                     aria-selected="${selected}"
                     role="option">
                    <div class="student-avatar ${student.rank <= 11 ? 'top-student' : ''}">
                        ${student.name.charAt(0)}
                    </div>
                    <div class="student-info">
                        <div class="student-name">
                            ${student.name}
                            ${student.isWebDeveloper ? '<span class="web-dev-badge"><i class="fas fa-code"></i> Web Developer</span>' : ''}
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
                innerHtml += '<img src="dog.svg" class="result-icon result-icon-left" alt="dog">';
            }
            
            innerHtml += `<span class="badge-name">${student.name}`;
            if (student.hasFnIcon) {
                innerHtml += '<img src="fn.webp" class="fn-icon" alt="fn" width="42" height="42">';
            }
            innerHtml += '</span>';
            
            if (student.isWangHenning) {
                innerHtml += '<img src="cat.svg" class="result-icon result-icon-right" alt="cat">';
            }
            
            if (student.isWebDeveloper) {
                innerHtml += '<span class="web-dev-mini-badge"><i class="fas fa-code"></i></span>';
            }
            
            innerHtml += `<span class="badge-rank">#${student.rank}</span>`;
            
            html += `<span class="${classes.join(' ')}">${innerHtml}</span>`;
        });
        
        html += '</div></div>';
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
            const names = record.people.map(p => p.name).join(', ');
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <div class="history-time"><i class="fas fa-clock"></i>${record.time}</div>
                        <span class="history-count">${record.count}人</span>
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
        if (selectedStudents.length === 0) {
            showToast('提示', '请先选择参与抽取的学生');
            return;
        }

        if (isRolling) return;

        let eligibleStudents = [...selectedStudents];
        if (onlyTop11) {
            eligibleStudents = eligibleStudents.filter(s => s.rank <= 11);
            if (eligibleStudents.length === 0) {
                showToast('提示', '当前选择的学生中没有前11名学生');
                return;
            }
        }

        const count = Math.min(Math.max(1, parseInt(DOM.drawCountInput.value) || 1), eligibleStudents.length);
        DOM.drawCountInput.value = count;

        isRolling = true;
        currentResult = [];
        DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>抽取中...';
        DOM.startDrawingBtn.disabled = true;

        const maxHistoryLength = Math.floor(eligibleStudents.length * 0.8);

        const animationConfig = {
            totalDuration: 900,
            initialAccelerationDuration: 150,
            misleadDecelerationDuration: 350,
            fakeoutDuration: 200,
            finalDecelerationDuration: 200,
            fakeoutIntensity: 0.5,
            frameDuration: 10
        };

        const initialAccelFrames = Math.round(animationConfig.initialAccelerationDuration / animationConfig.frameDuration);
        const misleadDecelFrames = Math.round(animationConfig.misleadDecelerationDuration / animationConfig.frameDuration);
        const fakeoutFrames = Math.round(animationConfig.fakeoutDuration / animationConfig.frameDuration);
        const finalDecelFrames = Math.round(animationConfig.finalDecelerationDuration / animationConfig.frameDuration);
        const totalFrames = initialAccelFrames + misleadDecelFrames + fakeoutFrames + finalDecelFrames;

        let currentFrame = 0;
        let currentIndex = 0;
        
        const misleadTargetIndex = Math.floor(seededRandom(randomSeed) * eligibleStudents.length);
        randomSeed++;

        function calculateFinalResult() {
            const recentStudentIds = new Set(recentHistory.map(s => s.id));
            let availableStudents = eligibleStudents.filter(s => !recentStudentIds.has(s.id));
            
            if (availableStudents.length === 0) {
                recentHistory = [];
                availableStudents = eligibleStudents;
            }
            
            while (availableStudents.length < count) {
                const earliestStudent = recentHistory.shift();
                if (earliestStudent) {
                    availableStudents.push(earliestStudent);
                }
            }
            
            return weightedRandomSelection(availableStudents, count);
        }

        const finalResult = calculateFinalResult();
        const finalStudent = finalResult[0];
        const finalIndex = eligibleStudents.findIndex(s => s.id === finalStudent.id);
        const fakeoutEndIndex = Math.floor((misleadTargetIndex + eligibleStudents.length * animationConfig.fakeoutIntensity) % eligibleStudents.length);

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
                return Math.floor(easedProgress * eligibleStudents.length * 3) % eligibleStudents.length;
            } else if (frame <= initialAccelFrames + misleadDecelFrames) {
                progress = (frame - initialAccelFrames) / misleadDecelFrames;
                easedProgress = easeFunctions.easeOutQuad(progress);
                const startIndex = Math.floor(eligibleStudents.length * 3) % eligibleStudents.length;
                const diff = misleadTargetIndex - startIndex;
                return Math.floor((startIndex + diff * easedProgress) % eligibleStudents.length);
            } else if (frame <= initialAccelFrames + misleadDecelFrames + fakeoutFrames) {
                progress = (frame - initialAccelFrames - misleadDecelFrames) / fakeoutFrames;
                easedProgress = easeFunctions.easeInOutQuad(progress);
                const fakeoutRange = Math.floor(eligibleStudents.length * animationConfig.fakeoutIntensity);
                const fakeoutDirection = seededRandom(randomSeed++) > 0.5 ? 1 : -1;
                return Math.floor((misleadTargetIndex + fakeoutDirection * fakeoutRange * easedProgress) % eligibleStudents.length);
            } else {
                progress = (frame - initialAccelFrames - misleadDecelFrames - fakeoutFrames) / finalDecelFrames;
                easedProgress = easeFunctions.easeOutBounce(progress);
                const diff = finalIndex - fakeoutEndIndex;
                return Math.floor((fakeoutEndIndex + diff * easedProgress) % eligibleStudents.length);
            }
        }

        const timeoutId = setTimeout(() => {
            if (isRolling) {
                console.error('抽取动画超时，强制重置状态');
                isRolling = false;
                DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>开始抽取';
                DOM.startDrawingBtn.disabled = false;
                showToast('提示', '抽取过程超时，请重试');
            }
        }, animationConfig.totalDuration + 200);

        function animateRolling() {
            try {
                if (currentFrame < totalFrames) {
                    currentIndex = calculateCurrentIndex(currentFrame);
                    currentIndex = (currentIndex + eligibleStudents.length) % eligibleStudents.length;
                    currentResult = [eligibleStudents[currentIndex]];
                    renderResult(currentResult);
                    currentFrame++;
                    setTimeout(animateRolling, animationConfig.frameDuration);
                } else {
                    currentResult = finalResult;
                    renderResult(currentResult);
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
                        people: currentResult
                    });
                    if (history.length > 10) {
                        history.pop();
                    }
                    isRolling = false;
                    DOM.startDrawingBtn.innerHTML = '<i class="fas fa-play"></i>开始抽取';
                    DOM.startDrawingBtn.disabled = false;
                    clearTimeout(timeoutId);
                    renderHistory();
                    updateStatistics();
                    showToast('成功', `已抽取${count}名学生`);
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
        DOM.onlyTop11.addEventListener('change', (e) => {
            onlyTop11 = e.target.checked;
        });
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
});