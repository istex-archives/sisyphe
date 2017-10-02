const cp = require('child_process');
var express = require("express");
var serveStatic = require("serve-static");
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
var bodyParser = require("body-parser");

var app = express();
app.use(serveStatic(path.join(__dirname, "out")));
app.use(bodyParser.json());
 
app.get("/download/latest", async function(req, res) {
  const sessions = await fs.readdirAsync("out");
  const session = path.resolve("out/", sessions.sort().pop());
  let sessionsFiles = getFiles(session, sessions.sort().pop() + "/");
  res.send(sessionsFiles);
});
app.post("/launch", async function(req, res) {
  cp.exec(`./app ${req.body.command}`);
});
app.post("/readdir", async function(req, res) {
  fs.readdirAsync(req.body.path)
  .then(data=>{
    res.send(data)
  })
  .catch(err=>{
    return res.send({error: err.message});
  })
});
app.listen(3000);


function getFiles (pathdir, parent = '', root = 'true') {
  let files = fs.readdirSync(pathdir).map(docs => {
    const absolute = path.resolve(pathdir, docs);
    if (fs.lstatSync(absolute).isDirectory()) {
      parent += path.basename(absolute) + '/';
      return getFiles(absolute, parent, false);
    }
    return { path: parent + docs };
  });
  if (root) {
    files = flatten(files);
  }
  return files;
}
function flatten (arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(
      Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
    );
  }, []);
}