'use strict';

const elasticUrl = process.env.ELASTIC_URL || 'localhost:9200';
const elasticsearch = require('elasticsearch'),
  Promise = require('bluebird');

class WalkerElastic {

  constructor(options) {
    this.totalFile = 0;
    this.elasticIndex = options.corpusname;
    this.elasticReq = '*';
    this._client = new elasticsearch.Client({
      host: elasticUrl
    });
  }

  start() {
    this.getResultsFromES(this.elasticIndex, this.elasticReq)
  }

  setFunctionEventOnFile(functionEventOnFile) {
    this.functionEventOnFile = functionEventOnFile;
    return this;
  }

  setFunctionEventOnData(functionEventOnData) {
    this.functionEventOnData = functionEventOnData;
    return this;
  }

  setFunctionEventOnEnd(functionEventOnEnd) {
    this.functionEventOnEnd = functionEventOnEnd;
    return this;
  }

  /**
   * Récupère les résultats d'une requête depuis un serveur ElasticSearch
   * @returns {Promise}
   */
  getResultsFromES(elasticIndex, elasticReq) {
    let results = 0;
    const self = this;

    this._client.search({
      scroll: '30s',
      index: 'analyse-' + elasticIndex,
      q: elasticReq
    }, function getMoreUntilDone(error, response) {
      if (error) {
        console.error(error);
        return;
      };
      if (response.hasOwnProperty('hits') && response.hits.hasOwnProperty('hits')) {
        response.hits.hits.forEach((hit) => {
          // Be sure hit._source exists.
          var objToSend = Object.assign({}, hit._source.fields);
          objToSend.updateEs = {};
          objToSend.updateEs._index = hit._index;
          objToSend.updateEs._type = hit._type;
          objToSend.updateEs._id = hit._id;
          results++;
          self.functionEventOnData(objToSend);
        });
      }

      if (results < response.hits.total) {
        self._client.scroll({
          scrollId: response._scroll_id,
          scroll: '30s'
        }, getMoreUntilDone);
      } else {
        self.functionEventOnEnd();
      }
    })
  }
}
module.exports = WalkerElastic;
