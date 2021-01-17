const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { transformFromAst } = require("@babel/core");

module.exports = class webpack {
  // 实例化webpack时传入的webpack.config.js中的内容，作为options
  constructor(options) {
    const { entry, output } = options;
    this.entry = entry;
    this.output = output;
    this.modules = [];
  }
  // 启动函数
  run() {
    //开始分析入口模块的内容
    const info = this.parse(this.entry);

    //递归分析其他的模块
    this.modules.push(info);
    for (let i = 0; i < this.modules.length; i++) {
      const item = this.modules[i];
      // 根据前者的dependencies来获得路径
      const { dependencies } = item;
      if (dependencies) {
        for (let j in dependencies) {
          this.modules.push(this.parse(dependencies[j]));
        }
      }
    }
    // 转换数据结构
    const obj = {};
    this.modules.forEach((item) => {
      obj[item.entryFile] = {
        dependencies: item.dependencies,
        code: item.code,
      };
    });
    // console.log(obj);
    this.file(obj);
  }
  // 分析函数
  parse(entryFile) {
    // 开始分析入口模块，得到内容，之后需要通过babel的parser，core，preset-env
    const content = fs.readFileSync(entryFile, "utf-8");

    //1, 使用@babel/parser分析模块，获得AST(抽象语法树)
    const ast = parser.parse(content, {
      sourceType: "module",
    });

    //2, 使用@babel/traverse遍历提取分析ast，获得依赖模块
    const dependencies = {};
    traverse(ast, {
      ImportDeclaration({ node }) {
        const newPathName =
          "./" + path.join(path.dirname(entryFile), node.source.value); // node.source.value是入口模块的相对路径
        // newPathName是拼接得到的绝对路径
        dependencies[node.source.value] = newPathName;
      },
    });
    //3, babel/core的transformFromAst 转换代码
    const { code } = transformFromAst(ast, null, {
      // @babel/preset-env来确定转换规则
      presets: ["@babel/preset-env"],
    });

    return {
      entryFile,
      dependencies,
      code,
    };
  }

  // 生成代码文件
  file(code) {
    //创建自运行函数，处理require,module,exports
    //生成main.js = >dist/main.js
    const filePath = path.join(this.output.path, this.output.filename);
    console.log(filePath);
    //require("./a.js")
    // this.entry = "./src/index.js"
    const newCode = JSON.stringify(code);
    // bundle是内容, 其中newCode是对应形参graph
    // reRequire的作用是，在代码中遇到的require时，我们将相对路径帮他转换为绝对路径
    // reRequire里面，这里重复执行require，像处理entry一样的程序
    const bundle = `(function(graph){
        function require(module){
            function reRequire(relativePath){
                return require(graph[module].dependencies[relativePath]) 
            }
            var exports = {};
            (function(require,exports,code){
                eval(code)
            })(reRequire,exports,graph[module].code)
            return exports;
        }
        require('${this.entry}')
    })(${newCode})`;
    // 写到文件出口
    fs.writeFileSync(filePath, bundle, "utf-8");
  }
};
