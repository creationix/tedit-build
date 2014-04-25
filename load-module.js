
module.exports = function (code) {
  var def = new Function("module, exports, require", code);
  var exports = {};
  var module = { exports: exports };
  def(module, exports, require);
  return module.exports;
};
