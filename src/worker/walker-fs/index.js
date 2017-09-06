const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

const walkerFs = {};

walkerFs.init = function (options = {corpusname: 'default'}) {
  this.now = options.hasOwnProperty('now') ? options.now : new Date().now;
  this.corpusname = options.corpusname;
};
walkerFs.doTheJob = function (data, done) {
  data.directories = [];
  data.files = [];
  fs.readdirAsync(data.directory).map((content) => {
    return path.join(data.directory, content);
  }).map((content) => {
    return Promise.join(
      fs.statAsync(content),
      content,
      (contentStat, contentPath) => {
        if (contentStat.isDirectory()) data.directories.push(content);
        if (contentStat.isFile()) {
          const fileInfo = {
            corpusname: this.corpusname,
            startAt: this.now,
            extension: path.extname(contentPath),
            path: contentPath,
            name: path.basename(contentPath),
            size: contentStat.size
          };
          data.files.push(fileInfo);
        }
      });
  }).then(() => {
    done(null, data);
  }).catch((error) => {
    done(error);
  });
};

module.exports = walkerFs;
