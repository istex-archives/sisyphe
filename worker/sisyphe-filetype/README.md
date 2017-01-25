[![Build Status](https://travis-ci.org/istex/sisyphe-filetype.svg?branch=master)](https://travis-ci.org/istex/sisyphe-filetype)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe-filetype/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe-filetype)

Sisyphe-filetype
=========
A [sisyphe](https://github.com/istex/sisyphe) module which detect filetype


### What does it do ?
This module will get the path of the file in data & extract : its mimetype, mimeDetails (a mimetype with more informations) 

![sisyphe-filetype-out](https://raw.githubusercontent.com/istex/sisyphe-filetype/master/sisyphe-filetype-out.png)

### How it works ?
It use a library based on file detection via magic number algorythm.
It does not really care about extensions.


### Corrupt files
This module is able to detect a lot of broken files (Ok not all ...almost), corrupt files will get a mimetype "application/octet-stream".


### Info 
Hidden files mimetype can be set to "application/octet-stream" whereas they are not actually broken.



