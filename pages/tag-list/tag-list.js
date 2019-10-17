const app = getApp();  //获取应用实例

Page({

    data: {
        tagList: [
            { name: '选项卡1', type: 1, reach: 1, show: true },
            { name: '选项卡2', type: 2, reach: 1, show: false },
            { name: '选项卡3', type: 3, reach: 1, show: false }
        ],
        tagIndex: 0,
    },

    onLoad: function (options) {

    },

    //选项卡切换
    tagChangeFn(e) {
        var index = e.currentTarget.dataset.index;
        this.setData({
            ['tagList[' + index + '].show']: true,
            tagIndex: index
        });
    },

    //上拉加载更多
    onReachBottom: function (e) {
        var reachObj = 'tagList[' + this.data.tagIndex + '].reach';
        this.setData({ [reachObj]: Math.random() });
    },

    //下拉刷新
    onPullDownRefresh: function () {
        var reachObj = 'tagList[' + this.data.tagIndex + '].reach';
        this.setData({ [reachObj]: Math.random() + 1 });
        wx.stopPullDownRefresh(); //下拉刷新后页面上移
    },

})