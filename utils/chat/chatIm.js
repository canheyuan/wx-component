var webim = require('webim_wx.js');

var msgArr = [];
/**
 * pageThis(传页面的this过来，这里需要接收到新消息的时候操作setData改变视图显示出未读消息)
 * app(传配置信息)
 * selToID(对方账号id,列表不设置所以这里传空)
 * callback(登录成功之后的回调) 
*/

//获取好友
//初始化聊天界面左侧好友列表框
var getAllFriend = function (app, cbOK, cbErr) {
    var options = {
        'From_Account': app.chatData.fromUser.id,
        'TimeStamp': 0,
        'StartIndex': 0,
        'GetCount': 50,
        'LastStandardSequence': 0,
        "TagList":
            [
                "Tag_Profile_IM_Nick",
                "Tag_SNS_IM_Remark"
            ]
    };
    webim.getAllFriend(
        options,
        function (resp) {
            cbOK && cbOK(resp)
            console.log("获取好友列表：", resp);
        },
        function (err) {
            cbErr && cbErr(err);
        }
    );
};

//发送消息(文本或者表情)
function onSendMsg(pageThis, app, msgtosend, sucFn, errFn) {
    var loginInfo = app.chatData.fromUser;
    var selToID = app.chatData.toUser.id;
    if (!selToID) {
        pageThis.setData({ textMessage: '' }); //清空文本框
        return;
    }
    //获取消息内容
    //var msgtosend = document.getElementsByClassName("msgedit")[0].value;
    var msgLen = webim.Tool.getStrBytes(msgtosend);
    if (msgtosend.length < 1) {
        pageThis.setData({ textMessage: '' }); //清空文本框
        return;
    }
    var maxLen, errInfo;
    var selType = 'C2C';
    var friendHeadUrl = '';
    if (selType == webim.SESSION_TYPE.C2C) {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        console.log(errInfo);
        return;
    }
    if (!selSess) {
        var selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示 SDK 自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    var subType;//消息子类型
    if (selType == webim.SESSION_TYPE.C2C) {
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    } else {
        //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
        //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
        //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
        //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
    //解析文本和表情
    var expr = /\[[^[\]]{1,3}\]/mg;
    var emotions = msgtosend.match(expr);
    if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        msg.addText(text_obj);
    } else {
        for (var i = 0; i < emotions.length; i++) {
            tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
            if (tmsg) {
                text_obj = new webim.Msg.Elem.Text(tmsg);
                msg.addText(text_obj);
            }
            emotionIndex = webim.EmotionDataIndexs[emotions[i]];
            emotion = webim.Emotions[emotionIndex];
            if (emotion) {
                face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
                msg.addFace(face_obj);
            } else {
                text_obj = new webim.Msg.Elem.Text(emotions[i]);
                msg.addText(text_obj);
            }
            restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
            msgtosend = msgtosend.substring(restMsgIndex);
        }
        if (msgtosend) {
            text_obj = new webim.Msg.Elem.Text(msgtosend);
            msg.addText(text_obj);
        }
    }

    //发送消息
    sendMsg(msg, function (resp) {
        sucFn && sucFn(resp)
    }, function (err) {
        errFn && errFn(err);
    });

}

function newMsg(selToID) {
    const app = getApp()
    var selType = webim.SESSION_TYPE.C2C;
    var fromAccount = app.chatData.fromUser.id
    var selSess = webim.MsgStore.sessByTypeId(selType, selToID);
    console.log('会话内容：', selSess);
    var msgTime = Math.round(new Date().getTime() / 1000); //消息时间戳
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var isSend = true;//是否为自己发送
    var subType = webim.C2C_MSG_SUB_TYPE.COMMON;//webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, null, msgTime);
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, fromAccount, subType, fromAccount);
    return msg
}

//发图片消息
function sendImageMsg(selToID, imageUrl, sucFn, errFn) {
    var msg = newMsg(selToID);
    var customMsg = new webim.Msg.Elem.Custom(JSON.stringify({
        type: 'image',
        url: imageUrl
    }));
    msg.addCustom(customMsg);
    sendMsg(msg, sucFn, errFn);
}


//发音频消息
function sendAudioMsg(selToID, audioUrl) {
    var msg = newMsg(selToID);
    var customMsg = new webim.Msg.Elem.Custom(JSON.stringify({
        type: 'audio',
        url: audioUrl
    }));
    msg.addCustom(customMsg);
    sendMsg(msg);
}

