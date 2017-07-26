const Queue = require('bull');
const monitorIHM = require('./monitorIHM')
const blessed = require('blessed')
const Promise = require('bluebird')


const monitor = {}


monitor.init = async function(options = {}) {
  this.refresh = options.refresh || 2000
  this.workers = []
  this.monitorIHM = monitorIHM.init()
  for (var i = 0; i < options.keys.length; i++) {
    const queue = new Queue(options.keys[i])
    queue.keyPrefix = options.prefix
    this.monitorIHM.addWorker(queue.name)
    this.workers.push(queue)
  }
}

monitor.launch = function() {
  setInterval(async() => {
    Promise.map(this.workers, async (queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      return jobsCount
    }).then((data)=>{
      this.monitorIHM.refresh(data)
    })
  }, this.refresh);
}

module.exports = monitor
