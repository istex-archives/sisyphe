const Queue = require('bull');
const MonitorController = require('./monitor/monitorController')
const blessed = require('blessed')
const Promise = require('bluebird')

const redis = require("redis")
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();

/**
 * Its role is to manage the refreshments loop and inject the data in the controller
 * @param       {Object} [options={}] Can have properties: refresh, prefix
 * @constructor
 * @return {Object} this object
 */
function Monitor(options = {}) {
  this.refresh = (options.refresh && options.refresh > 40) ? options.refresh : 40
  this.workers = []
  this.redisKeys = {}
  this.prefix = options.prefix
  return this
}

/**
 * Launches the monitor and injects the data that is needed
 * @return {Object} this object
 */
Monitor.prototype.launch = function() {
  this.monitorController = new MonitorController()
  this.intervalLoop = setInterval(async() => {
    const monitoring = await this.getMonitoring()
    if (!monitoring.hasOwnProperty('workers')) {
      return
    }
    const queues = await this.getQueue(monitoring.workers)

    await Promise.map(queues, async(queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      jobsCount.maxFile = this.redisKeys[queue.name].maxFile
      delete jobsCount.delayed
      delete jobsCount.active
      delete jobsCount.completed
      return jobsCount
    }).then(async(data) => {
      this.monitorController.refresh({
        data,
        startDate: monitoring.start,
        endDate: monitoring.end,
        log: monitoring.log
      })
      return data
    })
  }, this.refresh);
  return this
}

Monitor.prototype.getMonitoring = async function() {
  const monitoring = {}
  const keys = await client.hkeysAsync('monitoring')
  const data = await Promise.map(keys, async key => {
    monitoring[key] = JSON.parse(await client.hgetAsync('monitoring', key))
    return
  })
  return monitoring;
}

/**
 * Searches all keys in redis and stores them in the local object
 * @return {Promise} Promise resolve with all key in redis
 */
Monitor.prototype.getQueue = async function(workers) {
  const queues = await Promise.map(workers, async worker => {
    if (!this.redisKeys[worker]) {
      this.redisKeys[worker] = {}
      const queue = new Queue(worker, {
        prefix: this.prefix
      })
      this.workers.push(queue);
    }
    this.redisKeys[worker].maxFile = await client.getAsync(`${this.prefix}:${worker}:id`)
  })
  return this.workers
}

module.exports = Monitor
