const kue = require('kue')

const taskRedis = {}

taskRedis.init = function () {
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
taskRedis.get = function (job, nbJobs){
  return new Promise((resolve, reject) =>{
    // this.queue.client.RedisClient._maxListeners = 2
    const jobs = []
    this.queue.setMaxListeners(9000)
    this.queue.process(job, nbJobs,  (job, done) =>{
      jobs.push(job)
      this.queue.emit('job complete', job.id)
      if(jobs.length === nbJobs) resolve(jobs,done)
    })
  })
}


module.exports = taskRedis
