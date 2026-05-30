// Vue应用主文件
(function() {
    // 确保Vue已加载
    if (typeof Vue === 'undefined') {
        console.error('Vue.js library is not loaded!');
        return;
    }

    /**
     * 公平加权随机点名系统 v2.0
     * 算法说明：
     * 1. 基础权重：rank^(-1/4) - 名次越靠后权重越高，差距控制在3倍左右
     * 2. 保底权重：占总权重25%，确保每个人都有最低抽取概率
     * 3. 衰减机制：每次抽中后权重×0.9，防止重复抽取同一人
     * 4. 轮盘赌算法：基于最终权重进行加权随机选择
     */
    class FairWeightedRollCall {
        constructor(students, options = {}) {
            this.students = students;
            this.guaranteeRatio = options.guaranteeRatio ?? 0.25;  // 保底权重比例 25%
            this.decayFactor = options.decayFactor ?? 0.9;          // 衰减系数
            this.resetPeriod = options.resetPeriod ?? 'per_class';
            
            // 初始化抽中次数记录
            this.pickCounts = {};
            this.history = [];
            students.forEach(s => {
                this.pickCounts[s.id] = 0;
            });
            
            // 预计算所有权重
            this._precompute();
        }
        
        /**
     * 预计算基础权重
     * 公式：baseWeight = rank^(-1/4)
     * 第1名：1.0
     * 第41名：0.358
     * 差距：约2.8倍（通过四次方根降低差距）
     */
    _precompute() {
        this.baseWeights = {};
        let totalBase = 0;
        
        for (const s of this.students) {
            const w = Math.pow(s.rank, -0.25);
            this.baseWeights[s.id] = w;
            totalBase += w;
        }
            
            // 计算平均基础权重（用于保底权重计算）
            this.avgBaseWeight = totalBase / this.students.length;
            
            // 找到排名最前和最后的学生
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
        
        /**
         * 计算最终权重
         * 最终权重 = 混合权重 × 衰减系数^(抽中次数)
         * 混合权重 = 保底权重 + 基础权重
         * 保底权重 = 平均基础权重 × 保底比例
         * 基础权重 = 1/sqrt(rank) × (1-保底比例)
         */
        _computeFinalWeight(student) {
            const baseWeight = this.baseWeights[student.id];
            const pickCount = this.pickCounts[student.id];
            
            // 保底权重（所有人相同）
            const guaranteeWeight = this.avgBaseWeight * this.guaranteeRatio;
            
            // 基础权重（按名次分配）
            const rankWeight = baseWeight * (1 - this.guaranteeRatio);
            
            // 混合权重
            const mixedWeight = guaranteeWeight + rankWeight;
            
            // 衰减后的最终权重
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
        
        /**
         * 获取所有学生的权重信息
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
         */
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
        
        /**
         * 轮盘赌选择单个学生
         */
        pickOne() {
            const { weights, totalWeight } = this.getWeights();
            
            // 生成随机数
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
            
            // 兜底：返回最后一个
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
        
        /**
         * 选择多个学生（不重复）
         */
        pickN(n, availableStudents = null) {
            const studentPool = availableStudents || this.students;
            
            if (n > studentPool.length) {
                throw new Error(`班级只有 ${studentPool.length} 人，不能抽 ${n} 个`);
            }
            
            const picked = [];
            const tempPickCounts = { ...this.pickCounts };
            
            for (let i = 0; i < n; i++) {
                // 重新计算权重（考虑已抽中的学生）
                const { weights, totalWeight } = this.getWeights();
                
                // 过滤可用学生（未被抽中且在候选池中）
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
        
        /**
         * 获取统计信息
         */
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
        
        /**
         * 重置抽中次数记录
         */
        reset() {
            this.students.forEach(s => {
                this.pickCounts[s.id] = 0;
            });
            this.history = [];
        }
    }

    // 创建Vue应用实例
    const app = Vue.createApp({
        setup() {
            // 学生数据 - 最新排名列表
            const studentNames = [
                '李志敏', '茹柯臻', '胡逸柯', '邢任静', '原鑫椿', '王铖浩', '白淼鑫', '原梓杰', 
                '崔恒语', '蒋鹕涛', '张浩楠', '冯炜杰', '李梦雨', '史梓瑜', '李怡萱', '刘艺博', 
                '李帅辉', '原章恬', '王彦景', '张艺瀚', '张祺曼', '元静怡', '王鹤凝', '成浩宇', 
                '晋奥钊', '杜桓荣', '李湣帅', '焦雅琦', '马梓宁', '马欣怡', '王云鹏', '段晶晶', 
                '段培清', '白阳兰', '赵渊博', '贾烨标', '赵晨旭', '赵育敏', '延泽玉', '李昀宵', '樊师彤'
            ];

            // 初始化学生数据
            const students = Vue.ref(
                studentNames.map((name, index) => ({
                    id: index + 1,
                    name: name,
                    rank: index + 1,
                    probability: 0,
                    isSpecial: name === '贾烨标',
                    isWebDeveloper: name === '李梦雨',
                    isCloudShaped: name === '原鑫椿',
                    isWangHenning: name === '王鹤凝'
                }))
            );

            // 初始化加权点名系统
            const rollCallSystem = new FairWeightedRollCall(students.value);
            
            // 记录每个学生的抽中次数
            const studentPickCounts = Vue.ref({});
            students.value.forEach(s => {
                studentPickCounts.value[s.id] = 0;
            });

            // 状态管理
            const selectedStudents = Vue.ref([]);
            const history = Vue.ref([]);
            const totalDraws = Vue.ref(0);
            const drawCount = Vue.ref(1);
            const isRolling = Vue.ref(false);
            const currentResult = Vue.ref([]);
            const showModal = Vue.ref(false);
            const toast = Vue.ref({ show: false, title: '', message: '' });
            const isMusicPlaying = Vue.ref(false);
            const onlyTop11 = Vue.ref(false);
            const quote = Vue.ref({ content: '', author: '' });
            const isFetchingQuote = Vue.ref(false);

            // 计算属性
            const participationPercentage = Vue.computed(() => {
                return students.value.length > 0 ? (selectedStudents.value.length / students.value.length) * 100 : 0;
            });

            // 获取概率分布信息
            const getProbabilityInfo = () => {
                const probs = rollCallSystem.getProbabilities();
                const sortedStudents = [...students.value].sort((a, b) => a.rank - b.rank);
                const firstStudent = sortedStudents[0];
                const lastStudent = sortedStudents[sortedStudents.length - 1];
                const first = probs.find(p => p.id === firstStudent?.id);
                const last = probs.find(p => p.id === lastStudent?.id);
                return {
                    first: first ? first.probabilityText : '0%',
                    last: last ? last.probabilityText : '0%',
                    ratio: first && last && last.probability > 0 ? (first.probability / last.probability).toFixed(2) + ':1' : '0:1'
                };
            };

            // 切换学生选择状态
            const toggleStudentSelection = (student) => {
                const index = selectedStudents.value.findIndex(s => s.id === student.id);
                if (index > -1) {
                    selectedStudents.value.splice(index, 1);
                } else {
                    selectedStudents.value.push(student);
                }
            };

            // 检查学生是否已选择
            const isSelected = (student) => {
                return selectedStudents.value.some(s => s.id === student.id);
            };

            // 选择所有学生
            const selectAllStudents = () => {
                selectedStudents.value = [...students.value];
            };

            // 取消选择所有学生
            const deselectAllStudents = () => {
                selectedStudents.value = [];
            };

            // 确认学生选择
            const confirmSelection = () => {
                if (selectedStudents.value.length === 0) {
                    showToast('提示', '请至少选择一名学生');
                    return;
                }
                showModal.value = false;
                showToast('成功', `已选择 ${selectedStudents.value.length} 名学生参与抽取`);
            };

            // 固定种子的随机数生成器
            const seededRandom = (seed) => {
                let x = Math.sin(seed++) * 10000;
                return x - Math.floor(x);
            };
            
            // 随机种子，随机生成以确保每次运行结果不同
            let randomSeed = Vue.ref(Math.floor(Math.random() * 1000000000));
            
            // 使用新的加权系统进行选择
            const weightedRandomSelection = (items, count, seed = null) => {
                // 创建临时系统
                const tempSystem = new FairWeightedRollCall(items, {
                    guaranteeRatio: 0.25,
                    decayFactor: 0.9
                });
                
                // 复制抽中次数
                items.forEach(item => {
                    if (studentPickCounts.value[item.id] !== undefined) {
                        tempSystem.pickCounts[item.id] = studentPickCounts.value[item.id];
                    }
                });
                
                // 选择
                const result = tempSystem.pickN(count);
                
                // 更新抽中次数
                result.forEach(student => {
                    studentPickCounts.value[student.id]++;
                });
                
                return result;
            };
            
            // 最近抽取的学生历史记录
            const recentHistory = Vue.ref([]);

            // 开始抽取
            const startDrawing = () => {
                if (selectedStudents.value.length === 0) {
                    showToast('提示', '请先选择参与抽取的学生');
                    return;
                }

                if (isRolling.value) return;

                // 根据onlyTop11过滤学生
                let eligibleStudents = [...selectedStudents.value];
                if (onlyTop11.value) {
                    eligibleStudents = eligibleStudents.filter(s => s.rank <= 11);
                    if (eligibleStudents.length === 0) {
                        showToast('提示', '当前选择的学生中没有前11名学生');
                        return;
                    }
                }

                // 检查抽取人数是否合理
                const count = Math.min(Math.max(1, drawCount.value), eligibleStudents.length);
                drawCount.value = count;

                isRolling.value = true;
                currentResult.value = [];

                // 计算不重复抽取的最大历史记录长度
                const maxHistoryLength = Math.floor(eligibleStudents.length * 0.8);

                // 虚晃一枪动画配置参数 - 性能优化版
                const animationConfig = {
                    totalDuration: 900,
                    initialAccelerationDuration: 150,
                    misleadDecelerationDuration: 350,
                    fakeoutDuration: 200,
                    finalDecelerationDuration: 200,
                    fakeoutIntensity: 0.5,
                    frameDuration: 10
                };

                // 计算各阶段的帧数
                const initialAccelFrames = Math.round(animationConfig.initialAccelerationDuration / animationConfig.frameDuration);
                const misleadDecelFrames = Math.round(animationConfig.misleadDecelerationDuration / animationConfig.frameDuration);
                const fakeoutFrames = Math.round(animationConfig.fakeoutDuration / animationConfig.frameDuration);
                const finalDecelFrames = Math.round(animationConfig.finalDecelerationDuration / animationConfig.frameDuration);
                const totalFrames = initialAccelFrames + misleadDecelFrames + fakeoutFrames + finalDecelFrames;

                let currentFrame = 0;
                let currentIndex = 0;
                
                // 随机选择一个误导性目标位置
                const misleadTargetIndex = Math.floor(seededRandom(randomSeed.value) * eligibleStudents.length);
                randomSeed.value++;
                
                // 计算最终结果（只计算一次，避免在每一帧重复计算）
                const calculateFinalResult = () => {
                    // 过滤出最近没有被抽取的学生
                    const recentStudentIds = new Set(recentHistory.value.map(s => s.id));
                    let availableStudents = eligibleStudents.filter(s => !recentStudentIds.has(s.id));
                    
                    // 如果没有可用学生（理论上不应该发生），则重置历史记录
                    if (availableStudents.length === 0) {
                        recentHistory.value = [];
                        availableStudents = eligibleStudents;
                    }
                    
                    // 如果可用学生数量不足，则补充最近抽取的学生
                    while (availableStudents.length < count) {
                        const earliestStudent = recentHistory.value.shift();
                        if (earliestStudent) {
                            availableStudents.push(earliestStudent);
                        }
                    }
                    
                    // 使用新的加权随机选择算法
                    return weightedRandomSelection(availableStudents, count);
                };
                
                // 预计算最终结果信息，避免在动画过程中重复计算
                const finalResult = calculateFinalResult();
                const finalStudent = finalResult[0];
                const finalIndex = eligibleStudents.findIndex(s => s.id === finalStudent.id);
                const fakeoutEndIndex = Math.floor((misleadTargetIndex + eligibleStudents.length * animationConfig.fakeoutIntensity) % eligibleStudents.length);
                
                // 缓动函数库
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

                // 计算当前帧应该显示的学生索引
                const calculateCurrentIndex = (frame) => {
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
                        const fakeoutDirection = seededRandom(randomSeed.value++) > 0.5 ? 1 : -1;
                        return Math.floor((misleadTargetIndex + fakeoutDirection * fakeoutRange * easedProgress) % eligibleStudents.length);
                    } else {
                        progress = (frame - initialAccelFrames - misleadDecelFrames - fakeoutFrames) / finalDecelFrames;
                        easedProgress = easeFunctions.easeOutBounce(progress);
                        const diff = finalIndex - fakeoutEndIndex;
                        return Math.floor((fakeoutEndIndex + diff * easedProgress) % eligibleStudents.length);
                    }
                };

                // 添加超时处理，确保isRolling状态能被正确重置
                const timeoutId = setTimeout(() => {
                    if (isRolling.value) {
                        console.error('抽取动画超时，强制重置状态');
                        isRolling.value = false;
                        showToast('提示', '抽取过程超时，请重试');
                    }
                }, animationConfig.totalDuration + 200);
                
                const animateRolling = () => {
                    try {
                        if (currentFrame < totalFrames) {
                            currentIndex = calculateCurrentIndex(currentFrame);
                            currentIndex = (currentIndex + eligibleStudents.length) % eligibleStudents.length;
                            currentResult.value = [eligibleStudents[currentIndex]];
                            currentFrame++;
                            setTimeout(animateRolling, animationConfig.frameDuration);
                        } else {
                            currentResult.value = finalResult;
                            recentHistory.value.push(...currentResult.value);
                            if (recentHistory.value.length > maxHistoryLength) {
                                recentHistory.value = recentHistory.value.slice(recentHistory.value.length - maxHistoryLength);
                            }
                            totalDraws.value++;
                            const now = new Date();
                            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                            history.value.unshift({
                                time: timeString,
                                count: count,
                                people: currentResult.value
                            });
                            if (history.value.length > 10) {
                                history.value.pop();
                            }
                            isRolling.value = false;
                            clearTimeout(timeoutId);
                            showToast('成功', `已抽取${count}名学生`);
                        }
                    } catch (error) {
                        console.error('抽取动画发生错误:', error);
                        isRolling.value = false;
                        clearTimeout(timeoutId);
                        showToast('错误', '抽取过程发生错误，请重试');
                    }
                };

                animateRolling();
            };

            // 显示提示信息
            const showToast = (title, message) => {
                toast.value = { show: true, title, message };
                setTimeout(() => {
                    toast.value.show = false;
                }, 3000);
            };

            // 音乐播放器加载状态
            const isMusicLoading = Vue.ref(false);
            const isMusicLoaded = Vue.ref(false);
            const musicPlayerElement = Vue.ref(null);
            let audioElement = null;
            
            // 检查音乐播放器是否已存在
            const checkMusicPlayerExists = () => {
                return document.getElementById('xplayer') !== null || 
                       document.querySelector('.aplayer') !== null ||
                       audioElement !== null;
            };
            
            // 创建一个简单的内置音频播放器作为备选方案
            const createSimpleAudioPlayer = () => {
                if (!audioElement) {
                    audioElement = new Audio();
                    audioElement.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
                    audioElement.loop = true;
                    audioElement.volume = 0.7;
                }
                return audioElement;
            };
            
            // 按需加载音乐播放器脚本
            const loadMusicPlayerAsync = async () => {
                return new Promise((resolve, reject) => {
                    // 检查是否已加载
                    if (isMusicLoaded.value) {
                        resolve();
                        return;
                    }
                    
                    // 检查是否正在加载
                    if (isMusicLoading.value) {
                        const checkLoaded = setInterval(() => {
                            if (isMusicLoaded.value) {
                                clearInterval(checkLoaded);
                                resolve();
                            }
                        }, 100);
                        return;
                    }
                    
                    // 检查是否已存在播放器元素
                    if (checkMusicPlayerExists()) {
                        isMusicLoaded.value = true;
                        resolve();
                        return;
                    }
                    
                    isMusicLoading.value = true;
                    
                    // 首先尝试使用简单的音频播放器
                    try {
                        createSimpleAudioPlayer();
                        isMusicLoading.value = false;
                        isMusicLoaded.value = true;
                        resolve();
                        return;
                    } catch (e) {
                        console.log('简单音频播放器创建失败，尝试外部播放器...');
                    }
                    
                    // 创建音乐播放器容器
                    const playerContainer = document.createElement('div');
                    playerContainer.id = 'xplayer-container';
                    playerContainer.style.position = 'fixed';
                    playerContainer.style.bottom = '80px';
                    playerContainer.style.left = '20px';
                    playerContainer.style.zIndex = '100';
                    document.body.appendChild(playerContainer);
                    
                    // 创建脚本元素
                    const script = document.createElement('script');
                    script.id = 'xplayer';
                    script.src = 'https://y.cenguigui.cn/Static/player12/js/player.js';
                    script.setAttribute('key', '68397e7621e83');
                    script.setAttribute('api', 'https://y.cenguigui.cn/');
                    script.setAttribute('m', '1');
                    
                    // 设置超时
                    const timeout = setTimeout(() => {
                        script.onerror?.(new Error('加载超时'));
                    }, 10000);
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        isMusicLoading.value = false;
                        isMusicLoaded.value = true;
                        setTimeout(() => {
                            musicPlayerElement.value = document.querySelector('.aplayer');
                            if (musicPlayerElement.value) {
                                musicPlayerElement.value.style.width = '300px';
                            }
                        }, 500);
                        resolve();
                    };
                    
                    script.onerror = (error) => {
                        clearTimeout(timeout);
                        isMusicLoading.value = false;
                        // 清理容器
                        if (playerContainer.parentNode) {
                            playerContainer.parentNode.removeChild(playerContainer);
                        }
                        // 如果外部播放器加载失败，使用简单音频播放器
                        try {
                            createSimpleAudioPlayer();
                            isMusicLoaded.value = true;
                            resolve();
                        } catch (e) {
                            reject(error || new Error('音乐播放器加载失败'));
                        }
                    };
                    
                    document.body.appendChild(script);
                });
            };
            
            // 动态加载jQuery
            const loadJQuery = () => {
                return new Promise((resolve, reject) => {
                    if (window.jQuery) {
                        resolve(window.jQuery);
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.src = 'https://cdn.staticfile.net/jquery/3.5.1/jquery.min.js';
                    script.onload = () => resolve(window.jQuery);
                    script.onerror = () => reject(new Error('jQuery加载失败'));
                    document.head.appendChild(script);
                });
            };
            
            // 动态加载Font-Awesome CSS
            const loadFontAwesome = () => {
                return new Promise((resolve, reject) => {
                    const existingLink = document.getElementById('font-awesome-css');
                    if (existingLink) {
                        resolve();
                        return;
                    }
                    
                    const link = document.createElement('link');
                    link.id = 'font-awesome-css';
                    link.rel = 'stylesheet';
                    link.type = 'text/css';
                    link.href = 'https://cdn.staticfile.net/font-awesome/4.7.0/css/font-awesome.min.css';
                    link.onload = () => resolve();
                    link.onerror = () => reject(new Error('Font-Awesome加载失败'));
                    document.head.appendChild(link);
                });
            };
            
            // 创建音乐容器
            const createMusicContainer = () => {
                let container = document.getElementById('music');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'music';
                    container.setAttribute('key', '68397e7621e83');
                    container.setAttribute('api', 'https://y.cenguigui.cn/');
                    document.body.appendChild(container);
                }
                return container;
            };
            
            // 动态加载音乐播放器脚本
            const loadMusicPlayer = () => {
                return new Promise((resolve, reject) => {
                    const existingScript = document.getElementById('xplayer');
                    if (existingScript) {
                        resolve();
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.id = 'xplayer';
                    script.src = 'https://y.cenguigui.cn/Static/player15/js/player.js';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('音乐播放器加载失败'));
                    document.body.appendChild(script);
                });
            };
            
            // 切换音乐播放状态
            const toggleMusic = async () => {
                if (isRolling.value) return;
                
                try {
                    isMusicPlaying.value = !isMusicPlaying.value;
                    
                    // 如果是开启播放，则加载音乐播放器
                    if (isMusicPlaying.value) {
                        showToast('加载中', '正在加载音乐播放器...');
                        
                        // 按顺序加载所需资源
                        await loadJQuery();
                        await loadFontAwesome();
                        createMusicContainer();
                        await loadMusicPlayer();
                        
                        // 等待播放器初始化
                        setTimeout(() => {
                            isMusicLoaded.value = true;
                            showToast('成功', '音乐播放器加载完成');
                        }, 1000);
                    } else {
                        // 暂停时不需要卸载播放器
                        showToast('提示', '音乐已暂停');
                    }
                    
                } catch (error) {
                    console.error('音乐播放器操作失败:', error);
                    isMusicPlaying.value = false;
                    showToast('错误', '音乐播放器加载失败，请检查网络或稍后重试');
                }
            };

            // 获取原神一言
            const fetchGenshinQuote = async () => {
                isFetchingQuote.value = true;
                try {
                    const response = await fetch('https://gd.moyanjdc.top/api/yiyan');
                    if (!response.ok) throw new Error('网络请求失败');
                    const data = await response.json();
                    quote.value = {
                        content: data.content || '人生如逆旅，我亦是行人',
                        author: data.author || '原神'
                    };
                    localStorage.setItem('genshinQuote', JSON.stringify(quote.value));
                } catch (error) {
                    console.error('获取原神一言失败:', error);
                    const savedQuote = localStorage.getItem('genshinQuote');
                    if (savedQuote) {
                        try {
                            quote.value = JSON.parse(savedQuote);
                        } catch (e) {
                            quote.value = {
                                content: '人生如逆旅，我亦是行人',
                                author: '原神'
                            };
                        }
                    } else {
                        quote.value = {
                            content: '人生如逆旅，我亦是行人',
                            author: '原神'
                        };
                    }
                } finally {
                    isFetchingQuote.value = false;
                }
            };

            // 生命周期钩子
            Vue.onMounted(() => {
                selectedStudents.value = [...students.value];
                fetchGenshinQuote();
                setInterval(fetchGenshinQuote, 30000);
                
                // 输出初始概率分布到控制台
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
            });

            // 重置系统
            const resetSystem = () => {
                rollCallSystem.reset();
                students.value.forEach(s => {
                    studentPickCounts.value[s.id] = 0;
                });
                recentHistory.value = [];
                history.value = [];
                totalDraws.value = 0;
                showToast('提示', '系统已重置，权重已恢复初始状态');
            };
            
            // 获取统计信息
            const getSystemStats = () => {
                return rollCallSystem.getStatistics();
            };

            // 暴露给模板使用的变量和方法
            return {
                students,
                selectedStudents,
                studentPickCounts,
                history,
                totalDraws,
                drawCount,
                isRolling,
                currentResult,
                showModal,
                toast,
                isMusicPlaying,
                isMusicLoading,
                isMusicLoaded,
                onlyTop11,
                participationPercentage,
                randomSeed,
                recentHistory,
                toggleStudentSelection,
                isSelected,
                selectAllStudents,
                deselectAllStudents,
                confirmSelection,
                startDrawing,
                showToast,
                toggleMusic,
                quote,
                isFetchingQuote,
                fetchGenshinQuote,
                resetSystem,
                getProbabilityInfo,
                getSystemStats,
                rollCallSystem
            };
        }
    });

    // 挂载Vue应用 - DOM已准备好
    function initVueApp() {
        if (document.getElementById('app')) {
            app.mount('#app');
            console.log('Vue app mounted successfully');
        } else {
            console.error('App element not found, retrying...');
            setTimeout(initVueApp, 100);
        }
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVueApp);
    } else {
        initVueApp();
    }
})();
