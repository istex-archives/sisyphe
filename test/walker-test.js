const fs = require("fs");
const path = require("path");

process.on('message', (msg) => {
  fs.readdir(msg.directory, (error, contents) => {
    msg.directories = contents.map((content) => {
      return path.join(msg.directory, content);
    }).filter((content) => {
      return fs.statSync(content).isDirectory();
    });
    process.stdout.write('.');
    msg.isDone = true;
    // console.log(msg);
    process.send(msg);
  });
});