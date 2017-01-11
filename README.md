Sisyphe
===
Sisyphe is a generic NodeJS folder analyser.

It's in construction so you should come back a little latter for an easy-to-use & easy-to install process ;)


### Requirements
Test with NodeJS@6.9, Redis@3.2.6 & ElasticSearch@5.1.1


### Install it

1. Download the lastest Sisyphe version 
2. Init it's modules `git submodule init`
3. Update it's modules `git submodule update -remote`
4. Install their depedencies `git submodule foreach "npm install"`


### How it works ?

Just start Sisyphe on a folder with any files in it.
`node app.js -c folderName ~/Documents/customfolder/corpus`

Sisyphe is now working in background with all your computer thread.
Just take a coffee and wait , it will prevent you when it's done :)

[Sisyphe-pic](https://raw.githubusercontent.com/istex/sisyphe/update/sisyphe.png)


You should now have a file full of logs in `/yourcustomfolder/sisyphe/logs/sisyphe.log` (errors,info,duration..)

### Modules
There is a list of default modules (focused on xml & pdf).


- [Sisyphe-FILETYPE](https://github.com/istex/sisyphe-filetype) Will detect mimetype,extension, corrupted files..
- [Sisyphe-PDF](https://github.com/istex/sisyphe-pdf) Will get info from PDF (version, author, meta...)
- [Sisyphe-XML](https://github.com/istex/sisyphe-xml) Will check if it's wellformed, valid-dtd's, get element from balises ...
- [Sisyphe-XPATH](https://github.com/istex/sisyphe-xpath)  Will generate a complete list of xpath from the folder submited
- [Sisyphe-OUT](https://github.com/istex/sisyphe-out) Will export data to json file & ElasticSearch

You can create your own module & add it to sisyphe :
=> This part is not written yet

  