//发消息
function sendMsg(msg, sucFn, errFn) {
    webim.sendMsg(msg, function (resp) {
        // if (selType == webim.SESSION_TYPE.C2C) {
        //私聊时，在聊天窗口手动添加一条发的消息
        //群聊时，轮询接口会返回自己发的消息
        // showMsg(msg);
        // }
        //webim.Tool.setCookie("tmpmsg_" + app.chatData.toUserId, '', 0);
        console.debug("发消息成功");
        sucFn && sucFn(resp)
    }, function (err) {
        console.error("发消息失败:" + err.ErrorInfo);
        errFn && errFn();
    });
}


//获取历史消息
function getMsgFn(callback, emptyCallback) {
    var app = getApp();
    var toUserId = app.chatData.toUser.id
    var MsgKey = wx.getStorageSync('msgKey') ? wx.getStorageSync('msgKey') : '';
    var LastMsgTime = wx.getStorageSync('lastMsgTime') ? wx.getStorageSync('lastMsgTime') : 0;
    var options = {
        'Peer_Account': toUserId, //指定的好友帐号
        'MaxCnt': 15,//拉取的消息数目
        'LastMsgTime': LastMsgTime,//上一次拉取的时间  在第一次拉去消息的时候，这里必须为0
        'MsgKey': MsgKey
    }
    var selSess = null;
    webim.getC2CHistoryMsgs(
        options,
        function (resp) {
            console.log('历史聊天消息数据:', resp);
            var complete = resp.Complete; //是否还有历史消息可以拉取，1-表示没有，0-表示有
            var msgList = resp.MsgList;
            if (msgList.length == 0) {
                emptyCallback && emptyCallback();
                return;
            }
            msgList.forEach((item, index) => {
                if (index > 0) {
                    item.prevTime = msgList[index - 1].time;
                }
            })
            //拉取消息后，要将下一次拉取信息所需要的东西给存在缓存中
            wx.setStorageSync('lastMsgTime', resp.LastMsgTime);
            wx.setStorageSync('msgKey', resp.MsgKey);

            var textMsg = [];
            for (var j in msgList) { //遍历新消息
                var msg = msgList[j];
                if (msg.getSession().id() == toUserId) { //为当前聊天对象的消息
                    selSess = msg.getSession();
                    //在聊天窗体中新增一条消息
                    textMsg = textMsg.concat(addMsg(app, msg));
                }
            }
            console.log('最后获取到的消息列表：', textMsg);
            //消息已读上报，并将当前会话的消息设置成自动已读
            webim.setAutoRead(selSess, true, true);
            callback && callback(textMsg);
        },
        function (res) {
            console.log("获取消息失败：", res);

        }
    );
}

//处理消息（私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息） 我这里是只要私聊的
function addMsg(app, msg) {
    var ctn = null;
    var fromAccount, fromAccountNick, sessType, subType;
    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = fromAccount;
    }
    //解析消息
    //获取会话类型
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();
    switch (sessType) {
        case webim.SESSION_TYPE.C2C: //私聊消息
            switch (subType) {
                case webim.C2C_MSG_SUB_TYPE.COMMON: //c2c普通消息
                    //业务可以根据发送者帐号fromAccount是否为app管理员帐号，来判断c2c消息是否为全员推送消息，还是普通好友消息
                    //或者业务在发送全员推送消息时，发送自定义类型(webim.MSG_ELEMENT_TYPE.CUSTOM,即TIMCustomElem)的消息，在里面增加一个字段来标识消息是否为推送消息
                    ctn = convertMsg(app, msg);//解析方法
                    break;
            }
            break;
    }
    return ctn;
}

