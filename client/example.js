var socket = io();

$(function () {

    var router = new Router({
        container: '#container',
        enterTimeout: 250,
        leaveTimeout: 250
    });
    
    var _getTplName;
    function getTpl(name) {
        if (!name) {
            name = _getTplName;
        }
        _getTplName = name;
        return  _.template($('#' + name).html());
    }

    function getFormData(form) {
        var arrs = form.serializeArray();
        var json = {};
        for (var i = 0; i < arrs.length; i++) {
            json[arrs[i].name] = arrs[i].value;
        }
        return json;
    }

    var links = [
        { name: 'A0' },
        { name: 'A1' },
        { name: 'A2' },
        { name: 'A3' },
        { name: 'D0' },
        { name: 'D1' },
        { name: 'D2' },
        { name: 'D3' },
        { name: 'D4' },
        { name: 'D5' },
        { name: 'D6' }
    ];
    var linkTypes = [
        { name: '灯' },
        { name: '温度' }
    ];

    var dataCache = {agents: [], links: links, linkTypes: linkTypes};
    var isRefresh = true;
    var isInitLoad = false;

    socket.on('data', function(data) {
        dataCache = data;

        dataCache.links = links;
        dataCache.linkTypes = linkTypes;

        if (isRefresh || isInitLoad == false) {
            setTimeout(function(){
                var tpl = getTpl();
                $('#container > div').html(tpl(dataCache));

                //router.go(location.hash.substr(1));
            }, 10);
        }
        isInitLoad = true;
    });

    // grid
    var home = {
        url: '/',
        className: 'home',
        tplName: 'tpl_home',
        render: function () {
            isRefresh = true;
            var tplName = this.tplName;
            var tpl = getTpl(tplName);
            return tpl(dataCache);
        },
        bind: function (){
            var self = $('.container');
            self.on('click', '.J_status_checkbox', function (){
                var self = $(this);
                var data = {};
                data.agent = self.data('agent');
                data.link = self.data('link');
                data.value = self.attr("checked") ? "open" : "";
                socket.emit('status set', data);
            });
        }
    };

    // status
    var statusAdd = {
        url: '/status/add',
        className: 'status-add',
        tplName: 'tpl_status_add',
        render: function () {
            isRefresh = false;
            var tplName = this.tplName;
            var tpl = getTpl(tplName);
            return tpl(dataCache);
        },
        bind: function (){
            var self = $('.container');
            self.on('click', '.status-add .J_submit', function (){
                var json  = getFormData($('form', self));
                socket.emit('status add', json);
                setTimeout(function(){
                    location.replace('#/');
                    //router.go('/', true);
                }, 100);
            });
        }
    };

    // agent
    var agent = {
        url: '/agent',
        className: 'agent',
        tplName: 'tpl_agent',
        render: function () {
            isRefresh = true;
            var tplName = this.tplName;
            var tpl = getTpl(tplName);
            return tpl(dataCache);
        },
        bind: function (){
        }
    };

    // agent
    var agentAdd = {
        url: '/agent/add',
        className: 'agent-add',
        tplName: 'tpl_agent_add',
        render: function () {
            isRefresh = false;
            var tplName = this.tplName;
            var tpl = getTpl(tplName);
            return tpl(dataCache);
        },
        bind: function (){
            var self = $('.container');
            self.on('click', '.agent-add .J_submit', function (){
                var json  = getFormData($('form', self));
                socket.emit('agent add', json)

                setTimeout(function(){
                    location.replace('#/agent');
                    //router.go('/agent', true);
                }, 100);
            });
        }
    };

    router.push(home)
        .push(statusAdd)
        .push(agent)
        .push(agentAdd)
        .setDefault('/')
        .init();


    // .container 设置了 overflow 属性, 导致 Android 手机下输入框获取焦点时, 输入法挡住输入框的 bug
    // 相关 issue: https://github.com/weui/weui/issues/15
    // 解决方法:
    // 0. .container 去掉 overflow 属性, 但此 demo 下会引发别的问题
    // 1. 参考 http://stackoverflow.com/questions/23757345/android-does-not-correctly-scroll-on-input-focus-if-not-body-element
    //    Android 手机下, input 或 textarea 元素聚焦时, 主动滚一把
    if (/Android/gi.test(navigator.userAgent)) {
        window.addEventListener('resize', function () {
            if (document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
                window.setTimeout(function () {
                    document.activeElement.scrollIntoViewIfNeeded();
                }, 0);
            }
        })
    }
});
