//app.js
App({
    onLaunch: function () {
        // 展示本地存储能力
        var logs = wx.getStorageSync('logs') || []
        logs.unshift(Date.now())
        wx.setStorageSync('logs', logs)

        // 登录
        wx.login({
            success: res => {
                // 发送 res.code 到后台换取 openId, sessionKey, unionId
            }
        })
        // 获取用户信息
        wx.getSetting({
            success: res => {
                if (res.authSetting['scope.userInfo']) {
                    // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
                    wx.getUserInfo({
                        success: res => {
                            // 可以将 res 发送给后台解码出 unionId
                            this.globalData.userInfo = res.userInfo

                            // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
                            // 所以此处加入 callback 以防止这种情况
                            if (this.userInfoReadyCallback) {
                                this.userInfoReadyCallback(res)
                            }
                        }
                    })
                }
            }
        })
    },
    globalData: {
        userInfo: null
    },


    //统一的调用接口函数，接口返回错误码code（206:未认证企业；207：sessionId失效；0：正常）
    requestFn(option) {
        var _this = this;
        let opt = option ? option : null;
        let opt_default = {
            isLoading: true,  //是否加载loading
            isCloseLoading: true,  //是否关闭Loading
            loadTitle: '数据加载中',
            isLoginTip: false,    //是否弹出未登录提示
            isSessionId: true,  //是否传sessionId
            url: '', //前缀不用写
            header: 'application/json', //另一种（application/x-www-form-urlencoded）
            method: 'GET',    //接口类型
            data: {},   //接口接受的参数
            dataType: 'json',   //数据返回类型
            success: null,  //成功回调函数
            successOther: null,  //成功回调，code不为0时调用
            fail: null,     //失败回调函数
            complete: null   //调用接口完回调函数
        };
        opt = opt ? Object.assign(opt_default, opt) : opt_default;
        if (opt.isLoading) { wx.showLoading({ title: opt.loadTitle, mask: true }); }
        wx.request({
            url: _this.globalData.jkUrl + opt.url,
            method: opt.method,
            header: {
                "Content-Type": opt.header,
                "5ipark-gid": _this.globalData.groupId || '',
                "5ipark-sid": opt.isSessionId ? _this.globalData.sessionId : '',
                "5ipark-channel": _this.globalData.appApi.channel,   //之前是为了区分小招园叮（cmb），现在不知还有没用
                "5ipark-aid": _this.globalData.appApi.aid,
                "Cache-Control": "max-age=3600",
            },
            data: opt.data,
            dataType: opt.dataType,
            success: (res) => {
                if (opt.isCloseLoading) { wx.hideLoading(); };      //判断当前接口加载完是否关闭loading,默认：否
                var apiData = res.data;
                if (apiData.code == 0) {

                    if (opt.success) { opt.success(res, opt.page) }; //成功回调函数

                } else if (apiData.code == 207) {   //207表示：sessionID失效

                    if (opt.isLoginTip) {   //判断sid过期是否弹出提示
                        wx.showToast({ title: '登录已超时，请重新登录再进行操作！', icon: 'none', duration: 3000 });
                    }

                    if (!_this.globalData.isWxLogin) {  //
                        _this.globalData.isWxLogin = true;  //控制接口sessionID失效时不会重复调用wxLogin
                        _this.globalData.isLogin = false;
                        _this.globalData.sessionId = '';
                        wx.removeStorageSync('userInfo'); //清除之前缓存
                        //重新调用微信授权，为了不让页面接口调用不到数据
                        //(常见情况就是用户退出登录后没有重新登录，再次访问页面时)
                        _this.getWxLoginInfo(() => {
                            if (_this.chatData.pageThis) {
                                _this.chatData.pageThis.reachFn();
                            }
                        });
                    }

                } else {
                    this.globalData.indexReach = true;
                    wx.showToast({ title: res.data.msg, icon: 'none', duration: 3000 });
                }
                opt.successOther && opt.successOther(res);

            },
            fail(res) {
                wx.hideLoading();
                wx.showToast({ title: '数据加载失败', icon: 'none', duration: 3000 });
                if (opt.failFn) { opt.failFn(res) }; //失败回调函数
            },
            complete(res) {
                if (opt.complete) { opt.complete(res) }; //失败回调函数
            }
        });
    },

})