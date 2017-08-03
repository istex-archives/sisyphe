const Queue = require('bull');
const MonitorController = require('./monitor/monitorController')
const blessed = require('blessed')
const Promise = require('bluebird')

const redis = require("redis")
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
    const [startDate, endDate, queues] = await Promise.all([this.getStart(), this.getEnd(), this.getQueue()])
    Promise.map(queues, async(queue) => {
      const jobsCount = await queue.getJobCounts()
      jobsCount.name = queue.name
      jobsCount.maxFile = queue.maxFile
      delete jobsCount.delayed
      delete jobsCount.active
      delete jobsCount.completed
      return jobsCount
    }).then(async(data) => {
      this.monitorController.refresh({
        data,
        startDate,
        endDate
      })
      return data
    })
  }, this.refresh);
  return this
}

/**
 * Search in redis if work started on start key
 * @return {Promise} Promise resolve only when the start key is found
 */
Monitor.prototype.getStart = function() {
  return new Promise((resolve, reject) => {
    const dateStartInterval = setInterval(() => {
      client.hgetall(this.prefix + ":start:1", (err, start) => {
        if (start && start.hasOwnProperty('data')) {
          clearInterval(dateStartInterval)
          resolve(start.data)
        }
      })
    }, 100);
  });
}

/**
 * Search in redis if work ended on end key
 * @return {Promise} Promise resolve with data of end key or null
 */
Monitor.prototype.getEnd = function() {
  return new Promise((resolve, reject) => {
    client.hgetall(this.prefix + ":end:1", (err, end) => {
      if (end && end.hasOwnProperty('data')) resolve(end.data)
      else resolve(null)
    })
  });
}

/**
 * Searches all keys in redis and stores them in the local object
 * @return {Promise} Promise resolve with all key in redis
 */
Monitor.prototype.getQueue = function() {
  return new Promise((resolve, reject) => {
    client.keys("*" + this.prefix + ":*:id", async(err, obj) => {
      if (err) {
        reject(err);
        return;
      }
      for (var i = 0; i < obj.length; i++) {
        const keyValue = await this.getKeyValue(obj[i])
        if (!this.redisKeys.hasOwnProperty(obj[i])) {
          this.redisKeys[obj[i]] = {}
          const workers = new Queue(obj[i].split(':')[1], {
            prefix: this.prefix
          })
          workers.key = obj[i]
          this.workers.push(workers);
        } else {
          for (var j = 0; j < this.workers.length; j++) {
            if (this.workers[j].key == obj[i]) this.workers[j].maxFile = keyValue
          }
        }
      }
      resolve(this.workers)
    })
  });
}

/**
 * Get value from a key (use to get nbJob in idKey for redis)
 * @param  {String} key key to get value
 * @return {Promise}     resolve with data of key
 */
Monitor.prototype.getKeyValue = function(key) {
  return new Promise(function(resolve, reject) {
    client.get(key, (err, value) => {
      if (err) {
        reject(err)
        return;
      }
      resolve(value);
    })
  });
}

module.exports = Monitor
