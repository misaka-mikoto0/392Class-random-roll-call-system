// Vue应用主文件
(function() {
    // 确保Vue已加载
    if (typeof Vue === 'undefined') {
        console.error('Vue.js library is not loaded!');
        return;
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

            // 概率衰减因子 (0 < decayFactor <= 1)
            // 值越接近1，概率分布越均匀；值越小，排名靠前优势越明显
            const decayFactor = Vue.ref(0.95);

            // 根据排名计算概率权重
            const calculateProbabilityWeight = (rank, decay) => {
                return Math.pow(decay, rank - 1);
            };

            // 计算所有学生的概率权重并归一化
            const calculateProbabilities = (studentsList, decay) => {
                const weights = studentsList.map(s => calculateProbabilityWeight(s.rank, decay));
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                return studentsList.map((s, i) => ({
                    ...s,
                    probability: weights[i] / totalWeight
                }));
            };

            // 初始化学生数据
            const students = Vue.ref(
                studentNames.map((name, index) => ({
                    id: index + 1,
                    name: name,
                    rank: index + 1,
                    probability: 0,
                    isSpecial: name === '贾烨标'
                }))
            );

            // 初始化概率
            students.value = calculateProbabilities(students.value, decayFactor.value);

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
            
            // 概率加权随机选择函数
            // 基于轮盘赌算法实现，支持可选的种子参数以确保可重现性
            const weightedRandomSelection = (items, count, seed = null) => {
                const result = [];
                const remainingItems = [...items];
                
                // 使用传入的种子或当前随机种子
                let currentSeed = seed !== null ? seed : randomSeed.value;
                
                for (let i = 0; i < count && remainingItems.length > 0; i++) {
                    // 计算累积概率
                    const totalWeight = remainingItems.reduce((sum, item) => sum + item.probability, 0);
                    
                    // 生成随机数
                    const randomValue = seededRandom(currentSeed);
                    currentSeed++;
                    
                    // 轮盘赌选择
                    let cumulative = 0;
                    let selectedIndex = 0;
                    
                    for (let j = 0; j < remainingItems.length; j++) {
                        cumulative += remainingItems[j].probability / totalWeight;
                        if (randomValue <= cumulative) {
                            selectedIndex = j;
                            break;
                        }
                    }
                    
                    // 将选中的项目添加到结果中
                    result.push(remainingItems[selectedIndex]);
                    // 从剩余列表中移除已选中的项目
                    remainingItems.splice(selectedIndex, 1);
                }
                
                // 如果没有传入种子，则更新全局随机种子
                if (seed === null) {
                    randomSeed.value = currentSeed;
                }
                
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
                    
                    // 使用概率加权随机选择最终结果
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
                        const fakeoutDirection = Math.random() > 0.5 ? 1 : -1;
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
            
            // 检查音乐播放器是否已存在
            const checkMusicPlayerExists = () => {
                return document.getElementById('xplayer') !== null || 
                       document.querySelector('.aplayer') !== null;
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
                        reject(error || new Error('音乐播放器加载失败'));
                    };
                    
                    document.body.appendChild(script);
                });
            };
            
            // 切换音乐播放状态
            const toggleMusic = async () => {
                if (isRolling.value) return;
                
                try {
                    // 如果音乐播放器未加载，则先加载
                    if (!isMusicLoaded.value) {
                        showToast('加载中', '正在加载音乐播放器...');
                        await loadMusicPlayerAsync();
                        showToast('成功', '音乐播放器加载完成');
                    }
                    
                    // 切换播放状态
                    isMusicPlaying.value = !isMusicPlaying.value;
                    
                    // 尝试控制实际的音乐播放器
                    if (window.APlayer && window.aplayer) {
                        const ap = window.aplayer;
                        if (ap.list && ap.list.audios && ap.list.audios.length > 0) {
                            if (isMusicPlaying.value) {
                                ap.play();
                            } else {
                                ap.pause();
                            }
                        }
                    }
                    
                    showToast('提示', isMusicPlaying.value ? '音乐已开始播放' : '音乐已暂停');
                    
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
            });

            // 重置随机种子
            const resetSeed = () => {
                randomSeed.value = Math.floor(Math.random() * 1000000000);
                recentHistory.value = [];
                showToast('提示', '随机种子已重置，将生成新的随机序列');
            };
            
            // 更新概率设置
            const updateDecayFactor = () => {
                const decay = Math.max(0.1, Math.min(1.0, decayFactor.value));
                decayFactor.value = decay;
                students.value = calculateProbabilities(students.value, decayFactor.value);
                showToast('提示', `概率衰减因子已更新为 ${decayFactor.value.toFixed(2)}`);
            };

            // 获取概率分布信息
            const getProbabilityInfo = () => {
                const firstProb = students.value[0]?.probability || 0;
                const lastProb = students.value[students.value.length - 1]?.probability || 0;
                return {
                    first: (firstProb * 100).toFixed(2) + '%',
                    last: (lastProb * 100).toFixed(4) + '%',
                    ratio: (firstProb / lastProb).toFixed(2)
                };
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
                isMusicLoading,
                isMusicLoaded,
                onlyTop11,
                participationPercentage,
                randomSeed,
                recentHistory,
                decayFactor,
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
                resetSeed,
                updateDecayFactor,
                getProbabilityInfo
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
