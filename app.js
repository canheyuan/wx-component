import TIM from 'tim-wx-sdk';
import COS from "cos-wx-sdk-v5";

console.log('TIM', TIM, 'COS:', COS)
//app.js
App({
    onLaunch: function () {

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

    //聊天信息
    chatData: {
        chatPage: '',   //当前页面名称
        pageThis: null,  //当前页面的this
        chatLoginSuccess: false,
        //腾讯云Im的一些配置信息
        cosV5: {
            appid: '01254126397', // Bucket 所属的项目 ID
            bucket: "miniprog001-1254126397",  //空间名称 Bucket demo的IM处理封装
            region: 'ap-guangzhou', //ap-
            sid: 'AKID1whIhuqlRDrMgp8vxqcDuVv9B3EJ9RRI', // 项目的 SecretID
            skey: 'rbEkZIuNeNzUoEYq25zkw1wkWEnDRsFX' // 项目的 Secret Key
        },
        //Im的一些配置
        im: {
            sdkAppID: 1400131035,
            appIDAt3rd: 1400131035, //用户所属应用id，必填
            accountType: 36152, //用户所属应用帐号类型，必填
            accountMode: 0 //帐号模式，0-表示独立模式
        },
        fromUser: { id: '', nick: '', faceUrl: '' },
        toUser: { id: '', nick: '', faceUrl: '' },
    },

    //IM添加好友
    addFriendFn(imId, callback) {
        var _this = this;
        this.getAllFriend(function (res) {

            var isFriend = false;
            res.forEach(item => {   //循环查找是否有该好友
                if (imId == item.Info_Account) {
                    isFriend = true;
                }
            });

            if (!isFriend) {    //非好友，先添加
                _this.requestFn({
                    isLoading: false,
                    url: `/im/addFriend`,
                    data: { friendId: imId },
                    header: 'application/x-www-form-urlencoded',
                    method: 'POST',
                    success: (res) => {
                        console.log('添加好友成功！');
                        callback && callback(res);
                    }
                });
            } else {
                callback && callback(res);  //已经是好友
            }

        })

    },

    //获取IM好友列表
    getAllFriend(callback) {
        var _this = this;
        chatIm.getAllFriend(_this, function (res) {
            var list = res.InfoItem ? res.InfoItem : [];
            list.forEach(item => {
                item.To_Account = item.Info_Account;
                item.C2cNick = item.SnsProfileItem ? item.SnsProfileItem[0].Value : '';
            });
            callback && callback(list);
        });
    },

    //修改IM用户信息
    setUserImg(name, img) {
        var _this = this;
        var options = {
            'ProfileItem': [
                { "Tag": "Tag_Profile_IM_Nick", "Value": name },
                { "Tag": "Tag_Profile_IM_Image", "Value": img }
            ]
        };
        webim.setProfilePortrait(options, function () {
            _this.chatData.fromUser.nick = name;
            _this.chatData.fromUser.faceUrl = img;
        });
    },

    //聊天登录
    chatLogin(callback) {
        var _this = this;
        var loginInfo = {
            'sdkAppID': _this.chatData.Config.sdkappid,   //用户所属应用id,必填
            'appIDAt3rd': _this.chatData.Config.sdkappid, //用户所属应用id，必填
            'accountType': _this.chatData.Config.accountType, //用户所属应用帐号类型，必填
            'identifier': _this.chatData.fromUser.id, //当前用户ID,必须是否字符串类型，选填
            'identifierNick': _this.chatData.fromUser.nick, //当前用户昵称，选填
            'userSig': _this.chatData.fromUser.sig, //当前用户身份凭证，必须是字符串类型，选填
        }

        //事件回调对象 监听事件
        var listeners = {
            "onConnNotify": _this.onConnNotify, //监听连接状态回调变化事件,必填
            "onMsgNotify": _this.onMsgNotify//监听新消息(私聊，普通群(非直播聊天室)消息，全员推送消息)事件，必填
        };

        var options = {};

        //sdk登录(独立模式)
        webim.login(loginInfo, listeners, options, function (resp) {

            console.log("IM登录成功");
            _this.chatData.chatLoginSuccess = true;
            _this.setUserImg(_this.chatData.fromUser.nick, _this.chatData.fromUser.faceUrl);
            if (callback) { callback() }
        }, function (err) {
            console.log("登录失败", err.ErrorInfo)
        });
    },

    //1v1单聊的话，一般只需要 'onConnNotify' 和 'onMsgNotify'就行了。
    //监听连接状态回调变化事件
    onConnNotify(resp) {
        var info;
        switch (resp.ErrorCode) {//链接状态码
            case webim.CONNECTION_STATUS.ON:
                webim.Log.warn('建立连接成功: ' + resp.ErrorInfo);
                break;
            case webim.CONNECTION_STATUS.OFF:
                info = '连接已断开，无法收到新消息，请检查下您的网络是否正常: ' + resp.ErrorInfo;
                webim.Log.warn(info);
                break;
            case webim.CONNECTION_STATUS.RECONNECT:
                info = '连接状态恢复正常: ' + resp.ErrorInfo;
                webim.Log.warn(info);
                break;
            default:
                webim.Log.error('未知连接状态: =' + resp.ErrorInfo); //错误信息
                break;
        }
    },

    //监听新消息事件     注：其中参数 newMsgList 为 webim.Msg 数组，即 [webim.Msg]。
    //newMsgList 为新消息数组，结构为[Msg]
    onMsgNotify(newMsgList, callback) {
        console.log('监听新消息事件333', newMsgList);
        if (!newMsgList) { return };

        //做缓存记录未读消息
        var msgStorage = wx.getStorageSync('msgStorage') ? wx.getStorageSync('msgStorage') : [];
        newMsgList.forEach((item, i) => {
            var isMsg = false;  //当前账号是否有未读消息
            msgStorage.forEach(item2 => {
                if (item2.fromAccount == item.fromAccount) {
                    item2.fromAccount = item.fromAccount
                    item2.unread = item2.unread + 1; //未读消息数
                    isMsg = true;
                }
            });
            if (!isMsg) {
                var nesMsg = {};
                nesMsg.fromAccount = item.fromAccount
                nesMsg.unread = 1; //未读消息数
                msgStorage.push(nesMsg);
            }
        })
        wx.setStorageSync('msgStorage', msgStorage);
        callback && callback();

        if (this.chatData.chatPage == 'chat-detail') { //聊天会话页面

            var sess, newMsg;
            //获取所有聊天会话
            var selSess = null;
            var sessMap = webim.MsgStore.sessMap();
            var newMsg2 = null;
            for (var j in newMsgList) {//遍历新消息
                newMsg = newMsgList[j];
                if (newMsg.getSession().id() == this.chatData.toUser.id) {//为当前聊天对象的消息
                    selSess = newMsg.getSession();
                    newMsg2 = chatIm.addMsg(this, newMsg);  //在聊天窗体中新增一条消息
                }
            }

            var chatList = this.chatData.pageThis.data.chatItems.concat(newMsg2);
            chatList.forEach(item => {
                item.headUrl = item.isMy ? this.chatData.fromUser.faceUrl : this.chatData.toUser.faceUrl;
                item.headUrl = item.headUrl ? item.headUrl : (this.globalData.domainUrl + '/images/default/df_userhead.png');
            });
            console.log('chatList:', chatList);
            this.chatData.pageThis.setData({
                chatItems: chatList,
                scrollTopVal: chatList.length * 999
            });

            //消息已读上报，以及设置会话自动已读标记
            webim.setAutoRead(selSess, true, true);

            //阅读消息后清除未读消息缓存
            var msgStorage = wx.getStorageSync('msgStorage') ? wx.getStorageSync('msgStorage') : [];
            msgStorage = msgStorage.filter(item => {
                return item.fromAccount != this.chatData.toUser.id
            });
            wx.setStorageSync('msgStorage', msgStorage);

        } else if (this.chatData.chatPage == 'chat-list') {
            this.chatData.pageThis.initRecentContactList(); //获取会话列表        
        } else if (this.chatData.chatPage == 'index') {
            this.chatData.pageThis.getNotification(); //获取会话列表        
        }
    },


})