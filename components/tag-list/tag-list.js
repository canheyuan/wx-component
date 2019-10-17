
const app = getApp(); //获取应用实例
const listFn = require('../../utils/list.js'); //通用列表函数
Component({
    //组件的属性列表
    properties: {
        targetPage: String,
        tagType: {
            type: String,
            observer: function (newVal, oldVal, changedPath) {  //动态改变属性时执行
                this.setData({ tagType: newVal });
            }
        },
        reachData: {
            type: Number, 
            observer: function (newVal, oldVal, changedPath) {
                if (this.data.isFirst) {
                    this.setData({ isFirst: false })
                }
                //随机数大于1：刷新。小于1：上拉刷新
                if (newVal > 1) {
                    this.setData({ ['listInfo.pageNum']: 1 });
                };
                this.loadMoreListFn();
            }
        }
    },

    //组件的初始数据
    data: {
        tagType: '',    //类型
        isFirst: true,
        listInfo: {},   //列表数据
        
    },

    //组件的方法列表
    methods: {

        ////获取投诉列表
        getListInfo(isReach) {
            var _this = this;
            var c_status = this.properties.complaintType;
            listFn.listPage({
                url: `/estateComplaint/list`,
                data: {
                    status: c_status   //1-待处理 2-处理中 3-已完成
                },
                isReach: isReach,
                page: _this,
                listDataName: 'listInfo',
                getListDataFn: (listdata) => {
                    //返回列表数据和总数
                    return {
                        list: listdata.rows,
                        total: listdata.total
                    }
                },
                disposeFn: (listItem) => {
                    //对列表循环操作改变数据
                    var listItem = listItem;
                    if (listItem) {
                        listItem.applyTime = listItem.applyTime ? commonFn.getDate(listItem.applyTime) : '';
                        listItem.processTime = listItem.processTime ? commonFn.getDate(listItem.processTime) : '';
                        listItem.finishTime = listItem.finishTime ? commonFn.getDate(listItem.finishTime) : '';
                        switch (listItem.statusInt) {
                            case 1:
                                listItem.statusClass = 's_yellow';
                                break;
                            case 2:
                                listItem.statusClass = 's_blue';
                                break;
                            case 3:
                                listItem.statusClass = 's_gray';
                                break;
                        }
                    }
                    return listItem;
                },
                success: () => {
                    console.log("投诉建议列表接口：", _this.data.listInfo);
                }
            });
        },


        //上拉到底部加载更多函数
        loadMoreListFn: function () {
            var _this = this;
            var listInfo = this.data.listInfo;
            listFn.listLoadMore({
                pageNum: listInfo.pageNum,
                pageSize: listInfo.pageSize,
                pageTotal: listInfo.pageTotal,
                getListFn: (isReach) => {
                    _this.getListInfo(isReach);
                }
            })
        },

        //全屏预览图片
        previewImageFn(e) {
            var index = e.currentTarget.dataset.index;
            var imgs = e.currentTarget.dataset.imgs;
            wx.previewImage({
                urls: imgs,
                current: imgs[index]
            })
        },

        //跳转到详情页
        gotoDetail(e) {
            var id = e.currentTarget.dataset.id;
            console.log(id);
            wx.navigateTo({ url: `/pages/complaint/complaint-detail/complaint-detail?id=${id}` });
        },

    }
})
