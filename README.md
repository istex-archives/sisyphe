[![Build Status](https://travis-ci.org/istex/sisyphe.svg?branch=master)](https://travis-ci.org/istex/sisyphe)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe)

![sisyphe](/logo-sisyphe.jpg)

## Sisyphe

Sisyphe is a generic NodeJS recursive folder analyser terminal application & a ([lerna](https://github.com/lerna/lerna)) git [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

![Sisyphe-pic](/sisyphe.gif)

### Requirements
Test with NodeJS@6.9, Redis@3.2.6 & ElasticSearch@5.1.1 & XMLStarlet@1.6.1(libxml2@2.9.4)


### Install it

1. Download the lastest Sisyphe version 
2. Just do : `npm install`
3. ... that's it.

### Test

`npm run test` will test sisyphe & its workers

### Help

`./app.js --help` Will output help

### Options

- -h, --help               output usage information
- -V, --version            output the version number
- -n, --corpusname <name>  Choose an identifier 's Name
- -r, --remove-module <name> Remove one or some worker module
- -c, --config <path>      Config json file path
- -o, --output <all/json>  Output destination (only Json OR eslasticsearch+Json)


### How it works ?

Just start Sisyphe on a folder with any files in it.

`node app.js -c folderName ~/Documents/customfolder/corpus`


Sisyphe is now working in background with all your computer thread.
Just take a coffee and wait , it will prevent you when it's done :)

![Sisyphe-dashboard](/sisyphe.png)


You should now have a file full of logs in `/yourcustomfolder/sisyphe/logs/sisyphe.log` (errors,info,duration..)

### Modules
There is a list of default modules (focused on xml & pdf).

Those URL NEED to be updated when merge branch will be ok.
- [Sisyphe-HASH](/worker/sisyphe-hash) Will generate checksum of found files
- [Sisyphe-FILETYPE](/worker/sisyphe-filetype) Will detect mimetype,extension, corrupted files..
- [Sisyphe-PDF](/worker/sisyphe-pdf) Will get info from PDF (version, author, meta...)
- [Sisyphe-XML](/worker/sisyphe-xml) Will check if it's wellformed, valid-dtd's, get elements from balises ...
- [Sisyphe-XPATH](/worker/sisyphe-xpath)  Will generate a complete list of xpaths from submitted folder
- [Sisyphe-OUT](/worker/sisyphe-out) Will export data to json file & ElasticSearch database

To start sisyphe without some module just do 

`./app.js -r hash -r xml ...`

### Developpement on worker

#### DEBUG Mod

To use debug mod you will just have to add the parameter --inspect to node;

eg `node --inspect app.js ..`
You can use debug mod in somes IDE too (webstorm for eg)

When you work on worker, just:
- Commit your changes as easy
- Do a `npm run updated` (to check what worker has changed)
- Do a `npm run publish` (it will ask you to change version of module worker & publish it to github)
