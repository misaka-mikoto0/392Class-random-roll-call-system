// 切换原神背景图片
$(document).ready(function() {
    // 已使用的背景图片列表，避免重复
    let usedBackgrounds = [];
    // 自动切换定时器
    let autoChangeTimer = null;
    // 自动切换间隔（毫秒）
    const AUTO_CHANGE_INTERVAL = 30000; // 30秒
    
    // 渐变背景的颜色集
    const gradientSets = [
        ['#a18cd1', '#fbc2eb'], // 粉紫色系
        ['#84fab0', '#8fd3f4'], // 青绿色系
        ['#fccb90', '#d57eeb'], // 橙紫色系
        ['#ffecd2', '#fcb69f'], // 橙黄色系
        ['#0093e9', '#80d0c7'], // 蓝绿色系
        ['#d4fc79', '#96e6a1'], // 黄绿色系
        ['#e0c3fc', '#8ec5fc'], // 蓝紫色系
        ['#f093fb', '#f5576c'], // 粉橙色系
        ['#4facfe', '#00f2fe'], // 亮蓝色系
        ['#fa709a', '#fee140']  // 粉黄色系
    ];
    
    // 生成随机渐变背景的函数
    function generateRandomGradient() {
        // 随机选择一个渐变
        const randomIndex = Math.floor(Math.random() * gradientSets.length);
        
        // 获取渐变颜色
        const [color1, color2] = gradientSets[randomIndex];
        
        // 随机决定渐变方向
        const direction = Math.floor(Math.random() * 360);
        
        // 创建渐变背景
        return `linear-gradient(${direction}deg, ${color1}, ${color2})`;
    }
    
    // 设置初始动态渐变背景
    function setInitialGradientBackground() {
        // 生成渐变背景
        const gradient = generateRandomGradient();
        
        // 设置背景
        document.body.style.background = gradient;
        // 如果有with-background类，移除它
        if (document.body.classList.contains('with-background')) {
            document.body.classList.remove('with-background');
        }
    }
    
    // 更新背景图片的函数
    function updateBackgroundImage() {
        // 创建一个临时图片对象来处理重定向
        const img = new Image();
        const timestamp = new Date().getTime(); // 添加时间戳防止缓存
        const url = `https://t.alcy.cc/ys?${timestamp}`;
        
        img.onload = function() {
            // 图片加载成功后更新背景
            document.body.style.backgroundImage = `url(${url})`;
            // 添加带背景的类
            document.body.classList.add('with-background');
                       
            // 添加到已使用列表
            usedBackgrounds.push(url);
            // 如果列表过长，清理早期的图片
            if (usedBackgrounds.length > 20) {
                usedBackgrounds.shift();
            }
            
            // 如果是自动切换，不显示提示；如果是手动切换，显示提示
            if (!arguments[0] || arguments[0] !== 'auto') {
                // 显示成功提示
                const toast = document.createElement('div');
                toast.className = 'toast';
                toast.innerHTML = '<strong>成功</strong><span>背景图片已更新</span>';
                document.querySelector('.toast-container').appendChild(toast);
                toast.style.display = 'block';
                
                // 3秒后移除提示
                setTimeout(() => {
                    toast.style.display = 'none';
                    setTimeout(() => {
                        toast.remove();
                    }, 300);
                }, 3000);
            }
        };
        
        img.onerror = function() {
            console.error('获取背景图片失败');
        };
        
        // 设置图片源，触发加载
        img.src = url;
    }
    
    // 开始自动切换背景
    function startAutoChange() {
        // 清除之前的定时器
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
        }
        
        // 设置新的定时器
        autoChangeTimer = setInterval(() => {
            // 检查当前是否有背景图片
            if (document.body.classList.contains('with-background')) {
                updateBackgroundImage('auto');
            } else {
                // 如果没有背景图片，停止自动切换
                stopAutoChange();
            }
        }, AUTO_CHANGE_INTERVAL);
    }
    
    // 停止自动切换背景
    function stopAutoChange() {
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
            autoChangeTimer = null;
        }
    }
    
    // 点击按钮切换背景
    $(document).on('click', '#changeBackgroundBtn', function() {
        // 显示加载状态
        const btn = $(this);
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        
        // 更新背景图片
        updateBackgroundImage();
        
        // 确保启动自动切换（不再检查with-background类，因为updateBackgroundImage会添加该类）
        if (!autoChangeTimer) {
            // 稍微延迟启动，确保背景图片已成功设置
            setTimeout(() => {
                startAutoChange();
            }, 1000);
        }
        
        // 立即恢复按钮状态
        setTimeout(() => {
            btn.prop('disabled', false).html('<i class="fas fa-image"></i>');
        }, 500);
    });
    
    // 页面加载时设置初始渐变背景
$(window).on('load', function() {
    // 设置初始渐变背景
    setInitialGradientBackground();
});
});