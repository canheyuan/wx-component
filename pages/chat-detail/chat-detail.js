
//聊天对象的信息在跳转页面前，就已经给app.toUser赋值了
var app = getApp();
var commonFn = require('../../utils/chat/common.js');
var webim = require('../../utils/chat/webim_wx.js');
var chatIm = require('../../utils/chat/chatIm.js');
var Uploader = require('../../utils/chat/UploaderV5.js');

//聊天页面
Page({

    //页面的初始数据
    data: {
        domainUrl: app.globalData.domainUrl,
        textMessage: '',  //文本框内容
        chatItems: [],  //聊天内容列表

        scrollTopVal: '1000',    //聊天框位置
        scrollHeight: '1000',    //聊天框高度

        inputFocus: false,   //文本框时否获得焦点
        sendType: 'text', //发送类型：text、image、voice
        topLoadHide: true,   //顶部loading图标是否关闭
        isNoMoreMsg: false,   //是否没有更多消息了

        langData: null,  //语言数据
        langType: '',    //语言类型
    },

    onShow: function () {
        app.chatData.pageThis = this;
        app.chatData.chatPage = 'chat-detail';
    },

    //生命周期函数--监听页面加载
    onLoad: function (options) {
        var _this = this;

        //设置语言,判断是否切换语言
        app.loadLangFn(this, 'chat');

        var systemInfo = wx.getSystemInfoSync();    //获取系统信息
        _this.setData({
            scrollHeight: systemInfo.windowHeight - 78, //聊天框高度
        })

        //进入页面清除最后时间key的缓存
        wx.removeStorageSync('lastMsgTime');
        wx.removeStorageSync('msgKey');

        //设置title
        wx.setNavigationBarTitle({ title: app.chatData.toUser.nick });

        chatIm.getMsgFn(function (res) {
            //阅读消息后清除未读消息缓存
            var msgStorage = wx.getStorageSync('msgStorage') ? wx.getStorageSync('msgStorage') : [];
            msgStorage = msgStorage.filter(item => {
                return item.fromAccount != app.chatData.toUser.id
            });
            wx.setStorageSync('msgStorage', msgStorage);

            var chatList = res.concat(_this.data.chatItems);
            chatList.forEach(item => {
                item.headUrl = item.isMy ? app.chatData.fromUser.faceUrl : app.chatData.toUser.faceUrl;
                item.headUrl = item.headUrl ? item.headUrl : (_this.data.domainUrl + '/images/default/df_userhead.png');
            });
            console.log('历史聊天消息列表：', chatList, chatList.length);
            _this.setData({
                chatItems: chatList,
                scrollTopVal: chatList.length * 999
            });

            var defaultMsg = app.chatData.toUser.default_msg;
            if (defaultMsg) {
                _this.setData({ textMessage: defaultMsg });
                app.chatData.toUser.default_msg = '';
                _this.sendTextBtn();
            }

        }, function () {
            var defaultMsg = app.chatData.toUser.default_msg;
            if (defaultMsg) {
                _this.setData({ textMessage: defaultMsg });
                app.chatData.toUser.default_msg = '';
                _this.sendTextBtn();
            }
        });

    },

    //文本框文字改变
    inputChangeFn(e) {
        var value = e.detail.value;
        this.setData({ textMessage: value });
    },

    //文本框获得焦点
    inputFocusFn(e) {
        console.log('获得焦点', e);
        this.setData({ inputFocus: true });
    },

    //文本框失去焦点
    inputBlurFn(e) {
        var value = e.detail.value;
        if (!value) {
            this.setData({ inputFocus: false });
        }
    },

    //发送文本
    sendTextBtn: function (e) {
        var _this = this;
        let content = _this.data.textMessage; //文本消息
        _this.setData({
            textMessage: '',    //清空文本框内容
            sendType: 'text'
        });
        chatIm.onSendMsg(_this, app, content, function (res) {
            console.log('发送文本成功', res);

            //设置缓存里的消息已读
            var lastMsg = wx.getStorageSync('lastMsg') ? wx.getStorageSync('lastMsg') : [];
            var isHasfromAccount = false;
            lastMsg.forEach(item => {
                if (item.fromAccount == app.chatData.toUser.id) {
                    item.lastMsg = content;
                    isHasfromAccount = true;
                }
            });
            if (!isHasfromAccount) {
                lastMsg.push({
                    fromAccount: app.chatData.toUser.id,
                    lastMsg: content
                })
            }
            wx.setStorageSync('lastMsg', lastMsg);

            _this.addNewMsg(content, 'success');
        }, function () {
            console.log('发送文本失败');
            //_this.addNewMsg(content,'fail');
        })
    },

    //发送文本页面新增数据(sendStatus:success(发送成功)，fail(发送失败)，loading(发送中))
    addNewMsg(content, sendStatus) {
        var timestamp = Date.parse(new Date());
        var chatList = this.data.chatItems;
        var prevTime = chatList.length > 0 ? chatList[chatList.length - 1].time : 0
        console.log(timestamp, prevTime);
        var nowTime = commonFn.getDate(timestamp).substring(11, 16);
        var newMsg = {
            sendStatus: sendStatus,
            isMy: true,
            headUrl: app.globalData.loginInfo.userInfo.headImgs,
            content: content,
            type: this.data.sendType,
            time: nowTime,
            prevTime: prevTime,
            timeIsShow: (timestamp / 1000 - prevTime) / 60 > 10
        }
        chatList.push(newMsg);
        this.setData({
            chatItems: chatList,
            scrollTopVal: chatList.length * 999
        })
    },

    //上拉获取更多历史消息
    scrolltopFn(e) {
        console.log(e)
        var _this = this;
        if (_this.data.isNoMoreMsg) { return; }
        _this.setData({ topLoadHide: false });
        chatIm.getMsgFn(function (res) {
            var chatList = res.concat(_this.data.chatItems);
            chatList.forEach(item => {
                item.headUrl = item.isMy ? app.chatData.fromUser.faceUrl : app.chatData.toUser.faceUrl;
                item.headUrl = item.headUrl ? item.headUrl : (_this.data.domainUrl + '/images/default/df_userhead.png');
            });
            _this.setData({
                chatItems: chatList,
                scrollTopVal: '300',    //聊天框位置
                topLoadHide: true
            });
        }, function () {
            //空数据时
            _this.setData({
                topLoadHide: true,
                isNoMoreMsg: true
            })
        });
    },

    //选择图片发送
    chooseImgFn() {
        var _this = this;
        app.chooseImg({
            count: 1, // 默认9
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                _this.uploadFile(res.tempFilePaths[0], (result) => {

                    //设置缓存里的消息已读
                    var lastMsg = wx.getStorageSync('lastMsg') ? wx.getStorageSync('lastMsg') : [];
                    var isHasfromAccount = false;
                    lastMsg.forEach(item => {
                        if (item.fromAccount == app.chatData.toUser.id) {
                            item.lastMsg = _this.data.langData.otherText;
                            isHasfromAccount = true;
                        }
                    });
                    if (!isHasfromAccount) {
                        lastMsg.push({
                            fromAccount: app.chatData.toUser.id,
                            lastMsg: _this.data.langData.otherText
                        })
                    }
                    wx.setStorageSync('lastMsg', lastMsg);


                    _this.setData({ sendType: 'image' });   //改变发送类型为图片
                    _this.addNewMsg(res.tempFilePaths[0])
                });
            }
        })
    },

    // 腾讯IM 简单上传图片文件
    uploadFile(tempFilePath, callback) {
        Uploader.upload(tempFilePath, function (result) {

            //微信只能用 https
            var imgUrl = result.Location.replace("http://", "https://")
            var toUserId = app.chatData.toUser.id; //用户id

            chatIm.sendImageMsg(toUserId, imgUrl, function (res) {
                callback && callback(res); //回调函数
            });

        });
    },

    //图片放大
    previewImgFn(e) {
        var imgUrl = e.currentTarget.dataset.img;
        app.previewImgFn(imgUrl, [imgUrl]);
    }

});