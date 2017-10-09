const cp = require('child_process');
var express = require('express');
var serveStatic = require('serve-static');
const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
var bodyParser = require('body-parser');
const { spawn } = require('child_process');
let sisyphe = null;
var app = express();
app.use(serveStatic(path.join(__dirname, 'out')));
app.use(bodyParser.json());

app.get('/workers', function (req, res) {
  const workers = require('./src/worker.json');
  res.json(workers);
});

app.get('/download/latest', async function (req, res) {
  const sessions = await fs.readdirAsync('out');
  const session = path.resolve('out/', sessions.sort().pop());
  let sessionsFiles = getFiles(session, session.split('/').pop() + '/');
  res.send(sessionsFiles);
});
app.get('/ping', function (req, res) {
  res.send('pong');
});
app.post('/stop', function (req, res) {
  if (sisyphe) {
    sisyphe.kill('SIGTERM');
    sisyphe = null;
  }

  res.send('stop');
});
app.post('/launch', async function (req, res) {
  if (!sisyphe) {
    console.log(`launch: ${req.body.command}`);
    res.send(true);
    sisyphe = cp.spawn(`./app`, req.body.command.split(' '));
    sisyphe.stdout.pipe(process.stdout);
    sisyphe.on('exit', _=>{
      sisyphe = null
    })
  } else {
    console.log('Already launch');
    res.send(false);
  }
});
app.post('/readdir', async function (req, res) {
  fs.readdirAsync(req.body.path)
  .then(data => {
    res.send(data);
  })
  .catch(err => {
    return res.send({error: err.message});
  });
});
console.log('listen to port 3264');
app.listen(3264);

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
