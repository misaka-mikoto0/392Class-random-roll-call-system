// 随机点名系统 - 原生JavaScript实现

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 学生数据 - 按照用户提供的顺序排列
    const students = [
        { id: 1, name: '胡逸柯', rank: 1, probability: 1 },
        { id: 2, name: '原梓杰', rank: 2, probability: 1 },
        { id: 3, name: '元静怡', rank: 3, probability: 1 },
        { id: 4, name: '李梦雨', rank: 4, probability: 1 },
        { id: 5, name: '李帅辉', rank: 5, probability: 1 },
        { id: 6, name: '冯炜杰', rank: 6, probability: 1 },
        { id: 7, name: '邢任静', rank: 7, probability: 1 },
        { id: 8, name: '茹柯臻', rank: 8, probability: 1 },
        { id: 9, name: '王铖浩', rank: 9, probability: 1, isPotentialStar: true }, // 潜力之星
        { id: 10, name: '马欣怡', rank: 10, probability: 1 },
        { id: 11, name: '成浩宇', rank: 11, probability: 1 },
        { id: 12, name: '王鹤凝', rank: 12, probability: 1 },
        { id: 13, name: '李佳遥', rank: 13, probability: 1 },
        { id: 14, name: '王云鹏', rank: 14, probability: 1 },
        { id: 15, name: '刘艺博', rank: 15, probability: 1 },
        { id: 16, name: '王彦景', rank: 16, probability: 1 },
        { id: 17, name: '段晶晶', rank: 17, probability: 1 },
        { id: 18, name: '李怡萱', rank: 18, probability: 1 },
        { id: 19, name: '樊师彤', rank: 19, probability: 1 },
        { id: 20, name: '杜桓荣', rank: 20, probability: 1 },
        { id: 21, name: '李湣帅', rank: 21, probability: 1 },
        { id: 22, name: '常煜弦', rank: 22, probability: 1 },
        { id: 23, name: '高璐鑫', rank: 23, probability: 1 },
        { id: 24, name: '段培清', rank: 24, probability: 1 },
        { id: 25, name: '郝鑫悦', rank: 25, probability: 1 },
        { id: 26, name: '陕禹帆', rank: 26, probability: 1 },
        { id: 27, name: '赵一然', rank: 27, probability: 1 },
        { id: 28, name: '张严支', rank: 28, probability: 1, isPotentialStar: true }, // 潜力之星
        { id: 29, name: '牛一燃', rank: 29, probability: 1 },
        { id: 30, name: '崔刘杰', rank: 30, probability: 1 },
        { id: 31, name: '王沐勋', rank: 31, probability: 1 },
        { id: 32, name: '李向菲', rank: 32, probability: 1 },
        { id: 33, name: '延泽玉', rank: 33, probability: 1 },
        { id: 34, name: '白义菲', rank: 34, probability: 1 },
        { id: 35, name: '杨子怡', rank: 35, probability: 1 },
        { id: 36, name: '赵渊博', rank: 36, probability: 1 },
        { id: 37, name: '晋奥钊', rank: 37, probability: 1, isPotentialStar: true }, // 潜力之星
        { id: 38, name: '朱奕瑶', rank: 38, probability: 1 },
        { id: 39, name: '赵晨旭', rank: 39, probability: 1 },
        { id: 40, name: '王博宇', rank: 40, probability: 1 },
        { id: 41, name: '赵艺泽', rank: 41, probability: 1 },
        { id: 42, name: '曹凯乐', rank: 42, probability: 1 },
        { id: 43, name: '贾烨标', rank: 43, probability: 1, isSpecialGreen: true } // 绿色标识
    ];

    // 状态管理
    let selectedStudents = [...students];
    let history = [];
    let totalDraws = 0;
    let drawCount = 1;
    let isRolling = false;
    let currentResult = [];
    let isMusicPlaying = false;
    let quote = { content: '', author: '' };

    // DOM元素引用
    const elements = {
        drawCount: document.getElementById('drawCount'),
        onlyTop11: document.getElementById('onlyTop11'),
        startDrawBtn: document.getElementById('startDrawBtn'),
        drawBtnText: document.getElementById('drawBtnText'),
        selectStudentsBtn: document.getElementById('selectStudentsBtn'),
        placeholderText: document.getElementById('placeholder-text'),
        resultContainer: document.getElementById('result-container'),
        resultNames: document.getElementById('result-names'),
        historyList: document.getElementById('history-list'),
        noHistory: document.getElementById('no-history'),
        totalStudents: document.getElementById('total-students'),
        selectedStudents: document.getElementById('selected-students'),
        totalDraws: document.getElementById('total-draws'),
        currentDrawCount: document.getElementById('current-draw-count'),
        participationPercentage: document.getElementById('participation-percentage'),
        progressFill: document.getElementById('progress-fill'),
        quoteContent: document.getElementById('quote-content'),
        quoteAuthor: document.getElementById('quote-author'),
        // 添加footer相关元素
        footerDrawCount: document.getElementById('footer-draw-count'),
        footerStudentCount: document.getElementById('footer-student-count'),
        // 音乐控制按钮
        musicToggleBtn: document.getElementById('musicToggleBtn'),
        musicIcon: document.getElementById('musicIcon'),
        // Toast容器
        toastContainer: document.getElementById('toast-container')
    };
    
    // 函数声明将在后续代码中定义
    
    // 背景切换按钮
    const changeBackgroundBtn = document.getElementById('changeBackgroundBtn');
    if (changeBackgroundBtn) {
        changeBackgroundBtn.addEventListener('click', function() {
            // 假设background.js中定义了changeBackground函数
            if (typeof changeBackground === 'function') {
                changeBackground();
            }
        });
    }
    
    // 计算属性函数
    const calculateParticipationPercentage = () => {
        return students.length > 0 ? (selectedStudents.length / students.length) * 100 : 0;
    };



    // 更新UI显示
    const updateUI = () => {
        // 更新统计信息
        elements.totalStudents.textContent = students.length;
        elements.selectedStudents.textContent = selectedStudents.length;
        elements.totalDraws.textContent = totalDraws;
        elements.currentDrawCount.textContent = history.length > 0 ? history[0].count : 0;
        
        // 更新参与比例
        const percentage = calculateParticipationPercentage();
        elements.participationPercentage.textContent = Math.round(percentage) + '%';
        elements.progressFill.style.width = percentage + '%';
        
        // 更新历史记录
        updateHistoryDisplay();
        
        // 更新结果显示
        updateResultDisplay();
        
        // 更新footer统计信息
        if (elements.footerDrawCount && elements.footerStudentCount) {
            elements.footerDrawCount.textContent = `已抽取 ${totalDraws} 次`;
            elements.footerStudentCount.textContent = `服务 ${students.length} 名学生`;
        }
    };
    
    // 初始化页面
    updateUI();
    fetchGenshinQuote();
    
    // 更新结果显示 - 使用函数声明形式以避免提升问题
    function updateResultDisplay() {
        if (currentResult.length > 0) {
            elements.placeholderText.style.display = 'none';
            elements.resultContainer.style.display = 'block';
            elements.resultNames.innerHTML = '';
            
            currentResult.forEach(student => {
                const nameElement = document.createElement('div');
                nameElement.className = 'student-name-result';
                if (student.isSpecialGreen) nameElement.classList.add('special-green');
                if (student.isPotentialStar) nameElement.classList.add('potential-star');
                nameElement.textContent = student.name;
                elements.resultNames.appendChild(nameElement);
            });
        } else {
            elements.placeholderText.style.display = 'block';
            elements.resultContainer.style.display = 'none';
        }
    }
    
    // 更新历史记录显示 - 使用函数声明形式以避免提升问题
    function updateHistoryDisplay() {
        if (history.length === 0) {
            elements.noHistory.style.display = 'block';
            elements.historyList.style.display = 'none';
        } else {
            elements.noHistory.style.display = 'none';
            elements.historyList.style.display = 'block';
            elements.historyList.innerHTML = '';
            
            history.forEach(record => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const timeElement = document.createElement('div');
                timeElement.className = 'history-time';
                timeElement.textContent = record.time;
                
                const peopleElement = document.createElement('div');
                peopleElement.className = 'history-people';
                peopleElement.textContent = record.people.map(p => p.name).join('、');
                
                historyItem.appendChild(timeElement);
                historyItem.appendChild(peopleElement);
                elements.historyList.appendChild(historyItem);
            });
        }
    }
    
    // Fisher-Yates 洗牌算法 - 使用函数声明形式以避免提升问题
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    // 开始抽取 - 使用函数声明形式以避免提升问题
    function startDrawing() {
        if (isRolling) {
            // 停止抽取
            isRolling = false;
            elements.startDrawBtn.classList.remove('stop');
            elements.drawBtnText.textContent = '开始抽取';
            elements.drawBtnText.classList.remove('mdui-text-color-red');
            
            // 记录历史
            totalDraws++;
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            history.unshift({
                time: timeStr,
                count: currentResult.length,
                people: [...currentResult]
            });
            
            // 更新UI
            updateUI();
            
            return;
        }
        
        // 检查是否有可抽取的学生
        if (selectedStudents.length === 0) {
            showToast('提示', '没有可抽取的学生');
            return;
        }
        
        // 设置抽取数量
        const count = parseInt(elements.drawCount.value) || 1;
        if (count > selectedStudents.length) {
            showToast('提示', `抽取数量不能超过学生总数${selectedStudents.length}人`);
            return;
        }
        
        // 开始抽取动画
        isRolling = true;
        elements.startDrawBtn.classList.add('stop');
        elements.drawBtnText.textContent = '停止抽取';
        elements.drawBtnText.classList.add('mdui-text-color-red');
        
        // 根据概率抽取学生
        const shuffledStudents = shuffleArray(selectedStudents);
        currentResult = [];
        
        // 从洗牌后的数组中选取指定数量的学生
        for (let i = 0; i < count; i++) {
            currentResult.push(shuffledStudents[i]);
        }
        
        // 更新显示
        updateResultDisplay();
    }
    
    // 切换音乐播放状态 - 使用函数声明形式以避免提升问题
    function toggleMusic() {
        isMusicPlaying = !isMusicPlaying;
        if (elements.musicIcon) {
            if (isMusicPlaying) {
                elements.musicIcon.className = 'fas fa-volume-up';
                showToast('音乐', '背景音乐已开启');
            } else {
                elements.musicIcon.className = 'fas fa-volume-mute';
                showToast('音乐', '背景音乐已关闭');
            }
        }
    }
    
    // 获取原神一言 - 使用函数声明形式以避免提升问题
    async function fetchGenshinQuote() {
        try {
            // 调用原神一言API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer your-api-key' // 请替换为实际的API密钥
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'user',
                        content: '请生成一句原神游戏中的经典台词，格式为：台词内容|||角色名'
                    }],
                    max_tokens: 50
                })
            });
            
            const data = await response.json();
            const result = data.choices[0].message.content.trim();
            const [content, author] = result.split('|||');
            
            quote = { content: content.trim(), author: author.trim() };
        } catch (error) {
            console.error('获取一言失败，使用本地默认值:', error);
            // 由于API调用失败或跨域问题，使用本地默认值
            const defaultQuotes = [
                { content: '愿风指引你的道路', author: '温迪' },
                { content: '未来是可以被改变的', author: '琴' },
                { content: '无论何时，都要向前看', author: '旅行者' },
                { content: '每一个瞬间，都是珍贵的回忆', author: '派蒙' },
                { content: '努力是不会背叛人的', author: '香菱' }
            ];
            
            const randomIndex = Math.floor(Math.random() * defaultQuotes.length);
            quote = defaultQuotes[randomIndex];
        }
        
        // 更新UI显示
        if (elements.quoteContent) elements.quoteContent.textContent = quote.content;
        if (elements.quoteAuthor) elements.quoteAuthor.textContent = `- ${quote.author}`;
    }
    
    // 显示学生选择对话框 - 使用函数声明形式以避免提升问题
    function showStudentSelectionDialog() {
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'mdui-dialog';
        dialog.innerHTML = `
            <div class="mdui-dialog-title">选择学生</div>
            <div class="mdui-dialog-content" style="max-height: 400px; overflow-y: auto;">
                <div class="student-selection">
                    ${students.map(student => {
                        let nameClass = 'student-name';
                        if (student.isSpecialGreen) nameClass += ' special-green';
                        if (student.isPotentialStar) nameClass += ' potential-star';
                        return `
                            <label class="mdui-checkbox mdui-col-xs-4">
                                <input type="checkbox" value="${student.id}" ${selectedStudents.some(s => s.id === student.id) ? 'checked' : ''}>
                                <span class="${nameClass}">${student.name}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="mdui-dialog-actions">
                <button class="mdui-btn" id="selectAllBtn">全选</button>
                <button class="mdui-btn" id="selectNoneBtn">全不选</button>
                <button class="mdui-btn mdui-dialog-cancel">取消</button>
                <button class="mdui-btn mdui-dialog-confirm">确定</button>
            </div>
        `;
        document.body.appendChild(dialog);
        
        // 初始化对话框
        const mduiDialog = new mdui.Dialog(dialog);
        mduiDialog.open();
        
        // 绑定事件
        dialog.querySelector('#selectAllBtn').addEventListener('click', () => {
            dialog.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
        
        dialog.querySelector('#selectNoneBtn').addEventListener('click', () => {
            dialog.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
        
        // 确认按钮
        dialog.querySelector('.mdui-dialog-confirm').addEventListener('click', () => {
            const selectedIds = Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => parseInt(checkbox.value));
            
            selectedStudents = students.filter(student => selectedIds.includes(student.id));
            updateUI();
            showToast('提示', `已选择 ${selectedStudents.length} 名学生`);
            mduiDialog.close();
        });
        
        // 取消按钮
        dialog.querySelector('.mdui-dialog-cancel').addEventListener('click', () => {
            mduiDialog.close();
        });
        
        // 关闭时移除对话框
        dialog.addEventListener('closed.mdui.dialog', () => {
            setTimeout(() => {
                document.body.removeChild(dialog);
            }, 300);
        });
    };
    
    // 绑定事件监听器（所有函数定义之后）
    elements.selectStudentsBtn.addEventListener('click', showStudentSelectionDialog);
    elements.startDrawBtn.addEventListener('click', startDrawing);
    elements.musicToggleBtn.addEventListener('click', toggleMusic);
});

    // 获取原神一言
    const fetchGenshinQuote = async () => {
        try {
            const response = await fetch('https://gd.moyanjdc.top/api/yiyan');
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            const data = await response.json();
            quote = {
                content: data.content || '人生如逆旅，我亦是行人',
                author: data.author || '原神'
            };
            
            // 更新DOM
            elements.quoteContent.textContent = quote.content;
            elements.quoteAuthor.textContent = `— ${quote.author}`;
            
            // 保存到本地存储，以便下次访问时使用
            localStorage.setItem('genshinQuote', JSON.stringify(quote));
        } catch (error) {
            console.error('获取原神一言失败:', error);
            showToast('提示', '获取一言失败，显示默认内容');
            
            // 如果失败，尝试使用本地存储中的数据
            const savedQuote = localStorage.getItem('genshinQuote');
            if (savedQuote) {
                try {
                    quote = JSON.parse(savedQuote);
                } catch (e) {
                    // 本地存储数据无效
                    quote = {
                        content: '人生如逆旅，我亦是行人',
                        author: '原神'
                    };
                }
            } else {
                // 设置默认值
                quote = {
                    content: '人生如逆旅，我亦是行人',
                    author: '原神'
                };
            }
            
            // 更新DOM
            elements.quoteContent.textContent = quote.content;
            elements.quoteAuthor.textContent = `— ${quote.author}`;
        }
    };

    // 显示学生选择对话框
    const showStudentSelectionDialog = () => {
        // 创建对话框容器
        const modalContainer = document.createElement('div');
        modalContainer.id = 'studentSelectionModal';
        
        // 对话框HTML结构 - 包含搜索、筛选、分页等功能
        const dialogHTML = `
            <div class="student-selection-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>选择学生</h3>
                        <div class="modal-header-actions">
                            <span class="selected-count">已选择: <strong id="selectedCount">0</strong></span>
                            <button class="close-btn" id="closeModalBtn">&times;</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <!-- 搜索和筛选区域 -->
                        <div class="filter-section">
                            <div class="search-container">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" id="studentSearch" placeholder="搜索学生姓名..." class="search-input">
                            </div>
                            <div class="filter-controls">
                                <label class="filter-checkbox">
                                    <input type="checkbox" id="filterTop11">
                                    <span>仅显示前11名</span>
                                </label>
                                <label class="filter-checkbox">
                                    <input type="checkbox" id="filterPotentialStars">
                                    <span>仅显示潜力之星</span>
                                </label>
                                <label class="filter-checkbox">
                                    <input type="checkbox" id="filterSpecialGreen">
                                    <span>仅显示绿色标识</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- 操作按钮区域 -->
                        <div class="action-buttons">
                            <button class="mdui-btn mdui-color-indigo mdui-ripple" id="selectAllBtn">
                                <i class="fas fa-check-square"></i> 全选
                            </button>
                            <button class="mdui-btn mdui-color-red mdui-ripple" id="deselectAllBtn">
                                <i class="fas fa-square"></i> 取消全选
                            </button>
                            <button class="mdui-btn mdui-color-blue mdui-ripple" id="selectInvertBtn">
                                <i class="fas fa-exchange-alt"></i> 反选
                            </button>
                            <button class="mdui-btn mdui-color-yellow mdui-ripple" id="selectTop11Btn">
                                <i class="fas fa-crown"></i> 选择前11名
                            </button>
                        </div>
                        
                        <!-- 学生列表容器 -->
                        <div class="student-list-container">
                            <div class="student-grid" id="studentGrid"></div>
                            <div class="empty-state" id="emptyState">
                                <i class="fas fa-search fa-3x"></i>
                                <p>没有找到匹配的学生</p>
                            </div>
                        </div>
                        
                        <!-- 分页控制 -->
                        <div class="pagination-controls">
                            <div class="pagination-info">
                                显示 <span id="startRange">1</span> 至 <span id="endRange">0</span> 项，共 <span id="totalItems">0</span> 项
                            </div>
                            <div class="pagination-buttons">
                                <button class="mdui-btn mdui-btn-icon" id="prevPage" disabled>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <div class="page-numbers" id="pageNumbers"></div>
                                <button class="mdui-btn mdui-btn-icon" id="nextPage" disabled>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="mdui-btn mdui-ripple" id="cancelSelectionBtn">取消</button>
                        <button class="mdui-btn mdui-color-green mdui-ripple" id="confirmSelectionBtn">确认选择</button>
                    </div>
                </div>
            </div>
        `;
        
        modalContainer.innerHTML = dialogHTML;
        document.body.appendChild(modalContainer);
        
        // 添加对话框样式
        const style = document.createElement('style');
        style.textContent = `
            /* 模态框基础样式 */
            .student-selection-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.3s ease;
            }
            
            .modal-content {
                background: var(--card-bg);
                border-radius: var(--border-radius-lg);
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: var(--shadow-xl);
                animation: slideIn 0.3s ease;
                overflow: hidden;
            }
            
            /* 模态框头部 */
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
                color: white;
            }
            
            .modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
            }
            
            .modal-header-actions {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .selected-count {
                font-size: 0.9rem;
                opacity: 0.9;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
                opacity: 0.8;
                transition: var(--transition-fast);
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .close-btn:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* 模态框主体 */
            .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            /* 搜索和筛选区域 */
            .filter-section {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .search-container {
                position: relative;
                width: 100%;
            }
            
            .search-icon {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-secondary);
                pointer-events: none;
            }
            
            .search-input {
                width: 100%;
                padding: 10px 12px 10px 36px;
                border: 2px solid var(--border-color);
                border-radius: var(--border-radius);
                font-size: 1rem;
                transition: var(--transition);
                background: var(--background);
            }
            
            .search-input:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            
            .filter-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                align-items: center;
            }
            
            .filter-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
                gap: 6px;
                user-select: none;
            }
            
            .filter-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: var(--primary-color);
            }
            
            /* 操作按钮 */
            .action-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 8px 0;
            }
            
            .action-buttons .mdui-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.9rem;
                padding: 6px 12px;
                transition: var(--transition);
            }
            
            /* 学生列表 */
            .student-list-container {
                flex: 1;
                min-height: 300px;
                position: relative;
            }
            
            .student-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 8px;
            }
            
            .student-item {
                transition: var(--transition);
                animation: itemFadeIn 0.3s ease;
            }
            
            .student-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
                padding: 10px;
                border-radius: var(--border-radius);
                background: var(--background);
                border: 2px solid transparent;
                transition: var(--transition);
                position: relative;
                overflow: hidden;
            }
            
            .student-checkbox::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
                transition: left 0.5s ease;
            }
            
            .student-checkbox:hover {
                border-color: var(--primary-color);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .student-checkbox:hover::before {
                left: 100%;
            }
            
            .student-checkbox input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: var(--primary-color);
                cursor: pointer;
            }
            
            .student-name {
                margin-left: 8px;
                font-size: 0.95rem;
                font-weight: 500;
                flex: 1;
            }
            
            /* 学生特殊标识样式 */
            .top-student {
                color: var(--warning-color);
                font-weight: 600;
            }
            
            .potential-star {
                color: var(--accent-color);
                font-weight: 600;
            }
            
            .special-green {
                color: var(--success-color);
                font-weight: 600;
            }
            
            .student-item.selected .student-checkbox {
                background: rgba(99, 102, 241, 0.1);
                border-color: var(--primary-color);
            }
            
            /* 空状态 */
            .empty-state {
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: var(--text-secondary);
                gap: 12px;
            }
            
            .empty-state i {
                color: var(--text-light);
            }
            
            /* 分页控制 */
            .pagination-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 0 8px;
                border-top: 1px solid var(--border-color);
                margin-top: 8px;
            }
            
            .pagination-info {
                font-size: 0.9rem;
                color: var(--text-secondary);
            }
            
            .pagination-buttons {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .page-numbers {
                display: flex;
                gap: 4px;
            }
            
            .page-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                background: var(--card-bg);
                cursor: pointer;
                transition: var(--transition);
                font-size: 0.9rem;
            }
            
            .page-btn:hover:not(:disabled) {
                border-color: var(--primary-color);
                color: var(--primary-color);
            }
            
            .page-btn.active {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }
            
            .page-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            /* 模态框底部 */
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: var(--background);
            }
            
            /* 动画效果 */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes itemFadeIn {
                from { 
                    opacity: 0;
                    transform: translateY(10px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .modal-content {
                    width: 95%;
                    max-height: 95vh;
                }
                
                .modal-header {
                    padding: 16px 20px;
                }
                
                .modal-body {
                    padding: 16px;
                }
                
                .student-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 6px;
                }
                
                .filter-controls {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .action-buttons {
                    justify-content: center;
                }
                
                .pagination-controls {
                    flex-direction: column;
                    gap: 12px;
                    align-items: center;
                }
                
                .pagination-info {
                    order: 2;
                }
            }
        `;
        document.head.appendChild(style);
        
        // 状态管理
        let currentPage = 1;
        const pageSize = 20;
        let filteredStudents = [...students];
        let selectedIds = new Set(selectedStudents.map(s => s.id));
        
        // DOM元素引用
        const modalElements = {
            studentGrid: document.getElementById('studentGrid'),
            selectedCount: document.getElementById('selectedCount'),
            studentSearch: document.getElementById('studentSearch'),
            filterTop11: document.getElementById('filterTop11'),
            filterPotentialStars: document.getElementById('filterPotentialStars'),
            filterSpecialGreen: document.getElementById('filterSpecialGreen'),
            emptyState: document.getElementById('emptyState'),
            startRange: document.getElementById('startRange'),
            endRange: document.getElementById('endRange'),
            totalItems: document.getElementById('totalItems'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            pageNumbers: document.getElementById('pageNumbers')
        };
        
        // 更新已选择计数
        const updateSelectedCount = () => {
            modalElements.selectedCount.textContent = selectedIds.size;
        };
        
        // 过滤学生
        const filterStudents = () => {
            const searchTerm = modalElements.studentSearch.value.toLowerCase().trim();
            const onlyTop11 = modalElements.filterTop11.checked;
            const onlyPotentialStars = modalElements.filterPotentialStars.checked;
            const onlySpecialGreen = modalElements.filterSpecialGreen.checked;
            
            filteredStudents = students.filter(student => {
                // 搜索过滤
                const matchesSearch = student.name.toLowerCase().includes(searchTerm);
                
                // 其他筛选条件
                const matchesTop11 = !onlyTop11 || student.rank <= 11;
                const matchesPotentialStar = !onlyPotentialStars || student.isPotentialStar;
                const matchesSpecialGreen = !onlySpecialGreen || student.isSpecialGreen;
                
                return matchesSearch && matchesTop11 && matchesPotentialStar && matchesSpecialGreen;
            });
            
            // 重置到第一页
            currentPage = 1;
            
            // 更新UI
            renderStudentGrid();
            renderPagination();
        };
        
        // 渲染学生网格
        const renderStudentGrid = () => {
            // 清空网格
            modalElements.studentGrid.innerHTML = '';
            
            // 计算当前页的学生
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
            const currentStudents = filteredStudents.slice(startIndex, endIndex);
            
            // 更新分页信息
            modalElements.startRange.textContent = filteredStudents.length > 0 ? startIndex + 1 : 0;
            modalElements.endRange.textContent = endIndex;
            modalElements.totalItems.textContent = filteredStudents.length;
            
            // 显示/隐藏空状态
            modalElements.emptyState.style.display = filteredStudents.length === 0 ? 'flex' : 'none';
            
            // 添加学生项
            currentStudents.forEach((student, index) => {
                const isSelected = selectedIds.has(student.id);
                const studentItem = document.createElement('div');
                studentItem.className = `student-item ${isSelected ? 'selected' : ''}`;
                studentItem.style.animationDelay = `${index * 20}ms`;
                
                // 确定学生样式类
                let studentClass = '';
                if (student.isSpecialGreen) {
                    studentClass = 'special-green';
                } else if (student.isPotentialStar) {
                    studentClass = 'potential-star';
                } else if (student.rank <= 11) {
                    studentClass = 'top-student';
                }
                
                studentItem.innerHTML = `
                    <label class="student-checkbox">
                        <input type="checkbox" class="student-select" data-id="${student.id}" ${isSelected ? 'checked' : ''}>
                        <span class="student-name ${studentClass}">${student.name}</span>
                    </label>
                `;
                
                // 添加点击事件
                const checkbox = studentItem.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    updateStudentSelection(student.id, checkbox.checked);
                });
                
                // 添加整行点击事件
                studentItem.addEventListener('click', () => {
                    checkbox.checked = !checkbox.checked;
                    updateStudentSelection(student.id, checkbox.checked);
                });
                
                modalElements.studentGrid.appendChild(studentItem);
            });
        };
        
        // 更新学生选择状态
        const updateStudentSelection = (studentId, isSelected) => {
            if (isSelected) {
                selectedIds.add(studentId);
            } else {
                selectedIds.delete(studentId);
            }
            
            // 更新UI
            const studentItem = document.querySelector(`.student-select[data-id="${studentId}"]`).closest('.student-item');
            if (studentItem) {
                studentItem.classList.toggle('selected', isSelected);
            }
            
            updateSelectedCount();
        };
        
        // 渲染分页控制
        const renderPagination = () => {
            const totalPages = Math.ceil(filteredStudents.length / pageSize);
            
            // 更新分页按钮状态
            modalElements.prevPage.disabled = currentPage === 1;
            modalElements.nextPage.disabled = currentPage === totalPages || totalPages === 0;
            
            // 清空页码按钮
            modalElements.pageNumbers.innerHTML = '';
            
            // 只有一页或无数据时不显示页码按钮
            if (totalPages <= 1) return;
            
            // 生成分页按钮
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            // 调整起始页码以确保显示足够的页码
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            // 添加页码按钮
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderStudentGrid();
                    renderPagination();
                });
                modalElements.pageNumbers.appendChild(pageBtn);
            }
        };
        
        // 全选
        const selectAll = () => {
            filteredStudents.forEach(student => {
                selectedIds.add(student.id);
            });
            updateSelectedCount();
            renderStudentGrid();
        };
        
        // 取消全选
        const deselectAll = () => {
            filteredStudents.forEach(student => {
                selectedIds.delete(student.id);
            });
            updateSelectedCount();
            renderStudentGrid();
        };
        
        // 反选
        const invertSelection = () => {
            filteredStudents.forEach(student => {
                if (selectedIds.has(student.id)) {
                    selectedIds.delete(student.id);
                } else {
                    selectedIds.add(student.id);
                }
            });
            updateSelectedCount();
            renderStudentGrid();
        };
        
        // 选择前11名
        const selectTop11 = () => {
            students.filter(s => s.rank <= 11).forEach(student => {
                selectedIds.add(student.id);
            });
            updateSelectedCount();
            renderStudentGrid();
            showToast('成功', '已选择前11名学生');
        };
        
        // 绑定事件
        
        // 搜索和筛选
        modalElements.studentSearch.addEventListener('input', filterStudents);
        modalElements.filterTop11.addEventListener('change', filterStudents);
        modalElements.filterPotentialStars.addEventListener('change', filterStudents);
        modalElements.filterSpecialGreen.addEventListener('change', filterStudents);
        
        // 分页控制
        modalElements.prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderStudentGrid();
                renderPagination();
            }
        });
        
        modalElements.nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredStudents.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderStudentGrid();
                renderPagination();
            }
        });
        
        // 操作按钮
        document.getElementById('selectAllBtn').addEventListener('click', selectAll);
        document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
        document.getElementById('selectInvertBtn').addEventListener('click', invertSelection);
        document.getElementById('selectTop11Btn').addEventListener('click', selectTop11);
        
        // 模态框控制
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            modalContainer.remove();
            style.remove();
        });
        
        document.getElementById('cancelSelectionBtn').addEventListener('click', () => {
            modalContainer.remove();
            style.remove();
        });
        
        document.getElementById('confirmSelectionBtn').addEventListener('click', () => {
            if (selectedIds.size === 0) {
                showToast('提示', '请至少选择一名学生');
                return;
            }
            
            // 更新全局选中的学生
            selectedStudents = students.filter(student => selectedIds.has(student.id));
            updateUI();
            modalContainer.remove();
            style.remove();
            showToast('成功', `已选择 ${selectedIds.size} 名学生`);
        });
        
        // 点击模态框外部关闭
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
                style.remove();
            }
        });
        
        // 初始化
        updateSelectedCount();
        filterStudents();
    }
    
    // 显示提示信息 - 动态创建toast - 使用函数声明形式以避免提升问题
    function showToast(title, message) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'mdui-toast mdui-toast-show';
        toast.innerHTML = `
            <div class="mdui-toast-content">
                <div class="mdui-toast-text">${title}: ${message}</div>
            </div>
        `;
        
        // 添加到容器
        if (elements.toastContainer) {
            elements.toastContainer.appendChild(toast);
            
            // 3秒后移除
            setTimeout(() => {
                toast.classList.remove('mdui-toast-show');
                setTimeout(() => {
                    if (elements.toastContainer.contains(toast)) {
                        elements.toastContainer.removeChild(toast);
                    }
                }, 400);
            }, 3000);
        } else {
            console.log(`${title}: ${message}`);
        }
    }
