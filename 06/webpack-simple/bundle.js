//执行webpack构建的入口
//1.拿到webpack.config.js配置
const options = require("./webpack.config.js");
const webpack = require("./lib/webpack.js");

//2， 实例化wenpack并且传入参数，执行webpack
new webpack(options).run();
