'use strict';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost',
  REDIS_PORT = process.env.REDIS_PORT || '6379',
  REDIS_DB = 2,
  ELASTIC_URL = process.env.ELASTIC_URL || 'localhost:9200';

const sisypheOut = {},
  fs = require('fs'),
  path = require('path'),
  Promise = require('bluebird'),
  winston = require('winston'),
  Elasticsearch = require('winston-elasticsearch');

const template = require('./config/elasticsearch-template.json');

sisypheOut.init = function (options) {
  this.isInspected = options.isInspected || false;
  options.output = options.output || 'json';
  this.logger = new winston.Logger();
  this.logger.configure({
    exitOnError: false,
    transports: [
      new winston.transports.File({
        filename: `logs/analyse-${options.corpusname}.json`,
        highWaterMark: 24,
        json: true,
        level: 'debug'
      })
    ]
  });
  this.loggerError = fs.createWriteStream(`logs/analyse-${options.corpusname}.log`);
  return this;
};

sisypheOut.doTheJob = function (data, next) {
  this.logger.info(data);
  next(null, data);
};

module.exports = sisypheOut;
