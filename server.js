const redis = require("redis");
const Promise = require("bluebird");
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
const fs = Promise.promisifyAll(require("fs"));
const client = redis.createClient();
const cp = require("child_process");
const path = require('path')

function launch() {
  let retrieveData = true;
  setInterval(async _ => {
    if (!retrieveData) return;
    const command = await client.lpopAsync("command");
    const get = await client.lpopAsync("download");
    if (command) {
      console.log(command)
      retrieveData = false;
      console.log('launch:', command)
      // cp.exec(`./app ${command}`,_ =>retrieveData = true)
    }
    if (get) {
      const files = await fs.readdirAsync('logs')
      const dates = files
        .map(file => {
          const split = file.split("-")
          return split.splice(split.length - 3);
        })
        .filter(dateArray=>dateArray.length === 3)
        .map(array => array.join("-"))
      const lastAnalyse = dates.sort().pop();
      const logFile = files.filter(log => log.includes(lastAnalyse)).pop()
      const logPath = path.resolve("logs", logFile);
      const corpusname = JSON.parse(await readFirstLine(logPath)).corpusname
      const xpath = (await fs.readdirAsync(path.join('xpaths', corpusname)))
        .sort().pop()
      const xpathPath = path.resolve('xpaths', corpusname, xpath)
      const xpathContent = await fs.readFileAsync(xpathPath, 'utf8')
      const logContent = await fs.readFileAsync(logPath, 'utf8')
      await client.lpushAsync("downloadResponse", JSON.stringify({
        corpusname,
        xpath: {
          file: xpath,
          content: xpathContent
        },
        log: {
          file: logFile,
          content: logContent
        }
      }));
      console.log('send!')
    }
    else {
      retrieveData = true;
    }
  }, 1000)
}

launch()

function readFirstLine (path) {
  return new Promise((resolve, reject) => {
    var rs = fs.createReadStream(path, {encoding: 'utf8'});
    var acc = '';
    var pos = 0;
    var index;
    rs
      .on('data', function (chunk) {
        index = chunk.indexOf('\n');
        acc += chunk;
        index !== -1 ? rs.close() : pos += chunk.length;
      })
      .on('close', function () {
        resolve(acc.slice(0, pos + index));
      })
      .on('error', function (err) {
        reject(err);
      })
  });
}