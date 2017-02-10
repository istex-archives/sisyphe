[![Build Status](https://travis-ci.org/istex/sisyphe-out.svg?branch=master)](https://travis-ci.org/istex/sisyphe-out)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe-out/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe-out)

sisyphe-out
========
Output module for sisyphe analyser

Will export data to file & ElasticSearch


## Output formats
By default, this module will export the transferred data to 
- JSON file
- Elasticsearch index


## JSON file
The JSON file will be located in : 
`yourcustomfolder/sisyphe/logs/foldername.json`


## Elasticsearch index
This module will create elasticsearch index (`analyse-$folder`) & inject logstash template in it.
It use winston-elasticsearch which transform data to be visible & usable in Kibana


## Second pass
If you use this module in a second pass (data coming from elasticsearch) this module will do partial update.
(You know you're on a second pass if data have a ._index & ._type & ._it properties)

