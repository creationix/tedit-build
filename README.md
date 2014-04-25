tedit-compiler
==============

A node module that implements the tedit build system.

This implements the same logic as found in tedit, but works with files on the
filesystem and uses node instead of chrome APIs.

## Installing this tool

Currently the best way to install this tool is to clone it recursivly and then `npm link` from the new directory.

```sh
git clone git@github.com:creationix/tedit-build.git
cd tedit-build
npm link
```

This will clone the tool and all it's dependencies using versions I know work.

If you prefer, you could install using npm directly, but that will pull the bleeding edge versions of all deps which might not work.

```sh
npm install -g git://github.com/creationix/tedit-build.git
```

## Usage Example

For example, this tool can be used to build tedit from git without already having
a copy of Tedit from the chrome store.

```sh
git clone git@github.com:creationix/tedit-app.git --recursive
tedit-build tedit-app out chrome-app filters
```

This will clone tedit and it's dependencies.  Then tedit-build will import
all these files into a local in-memory git database.  It will then do a
full export of the `chrome-app` subfolder using the `filters` subfolder for
build rules.  The built version of tedit will be available in the new `out` folder.

This can then be added to chrome using chrome://extensions.

## TODO

Eventually this tool will be smarter and faster.  I want to make it monitor for changes
and do incremental builds.  This way you can use sublime or your favorite text
editor and still have full access to the tedit build system.  Also I plan on adding
a local server that serves a repo over HTTP same as Tedit can to.

Basically this tool has all the cool stuff from Tedit, but lets you continue
to use your existing editor and tools.
