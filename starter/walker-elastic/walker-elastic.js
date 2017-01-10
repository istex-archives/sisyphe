'use strict';

const elasticUrl= process.env.ELASTIC_URL || 'localhost:9200';
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
    return this.getResultsFromES(this.elasticIndex, this.elasticReq)
    .map(doc => {
      this.functionEventOnData(doc)
    })
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
    const results = [];
    const self = this;
 
    return new Promise((resolve, reject) => {
      this._client.search({
        scroll: '30s',
        index: 'analyse-' + elasticIndex,
        q: elasticReq
      }, function getMoreUntilDone(error, response) {
        if (error) reject(error);
        if (response.hasOwnProperty('hits') && response.hits.hasOwnProperty('hits')) {
          response.hits.hits.forEach((hit) => {
            var objToSend = Object.assign({}, hit._source);
            objToSend._index = hit._index;
            objToSend._type = hit._type;
            objToSend._id = hit._id;
            results.push(objToSend);
          });
        }
 
        if (results.length < response.hits.total) {
          self._client.scroll({
            scrollId: response._scroll_id,
            scroll: '30s'
          }, getMoreUntilDone);
        } else {
          resolve(results)
        }
      })
    })
  }
}

module.exports = WalkerElastic;