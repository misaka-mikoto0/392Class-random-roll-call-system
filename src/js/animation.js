// 动画函数库 - 可复用的动画组件和工具

// 缓动函数库
export const easeFunctions = {
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
    },
    // 线性
    linear: (t) => t,
    // 加速
    easeInCubic: (t) => t * t * t,
    // 减速
    easeOutCubic: (t) => (--t) * t * t + 1,
    // 先加速后减速
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};

// 虚晃一枪动画配置
export const defaultAnimationConfig = {
    totalDuration: 900, // 总动画时长（毫秒）
    initialAccelerationDuration: 150, // 初始加速阶段时长
    misleadDecelerationDuration: 350, // 误导性减速阶段时长
    fakeoutDuration: 200, // 突然变向阶段时长
    finalDecelerationDuration: 200, // 最终减速阶段时长
    fakeoutIntensity: 0.5, // 虚晃强度（0-1）
    frameDuration: 10 // 每帧持续时间（毫秒）
};

// 固定种子的随机数生成器
export const seededRandom = (seed) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// Fisher-Yates 洗牌算法（使用固定种子）
export const shuffleArray = (array, seed) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed) * (i + 1));
        seed++;
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// 计算各阶段的帧数
export const calculateFrames = (config) => {
    const initialAccelFrames = Math.round(config.initialAccelerationDuration / config.frameDuration);
    const misleadDecelFrames = Math.round(config.misleadDecelerationDuration / config.frameDuration);
    const fakeoutFrames = Math.round(config.fakeoutDuration / config.frameDuration);
    const finalDecelFrames = Math.round(config.finalDecelerationDuration / config.frameDuration);
    const totalFrames = initialAccelFrames + misleadDecelFrames + fakeoutFrames + finalDecelFrames;
    
    return {
        initialAccelFrames,
        misleadDecelFrames,
        fakeoutFrames,
        finalDecelFrames,
        totalFrames
    };
};

// 虚晃一枪动画类
export class FakeoutAnimation {
    constructor(config = {}) {
        this.config = { ...defaultAnimationConfig, ...config };
        this.frames = calculateFrames(this.config);
        this.animationId = null;
        this.startTime = 0;
        this.callbacks = {
            onFrame: null,
            onComplete: null,
            onError: null
        };
    }
    
    // 计算当前帧应该显示的索引
    calculateCurrentIndex(frame, items, targetIndex, misleadTargetIndex) {
        let progress, easedProgress;
        const { initialAccelFrames, misleadDecelFrames, fakeoutFrames, finalDecelFrames } = this.frames;
        
        if (frame <= initialAccelFrames) {
            // 阶段1：初始加速
            progress = frame / initialAccelFrames;
            easedProgress = easeFunctions.easeInQuad(progress);
            return Math.floor(easedProgress * items.length * 3) % items.length;
        } else if (frame <= initialAccelFrames + misleadDecelFrames) {
            // 阶段2：误导性减速
            progress = (frame - initialAccelFrames) / misleadDecelFrames;
            easedProgress = easeFunctions.easeOutQuad(progress);
            
            const startIndex = Math.floor(items.length * 3) % items.length;
            const diff = misleadTargetIndex - startIndex;
            return Math.floor((startIndex + diff * easedProgress) % items.length);
        } else if (frame <= initialAccelFrames + misleadDecelFrames + fakeoutFrames) {
            // 阶段3：突然变向
            progress = (frame - initialAccelFrames - misleadDecelFrames) / fakeoutFrames;
            easedProgress = easeFunctions.easeInOutQuad(progress);
            
            const fakeoutRange = Math.floor(items.length * this.config.fakeoutIntensity);
            const fakeoutDirection = Math.random() > 0.5 ? 1 : -1;
            
            return Math.floor((misleadTargetIndex + fakeoutDirection * fakeoutRange * easedProgress) % items.length);
        } else {
            // 阶段4：最终减速到真实结果
            progress = (frame - initialAccelFrames - misleadDecelFrames - fakeoutFrames) / finalDecelFrames;
            easedProgress = easeFunctions.easeOutBounce(progress);
            
            const fakeoutEndIndex = Math.floor((misleadTargetIndex + items.length * this.config.fakeoutIntensity) % items.length);
            const diff = targetIndex - fakeoutEndIndex;
            return Math.floor((fakeoutEndIndex + diff * easedProgress) % items.length);
        }
    }
    