//解析方法
function convertMsg(app, msg) {
    var elems, elem, type, content, isSelfSend;
    var loginInfo = app.chatData.fromUser;//自己的资料
    var friendInfo = app.chatData.toUser;//对方的资料，这里要特别注意一下，消息里面是不会返回双方的头像和昵称的，只能通过指定的方法得到。
    elems = msg.getElems();
    isSelfSend = msg.getIsSend(); //消息是否为自己发的 true是自己发送，
    var sess = msg.sess;
    var currentMsg = {}; //设置消息数组，存消息
    var currentMsgsArray = [];
    var allChatList = null;
    for (var i in elems) {
        elem = elems[i];
        type = elem.getType();

        content = elem.getContent();

        var msgContent = null;

        switch (type) {
            case webim.MSG_ELEMENT_TYPE.TEXT: //文本消息
                msgContent = convertTextMsgToHtml(content);
                currentMsg.content = msgContent;//当前消息的内容
                currentMsg.type = 'text';
                break;

            case webim.MSG_ELEMENT_TYPE.CUSTOM:
                msgContent = convertImageMsgToHtml(content).url;
                currentMsg.content = msgContent;//当前消息的内容
                currentMsg.type = 'image';
                break;
        }
        //var msgContent = content;
        var msgTime = msg.getTime();//得到当前消息发送的时间
        //得到当天凌晨的时间戳
        var timeStamp = new Date(new Date().setHours(0, 0, 0, 0)) / 1000;
        var thisdate;
        var d = new Date(msgTime * 1000); //根据时间戳生成的时间对象
        var min = d.getMinutes();
        var hour = d.getHours();
        //得到时和分，分小于10时，只返回一位数
        if (min < 10) {
            min = "0" + min;
        }
        //得到月份和天  月份一般是从0开始，所以展示出来要+1
        var month = d.getMonth();

        var day = d.getDate();
        //得到时间   当天时间应该只显示时分  当天以前显示日期+时间
        if (timeStamp > msgTime) {
            thisdate = ((month + 1) + '-' + day + ' ' + hour + ":" + min);
        } else {
            thisdate = (hour + ":" + min);
        }
        //和前一条的时间大于10分钟就显示时间
        var prevTime = msg.prevTime ? msg.prevTime : 0;
        currentMsg.timeIsShow = (msgTime - prevTime) / 60 > 10 ? true : false;
        currentMsg.prevTime = prevTime;
        currentMsg.time = thisdate;
        currentMsg.isMy = isSelfSend;

        //根据是否自己发送的消息，设置双方的头像
        if (isSelfSend) {
            currentMsg.headUrl = '';
        } else {
            currentMsg.headUrl = friendInfo.headImg;
        }

        //然后将每一条聊天消息push进数组
        msgArr.push(currentMsg);
    }
    var reArr = msgArr;
    msgArr = [];
    return reArr;

}

//解析文本消息元素
function convertTextMsgToHtml(content) {
    return content.getText();
}

//解析图片消息元素
function convertImageMsgToHtml(content) {
    console.log(content);
    return JSON.parse(content.data);
}

//获取纬度消息
function getUnread(pageThis) {
    var sess = {};
    var sessMap = webim.MsgStore.sessMap();
    if (pageThis.data.contactList) {//这里判断是否存在会话列表，或者在会话列表的页面
        // 更新消息的未读数
        for (var i in sessMap) {
            sess = sessMap[i];
            var contactList = pageThis.data.contactList.map((item, index) => {
                if (item.To_Account == sess.id()) {
                    item.UnreadMsgCount = sess.unread()
                }
                return item;
            })
            //先把未读数赋值
            pageThis.setData({
                contactList: contactList
            })
            // 获取最新的会话消息（把最新的一条赋值到会话列表）
            webim.getRecentContactList({
                'Count': 10 //最近的会话数 ,最大为 100
            }, function (resp) {
                var MsgShow = resp.SessionItem.filter((item, index) => {
                    if (item.To_Account == sess.id()) return item;
                })

                var contactList = pageThis.data.contactList.map((item, index) => {
                    if (item.To_Account == sess.id()) {
                        // 获取最新消息
                        if (MsgShow[0].MsgShow == '[其他]') {
                            MsgShow[0].MsgShow = '[房源信息]'
                        }
                        item.MsgShow = MsgShow[0].MsgShow

                    }
                    return item;
                })

                pageThis.setData({
                    contactList: contactList
                })

            })

        }
    }
}

module.exports = {
    onSendMsg: onSendMsg, //发送文字消息
    sendImageMsg: sendImageMsg, //发送图片消息
    getMsgFn: getMsgFn,  //获取历史消息
    getAllFriend: getAllFriend, //获取所有好友列表
    addMsg: addMsg,
    getUnread: getUnread  //获取未读消息
}