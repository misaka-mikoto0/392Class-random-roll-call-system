/*!
 * cdn-fallback.js —— CDN 资源兜底加载器
 * ------------------------------------------------------------
 * 目标：主 CDN（https://www.zstatic.net/）不可用时，自动切换到备用 CDN，
 *       最后回落到仓库内置的本地资源，保证页面「样式 + 脚本」仍可用。
 *
 * 覆盖的失败场景：
 *   1. 加载超时          —— 看门狗定时器（默认 5000ms）
 *   2. 返回错误状态码    —— 浏览器对 4xx/5xx 会触发 error 事件；
 *                          另外通过 PerformanceResourceTiming.responseStatus
 *                          主动识别已完成的失败请求（含脚本晚于加载完成执行的场景）
 *   3. 网络异常 / 被拦截 —— error 事件（ERR_BLOCKED_BY_CLIENT 等）
 *   4. 加载成功但内容不可用 —— verify(url) 自定义校验（如 200 返回错误页）
 *
 * 性能保障（CDN 正常时零额外开销）：
 *   - 接管页面已有的 <link>/<script> 标签，首源不重复发请求；
 *   - 不使用 HEAD 预检，不预加载备用源；
 *   - 仅在首源失败时才发起备用请求；
 *   - 成功的源写入 localStorage，下次访问优先使用（跳过已知不可用源）。
 */
