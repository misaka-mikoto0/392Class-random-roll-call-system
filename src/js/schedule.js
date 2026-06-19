/**
 * 课表管理器
 * 功能：解析课表CSV、匹配当前时间、计算周次轮换、渲染课程信息
 */
class ScheduleManager {
    constructor() {
        this.scheduleData = null;
        this.error = null;
        this.periods = [
            { name: '第1节', start: '05:45', end: '07:10', duration: 85 },
            { name: '第2节', start: '08:05', end: '08:50', duration: 45 },
            { name: '第3节', start: '09:00', end: '09:45', duration: 45 },
            { name: '第4节', start: '10:20', end: '11:05', duration: 45 },
            { name: '第5节', start: '11:15', end: '12:00', duration: 45 },
            { name: '第6节', start: '14:30', end: '15:15', duration: 45 },
            { name: '第7节', start: '15:25', end: '16:10', duration: 45 },
            { name: '第8节', start: '16:20', end: '17:05', duration: 45 },
            { name: '第9节', start: '17:35', end: '18:20', duration: 45 },
            { name: '第10节', start: '19:00', end: '19:50', duration: 50 },
            { name: '第11节', start: '20:00', end: '20:50', duration: 50 },
            { name: '第12节', start: '21:00', end: '22:00', duration: 60 }
        ];
        // 基准日期：2026年6月19日为第二周周一（月份从0开始）
        this.baseDate = new Date(2026, 5, 19);
    }

    /**
     * 加载课表文件
     */
    async loadSchedule() {
        try {
            const response = await fetch('src/assets/课表.csv');
            if (!response.ok) {
                throw new Error('\u65e0\u6cd5\u52a0\u8f7d\u8bfe\u8868\u6587\u4ef6: ' + response.status);
            }
            const text = await response.text();
            this.scheduleData = this.parseCSV(text);
            this.error = null;
        } catch (err) {
            this.error = err.message;
            console.error('\u8bfe\u8868\u52a0\u8f7d\u5931\u8d25:', err);
        }
    }

    /**
     * 解析CSV文本
     * @param {string} text - CSV原始文本
     * @returns {Object} 解析后的课表数据
     */
    parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) {
            throw new Error('\u8bfe\u8868\u6587\u4ef6\u4e3a\u7a7a');
        }

        const headers = lines[0].split(',');
        const data = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',');
            const dayKey = cols[0];
            const courses = {};

            for (let j = 1; j < headers.length; j++) {
                const header = headers[j].trim();
                const value = cols[j] ? cols[j].trim() : '';
                courses[header] = value;
            }
            data[dayKey] = courses;
        }
        return data;
    }

    /**
     * 计算当前是第几周
     * @param {Date} date - 目标日期，默认为当前时间
     * @returns {number} 周次（从1开始）
     */
    getWeekNumber(date) {
        date = date || new Date();
        var msPerDay = 24 * 60 * 60 * 1000;
        var daysDiff = Math.floor((date.getTime() - this.baseDate.getTime()) / msPerDay);
        return 2 + Math.floor(daysDiff / 7);
    }

    /**
     * 根据日期获取对应的课表日期键值
     * @param {Date} date - 目标日期
     * @returns {string|null} 日期键值，周日返回null
     */
    getDayKey(date) {
        date = date || new Date();
        var day = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
        var weekNumber = this.getWeekNumber(date);

        if (day >= 1 && day <= 5) {
            var weekdays = ['周一', '周二', '周三', '周四', '周五'];
            return weekdays[day - 1];
        } else if (day === 6) {
            var satIndex = ((weekNumber - 1) % 4 + 4) % 4;
            var saturdays = ['周六一', '周六二', '周六三', '周六四'];
            return saturdays[satIndex];
        } else {
            return null; // 周日无课
        }
    }

    /**
     * 根据时间获取当前节次
     * @param {Date} time - 目标时间
     * @returns {Object|null} 节次信息，不在上课时间返回null
     */
    getCurrentPeriod(time) {
        time = time || new Date();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var totalMinutes = hours * 60 + minutes;

        for (var i = 0; i < this.periods.length; i++) {
            var startParts = this.periods[i].start.split(':');
            var endParts = this.periods[i].end.split(':');
            var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
            var endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

            if (totalMinutes >= startMin && totalMinutes < endMin) {
                return {
                    index: i + 1,
                    name: this.periods[i].name,
                    start: this.periods[i].start,
                    end: this.periods[i].end,
                    duration: this.periods[i].duration,
                    remainingMinutes: endMin - totalMinutes
                };
            }
        }
        return null;
    }

    /**
     * 获取下一节课
     * @param {Date} time - 目标时间
     * @returns {Object|null} 下一节信息，无则返回null
     */
    getNextPeriod(time) {
        time = time || new Date();
        var hours = time.getHours();
        var minutes = time.getMinutes();
        var totalMinutes = hours * 60 + minutes;

        for (var i = 0; i < this.periods.length; i++) {
            var startParts = this.periods[i].start.split(':');
            var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
            if (totalMinutes < startMin) {
                return {
                    index: i + 1,
                    name: this.periods[i].name,
                    start: this.periods[i].start,
                    end: this.periods[i].end
                };
            }
        }
        return null;
    }

    /**
     * 获取当前课程信息
     * @returns {Object} 课程状态信息
     */
    getCurrentCourse() {
        if (this.error) {
            return { status: 'error', message: this.error };
        }
        if (!this.scheduleData) {
            return { status: 'error', message: '\u8bfe\u8868\u6570\u636e\u672a\u52a0\u8f7d' };
        }

        var now = new Date();
        var dayKey = this.getDayKey(now);
        var weekNumber = this.getWeekNumber(now);

        if (!dayKey) {
            return {
                status: 'rest',
                weekNumber: weekNumber,
                message: '\u4eca\u65e5\u4f11\u606f\uff0c\u65e0\u8bfe\u7a0b\u5b89\u6392'
            };
        }

        var daySchedule = this.scheduleData[dayKey];
        if (!daySchedule) {
            return {
                status: 'error',
                weekNumber: weekNumber,
                message: '\u672a\u627e\u5230 ' + dayKey + ' \u7684\u8bfe\u7a0b\u5b89\u6392'
            };
        }

        var period = this.getCurrentPeriod(now);
        if (!period) {
            var nextPeriod = this.getNextPeriod(now);
            return {
                status: 'break',
                weekNumber: weekNumber,
                day: dayKey,
                message: '\u5f53\u524d\u4e0d\u5728\u4e0a\u8bfe\u65f6\u95f4',
                nextPeriod: nextPeriod
            };
        }

        var courseName = daySchedule[period.name] || '\u672a\u77e5\u8bfe\u7a0b';

        return {
            status: 'active',
            weekNumber: weekNumber,
            day: dayKey,
            period: period,
            courseName: courseName
        };
    }
}

