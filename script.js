// Vue应用主文件

// 可复现的伪随机数生成器 (使用种子)
class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    // 生成0-1之间的随机数
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    // 生成min到max之间的整数
    nextInt(min, max) {
        return Math.floor(min + this.next() * (max - min + 1));
    }

    // 生成min到max之间的浮点数
    nextFloat(min, max) {
        return min + this.next() * (max - min);
    }
}

// 创建Vue应用实例
const app = Vue.createApp({
    setup() {
        // 学生数据
        const students = Vue.ref([
            { id: 1, name: '王铖浩', rank: 1, probability: 1 },
            { id: 2, name: '原梓杰', rank: 2, probability: 1 },
            { id: 3, name: '茹柯臻', rank: 3, probability: 1 },
            { id: 4, name: '胡逸柯', rank: 4, probability: 0.9 },
            { id: 5, name: '刘艺博', rank: 5, probability: 1 },
            { id: 6, name: '冯炜杰', rank: 6, probability: 1 },
            { id: 7, name: '李梦雨', rank: 7, probability: 1 },
            { id: 8, name: '王彦景', rank: 8, probability: 1 },
            { id: 9, name: '李帅辉', rank: 9, probability: 1 },
            { id: 10, name: '邢任静', rank: 10, probability: 1 },
            { id: 11, name: '杜桓荣', rank: 11, probability: 1 },
            { id: 12, name: '晋奥钊', rank: 12, probability: 1 },
            { id: 13, name: '元静怡', rank: 13, probability: 1 },
            { id: 14, name: '成浩宇', rank: 14, probability: 1 },
            { id: 15, name: '常煜弦', rank: 15, probability: 1 },
            { id: 16, name: '王鹤凝', rank: 16, probability: 1 },
            { id: 17, name: '段晶晶', rank: 17, probability: 1 },
            { id: 18, name: '陕禹帆', rank: 18, probability: 1 },
            { id: 19, name: '李湣帅', rank: 19, probability: 1 },
            { id: 20, name: '李怡萱', rank: 20, probability: 1 },
            { id: 21, name: '李佳遥', rank: 21, probability: 1 },
            { id: 22, name: '王云鹏', rank: 22, probability: 1 },
            { id: 23, name: '马欣怡', rank: 23, probability: 1 },
            { id: 24, name: '高璐鑫', rank: 24, probability: 1 },
            { id: 25, name: '郝鑫悦', rank: 25, probability: 1 },
            { id: 26, name: '张严支', rank: 26, probability: 1 },
            { id: 27, name: '李向菲', rank: 27, probability: 1 },
            { id: 28, name: '延泽玉', rank: 28, probability: 1 },
            { id: 29, name: '朱奕瑶', rank: 29, probability: 1 },
            { id: 30, name: '樊师彤', rank: 30, probability: 1 },
            { id: 32, name: '贾烨标', rank: 32, probability: 1 },
            { id: 33, name: '赵一然', rank: 33, probability: 1 },
            { id: 34, name: '段培清', rank: 34, probability: 1 },
            { id: 35, name: '牛一燃', rank: 35, probability: 1 },
            { id: 36, name: '杨子怡', rank: 36, probability: 1 },
            { id: 37, name: '王博宇', rank: 37, probability: 1 },
            { id: 38, name: '赵艺泽', rank: 38, probability: 1 },
            { id: 39, name: '赵晨旭', rank: 39, probability: 1 },
            { id: 40, name: '崔刘杰', rank: 40, probability: 1 },
            { id: 41, name: '曹凯乐', rank: 41, probability: 1 },
            { id: 42, name: '白义菲', rank: 42, probability: 1 },
            { id: 43, name: '赵渊博', rank: 43, probability: 1 },
            { id: 44, name: '王沐勋', rank: 44, probability: 1 }
        ]);

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
        
        // 新增：重复控制相关状态
        const repeatControlSeed = Vue.ref(Date.now()); // 随机种子（默认使用当前时间戳）
        const studentDrawCounts = Vue.ref({}); // 记录每个学生被抽中的次数
        const cycleResetCounter = Vue.ref(0); // 当前轮次抽取次数
        const maxDrawsBeforeReset = Vue.ref(0); // 重置前最大抽取次数（学生总数的0.8）

        // 计算属性
        const participationPercentage = Vue.computed(() => {
            return students.value.length > 0 ? (selectedStudents.value.length / students.value.length) * 100 : 0;
        });

        // 计算最大抽取次数（学生总数的0.8）
        const calculateMaxDraws = () => {
            const totalStudents = selectedStudents.value.length;
            maxDrawsBeforeReset.value = Math.floor(totalStudents * 0.8);
            return maxDrawsBeforeReset.value;
        };

        // 检查是否需要进行重置
        const needsReset = () => {
            return cycleResetCounter.value >= maxDrawsBeforeReset.value;
        };

        // 重置抽取记录
        const resetDrawRecords = () => {
            studentDrawCounts.value = {};
            cycleResetCounter.value = 0;
            showToast('系统', '已重置学生抽取记录，开始新一轮抽取');
        };

        // 切换学生选择状态
        const toggleStudentSelection = (student) => {
            const index = selectedStudents.value.findIndex(s => s.id === student.id);
            if (index > -1) {
                selectedStudents.value.splice(index, 1);
            } else {
                selectedStudents.value.push(student);
            }
            // 重新计算最大抽取次数
            calculateMaxDraws();
        };

        // 检查学生是否已选择
        const isSelected = (student) => {
            return selectedStudents.value.some(s => s.id === student.id);
        };

        // 选择所有学生
        const selectAllStudents = () => {
            selectedStudents.value = [...students.value];
            calculateMaxDraws();
        };

        // 取消选择所有学生
        const deselectAllStudents = () => {
            selectedStudents.value = [];
            calculateMaxDraws();
        };

        // 确认学生选择
        const confirmSelection = () => {
            if (selectedStudents.value.length === 0) {
                showToast('提示', '请至少选择一名学生');
                return;
            }
            showModal.value = false;
            calculateMaxDraws(); // 重新计算最大抽取次数
            showToast('成功', '学生选择已确认');
        };

        // 可复现的 Fisher-Yates 洗牌算法
        const seededShuffleArray = (array, seed) => {
            const random = new SeededRandom(seed);
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = random.nextInt(0, i);
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        };

        // 加权随机选择（考虑概率和学生已抽取次数）
        const weightedRandomSelection = (candidates, count, seed) => {
            const random = new SeededRandom(seed);
            const selected = [];
            const availableCandidates = [...candidates];
            
            // 计算每个候选人的权重
            const calculateWeight = (student) => {
                const baseWeight = student.probability || 1;
                const drawCount = studentDrawCounts.value[student.id] || 0;
                
                // 已被抽取次数越多，权重越低
                // 如果学生已经被抽取过，降低其权重
                const penalty = drawCount > 0 ? 0.3 : 1;
                
                return baseWeight * penalty;
            };
            
            for (let i = 0; i < count && availableCandidates.length > 0; i++) {
                // 计算总权重
                let totalWeight = 0;
                const weights = availableCandidates.map(student => {
                    const weight = calculateWeight(student);
                    totalWeight += weight;
                    return weight;
                });
                
                // 生成随机数并选择
                const randomValue = random.nextFloat(0, totalWeight);
                let cumulativeWeight = 0;
                let selectedIndex = 0;
                
                for (let j = 0; j < availableCandidates.length; j++) {
                    cumulativeWeight += weights[j];
                    if (randomValue <= cumulativeWeight) {
                        selectedIndex = j;
                        break;
                    }
                }
                
                const selectedStudent = availableCandidates[selectedIndex];
                selected.push(selectedStudent);
                
                // 从候选列表中移除已选学生
                availableCandidates.splice(selectedIndex, 1);
            }
            
            return selected;
        };

        // 开始抽取
        const startDrawing = () => {
            if (selectedStudents.value.length === 0) {
                showToast('提示', '请先选择参与抽取的学生');
                return;
            }

            if (isRolling.value) return;

            // 检查是否需要重置
            if (needsReset()) {
                resetDrawRecords();
            }

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

            // 使用时间戳和随机种子创建本次抽取的唯一种子
            const drawSeed = repeatControlSeed.value + totalDraws.value + Date.now();
            
            // 动画效果
            const animationDuration = 1000; // 动画持续时间（毫秒）
            const frameDuration = 50; // 每帧持续时间（毫秒）
            const frameCount = animationDuration / frameDuration;
            let currentFrame = 0;

            const animateRolling = () => {
                if (currentFrame < frameCount) {
                    // 随机显示一个学生（使用临时种子）
                    const tempSeed = drawSeed + currentFrame;
                    const tempRandom = new SeededRandom(tempSeed);
                    const randomIndex = tempRandom.nextInt(0, eligibleStudents.length - 1);
                    currentResult.value = [eligibleStudents[randomIndex]];
                    currentFrame++;
                    setTimeout(animateRolling, frameDuration);
                } else {
                    // 最终结果 - 使用可复现的加权随机选择
                    const finalResult = weightedRandomSelection(eligibleStudents, count, drawSeed);
                    currentResult.value = finalResult;
                    
                    // 更新学生抽取次数
                    finalResult.forEach(student => {
                        if (!studentDrawCounts.value[student.id]) {
                            studentDrawCounts.value[student.id] = 0;
                        }
                        studentDrawCounts.value[student.id]++;
                    });
                    
                    // 更新抽取轮次计数器
                    cycleResetCounter.value++;
                    
                    // 更新历史记录
                    totalDraws.value++;
                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    const dateString = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
                    
                    history.value.unshift({
                        time: timeString,
                        date: dateString,
                        count: count,
                        people: [...finalResult],
                        seed: drawSeed, // 记录种子以便复现
                        cycle: cycleResetCounter.value,
                        maxCycle: maxDrawsBeforeReset.value
                    });
                    
                    // 保留最近20条记录
                    if (history.value.length > 20) {
                        history.value.pop();
                    }
                    
                    isRolling.value = false;
                    showToast('成功', `已抽取${count}名学生（本轮第${cycleResetCounter.value}/${maxDrawsBeforeReset.value}次）`);
                    
                    // 如果达到最大抽取次数，提示即将重置
                    if (cycleResetCounter.value >= maxDrawsBeforeReset.value) {
                        setTimeout(() => {
                            showToast('提示', '已达到最大抽取次数，下次抽取将重置记录');
                        }, 1000);
                    }
                }
            };

            // 开始动画
            animateRolling();
        };

        // 复现历史记录中的抽取结果
        const replayHistoryDraw = (historyItem) => {
            if (!historyItem.seed) {
                showToast('错误', '此历史记录无法复现');
                return;
            }
            
            // 根据onlyTop11过滤学生
            let eligibleStudents = [...selectedStudents.value];
            if (onlyTop11.value) {
                eligibleStudents = eligibleStudents.filter(s => s.rank <= 11);
                if (eligibleStudents.length === 0) {
                    showToast('提示', '当前选择的学生中没有前11名学生');
                    return;
                }
            }
            
            // 使用相同的种子复现结果
            const recreatedResult = weightedRandomSelection(eligibleStudents, historyItem.count, historyItem.seed);
            
            // 显示复现结果
            showModal.value = true;
            currentResult.value = recreatedResult;
            
            showToast('成功', `已复现历史抽取结果（${historyItem.time}）`);
        };

        // 设置随机种子
        const setRandomSeed = () => {
            const newSeed = prompt('请输入随机种子（数字）:', repeatControlSeed.value);
            if (newSeed !== null && !isNaN(newSeed)) {
                repeatControlSeed.value = parseInt(newSeed);
                showToast('成功', `随机种子已设置为: ${repeatControlSeed.value}`);
            }
        };

        // 重置当前轮次
        const resetCurrentCycle = () => {
            if (confirm('确定要重置当前抽取轮次吗？这将清空所有学生的抽取记录。')) {
                resetDrawRecords();
            }
        };

        // 显示提示信息
        const showToast = (title, message) => {
            toast.value = { show: true, title, message };
            setTimeout(() => {
                toast.value.show = false;
            }, 3000);
        };

        // 切换音乐播放状态
        const toggleMusic = () => {
            if (isMusicPlaying.value) {
                // 暂停音乐
                if (window.myhkplayer && window.myhkplayer.pause) {
                    window.myhkplayer.pause();
                }
                isMusicPlaying.value = false;
            } else {
                // 播放音乐
                if (!window.myhkplayer) {
                    // 创建音乐播放器
                    const playerScript = document.createElement('script');
                    playerScript.src = 'https://api.molihua.cc/js/music.min.js';
                    playerScript.onload = () => {
                        if (window.myhkplayer && window.myhkplayer.play) {
                            window.myhkplayer.play();
                            isMusicPlaying.value = true;
                        }
                    };
                    document.body.appendChild(playerScript);
                } else if (window.myhkplayer.play) {
                    window.myhkplayer.play();
                    isMusicPlaying.value = true;
                }
            }
        };

        // 获取原神一言
        const fetchGenshinQuote = async () => {
            isFetchingQuote.value = true;
            try {
                const response = await fetch('https://gd.moyanjdc.top/api/yiyan');
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                const data = await response.json();
                quote.value = {
                    content: data.content || '人生如逆旅，我亦是行人',
                    author: data.author || '原神'
                };
                // 保存到本地存储，以便下次访问时使用
                localStorage.setItem('genshinQuote', JSON.stringify(quote.value));
            } catch (error) {
                console.error('获取原神一言失败:', error);
                showToast('提示', '获取一言失败，显示默认内容');
                // 如果失败，尝试使用本地存储中的数据
                const savedQuote = localStorage.getItem('genshinQuote');
                if (savedQuote) {
                    try {
                        quote.value = JSON.parse(savedQuote);
                    } catch (e) {
                        // 本地存储数据无效
                        quote.value = {
                            content: '人生如逆旅，我亦是行人',
                            author: '原神'
                        };
                    }
                } else {
                    // 设置默认值
                    quote.value = {
                        content: '人生如逆旅，我亦是行人',
                        author: '原神'
                    };
                }
            } finally {
                isFetchingQuote.value = false;
            }
        };

        // 获取学生抽取统计信息
        const getStudentDrawStats = (studentId) => {
            return studentDrawCounts.value[studentId] || 0;
        };

        // 计算平均抽取次数
        const getAverageDrawCount = Vue.computed(() => {
            const selectedIds = selectedStudents.value.map(s => s.id);
            const counts = selectedIds.map(id => getStudentDrawStats(id));
            const total = counts.reduce((sum, count) => sum + count, 0);
            return selectedIds.length > 0 ? (total / selectedIds.length).toFixed(2) : '0.00';
        });

        // 生命周期钩子
        Vue.onMounted(() => {
            selectedStudents.value = [...students.value];
            calculateMaxDraws(); // 初始化最大抽取次数
            
            // 页面加载时自动获取原神一言
            fetchGenshinQuote();
            
            // 设置定时器，每30秒自动刷新一次原神一言
            setInterval(fetchGenshinQuote, 30000);
            
            // 从本地存储加载随机种子（如果存在）
            const savedSeed = localStorage.getItem('drawSystemSeed');
            if (savedSeed) {
                repeatControlSeed.value = parseInt(savedSeed);
            }
            
            // 保存随机种子到本地存储
            localStorage.setItem('drawSystemSeed', repeatControlSeed.value.toString());
        });

        // 暴露给模板使用的变量和方法
        return {
            students,
            selectedStudents,
            history,
            totalDraws,
            drawCount,
            isRolling,
            currentResult,
            showModal,
            toast,
            isMusicPlaying,
            onlyTop11,
            participationPercentage,
            repeatControlSeed,
            studentDrawCounts,
            cycleResetCounter,
            maxDrawsBeforeReset,
            getAverageDrawCount,
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
            replayHistoryDraw,
            setRandomSeed,
            resetCurrentCycle,
            getStudentDrawStats,
            calculateMaxDraws
        };
    }
});

// 确保DOM加载完成后再挂载Vue应用
document.addEventListener('DOMContentLoaded', function() {
    app.mount('#app');
});