(function (global) {
    'use strict';

    var STORE_PREFIX = 'cdn-fallback:';
    var DEFAULT_TIMEOUT = 5000;

    /** 读取上次成功的源（localStorage 在隐私模式 / file:// 下可能不可用，统一兜底） */
    function readPreferred(id) {
        try { return global.localStorage.getItem(STORE_PREFIX + id); } catch (e) { return null; }
    }

    /** 记住本次成功的源 */
    function rememberPreferred(id, url) {
        try { global.localStorage.setItem(STORE_PREFIX + id, url); } catch (e) { /* 忽略 */ }
    }

    function log(level, msg) {
        var fn = global.console && global.console[level];
        if (typeof fn === 'function') fn('[cdn-fallback] ' + msg);
    }

    /**
     * 组装候选源：主源 → 上次成功的源 → 备用 CDN → 本地兜底
     */
    function buildSources(options) {
        var list = [];
        function push(url) {
            if (url && list.indexOf(url) === -1) list.push(url);
        }
        push(options.primary);
        push(readPreferred(options.id));
        (options.fallbacks || []).forEach(push);
        push(options.local);
        return list;
    }

    /**
     * 资源是否已经在脚本执行前加载完成
     * 注意：被拦截 / 失败的 <link> 在部分浏览器里仍会生成空的 CSSStyleSheet，
     *      因此不能只用 el.sheet 判断，必须结合 load 事件标记或「规则非空」。
     */
    function alreadyLoaded(el, type) {
        if (!el || type === 'js') return false;
        if (el.dataset && el.dataset.cdnState === 'loaded') return true;
        try {
            return !!(el.sheet && el.sheet.cssRules && el.sheet.cssRules.length > 0);
        } catch (e) {
            return false; // 读不到规则且无 load 标记：按未加载处理，交给后续重试
        }
    }

    /**
     * 通过 Performance API 识别「已完成但失败」的请求（例如返回 404/502）
     * 说明：responseStatus 不受跨域限制影响；不支持时返回 null，交由 error/超时处理。
     */
    function detectFailureByTiming(url) {
        if (!global.performance || typeof global.performance.getEntriesByName !== 'function') return null;
        var entries = global.performance.getEntriesByName(url) || [];
        for (var i = entries.length - 1; i >= 0; i--) {
            var status = entries[i].responseStatus;
            if (typeof status === 'number' && status > 0 && status >= 400) {
                return 'HTTP ' + status;
            }
        }
        return null;
    }

    /**
     * 加载单个源：resolve = load 事件；reject = error 事件 / 超时 / 内容校验失败
     */
    function loadOne(el, url, attr, timeout) {
        return new Promise(function (resolve, reject) {
            var settled = false;
            var timer = null;

            function finish(ok, reason) {
                if (settled) return;
                settled = true;
                if (timer) clearTimeout(timer);
                el.onload = null;
                el.onerror = null;
                if (ok) resolve();
                else reject(new Error(reason));
            }

            el.onload = function () { finish(true); };
            el.onerror = function () {
                finish(false, '加载失败（网络异常 / 非 2xx 状态码 / 被客户端拦截）: ' + url);
            };
            timer = setTimeout(function () {
                finish(false, '加载超时（>' + timeout + 'ms）: ' + url);
            }, timeout);

            if (attr === 'src') el.src = url;
            else el.href = url;
        });
    }

    /**
     * 接管一个资源：失败时按顺序切换到下一个源
     * @param {Object} options
     *   id         {string}  资源标识（用于记忆成功源）
     *   type       {string}  'css' | 'js'
     *   el         {Element} 已存在的标签（首源零额外请求）；js 类型可省略，由加载器创建
     *   primary    {string}  主 CDN 地址
     *   fallbacks  {Array}   备用 CDN 地址列表
     *   local      {string}  本地兜底资源路径
     *   timeout    {number}  单次加载超时（毫秒）
     *   verify     {Function(url)} 内容校验，返回 false 视为失败
     *   onReady    {Function(url)} 成功回调
     *   onFail     {Function(reason)} 全部失败回调
     */
    function guard(options) {
        var type = options.type === 'js' ? 'js' : 'css';
        var attr = type === 'js' ? 'src' : 'href';
        var timeout = options.timeout || DEFAULT_TIMEOUT;
        var sources = buildSources(options);
        var el = options.el;
        var index = -1;

        if (!el) {
            el = document.createElement(type === 'js' ? 'script' : 'link');
            if (type === 'css') el.rel = 'stylesheet';
            el.crossOrigin = 'anonymous';
            document.head.appendChild(el);
        }
        if (options.id) el.setAttribute('data-cdn-id', options.id);

        function succeed(url) {
            rememberPreferred(options.id, url);
            if (options.onReady) options.onReady(url);
        }

        function fail(reason) {
            document.documentElement.classList.add(options.failClass || 'cdn-resource-unavailable');
            log('warn', '所有源均不可用，已启用降级：' + reason);
            if (options.onFail) options.onFail(reason);
        }

        function tryNext(reason) {
            index += 1;
            if (index >= sources.length) {
                fail(reason || '未知原因');
                return;
            }
            var url = sources[index];
            if (index > 0) {
                log('warn', '切换备用源 ' + index + '/' + (sources.length - 1) + '：' + url +
                    (reason ? '（原因：' + reason + '）' : ''));
            }            // 本地兜底资源加载前打标记，便于本地样式/脚本按需生效
            if (options.local && url === options.local) {
                document.documentElement.classList.add(options.localClass || 'cdn-local-fallback');
            }

            loadOne(el, url, attr, timeout).then(function () {
                if (typeof options.verify === 'function' && !options.verify(url)) {
                    tryNext('内容校验未通过: ' + url);
                    return;
                }
                succeed(url);
            }).catch(function (err) {
                tryNext(err && err.message);
            });
        }

        // 首源：若脚本执行前已加载完成则直接判定成功，不发任何额外请求
        if (alreadyLoaded(el, type)) {
            if (typeof options.verify === 'function' && !options.verify(sources[0])) {
                index = 0;
                tryNext('内容校验未通过（疑似空样式表）: ' + sources[0]);
                return;
            }
            succeed(sources[0]);
            return;
        }
        // 接管前已触发 error 事件（页面内联脚本提前记录）：跳过主源，立即切换，不必等超时
        if (el && el.dataset && el.dataset.cdnState === 'error') {
            index = 0;
            tryNext('资源加载失败（网络异常 / 非 2xx 状态码 / 被客户端拦截）: ' + sources[0]);
            return;
        }
        // 首源已完成但返回错误状态码（脚本晚于请求结束时执行的情况）
        var timingReason = detectFailureByTiming(sources[0]);
        if (timingReason) {
            index = 0;
            tryNext(timingReason + ' : ' + sources[0]);
            return;
        }
        tryNext();
    }

    /** 动态加载一个脚本资源，返回 Promise（供后续扩展使用） */
    function loadScript(options) {
        return new Promise(function (resolve, reject) {
            guard(Object.assign({}, options, {
                type: 'js',
                onReady: resolve,
                onFail: reject
            }));
        });
    }

    global.CDNFallback = {
        guard: guard,
        loadScript: loadScript,
        /** 清除已记忆的源（排障用，控制台执行 CDNFallback.reset('font-awesome')） */
        reset: function (id) {
            try { global.localStorage.removeItem(STORE_PREFIX + id); } catch (e) { /* 忽略 */ }
        }
    };
})(window);
