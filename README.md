[![Build Status](https://travis-ci.org/istex/sisyphe.svg?branch=master)](https://travis-ci.org/istex/sisyphe)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe)

![sisyphe](./logo-sisyphe.jpg)

## Sisyphe

Sisyphe is a generic NodeJS recursive folder analyser terminal application & a ([lerna](https://github.com/lerna/lerna)) git [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

![Sisyphe-pic](./sisyphe.gif)

### Requirements
Test with NodeJS@8.1, Redis@3.2.6 & XMLStarlet@1.6.1(libxml2@2.9.4)

Example to run a quick local redis thanks to docker:
```bash
docker run --name sisyphe-redis -p 6379:6379 redis:3.2.6
```

### Install it

1. Download the lastest Sisyphe version 
2. Just do : `npm install`
3. ... that's it.

### Test

`npm run test` will test sisyphe & its workers

### Help

`./app.js --help` Will output help

### Options
    -V, --version            output the version number
    -n, --corpusname <name>  Corpus name
    -c, --config-dir <path>  Configuration folder path
    -s, --silent             Silence output
    -h, --help               output usage information

### How it works ?

Just start Sisyphe on a folder with any files in it.

`node app.js -c folderName ~/Documents/customfolder/corpus`


Sisyphe is now working in background with all your computer thread.
Just take a coffee and wait , it will prevent you when it's done :)

You should now have a file full of logs in `/yourcustomfolder/sisyphe/logs/sisyphe.log` (errors,info,duration..)

For a control panel, go to [Sisyphe-monitor](https://github.com/istex/sisyphe-monitor)
sisyphe has a server that allows to control it and to obtain more information on its execution.
Simply run the server with `npm run server` to access these features


![Sisyphe-dashboard](./sisyphe-monitor.gif)

### Modules
There is a list of default modules (focused on xml & pdf).

Those URL NEED to be updated when merge branch will be ok.
- [Sisyphe-FILETYPE](https://github.com/istex/sisyphe/tree/master/src/worker/filetype) Will detect mimetype,extension, corrupted files..
- [Sisyphe-PDF](https://github.com/istex/sisyphe/tree/master/src/worker/pdf) Will get info from PDF (version, author, meta...)
- [Sisyphe-XML](https://github.com/istex/sisyphe/tree/master/src/worker/xml) Will check if it's wellformed, valid-dtd's, get elements from balises ...
- [Sisyphe-XPATH](https://github.com/istex/sisyphe/tree/master/src/worker/xpath)  Will generate a complete list of xpaths from submitted folder
- [Sisyphe-OUT](https://github.com/istex/sisyphe/tree/master/src/worker/out) Will export data to json file & ElasticSearch database


### Developpement on worker

When you work on worker, just:
- Commit your changes as easy
- Do a `npm run updated` (to check what worker has changed)
- Do a `npm run publish` (it will ask you to change version of module worker & publish it to github)
