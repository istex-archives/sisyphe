[![Build Status](https://travis-ci.org/istex/sisyphe.svg?branch=master)](https://travis-ci.org/istex/sisyphe)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe)

![sisyphe](/logo-sisyphe.jpg)

## Sisyphe

Sisyphe is a generic NodeJS folder analyser & a ([lerna](https://github.com/lerna/lerna)) git [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

It's in construction so you should come back a little latter for an easy-to-use & easy-to install process ;)


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

-h, --help               output usage information
-V, --version            output the version number
-n, --corpusname <name>  Choose an identifier 's Name
-c, --config <path>      Config json file path
-d, --dtd <path>         DTD folder path


### How it works ?

Just start Sisyphe on a folder with any files in it.
`node app.js -c folderName ~/Documents/customfolder/corpus`

Sisyphe is now working in background with all your computer thread.
Just take a coffee and wait , it will prevent you when it's done :)

![Sisyphe-pic](/sisyphe.jpg)


You should now have a file full of logs in `/yourcustomfolder/sisyphe/logs/sisyphe.log` (errors,info,duration..)

### Modules
There is a list of default modules (focused on xml & pdf).

Those URL NEED to be updated when merge branch will be ok.
- [Sisyphe-FILETYPE](/worker/sisyphe-filetype) Will detect mimetype,extension, corrupted files..
- [Sisyphe-PDF](/worker/sisyphe-pdf) Will get info from PDF (version, author, meta...)
- [Sisyphe-XML](/worker/sisyphe-xml) Will check if it's wellformed, valid-dtd's, get element from balises ...
- [Sisyphe-XPATH](/worker/sisyphe-xpath)  Will generate a complete list of xpath from the folder submited
- [Sisyphe-OUT](/worker/sisyphe-out) Will export data to json file & ElasticSearch

You can create your own module & add it to sisyphe :
=> This part is not written yet


### Developpement on worker

When you work on worker, just: 
- Commit your changes as easy
- Do a `npm run updated` (to check what worker has changed)
- Do a `npm run publish` (it will ask you to change version of module worker & publish it to github)