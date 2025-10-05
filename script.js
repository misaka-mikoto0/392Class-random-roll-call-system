const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // 学生数据
        const students = ref([
            { id: 1, name: '王铖浩', rank: 1, probability: 1 },
            { id: 2, name: '原梓杰', rank: 2, probability: 1 },
            { id: 3, name: '茹柯臻', rank: 3, probability: 1 },
            { id: 4, name: '胡逸柯', rank: 4, probability: 1 },
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
        const selectedStudents = ref([]);
        const history = ref([]);
        const totalDraws = ref(0);
        const drawCount = ref(1);
        const isRolling = ref(false);
        const currentResult = ref([]);
        const showModal = ref(false);
        const toast = ref({
            show: false,
            title: '',
            message: ''
        });
        const isMusicPlaying = ref(false);
        const onlyTop11 = ref(false);
        // 原神一言状态
        const quote = ref({
            content: '',
            author: ''
        });
        const isFetchingQuote = ref(false);

        // 计算属性
        const participationPercentage = computed(() => {
            if (students.value.length === 0) return 0;
            return (selectedStudents.value.length / students.value.length) * 100;
        });

        // 方法
        const toggleStudentSelection = (student) => {
            const index = selectedStudents.value.findIndex(s => s.id === student.id);
            if (index === -1) {
                selectedStudents.value.push(student);
            } else {
                selectedStudents.value.splice(index, 1);
            }
        };

        const isSelected = (student) => {
            return selectedStudents.value.some(s => s.id === student.id);
        };

        const selectAllStudents = () => {
            selectedStudents.value = [...students.value];
            showToast('全选成功', `已选择全部 ${students.value.length} 名学生`);
        };

        const deselectAllStudents = () => {
            selectedStudents.value = [];
            showToast('反选成功', '已取消选择所有学生');
        };

        const confirmSelection = () => {
            if (selectedStudents.value.length === 0) {
                selectedStudents.value = [...students.value];
                showToast('提示', '已默认选择全部学生');
            } else {
                showToast('选择已更新', `已选择 ${selectedStudents.value.length} 名学生参与抽取`);
            }
            showModal.value = false;
        };

        const startDrawing = () => {
            if (drawCount.value < 1) {
                showToast('输入错误', '请输入有效的抽取人数');
                return;
            }
            if (selectedStudents.value.length === 0) {
                showToast('没有学生', '请先选择参与的学生');
                return;
            }
            
            // 如果启用了仅抽取前11名，过滤出前11名学生
            let availableStudents = selectedStudents.value;
            if (onlyTop11.value) {
                availableStudents = selectedStudents.value.filter(s => s.rank <= 11);
                if (availableStudents.length === 0) {
                    showToast('人数不足', '没有前11名学生参与抽取');
                    return;
                }
                if (drawCount.value > availableStudents.length) {
                    showToast('人数不足', `只有 ${availableStudents.length} 名前11名学生参与，无法抽取 ${drawCount.value} 人`);
                    return;
                }
            } else {
                if (drawCount.value > selectedStudents.value.length) {
                    showToast('人数不足', `只有 ${selectedStudents.value.length} 名学生参与，无法抽取 ${drawCount.value} 人`);
                    return;
                }
            }
            
            isRolling.value = true;
            currentResult.value = [];

            let counter = 0;
            const maxCycles = 30;
            const interval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * availableStudents.length);
                currentResult.value = [availableStudents[randomIndex]];
                counter++;
                if (counter >= maxCycles) {
                    clearInterval(interval);
                    finishDrawing(availableStudents);
                }
            }, 100);
        };

        const finishDrawing = (availableStudents) => {
            // Fisher-Yates 洗牌算法
            const shuffled = [...availableStudents];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const results = shuffled.slice(0, drawCount.value);
            currentResult.value = results;
            isRolling.value = false;
            saveResult(results);
        };

        const saveResult = (results) => {
            const resultData = {
                time: new Date().toLocaleString('zh-CN'),
                people: results,
                count: results.length
            };
            history.value.unshift(resultData);
            totalDraws.value++;
            if (history.value.length > 5) {
                history.value.pop();
            }
            showToast('抽取完成', `成功抽取 ${results.length} 名学生`);
        };

        const showToast = (title, message) => {
            toast.value = {
                show: true,
                title,
                message
            };
            setTimeout(() => {
                toast.value.show = false;
            }, 3000);
        };

        const toggleMusic = () => {
            if (isMusicPlaying.value) {
                // 暂停音乐
                if (window.myhkplayer && window.myhkplayer.pause) {
                    window.myhkplayer.pause();
                }
                isMusicPlaying.value = false;
                showToast('提示', '音乐已暂停');
            } else {
                // 播放音乐
                if (window.myhkplayer && window.myhkplayer.play) {
                    window.myhkplayer.play();
                    showToast('提示', '音乐已开始播放');
                } else {
                    // 尝试初始化播放器
                    try {
                        // 动态创建播放器元素
                        if (!document.getElementById('music')) {
                            const musicDiv = document.createElement('div');
                            musicDiv.id = 'music';
                            musicDiv.setAttribute('key', '68397e7621e83');
                            musicDiv.setAttribute('api', 'https://y.cenguigui.cn/');
                            document.body.appendChild(musicDiv);
                        }
                        
                        // 动态加载播放器脚本
                        if (!document.getElementById('xplayer')) {
                            const script = document.createElement('script');
                            script.id = 'xplayer';
                            script.src = 'https://y.cenguigui.cn/Static/player14/js/player.js';
                            script.onload = function() {
                                // 脚本加载完成后尝试播放
                                setTimeout(() => {
                                    if (window.myhkplayer && window.myhkplayer.play) {
                                        window.myhkplayer.play();
                                    }
                                }, 500);
                            };
                            document.body.appendChild(script);
                        }
                        showToast('提示', '音乐播放器正在准备');
                    } catch (error) {
                        showToast('错误', '音乐播放失败');
                    }
                }
                isMusicPlaying.value = true;
            }
        };

        // 获取原神一言的方法
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
        onMounted(() => {
            selectedStudents.value = [...students.value];
            // 页面加载时自动获取原神一言
            fetchGenshinQuote();
            
            // 设置定时器，每30秒自动刷新一次原神一言
            setInterval(fetchGenshinQuote, 30000);
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
            fetchGenshinQuote
        };
    }
}).mount('#app');