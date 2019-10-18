
const app = getApp(); //获取实例
var commonFn = require('../../utils/common.js');
var webim = require('../../utils/chat/webim_wx.js');
var chatIm = require('../../utils/chat/chatIm.js');

Page({

    //页面的初始数据
    data: {
        domainUrl: app.globalData.domainUrl,
        systemMsgNum: 0,   //系统公告消息数
        msgNum: 0,  //通知消息消息数
        contactList: [],//会话列表

        listInfo: [],

        langData: null,  //语言数据
        langType: '',    //语言类型
    },

    onLoad: function (options) {

        //设置语言,判断是否切换语言
        app.loadLangFn(this, 'chat', (res) => {
            wx.setNavigationBarTitle({ title: res.title });  //设置当前页面的title
        });

        if (options.from == 'ma_msg') {
            this.setData({ isIndexBtnShow: true });
        }
    },

    //跳转到聊天页
    gotoChat(e) {
        let item = e.currentTarget.dataset.item;
        var toUserData = {
            id: item.To_Account,
            nick: item.C2cNick,
            faceUrl: item.C2cImage
        }
        console.log("聊天跳转", toUserData);
        app.chatData.toUser = toUserData;
        wx.navigateTo({ url: `../chat/chat` });
    },

    onShow: function () {
        var _this = this;
        app.chatData.pageThis = this;
        app.chatData.chatPage = 'chat-list';

        if (app.globalData.sessionId && app.globalData.isLogin && app.chatData.chatLoginSuccess) {
            _this.initRecentContactList(); //获取会话列表
            _this.getNotification();  //获取通知公告数据消息数量
        } else {
            var timer = setInterval(() => {
                //循环判断用户是否已登录
                if (app.globalData.sessionId) {
                    clearInterval(timer);
                    if (!app.globalData.isLogin) {
                        _this.setData({ isLoginPopHide: false });
                    } else {
                        _this.setData({ isLoginPopHide: true });
                        _this.getNotification();  //获取通知公告数据消息数量
                        //循环判断聊天是否已登录完成
                        var timer2 = setInterval(() => {
                            if (app.chatData.chatLoginSuccess) {
                                clearInterval(timer2);
                                _this.initRecentContactList(); //获取会话列表
                                //_this.getAllFriend();  //获取所有好友列表
                            }
                        }, 300);
                    }

                }
            }, 300);
        }


    },
    //关闭页面
    onHide: function () {
        app.chatData.pageThis = null;
        app.chatData.chatPage = '';
    },
    //卸载页面
    onUnload: function () {
        app.chatData.pageThis = null;
        app.chatData.chatPage = '';
    },

    //获取通知公告数据消息数量
    getNotification() {
        var _this = this;
        app.requestFn({
            isLoading: false,
            url: '/notification',
            success: (res) => {
                var num = parseInt(res.data.data);
                _this.setData({ systemMsgNum: num });
            }
        });

        app.requestFn({
            isLoading: false,
            url: '/message/unreadCount',
            success: (res) => {
                var num = parseInt(res.data.data);
                _this.setData({ msgNum: num });
            }
        });
    },

    //获取好友列表
    getAllFriend() {
        var _this = this;
        app.getAllFriend((friendList) => {
            _this.setData({ contactList: friendList })
        })
    },


    //初始化聊天界面最近会话列表
    initRecentContactList: function () {
        var that = this;
        webim.getRecentContactList({//获取会话列表的方法
            'Count': 20   //最近的会话数 ,最大为 100
        }, function (resp) {
            if (app.globalData.apiMsgSwitch) { console.log('获取最近会话：', resp); }
            var sessMap = webim.MsgStore.sessMap();

            if (resp.SessionItem) {
                var sessionList = resp.SessionItem
                if (sessionList.length == 0) {
                    wx.hideLoading();
                } else if (sessionList.length > 0) {

                    var userId = sessionList.map((item, index) => {
                        return item.To_Account
                    })
                    that.getAvatar(userId, sessionList, function (data) {
                        var msgStorage = wx.getStorageSync('msgStorage') ? wx.getStorageSync('msgStorage') : [];
                        var lastMsg = wx.getStorageSync('lastMsg') ? wx.getStorageSync('lastMsg') : []; //最后消息，用于下次访问判断是否有未读消息
                        var lastMsg2 = [];
                        data = data.map((item, index) => {
                            var unreadNum = 0;
                            //下次访问获取是否有未读消息（由于未登录状态下接受的消息在下次登录时未能接收到的）
                            if (lastMsg.constructor === Array) {
                                lastMsg.forEach(item2 => {
                                    if (item2.fromAccount == item.To_Account) {
                                        var last_msg = item.MsgShow
                                        if (item2.lastMsg != last_msg) {
                                            unreadNum = 1
                                        }
                                    }
                                });
                            }
                            //实时监听的未读消息
                            msgStorage.forEach(item2 => {
                                if (item2.fromAccount == item.To_Account) {
                                    unreadNum = item2.unread;
                                }
                            });
                            item.unread = unreadNum;


                            lastMsg2.push({
                                fromAccount: item.To_Account,
                                lastMsg: item.MsgShow
                            });
                            if (item.MsgShow == '[其他]') {
                                item.MsgShow = '[图片]'
                            }
                            return item;
                        });
                        wx.setStorageSync('lastMsg', lastMsg2);
                        that.setData({ contactList: data })
                        if (app.globalData.apiMsgSwitch) { console.log('最后消息：', data); }
                        wx.hideLoading();

                    })
                } else {
                    wx.hideLoading()
                    return;
                }
            } else {
                wx.hideLoading()
            }


        }, function (resp) {
            //错误回调
        });


    },

    //获取会话列表所有用户头像
    getAvatar: function (userId, item, callback) {
        var that = this;
        var tag_list = ['Tag_Profile_IM_Nick', 'Tag_Profile_IM_Image']
        //用户id
        var account = userId
        var options = {

            To_Account: account,
            LastStandardSequence: 0,
            TagList: tag_list,
        };
        var contactList = [];

        webim.getProfilePortrait(
            options,
            function (res) {
                var UserProfileItem = res.UserProfileItem;
                var C2cNick, C2cImage;
                // 循环添加昵称和头像
                contactList = item.map((item, index) => {
                    var MsgTimeStamp = commonFn.getDate(item.MsgTimeStamp * 1000).substring(5, 16);
                    item.MsgTimeStamp = MsgTimeStamp;
                    if (UserProfileItem[index].ProfileItem) {
                        item.C2cNick = UserProfileItem[index].ProfileItem[0].Value;
                        item.C2cImage = UserProfileItem[index].ProfileItem[1].Value;
                    }
                    return item;
                })
                callback && callback(contactList);
            },
            function (res) {
                console.log("获取用户头像昵称失败：", res);
            }
        )

    }

})