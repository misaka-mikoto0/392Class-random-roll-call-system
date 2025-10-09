// 切换原神背景图片
$(document).ready(function() {
    // 已使用的背景图片列表，避免重复
    let usedBackgrounds = [];
    // 自动切换定时器
    let autoChangeTimer = null;
    // 自动切换间隔（毫秒）
    const AUTO_CHANGE_INTERVAL = 30000; // 30秒
    
    // 更新背景图片的函数
    function updateBackgroundImage() {
        $.ajax({
            url: 'https://v2.xxapi.cn/api/ys',
            type: 'get',
            success: function(res) {
                // 状态码 200 表示请求成功
                if (res.code === 200 && res.data) {
                    // 检查是否已使用过此图片
                    if (usedBackgrounds.includes(res.data)) {
                        // 如果已使用过，则重新请求
                        updateBackgroundImage();
                        return;
                    }
                    
                    console.log('背景图片更新为:', res.data);
                    // 更新body背景图片
                    document.body.style.backgroundImage = `url(${res.data})`;
                    // 添加带背景的类
                    document.body.classList.add('with-background');
                    
                    // 添加到已使用列表
                    usedBackgrounds.push(res.data);
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
                } else {
                    console.error('获取背景图片失败', res);
                }
            },
            error: function() {
                console.error('获取背景图片网络错误');
            }
        });
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
        
        // 启动自动切换（如果还没有启动）
        if (!autoChangeTimer && document.body.classList.contains('with-background')) {
            startAutoChange();
        }
        
        // 立即恢复按钮状态
        setTimeout(() => {
            btn.prop('disabled', false).html('<i class="fas fa-image"></i>');
        }, 500);
    });
    
    // 页面加载时检查是否已有背景图片
    $(window).on('load', function() {
        if (document.body.classList.contains('with-background')) {
            startAutoChange();
        }
    });
});