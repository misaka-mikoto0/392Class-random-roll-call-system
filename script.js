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
            if (drawCount.value > selectedStudents.value.length) {
                showToast('人数不足', `只有 ${selectedStudents.value.length} 名学生参与，无法抽取 ${drawCount.value} 人`);
                return;
            }
            isRolling.value = true;
            currentResult.value = [];

            let counter = 0;
            const maxCycles = 30;
            const interval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * selectedStudents.value.length);
                currentResult.value = [selectedStudents.value[randomIndex]];
                counter++;
                if (counter >= maxCycles) {
                    clearInterval(interval);
                    finishDrawing();
                }
            }, 100);
        };

        const finishDrawing = () => {
            // Fisher-Yates 洗牌算法
            const shuffled = [...selectedStudents.value];
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

        // 生命周期钩子
        onMounted(() => {
            selectedStudents.value = [...students.value];
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
            participationPercentage,
            toggleStudentSelection,
            isSelected,
            confirmSelection,
            startDrawing,
            showToast
        };
    }
}).mount('#app');