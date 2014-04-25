#!/home/tim/Code/nvm/v0.11.12/bin/node --harmony

var fs = require('fs');
var path = require('path');
var pathJoin = path.join;
var baseName = path.basename;
var dirname = path.dirname;
var run = require('gen-run');
var modes = require('js-git/lib/modes');
var publisher = require('./publisher');

if (process.argv.length !== 6) {
  var base = baseName(process.argv[1]);
  console.error("Usage:\n\t%s input output source filters", base);
  console.error("Example:\n\t%s tedit-app tedit chrome-app filters", base);
  process.exit(-1);
}

var input = process.argv[2];
var output = process.argv[3];
var source = process.argv[4];
var filters = process.argv[5];

var repo = {};
require('js-git/mixins/mem-db')(repo);
require('js-git/mixins/mem-cache')(repo);
require('js-git/mixins/formats')(repo);

var rootHash;
var gitFs = require('git-tree')({
  configs: {"":{}},
  repos: {"":repo},
  getRootHash: function () { return rootHash; }
});

var servePath = publisher(gitFs.readPath, {
  filters: filters
});

run(function* () {

  console.log("Importing %s to in-memory js-git database", input);
  var root = yield* importDir(input);
  rootHash = yield repo.saveAs("commit", {
    tree: root.hash,
    author: {
      name: "tedit-build script",
      email: "tedit@creationix.com"
    },
    message: "Initial import from " + source
  });
  
  console.log("Imported as commit", rootHash);

  console.log(gitFs);
  yield* buildPath(source, output);

  console.log("All done!");

}, function (err) {
  if (err) throw err;
});

function* buildPath(path, base) {
  console.log("Building %s", path);
  var entry = yield servePath(path);
  if (entry.mode === modes.tree) {
    var tree = yield entry.fetch;
    var names = Object.keys(tree);
    if (names.length) {
      yield mkdirp(base);
      yield* each(names, function* (name) {
        yield* buildPath(pathJoin(path, name), pathJoin(base, name));
      });
    }
  }
  else if (modes.isFile(entry.mode)) {
    var body = yield entry.fetch;
    yield writeFile(base, body, entry.mode);
  }
  else if (entry.mode === modes.sym) {
    var target = yield entry.fetch
    yield symlink(base, target);
  }
  else {
    throw new Error("Unknown mode: " + entry.mode.toString(8));
  }
}

function* importDir(path) {
  console.log("Importing %s...", path);
  var names = yield readDir(path);
  var dir = {};
  yield* each(names, function* (name) {
    if (name === ".git" || name === ".gitmodules") return;
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
function writeFile(path, body, mode) {
  return function (callback) {
    fs.writeFile(path, body, {mode: mode}, callback);
  };
}
function symlink(path, target) {
  return function (callback) {
    fs.symlink(path, target, callback);
  }
}
// Continuable friendly mkdirp
function mkdirp(path, callback) {
  if (!callback) return mkdirp.bind(this, path);
  fs.mkdir(path, onDone);
  function onDone(err) {
    if (!err || err.code === "EEXIST") return callback();
    if (err.code === "ENOENT") {
      return mkdirp(dirname(path), function (err) {
        if (err) return callback(err);
        fs.mkdir(path, callback);
      });
    }
    callback(err);
  }
}

// Generator friendly each
function* each(array, fn) {
  for (var i = 0, l = array.length; i < l; i++) {
    yield* fn(array[i]);
  }
}

