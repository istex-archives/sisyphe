[![Build Status](https://travis-ci.org/istex/sisyphe-xml.svg?branch=master)](https://travis-ci.org/istex/sisyphe-xml)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe-xml/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe-xml)

Sisyphe-xml
=====
Module which generate XML's information for Sisyphe

## Requirements:
Tested with Redis@3.2.6 & Node 6.9 & XmlStarlet@1.6.1(libxml2@2.9.4)

## Structure Directory
All you have to do is to add your dtd & your "sisyphe-xml.json" conf file into your configFolders,
configFolders can be any folder on your computer (it's -c argument when you start sisyphe).
Sisyphe-xml will try to match the best config dir to use .
If no any configFolder are given sisyphe-xml will try to get config file in worker/sisyphe-xml/conf

eg: 

```
.
├── a                        
└── sample                           
    └── path                   
    │   └── test
            └── DTD
            └── sisyphe-xml.json
    │   └── some
            └── DTD
            └── sisyphe-xml.json
    │   └── any
    │   └── others
```

The command : `node app.js -n test2 -c /a/sample/path` will find that "test" is the best option to use.


## How it works ?
This module use XmlStarlet NodeJs wrapper to check xmldata, it add in data :
- XML formation (Wellformed or not)
- XML validation (is the XML file valid against its own listed DTD & Other DTD you may want to check against) 
- Retrives XML informations in any XML element you want


## Welformed
Sisyphe xml will firstly check if XML is wellformed or not.


## DTD Validation

If XML is wellformed, Sisyphe-xml is able to check XML against DTD, you just have to create a directory in `sisyphe-xml/conf/folderName`
where "folderNamme" is the folderName you entered in sisyphe command.

In the nearly created folder you have to create a "sisyphe-xml.json" config file & put your dtd files ina dtd folder.

In the config file you just have to put your relative mains entries dtd's path:

eg

```javascript
{
  dtd: ['folder/file1.dtd', 'folder/file2.dtd']
}
```

Sisyphe will check dtd against file1 then file2 ...


#### Info
If the .XML is VALID against its own listed a "validateAgainstDTD" field will be set to true
If the .XML is not valid against its own listed .DTD then 


## XML Extraction

If a document is wellformed & DTD Valid we can extract some kind of informations in it

There are 2 options you can use:
- dtd (an array of DTD Path you wan to validate against file)
- metadata (which represent XML element informations you want to extract)
  - Check element presence
  - Text extraction
  - Count elements

#### Config of extracted metadata

You will have to create your own sisyphe-xml.json config files, you will have to writte an array of objects containing xpath name, path & type.

eg

```javascript
{
  medatada: [{name, type xpath},{name, type xpath, regex},{...}]
}
```

NAME: An Id, must be present only one time [required]
TYPE: String, Number, Boolean, Count, Attribute [required]
XPATH: the path of the value you want to get [required]
Regex: A javascript regex to check if the value returned is in a correct form. [optional]

In the end you should have something like:

eg

```javascript
{
  medatada: [{"name": "publicationYear", "type": "Number", "xpath": "///article-meta/pub-date/year", "regex": "^([0-9]{4})$" },{...}]
}
```

You can find a complete exemple [here](/worker/sisyphe-xml/conf/exemple)




