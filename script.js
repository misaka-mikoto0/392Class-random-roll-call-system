<!-- Vue应用主文件 -->
<script>
// 简单的种子随机数生成器（线性同余法）
let seed = 12345; // 默认种子，可修改为用户输入或时间戳等
const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return seed / Math.pow(2, 32);
};

const seededShuffle = (array, seedVal = seed) => {
    // 临时使用指定种子生成随机序列
    let tempSeed = seedVal;
    const rand = () => {
        tempSeed = (tempSeed * 1664525 + 1013904223) % Math.pow(2, 32);
        return tempSeed / Math.pow(2, 32);
    };

    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const app = Vue.createApp({
    setup() {
        // 学生数据（保持不变）
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

        // ===== 新增：状态管理增强 =====
        const currentSeed = Vue.ref(12345); // 可由用户输入或固定
        const remainingPool = Vue.ref([]); // 剩余可抽（用于无重复阶段）
        const usedPool = Vue.ref([]);      // 已抽学生（用于记录）

        // 重置抽取状态（清空已抽、重置剩余池）
        const resetState = () => {
            remainingPool.value = [...selectedStudents.value];
            usedPool.value = [];
            // 重置随机种子（确保复现性）
            seed = currentSeed.value;
        };

        // 状态管理（原有部分，仅补充）
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

        // 确认学生选择（重置抽取池）
        const confirmSelection = () => {
            if (selectedStudents.value.length === 0) {
                showToast('提示', '请至少选择一名学生');
                return;
            }
            // 重置状态：清空已抽，剩余池 = 当前选中的学生
            resetState();
            showModal.value = false;
            showToast('成功', '学生选择已确认');
        };

        // 开始抽取（核心修改）
        const startDrawing = () => {
            if (selectedStudents.value.length === 0) {
                showToast('提示', '请先选择参与抽取的学生');
                return;
            }

            if (isRolling.value) return;

            // 根据onlyTop11过滤可选学生
            let eligibleStudents = [...selectedStudents.value];
            if (onlyTop11.value) {
                eligibleStudents = eligibleStudents.filter(s => s.rank <= 11);
                if (eligibleStudents.length === 0) {
                    showToast('提示', '当前选择的学生中没有前11名学生');
                    return;
                }
            }

            // 更新剩余池为 eligibleStudents（仅首次或重置后）
            if (remainingPool.value.length === 0 || remainingPool.value.length !== eligibleStudents.length) {
                // 若已抽过但剩余池为空/不匹配，说明需要重置（如切换了onlyTop11）
                remainingPool.value = [...eligibleStudents];
                usedPool.value = [];
            }

            const maxUniqueCount = Math.floor(eligibleStudents.length * 0.8);
            const count = Math.min(Math.max(1, drawCount.value), eligibleStudents.length);
            drawCount.value = count;

            isRolling.value = true;
            currentResult.value = [];

            // ===== 动画阶段：仍用 Math.random() 保证视觉随机 =====
            const animationDuration = 1000;
            const frameDuration = 50;
            const frameCount = animationDuration / frameDuration;
            let currentFrame = 0;

            const animateRolling = () => {
                if (currentFrame < frameCount) {
                    const randomIndex = Math.floor(Math.random() * eligibleStudents.length);
                    currentResult.value = [eligibleStudents[randomIndex]];
                    currentFrame++;
                    setTimeout(animateRolling, frameDuration);
                } else {
                    // ===== 真实结果：按种子抽取，保证可复现 =====
                    let finalResult = [];

                    // 情况1：还有足够剩余学生（未到80%），从 remainingPool 中抽且移除
                    if (remainingPool.value.length >= count && usedPool.value.length < maxUniqueCount) {
                        // 随机打乱剩余池（使用种子）
                        const shuffledRemaining = seededShuffle(remainingPool.value, currentSeed.value);
                        finalResult = shuffledRemaining.slice(0, count);
                        // 更新剩余池和已抽池
                        remainingPool.value = shuffledRemaining.slice(count);
                        usedPool.value.push(...finalResult);
                    } 
                    // 情况2：剩余不足 or 已超80%，允许重复 → 使用完整 eligibleStudents + 种子随机抽
                    else {
                        // 从完整 eligibleStudents 中按种子随机抽（可重复）
                        const results = [];
                        for (let i = 0; i < count; i++) {
                            const idx = Math.floor(seededRandom() * eligibleStudents.length);
                            results.push(eligibleStudents[idx]);
                        }
                        finalResult = results;
                    }

                    currentResult.value = finalResult;

                    // 更新历史（含种子，用于复现）
                    totalDraws.value++;
                    const now = new Date();
                    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                    history.value.unshift({
                        time: timeString,
                        count: count,
                        people: [...finalResult], // 深拷贝
                        seedUsed: currentSeed.value // ✅ 关键：记录种子！
                    });

                    if (history.value.length > 10) {
                        history.value.pop();
                    }

                    isRolling.value = false;
                    showToast('成功', `已抽取${count}名学生`);
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

        // 切换音乐播放状态（不变）
        const toggleMusic = () => {
            if (isMusicPlaying.value) {
                if (window.myhkplayer && window.myhkplayer.pause) {
                    window.myhkplayer.pause();
                }
                isMusicPlaying.value = false;
            } else {
                if (!window.myhkplayer) {
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

        // 获取原神一言（不变）
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
                showToast('提示', '获取一言失败，显示默认内容');
                const savedQuote = localStorage.getItem('genshinQuote');
                if (savedQuote) {
                    try {
                        quote.value = JSON.parse(savedQuote);
                    } catch (e) {
                        quote.value = { content: '人生如逆旅，我亦是行人', author: '原神' };
                    }
                } else {
                    quote.value = { content: '人生如逆旅，我亦是行人', author: '原神' };
                }
            } finally {
                isFetchingQuote.value = false;
            }
        };

        // 生命周期钩子
        Vue.onMounted(() => {
            selectedStudents.value = [...students.value];
            resetState(); // 初始化剩余池
            fetchGenshinQuote();
            setInterval(fetchGenshinQuote, 30000);
        });

        // 暴露
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
            currentSeed, // 暴露种子（可用于输入框绑定）
            resetState   // 暴露重置（可用于“重新开始”按钮）
        };
    }
});

// 挂载
document.addEventListener('DOMContentLoaded', function() {
    app.mount('#app');
});
</script>