    // 开始动画
    start(items, targetIndex, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                if (!items || items.length === 0) {
                    throw new Error('动画项不能为空');
                }
                
                const { onFrame, onComplete } = options;
                this.callbacks.onFrame = onFrame;
                this.callbacks.onComplete = onComplete;
                
                let currentFrame = 0;
                const totalFrames = this.frames.totalFrames;
                const misleadTargetIndex = Math.floor(Math.random() * items.length);
                const startTime = performance.now();
                
                // 使用requestAnimationFrame代替setTimeout，提高动画性能
                const animate = (timestamp) => {
                    try {
                        const elapsed = timestamp - startTime;
                        const expectedFrame = Math.floor(elapsed / this.config.frameDuration);
                        
                        if (currentFrame < totalFrames && expectedFrame >= currentFrame) {
                            const currentIndex = this.calculateCurrentIndex(
                                currentFrame, 
                                items, 
                                targetIndex, 
                                misleadTargetIndex
                            );
                            
                            // 确保索引为正数
                            const normalizedIndex = (currentIndex + items.length) % items.length;
                            
                            if (this.callbacks.onFrame) {
                                this.callbacks.onFrame(normalizedIndex, items[normalizedIndex], currentFrame, totalFrames);
                            }
                            
                            currentFrame++;
                            this.animationId = requestAnimationFrame(animate);
                        } else if (currentFrame >= totalFrames) {
                            if (this.callbacks.onFrame) {
                                this.callbacks.onFrame(targetIndex, items[targetIndex], totalFrames, totalFrames);
                            }
                            
                            if (this.callbacks.onComplete) {
                                this.callbacks.onComplete(targetIndex, items[targetIndex]);
                            }
                            
                            resolve({ targetIndex, item: items[targetIndex] });
                            this.animationId = null;
                        } else {
                            // 继续下一帧
                            this.animationId = requestAnimationFrame(animate);
                        }
                    } catch (error) {
                        this.stop();
                        reject(error);
                    }
                };
                
                // 添加超时处理
                const timeoutId = setTimeout(() => {
                    this.stop();
                    const error = new Error('动画超时');
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                    reject(error);
                }, this.config.totalDuration + 500);
                
                // 保存超时ID以便在stop时清除
                this.timeoutId = timeoutId;
                
                // 开始动画
                this.animationId = requestAnimationFrame(animate);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 停止动画
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    // 获取动画配置
    getConfig() {
        return { ...this.config };
    }
    
    // 更新动画配置
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.frames = calculateFrames(this.config);
    }
}

// 简单的数字动画
export const animateNumber = (start, end, duration, callback, easing = 'easeOutQuad') => {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const easingFn = easeFunctions[easing] || easeFunctions.easeOutQuad;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentValue = start + (end - start) * easedProgress;
            
            if (callback) {
                callback(currentValue);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve(end);
            }
        };
        
        requestAnimationFrame(animate);
    });
};

// 颜色渐变动画
export const animateColor = (startColor, endColor, duration, callback) => {
    return new Promise((resolve) => {
        const parseColor = (color) => {
            const hex = color.replace('#', '');
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        };
        
        const formatColor = (color) => {
            return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
        };
        
        const start = parseColor(startColor);
        const end = parseColor(endColor);
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeFunctions.easeOutQuad(progress);
            
            const currentColor = {
                r: start.r + (end.r - start.r) * easedProgress,
                g: start.g + (end.g - start.g) * easedProgress,
                b: start.b + (end.b - start.b) * easedProgress
            };
            
            if (callback) {
                callback(formatColor(currentColor));
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve(formatColor(end));
            }
        };
        
        requestAnimationFrame(animate);
    });
};

// 动画预览工具
export class AnimationPreviewer {
    constructor(container) {
        this.container = container;
        this.animation = null;
        this.isPlaying = false;
    }
    
    // 预览虚晃一枪动画
    previewFakeoutAnimation(items, config = {}) {
        if (this.isPlaying) {
            this.stop();
        }
        
        this.isPlaying = true;
        const targetIndex = Math.floor(Math.random() * items.length);
        const animation = new FakeoutAnimation(config);
        this.animation = animation;
        
        return animation.start(items, targetIndex, {
            onFrame: (index, item) => {
                if (this.container) {
                    this.container.textContent = item.name || item.toString();
                }
            },
            onComplete: () => {
                this.isPlaying = false;
            }
        });
    }
    
    // 停止预览
    stop() {
        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }
        this.isPlaying = false;
    }
    
    // 测试不同配置
    testConfig(config) {
        if (this.isPlaying) {
            this.stop();
        }
        
        // 简单的测试项目
        const testItems = Array.from({ length: 10 }, (_, i) => ({ name: `项目 ${i + 1}` }));
        return this.previewFakeoutAnimation(testItems, config);
    }
}