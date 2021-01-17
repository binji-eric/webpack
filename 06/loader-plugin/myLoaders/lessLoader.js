const less = require("less");
module.exports = function (source) {
  console.log(source);
  // return source;
  // less render是将css转化为less
  less.render(source, (e, output) => {
    console.log(output.css);
    this.callback(e, output.css);
  });
};
