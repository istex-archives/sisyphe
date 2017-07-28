const Queue = require('bull');
const monitorController = require('./monitor/monitorController')
const blessed = require('blessed')
const Promise = require('bluebird')

const redis = require("redis")
const client = redis.createClient();

const monitor = {}


monitor.init = function(options = {}) {
  this.refresh = options.refresh || 2000
  this.workers = []
  this.redisKeys = {}
  this.prefix = options.prefix
  this.monitorController = monitorController.init()
  return this
}

monitor.launch = function() {
  setInterval(async () => {
    const queues = await this.getQueue()
    Promise.map(queues, async(queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      return jobsCount
    }).then(async(data) => {
      this.monitorController.refresh(data)
    })
  }, this.refresh);
}

monitor.getQueue = function() {
  return new Promise((resolve, reject) => {
    client.keys("*" + this.prefix + ":*:id", (err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      for (var i = 0; i < obj.length; i++) {
        if (!this.redisKeys.hasOwnProperty(obj[i])) {
          this.redisKeys[obj[i]] = {}
          this.workers.push(new Queue(obj[i].split(':')[1], {
            prefix:this.prefix
          }));
        }
      }
      resolve(this.workers)
    })
  });
}
module.exports = monitor
