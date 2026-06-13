// 切换原神背景图片
document.addEventListener('DOMContentLoaded', function() {
    let usedBackgrounds = [];
    let autoChangeTimer = null;
    const AUTO_CHANGE_INTERVAL = 30000;

    const gradientSets = [
        ['#a18cd1', '#fbc2eb'],
        ['#84fab0', '#8fd3f4'],
        ['#fccb90', '#d57eeb'],
        ['#ffecd2', '#fcb69f'],
        ['#0093e9', '#80d0c7'],
        ['#d4fc79', '#96e6a1'],
        ['#e0c3fc', '#8ec5fc'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#fa709a', '#fee140']
    ];

    function generateRandomGradient() {
        const randomIndex = Math.floor(Math.random() * gradientSets.length);
        const [color1, color2] = gradientSets[randomIndex];
        const direction = Math.floor(Math.random() * 360);
        return `linear-gradient(${direction}deg, ${color1}, ${color2})`;
    }

    function setInitialGradientBackground() {
        const gradient = generateRandomGradient();
        document.body.style.background = gradient;
        if (document.body.classList.contains('with-background')) {
            document.body.classList.remove('with-background');
        }
    }

    function updateBackgroundImage(isAuto) {
        const img = new Image();
        const timestamp = new Date().getTime();
        const url = `https://t.alcy.cc/ys?${timestamp}`;

        img.onload = function() {
            document.body.style.backgroundImage = `url(${url})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.classList.add('with-background');

            usedBackgrounds.push(url);
            if (usedBackgrounds.length > 20) {
                usedBackgrounds.shift();
            }

            if (!isAuto) {
                const toastContainer = document.querySelector('.toast-container');
                if (!toastContainer) {
                    console.error('toast-container element not found');
                    return;
                }

                const toast = document.createElement('div');
                toast.className = 'toast';
                toast.innerHTML = '<strong>成功</strong><span>背景图片已更新</span>';
                toastContainer.appendChild(toast);
                toast.style.display = 'block';

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

        img.src = url;
    }

    function startAutoChange() {
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
        }

        autoChangeTimer = setInterval(() => {
            if (document.body.classList.contains('with-background')) {
                updateBackgroundImage(true);
            } else {
                stopAutoChange();
            }
        }, AUTO_CHANGE_INTERVAL);
    }

    function stopAutoChange() {
        if (autoChangeTimer) {
            clearInterval(autoChangeTimer);
            autoChangeTimer = null;
        }
    }

    function setupBackgroundButton() {
        const changeBackgroundBtn = document.getElementById('changeBackgroundBtn');
        if (!changeBackgroundBtn) {
            console.error('changeBackgroundBtn element not found');
            return;
        }

        changeBackgroundBtn.addEventListener('click', function() {
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            updateBackgroundImage(false);

            if (!autoChangeTimer) {
                setTimeout(() => {
                    startAutoChange();
                }, 1000);
            }

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-image"></i>';
            }, 500);
        });
    }

    window.addEventListener('load', function() {
        setInitialGradientBackground();
    });

    setupBackgroundButton();
});