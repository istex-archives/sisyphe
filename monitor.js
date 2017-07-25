const Queue = require('bull');
const monitorIHM = require('./monitorIHM')
const blessed = require('blessed')

const monitor = {}


monitor.init = async function (options = {}) {
  this.refresh = options.refresh || 2000
  this.workers = []
  this.monitorIHM = monitorIHM.init()
  for (var i = 0; i < options.workers.length; i++) {
    const redisObject = options.workers[i]
    for (var j = 0; j < redisObject.keys.length; j++) {
      const key = redisObject.keys[j]
      const queue = redisObject.server ? new Queue(key, redisObject.server) : new Queue(key)
      this.workers.push(queue)
      this.monitorIHM.addWorker(queue.name)
    }
  }
}

monitor.launch =  function () {
  setInterval(async () => {
    this.workers.map(async queue=>{
      this.monitorIHM.refresh(queue.name, await queue.getJobCounts())
    })
  }, this.refresh);
}

module.exports = monitor
