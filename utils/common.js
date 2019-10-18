//验证手机号
const phoneregFn = phone => {
    const myreg = /^1[0-9]{10}$/;
  return myreg.test(phone);
}

//验证邮箱
const emailRegFn = email =>{
  var reg = new RegExp("^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$"); //正则表达式
  return reg.test(email)
}

//时间戳转时间
const getDate = shijianchuo => {
  //shijianchuo是整数，否则要parseInt转换  
  var time = new Date(shijianchuo);
  var y = time.getFullYear();
  var m = time.getMonth() + 1;
  var d = time.getDate();
  var h = time.getHours();
  var mm = time.getMinutes();
  var s = time.getSeconds();
  return y + '-' + add0(m) + '-' + add0(d) + ' ' + add0(h) + ':' + add0(mm) + ':' + add0(s);
}; 
const add0 = m => { return m < 10 ? '0' + m : m };

//时间转时间戳
const getTimes = datetime =>{
  var date = new Date(datetime.replace(/-/g, '/'));
  return date.getTime();
}

//图片加载失败时加载预览图
const errorImg = (_this, obj, imgUrl )=>{
  var imgUrl = imgUrl ? imgUrl :"https://www.5iparks.com/static/yuanding/images/default/img_280_200.jpg";
  _this.setData({ [obj]:imgUrl });
};

//详情页全局替换<o:p></o:p>
const replaceTxt = (str) => {
  var objTxt = str;
  var txt01 = "<o:p>";
  var txt02 = "</o:p>"
  var txt03 = '<o:p data-filtered="filtered">';
  objTxt = objTxt.replace(new RegExp(txt01, 'g'), '');
  objTxt = objTxt.replace(new RegExp(txt02, 'g'), '');
  objTxt = objTxt.replace(new RegExp(txt03, 'g'), '');
  return objTxt;
}

//获取当前页url
const getCurrentPageUrl = ()=> {
  var pages = getCurrentPages() //获取加载的页面 
  var currentPage = pages[pages.length - 1] //获取当前页面的对象 
  var url = currentPage.route //当前页面url 
  var options = currentPage.options //如果要获取url中所带的参数可以查看options

  //拼接url的参数 
  var urlWithArgs = url + '?'
  for (var key in options) {
    var value = options[key];
    urlWithArgs += key + '=' + value + '&';
  }
  urlWithArgs = urlWithArgs.substring(0, urlWithArgs.length - 1)

  return urlWithArgs;
}

//验证码倒计时
var codeCountDown = (option)=>{
    let opt = option ? option : null;
    let opt_default = {
        pageThis:null,
        phone:'',   //手机号码
        getBtnText:'',  //获取验证码按钮文字
        timer:null,
        time:60,
    };
    opt = opt ? Object.assign(opt_default, opt) : opt_default;
    opt.timer = setInterval(()=> {
        if (opt.time > 0) {
            opt.pageThis.setData({
                [opt.getBtnText]: '重新获取' + time + 'S'
            });
        } else {
            clearInterval(opt.timer);
            opt.pageThis.setData({
                [opt.getBtnText]: '获取验证码'
            })
        }
        opt.time--;
    }, 1000);
}



module.exports = {
  phoneregFn  : phoneregFn, //验证手机
  emailRegFn  : emailRegFn, //验证邮箱
  getDate     : getDate, //时间戳转时间
  errorImg    : errorImg, //图片加载失败
  getTimes    : getTimes,  //时间转时间戳
  replaceTxt  : replaceTxt,  //替换详情页文本
  getCurrentPageUrl: getCurrentPageUrl,  //获取当前页面的url
  codeCountDown,    //倒计时
}