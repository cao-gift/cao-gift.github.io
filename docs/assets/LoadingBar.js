(function () {
    function loadjQuery(callback) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://blog.liyifan.xyz/lib/jquery.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function createLoader() {
        // 创建CSS样式
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .loaderbg {
                background-color: #fff;
                width: 100%;
                height: 100%;
                overflow: hidden;
                position: fixed;
                left: 0;
                top: 0;
                z-index: 99999999;
                visibility: visible;
            }
            .spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                margin-left: -25px;
                margin-top: -30px;
                width: 50px;
                height: 60px;
                text-align: center;
                font-size: 10px;
            }
            .spinner > .double {
                background: #49a9ee;
                height: 100%;
                width: 6px;
                display: inline-block;
                animation: stretchDelay 1.2s infinite ease-in-out;
            }
            .spinner .rect2 { animation-delay: -1.1s; }
            .spinner .rect3 { animation-delay: -1.0s; }
            .spinner .rect4 { animation-delay: -0.9s; }
            .spinner .rect5 { animation-delay: -0.8s; }
            @keyframes stretchDelay {
                0%, 40%, 100% { transform: scaleY(0.4); }
                20% { transform: scaleY(1); }
            }
        `;
        document.head.appendChild(style);

        // 创建加载条HTML
        var loader = document.createElement('div');
        loader.className = 'loaderbg';
        loader.innerHTML = `
            <div class="spinner">
                <div class="double rect1"></div>
                <div class="double rect2"></div>
                <div class="double rect3"></div>
                <div class="double rect4"></div>
                <div class="double rect5"></div>
            </div>
        `;
        document.body.appendChild(loader);

        return loader;
    }

    function hideLoader(loader) {
        loader.style.visibility = 'hidden';
    }

    function showLoader(loader) {
        loader.style.visibility = 'visible';
    }

    function loadingSpinner(options) {
        var settings = {
            duration: 3000,
            onComplete: function () {}
        };

        // 合并用户配置
        if (options) {
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    settings[key] = options[key];
                }
            }
        }

        var loader = createLoader();

        // 页面加载完成后隐藏加载条
        window.addEventListener('load', function () {
            hideLoader(loader);
            settings.onComplete();
        });

        return {
            show: function () { showLoader(loader); },
            hide: function () { hideLoader(loader); }
        };
    }


    // 加载jQuery并初始化插件
    loadjQuery(function () {
        loadingSpinner({
            duration: 3000,
            onComplete: function () {
                console.log("页面加载完成啦！");
            }
        });
    });
})();
