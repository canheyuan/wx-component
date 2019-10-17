const app = getApp();   //获取应用实例

//通用列表页
const listPage = (option) => {
    let opt = option ? option : null;
    if (!option.listDataName) {
        var listInfo = option.page.data['listInfo'];
    } else {
        var listInfo = option.page.data[option.listDataName];
    }
    let opt_default = {
        isLoading: false,
        url: '', //前缀不用写
        sizeName: 'pageSize',   //每页个数名称
        NoName: 'pageNum',  //列表分页索引名称
        pageSize: 10,       //每页个数
        pageNum: 1,         //列表分页索引
        page: null,         //当前页面的this
        listDataName: 'listInfo',  //当前列表的名称
        isReach: false,             //是否合并
        moreTxt: '上拉加载更多',
        noMoreTxt: '没有更多了',
        data: {},
        dataType: 'json',
        getListDataFn: null,  //获取列表数据和总数，，需要return回来
        disposeFn: null, //处理列表数据，需要return回来
        success: null,  //成功回调函数
        fail: null,  //失败回调函数
    };
    opt = opt ? Object.assign(opt_default, opt) : opt_default;
    opt.pageSize = listInfo[opt.sizeName] ? listInfo[opt.sizeName] : 10;
    opt.pageNum = listInfo[opt.NoName] ? listInfo[opt.NoName] : 1;

    let formData = opt.data;
    formData[opt.NoName] = opt.pageNum;
    formData[opt.sizeName] = opt.pageSize;

    app.requestFn({
        isLoading: opt.isLoading,
        url: opt.url,
        data: formData,
        success: (res) => {

            var thisPageData = opt.page.data[opt.listDataName]; //在页面的data里的列表数据
            var returnListData = opt.getListDataFn ? opt.getListDataFn(res.data) : null;
            var list = returnListData ? returnListData.list : []; //列表总数
            var pageTotal = returnListData ? returnListData.total : null;  //列表总数

            list.forEach((item, i) => {
                if (opt.disposeFn) { item = opt.disposeFn(item, i, list.length); }
            });

            list = opt.isReach ? list : opt.page.data[opt.listDataName].list.concat(list);//合并数组
            if (pageTotal) {
                var btmTipTxt = ((pageTotal / opt.pageSize) > opt.pageNum) ? opt.moreTxt : opt.noMoreTxt;
            } else {
                var btmTipTxt = '';
            }

            //设置data数据
            let setData = {
                pageNum: opt.pageNum + 1,
                pageSize: opt.pageSize,
                pageTotal: pageTotal,
                list: list,
                tipTxt: btmTipTxt,
                isFinish:true
            }
            opt.page.setData({
                [opt.listDataName]: setData
            });
            opt.success && opt.success(setData);
        },
        fail:(res)=>{
            //设置data数据
            let setData = {
                isFinish: true
            }
            opt.page.setData({
                [opt.listDataName]: setData
            });
            opt.fail && opt.fail(res);
        }
    });
}

const listLoadMore = (option) => {

    let opt = option ? option : null;
    let opt_default = {
        pageNum: 1,
        pageSize: 10,
        pageTotal: 0,
        getListFn: null
    };
    opt = opt ? Object.assign(opt_default, opt) : opt_default;

    if (opt.pageNum > 1) {
        //判断是否有下一页
        if ((opt.pageTotal / opt.pageSize) > opt.pageNum - 1) {
            opt.getListFn && opt.getListFn(false);
        }
    } else {
        opt.getListFn && opt.getListFn(true);
    }
}

module.exports = {
    listPage: listPage,
    listLoadMore: listLoadMore
}