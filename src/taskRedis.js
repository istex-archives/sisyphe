const kue = require('kue')

const taskRedis = {}

taskRedis.init = function (options) {
  this.redisKey = options.redisKey
  this.queue = kue.createQueue();
  this.queue.on( 'error', ( err )=> {
      // console.log(err);
      return {error:err}
    }).on('job complete', (id, result)=>{
      kue.Job.get(id, (err, job)=>{
      if (err) return;
      job.remove((err)=>{
        if (err) throw err;
      });
    });
  })
}
taskRedis.get = function (nbJobs){
  return new Promise((resolve, reject) =>{
    const jobs = []
    this.queue.setMaxListeners(9000)
    this.queue.process(this.redisKey, nbJobs,  (job, done) =>{
      jobs.push(job)
      this.queue.emit('job complete', job.id)
      if(jobs.length === nbJobs) resolve(jobs)
    })
  })
}


module.exports = taskRedis
