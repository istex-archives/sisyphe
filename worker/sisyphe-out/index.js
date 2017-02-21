'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379',
  redisDB = 2,
  elasticUrl = process.env.ELASTIC_URL || 'localhost:9200';

const sisypheOut = {},
  fs = require('fs'),
  path = require('path'),
  Promise = require('bluebird'),
  elasticsearch = require('elasticsearch'),
  winston = require('winston'),
  redis = Promise.promisifyAll(require('redis')),
  Elasticsearch = require('winston-elasticsearch');


const template = require('./config/elasticsearch-template.json');

sisypheOut.init = function (options) {
  options.output = options.output || 'json';
  this.client = new elasticsearch.Client({
    host: elasticUrl,
    log: {
      type: 'file',
      level: ['error', 'warning'],
      path: path.resolve(__dirname, `logs/elasticsearch-${options.corpusname}.log`)
    }
  });
  this.redisClient = redis.createClient(`//${redisHost}:${redisPort}`, {db: redisDB});
  this.logger = new winston.Logger();
  this.logger.configure({
    exitOnError: false,
    transports: [
      new (winston.transports.File)({
        filename: `logs/analyse-${options.corpusname}.json`,
        level: 'debug'
      })
    ]
  });
  if(options.output === 'all'){
    let esTransportOpts = {
      level: 'info',
      index: `analyse-${options.corpusname}`,
      mappingTemplate: template,
      client: this.client,
      consistency: false // TODO: check why this option is important
    }
    this.logger.add(winston.transports.Elasticsearch,esTransportOpts);
  }
  return this;
};

sisypheOut.doTheJob = function (data, next) {

  this.redisClient.getAsync(data.path).then((res) => {
    if (res !== null) {
      // Path already exist, will skip it.
      next(null, data);
      return;
    }
    if (data.hasOwnProperty('updateEs')) {
      // Could be better if winston could do it .. to check
      let body = Object.assign({}, data);
      delete body.updateEs;
      this.logger.debug(body);
      this.client.update({
        index: data.updateEs._index,
        type: data.updateEs._type,
        id: data.updateEs._id,
        body: {
          // This is a partial update
          doc: {
            fields: body,
          }
        }
      }).then((resp) => {
        this.redisClient.incr(data.path);
        next(null, data);
      }).catch(error => {
        next(error, data);
      });
    } else {
      this.redisClient.incr(data.path);
      this.logger.info(data);
      next(null, data);
    }
  }).catch(err => {
    next(err, data);
  })
};

module.exports = sisypheOut;