/**
 * 课表UI渲染器
 */
class ScheduleUI {
    constructor(manager) {
        this.manager = manager;
        this.container = null;
        this.timerId = null;
    }

    /**
     * 绑定DOM容器
     * @param {HTMLElement} container - 显示容器
     */
    bind(container) {
        this.container = container;
    }

    /**
     * 格式化时间，将分钟转为时分显示
     */
    formatTime(minutes) {
        if (minutes < 60) {
            return minutes + '\u5206\u949f';
        }
        var h = Math.floor(minutes / 60);
        var m = minutes % 60;
        if (m === 0) {
            return h + '\u5c0f\u65f6';
        }
        return h + '\u5c0f\u65f6' + m + '\u5206';
    }

    /**
     * 渲染课程信息
     */
    render() {
        if (!this.container) return;

        var info = this.manager.getCurrentCourse();
        var html = '';

        if (info.status === 'error') {
            html = this.renderError(info.message);
        } else if (info.status === 'rest') {
            html = this.renderRest(info);
        } else if (info.status === 'break') {
            html = this.renderBreak(info);
        } else if (info.status === 'active') {
            html = this.renderActive(info);
        } else {
            html = this.renderError('\u672a\u77e5\u72b6\u6001');
        }

        this.container.innerHTML = html;
    }

    renderError(message) {
        return '<div class="schedule-error">' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<span>' + message + '</span>' +
            '</div>';
    }

    renderRest(info) {
        return '<div class="schedule-rest">' +
            '<div class="schedule-status-icon"><i class="fas fa-mug-hot"></i></div>' +
            '<div class="schedule-status-text">' + info.message + '</div>' +
            '<div class="schedule-meta">\u7b2c ' + info.weekNumber + ' \u5468 \u00b7 \u5468\u65e5</div>' +
            '</div>';
    }

    renderBreak(info) {
        var html = '<div class="schedule-break">' +
            '<div class="schedule-status-icon"><i class="fas fa-coffee"></i></div>' +
            '<div class="schedule-status-text">' + info.message + '</div>' +
            '<div class="schedule-meta">' + info.day + ' \u00b7 \u7b2c ' + info.weekNumber + ' \u5468</div>';

        if (info.nextPeriod) {
            html += '<div class="schedule-next">' +
                '<span class="schedule-next-label">\u4e0b\u4e00\u8282:</span>' +
                '<span class="schedule-next-name">' + info.nextPeriod.name + '</span>' +
                '<span class="schedule-next-time">' + info.nextPeriod.start + '</span>' +
                '</div>';
        }

        html += '</div>';
        return html;
    }

    renderActive(info) {
        var html = '<div class="schedule-active">' +
            '<div class="schedule-course-name">' + info.courseName + '</div>' +
            '<div class="schedule-period">' +
            '<span class="schedule-period-name">' + info.period.name + '</span>' +
            '<span class="schedule-period-time">' + info.period.start + ' - ' + info.period.end + '</span>' +
            '</div>' +
            '<div class="schedule-countdown">' +
            '<i class="fas fa-hourglass-half"></i>' +
            '<span>\u5269\u4f59 ' + this.formatTime(info.period.remainingMinutes) + '</span>' +
            '</div>' +
            '<div class="schedule-meta">' + info.day + ' \u00b7 \u7b2c ' + info.weekNumber + ' \u5468</div>' +
            '</div>';
        return html;
    }

    /**
     * 启动定时刷新
     * @param {number} interval - 刷新间隔（毫秒），默认30秒
     */
    start(interval) {
        interval = interval || 30000;
        this.stop();
        this.render();
        var self = this;
        this.timerId = setInterval(function() {
            self.render();
        }, interval);
    }

    /**
     * 停止定时刷新
     */
    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

/**
 * 初始化课表模块
 */
async function initSchedule() {
    var scheduleContent = document.getElementById('schedule-content');
    if (!scheduleContent) return;

    scheduleContent.innerHTML = '<div class="schedule-loading"><i class="fas fa-spinner fa-spin"></i> \u6b63\u5728\u52a0\u8f7d\u8bfe\u8868...</div>';

    var manager = new ScheduleManager();
    await manager.loadSchedule();

    var ui = new ScheduleUI(manager);
    ui.bind(scheduleContent);
    ui.start(30000); // 每30秒刷新一次
}

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSchedule);
} else {
    initSchedule();
}
