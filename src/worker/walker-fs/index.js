const fs = require('fs');
const path = require('path');

const walkerFs = {};

walkerFs.doTheJob = function(data, done) {
  fs.readdir(data.directory, (error, contents) => {
    if (error) return done(error);
    data.directories = [];
    data.files = [];
    contents.map((content) => {
      return path.join(data.directory, content);
    }).map((content) => {
      if (fs.statSync(content).isDirectory()) data.directories.push(content);
      if (fs.statSync(content).isFile()) data.files.push(content);
    });
    done(null, data);
  });
};

module.exports = walkerFs;
