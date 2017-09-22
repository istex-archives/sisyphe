const redis = require("redis");
const Promise = require("bluebird");
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();
const cp = require("child_process");
const fs = Promise.promisifyAll(require("fs"));

function launch() {
  let retrieveData = true;
  setInterval(async _ => {
    if (!retrieveData) return;
    const command = await client.lpopAsync("command");
    if (command) {
      retrieveData = false;
      console.log('launch:', command)
      cp.exec(`./app ${command}`,_ =>retrieveData = true)
    }
    else {
      retrieveData=true
    }
  }, 1000)
}

launch()