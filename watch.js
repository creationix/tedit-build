#!/home/tim/Code/nvm/v0.11.12/bin/node --harmony

var fs = require('fs');
var path = require('path');
var pathJoin = path.join;
var baseName = path.basename;
var run = require('gen-run');
var modes = require('js-git/lib/modes');

if (process.argv.length !== 6) {
  var base = baseName(process.argv[1]);
  console.error("Usage:\n\t%s input output source filters", base);
  console.error("Example:\n\t%s tedit-app tedit chrome-app filters", base);
  process.exit(-1);
}

var repo = {};
require('js-git/mixins/mem-db')(repo);
require('js-git/mixins/mem-cache')(repo);
require('js-git/mixins/formats')(repo);
console.log(repo);

run(function* () {
  var root = yield* importDir(process.argv[2]);
  console.log("ROOT", root);
});

function* importDir(path) {
  var names = yield readDir(path);
  var dir = {};
  yield* each(names, function* (name) {
    if (name === ".git") return;
    var newPath = pathJoin(path, name);
    var info = yield lstat(newPath);
    if (info.isDirectory()) {
      dir[name] = yield* importDir(newPath);
    }
    else if (info.isFile()) {
      dir[name] = {
        mode: info.mode & 1 ? modes.exec : modes.file,
        hash: yield repo.saveAs("blob", yield readFile(newPath))
      };
    }
    else if (info.isSymbolicLink()) {
      dir[name] = {
        mode: modes.sym,
        hash: yield repo.saveAs("blob", yield readLink(newPath))
      };
    }
    // Ignore other types
  });
  return {
    mode: modes.tree,
    hash: yield repo.saveAs("tree", dir)
  };
}

// Wrap some fs functions to be generator friendly.
function readDir(path) {
  return function (callback) {
    fs.readdir(path, callback);
  };
}
function readFile(path) {
  return function (callback) {
    fs.readFile(path, callback);
  };
}
function lstat(path) {
  return function (callback) {
    fs.lstat(path, callback);
  };
}
function readLink(path) {
  return function (callback) {
    fs.readlink(path, callback);
  };
}

// Generator friendly each
function* each(array, fn) {
  for (var i = 0, l = array.length; i < l; i++) {
    yield* fn(array[i]);
  }
}

