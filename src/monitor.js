const Queue = require('bull');
const monitorController = require('./monitor/monitorController')
const blessed = require('blessed')
const Promise = require('bluebird')

const redis = require("redis")
const client = redis.createClient();

function Monitor() {}


Monitor.prototype.init = function(options = {}) {
  this.refresh = (options.refresh && options.refresh > 40) ? options.refresh : 40
  this.workers = []
  this.redisKeys = {}
  this.prefix = options.prefix
  this.silent = options.silent || false
  return this
}

Monitor.prototype.launch = function() {
  if (!this.silent) this.monitorController = monitorController.init()
  this.intervalLoop = setInterval(async() => {
    const queues = await this.getQueue()
    Promise.map(queues, async(queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      jobsCount.maxFile = queue.maxFile
      return jobsCount
    }).then(async(data) => {
      if (!this.silent) this.monitorController.refresh(data)
      return data
    })
  }, this.refresh);
  return this
}

Monitor.prototype.getQueue = function() {
  return new Promise((resolve, reject) => {
    client.keys("*" + this.prefix + ":*:id", async(err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      for (var i = 0; i < obj.length; i++) {
        if (obj[i] === undefined) {
          continue;
        }
        const keyValue = await getKeyValue(obj[i])
        if (!this.redisKeys.hasOwnProperty(obj[i])) {
          this.redisKeys[obj[i]] = {}
          const workers = new Queue(obj[i].split(':')[1], {
            prefix: this.prefix
          })
          workers.key = obj[i]
          this.workers.push(workers);
        } else {
          for (var j = 0; j < this.workers.length; j++) {
            if (this.workers[j].key == obj[i]) {
              this.workers[j].maxFile = keyValue
            }
          }
        }
      }
      resolve(this.workers)
    })
  });
}

Monitor.prototype.exit = function() {
  clearInterval(this.intervalLoop)
  return this
}

function getKeyValue(key) {
  return new Promise(function(resolve, reject) {
    client.get(key, (err, value) => {
      if (err) {
        reject(err)
      }
      resolve(value);
    })
  });
}
module.exports = Monitor
