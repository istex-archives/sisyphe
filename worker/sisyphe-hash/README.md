[![Build Status](https://travis-ci.org/istex/sisyphe.svg?branch=master)](https://travis-ci.org/istex/sisyphe)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe)

Sisyphe-hash
=========
A [sisyphe](https://github.com/istex/sisyphe) module which will generate checksum from files

### What does it do ?
This module will add a "hash" property into json element & create a .csv in a checksum folder containing all hash & path to file 

![sisyphe-hash](/)

### How it works ?
It read file (async or via stream depending on its size) & then it create a md5 hash of it

### Why MD5 & not SHA1 ?
MD5 is at least 2X faster than SHA1 & in the case of checksum there are no any reason to have a. good secury on this.
It's just a number to identify a file via it's content. 
