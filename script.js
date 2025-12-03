// Vue应用主文件

// 创建Vue应用实例
const app = Vue.createApp({
    setup() {
        // 学生数据
        const students = Vue.ref([
            { id: 1, name: '胡逸柯', rank: 1, probability: 1 },
            { id: 2, name: '原梓杰', rank: 2, probability: 1 },
            { id: 3, name: '王彦景', rank: 3, probability: 1 },
            { id: 4, name: '邢任静', rank: 4, probability: 1 },
            { id: 5, name: '李梦雨', rank: 5, probability: 1 },
            { id: 6, name: '刘艺博', rank: 6, probability: 1 },
            { id: 7, name: '常煜弦', rank: 7, probability: 1 },
            { id: 8, name: '王鹤凝', rank: 8, probability: 1 },
            { id: 9, name: '王铖浩', rank: 9, probability: 1 },
            { id: 10, name: '李帅辉', rank: 10, probability: 1 },
            { id: 11, name: '元静怡', rank: 11, probability: 1 },
            { id: 12, name: '段晶晶', rank: 12, probability: 1 },
            { id: 13, name: '马欣怡', rank: 13, probability: 1 },
            { id: 14, name: '冯炜杰', rank: 14, probability: 1 },
            { id: 15, name: '杜桓荣', rank: 15, probability: 1 },
            { id: 16, name: '茹柯臻', rank: 16, probability: 1 },
            { id: 17, name: '李佳遥', rank: 17, probability: 1 },
            { id: 18, name: '樊师彤', rank: 18, probability: 1 },
            { id: 19, name: '李湣帅', rank: 19, probability: 1 },
            { id: 20, name: '成浩宇', rank: 20, probability: 1 },
            { id: 21, name: '牛一燃', rank: 21, probability: 1 },
            { id: 22, name: '李怡萱', rank: 22, probability: 1 },
            { id: 23, name: '王云鹏', rank: 23, probability: 1 },
            { id: 24, name: '晋奥钊', rank: 24, probability: 1 },
            { id: 25, name: '张严支', rank: 25, probability: 1 },
            { id: 26, name: '高璐鑫', rank: 26, probability: 1 },
            { id: 27, name: '朱奕瑶', rank: 27, probability: 1 },
            { id: 28, name: '赵晨旭', rank: 28, probability: 1 },
            { id: 29, name: '陕禹帆', rank: 29, probability: 1 },
            { id: 30, name: '赵一然', rank: 30, probability: 1 },
            { id: 31, name: '赵渊博', rank: 31, probability: 1 },
            { id: 32, name: '崔刘杰', rank: 32, probability: 1 },
            { id: 33, name: '李向菲', rank: 33, probability: 1 },
            { id: 34, name: '郝鑫悦', rank: 34, probability: 1 },
            { id: 35, name: '王沐勋', rank: 35, probability: 1 },
            { id: 36, name: '白义菲', rank: 36, probability: 1 },
            { id: 37, name: '杨子怡', rank: 37, probability: 1 },
            { id: 38, name: '王博宇', rank: 38, probability: 1 },
            { id: 39, name: '延泽玉', rank: 39, probability: 1 },
            { id: 40, name: '贾烨标', rank: 40, probability: 1 },
            { id: 41, name: '曹凯乐', rank: 41, probability: 1 }
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

        // 计算属性
        const participationPercentage = Vue.computed(() => {
            return students.value.length > 0 ? (selectedStudents.value.length / students.value.length) * 100 : 0;
        });

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
            showToast('成功', '学生选择已确认');
        };

        // 固定种子的随机数生成器
        const seededRandom = (seed) => {
            let x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        
        // 随机种子，随机生成以确保每次运行结果不同
        let randomSeed = Vue.ref(Math.floor(Math.random() * 1000000000));
        
        // Fisher-Yates 洗牌算法（使用固定种子）
        const shuffleArray = (array) => {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(randomSeed.value) * (i + 1));
                randomSeed.value++;
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
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

            // 虚晃一枪动画配置参数 - 性能优化版
            const animationConfig = {
                totalDuration: 900, // 总动画时长（毫秒）- 从1200ms缩短到900ms，减少25%
                initialAccelerationDuration: 150, // 初始加速阶段时长 - 从200ms缩短到150ms
                misleadDecelerationDuration: 350, // 误导性减速阶段时长 - 从500ms缩短到350ms
                fakeoutDuration: 200, // 突然变向阶段时长 - 从250ms缩短到200ms
                finalDecelerationDuration: 200, // 最终减速阶段时长 - 从250ms缩短到200ms
                fakeoutIntensity: 0.5, // 虚晃强度（0-1）- 略微降低以简化计算
                frameDuration: 10 // 每帧持续时间（毫秒）- 从12ms缩短到10ms，提高流畅度
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
                // 计算不重复抽取的最大历史记录长度
                const maxHistoryLength = Math.floor(eligibleStudents.length * 0.8);
                
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
                    // 找到最早抽取的学生添加到可用列表
                    const earliestStudent = recentHistory.value.shift();
                    if (earliestStudent) {
                        availableStudents.push(earliestStudent);
                    }
                }
                
                // 使用固定种子随机选择最终结果
                const shuffled = shuffleArray(availableStudents);
                return shuffled.slice(0, count);
            };
            
            // 预计算最终结果信息，避免在动画过程中重复计算
            const finalResult = calculateFinalResult();
            const finalStudent = finalResult[0];
            const finalIndex = eligibleStudents.findIndex(s => s.id === finalStudent.id);
            const fakeoutEndIndex = Math.floor((misleadTargetIndex + eligibleStudents.length * animationConfig.fakeoutIntensity) % eligibleStudents.length);
            
            // 缓动函数库
            const easeFunctions = {
                // 加速
                easeInQuad: (t) => t * t,
                // 减速
                easeOutQuad: (t) => t * (2 - t),
                // 先加速后减速
                easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                // 弹性效果
                easeOutElastic: (t) => {
                    const c4 = (2 * Math.PI) / 3;
                    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
                },
                // 弹跳效果
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
                    // 阶段1：初始加速
                    progress = frame / initialAccelFrames;
                    easedProgress = easeFunctions.easeInQuad(progress);
                    // 快速增加索引
                    return Math.floor(easedProgress * eligibleStudents.length * 3) % eligibleStudents.length;
                } else if (frame <= initialAccelFrames + misleadDecelFrames) {
                    // 阶段2：误导性减速 - 看似要停在misleadTargetIndex
                    progress = (frame - initialAccelFrames) / misleadDecelFrames;
                    easedProgress = easeFunctions.easeOutQuad(progress);
                    
                    // 计算从当前位置到误导目标的插值
                    const startIndex = Math.floor(eligibleStudents.length * 3) % eligibleStudents.length;
                    const diff = misleadTargetIndex - startIndex;
                    return Math.floor((startIndex + diff * easedProgress) % eligibleStudents.length);
                } else if (frame <= initialAccelFrames + misleadDecelFrames + fakeoutFrames) {
                    // 阶段3：突然变向 - 虚晃一枪
                    progress = (frame - initialAccelFrames - misleadDecelFrames) / fakeoutFrames;
                    easedProgress = easeFunctions.easeInOutQuad(progress);
                    
                    // 计算变向幅度
                    const fakeoutRange = Math.floor(eligibleStudents.length * animationConfig.fakeoutIntensity);
                    // 随机选择变向方向
                    const fakeoutDirection = Math.random() > 0.5 ? 1 : -1;
                    
                    // 从误导目标位置突然向相反方向移动
                    return Math.floor((misleadTargetIndex + fakeoutDirection * fakeoutRange * easedProgress) % eligibleStudents.length);
                } else {
                    // 阶段4：最终减速到真实结果
                    progress = (frame - initialAccelFrames - misleadDecelFrames - fakeoutFrames) / finalDecelFrames;
                    easedProgress = easeFunctions.easeOutBounce(progress);
                    
                    // 使用预计算的最终结果，避免重复计算
                    const diff = finalIndex - fakeoutEndIndex;
                    return Math.floor((fakeoutEndIndex + diff * easedProgress) % eligibleStudents.length);
                }
            };

            const animateRolling = () => {
                if (currentFrame < totalFrames) {
                    // 计算当前应该显示的学生索引
                    currentIndex = calculateCurrentIndex(currentFrame);
                    // 确保索引为正数
                    currentIndex = (currentIndex + eligibleStudents.length) % eligibleStudents.length;
                    
                    // 显示当前学生
                    currentResult.value = [eligibleStudents[currentIndex]];
                    currentFrame++;
                    
                    // 继续下一帧
                    setTimeout(animateRolling, animationConfig.frameDuration);
                } else {
                        // 使用预计算的最终结果
                    currentResult.value = finalResult;
                    
                    // 更新最近历史记录
                    recentHistory.value.push(...currentResult.value);
                    // 保持历史记录长度不超过最大限制
                    if (recentHistory.value.length > maxHistoryLength) {
                        recentHistory.value = recentHistory.value.slice(recentHistory.value.length - maxHistoryLength);
                    }
                    
                    // 更新历史记录
                    totalDraws.value++;
                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    history.value.unshift({
                        time: timeString,
                        count: count,
                        people: currentResult.value
                    });
                    
                    // 保留最近10条记录
                    if (history.value.length > 10) {
                        history.value.pop();
                    }
                    
                    isRolling.value = false;
                    showToast('成功', `已抽取${count}名学生`);
                }
            };

            // 开始动画
            animateRolling();
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

        // 生命周期钩子
        Vue.onMounted(() => {
            selectedStudents.value = [...students.value];
            // 页面加载时自动获取原神一言
            fetchGenshinQuote();
            
            // 设置定时器，每30秒自动刷新一次原神一言
            setInterval(fetchGenshinQuote, 30000);
        });

        // 重置随机种子
        const resetSeed = () => {
            randomSeed.value = Math.floor(Math.random() * 1000000000);
            recentHistory.value = [];
            showToast('提示', '随机种子已重置，将生成新的随机序列');
        };
        
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
            resetSeed
        };
    }
});

// 确保DOM加载完成后再挂载Vue应用
document.addEventListener('DOMContentLoaded', function() {
    app.mount('#app');
});
