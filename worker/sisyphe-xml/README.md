[![Build Status](https://travis-ci.org/istex/sisyphe-xml.svg?branch=master)](https://travis-ci.org/istex/sisyphe-xml)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe-xml/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe-xml)

Sisyphe-xml
=====
Module which generate XML's information for Sisyphe

## Requirements:
Tested with Redis@3.2.6 & Node 6.9 & XmlStarlet@1.6.1(libxml2@2.9.4)


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

In the nearly created folder you have to create a "folderName.json". You will enter XML configuration in it.


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

#### You can see exemples in config folder in this repo

