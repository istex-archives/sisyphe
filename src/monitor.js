const Queue = require('bull');
const monitorController = require('./monitor/monitorController')
const blessed = require('blessed')
const Promise = require('bluebird')

const monitor = {}


monitor.init = async function(options = {}) {
  this.refresh = options.refresh || 2000
  this.workers = []
  this.monitorController = monitorController.init()

  for (var i = 0; i < options.keys.length; i++) {
    const queue = new Queue(options.keys[i],{prefix: 'sisyphe'})
    this.monitorController.addWorker(queue.name)
    this.workers.push(queue)
  }
  return this
}

monitor.launch = function() {
  setInterval(async() => {
    Promise.map(this.workers, async (queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      return jobsCount
    }).then((data)=>{
      this.monitorController.refresh(data)
    })
  }, this.refresh);
}

module.exports = monitor
