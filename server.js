const redis = require('redis');
const Promise = require('bluebird');
var zlib = require('zlib');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
const fs = Promise.promisifyAll(require('fs'));
const client = redis.createClient({ return_buffers: true });
const cp = require('child_process');
const path = require('path');

const Server = function () {
  setInterval(async _ => {
    const redisResult = await client.lpopAsync('server');
    const parseResult = redisResult ? JSON.parse(redisResult) : redisResult;
    if (parseResult === null) return;
    if (parseResult.action === 'launch') this.launch(parseResult.command);
    if (parseResult.action === 'download') this.download(parseResult.download);
  }, 500);
};

Server.prototype.launch = function (command) {
  cp.exec(`./app ${command}`);
  console.log('launch:', command);
};

function getFiles (pathdir, parent = '', root = 'true') {
  let files = fs.readdirSync(pathdir).map(docs => {
    const absolute = path.resolve(pathdir, docs);
    if (fs.lstatSync(absolute).isDirectory()) {
      parent += path.basename(absolute) + '/';
      return getFiles(absolute, parent, false);
    }
    return {
      path: parent + docs,
      content: fs.readFileSync(absolute, 'utf8')
    };
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

Server.prototype.download = async function (id) {
  const sessions = await fs.readdirAsync('out');
  const sessionToZip = path.resolve('out/', sessions.sort().pop());
  let files = getFiles(sessionToZip);
  files = zlib.deflateSync(JSON.stringify(files), { level: 9 });
  console.log('send !');
  await client.lpushAsync('downloadResponse', files);
};
const server = new Server();