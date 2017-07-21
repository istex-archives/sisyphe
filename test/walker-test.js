const fs = require("fs");
const path = require("path");

process.on('message', (msg) => {
  fs.readdir(msg.directory, (error, contents) => {
    msg.directories = [];
    msg.files = [];
    contents.map((content) => {
      return path.join(msg.directory, content);
    }).map((content) => {
      if (fs.statSync(content).isDirectory()) msg.directories.push(content);
      if (fs.statSync(content).isFile()) msg.files.push(content);
    });
    msg.isDone = true;
    process.send(msg);
  });
});