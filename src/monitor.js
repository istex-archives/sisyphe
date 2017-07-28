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
  this.prefix = options.prefix
  this.monitorController = monitorController.init()
  return this
}

monitor.launch = async function() {
  let workers = []
  setInterval(() => {
    return Promise.map(workers, async(queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      return jobsCount
    }).then(async(data) => {
      const isThereAWaitingWorker = this.monitorController.refresh(data)
      if (!isThereAWaitingWorker) {
        return workers = await getQueue(this.prefix)
      }
    })
  }, this.refresh);
}

function getQueue(prefix) {
  return new Promise(function(resolve, reject) {
    client.keys("*" + prefix + ":*:id", function(err, obj) {
      if (err) {
        reject(err);
        return;
      }
      const keys = []
      for (var i = 0; i < obj.length; i++) {
        keys.push(new Queue(obj[i].split(':')[1], {
          prefix
        }));
      }
      resolve(keys)
    })
  });
}
module.exports = monitor
