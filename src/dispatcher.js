const path = require('path'),
  winston = require('winston'),
  _ = require('lodash'),
  cp = require('child_process'),
  recluster = require('recluster'),
  async = require('async'),
  Promise = require('bluebird'),
  tasks = require('./taskRedis');

const Dispatcher = {}

const listWorkers = []

Dispatcher.init = function (args) {
  this.firstTask = args.firstTask
  tasks.init()
}

Dispatcher.subscribe = function (worker) {
  listWorkers.push(worker)
  tasks.get(this.firstTask, 1).then((jobs,done)=>{
    worker.send(jobs[0])
    worker.on('message',message=>{
      if (message.hasOwnProperty('end')) {
        tasks.get(this.firstTask, 1).then((jobs,done)=>{
          worker.send(jobs[0])
        })
      }
    })
  })
}

module.exports = Dispatcher








//
// const Dispatcher = {}
// Dispatcher.init = function (args) {
//   this.chainJobsCPUS = args.chainJobsCPUS
//   this.workers = args.workers
//   this.queue = kue.createQueue();
//   this.queue.on( 'error', ( err )=> {
//     // console.log(err);
//     process.send({error: err});
//   }).on('job complete', (id, result)=>{
//     kue.Job.get(id, (err, job)=>{
//     if (err) return;
//     job.remove((err)=>{
//       if (err) throw err;
//     });
//   });
// });
// }
//
// Dispatcher.exec = function () {
//   Dispatcher.getJobs(this.chainJobsCPUS).then(jobs=>{
//     this.chainJobsForks = []
//     for (var i = 0; i < this.chainJobsCPUS; i++) {
//       const chainJobsFork = cp.fork(path.join(__dirname, 'chain-jobs.js'))
//       chainJobsFork.send({workers: this.workers, job: jobs[i]})
//       chainJobsFork.on('message', function (message){
//         if(message.hasOwnProperty('end')) {
//           Dispatcher.getJobs(1).then(jobs=>{
//             this.send({workers: this.workers, job: jobs[0]})
//           })
//         }
//       })
//       this.chainJobsForks.push(chainJobsFork)
//     }
//   })
// }
//
// Dispatcher.getJobs = function (nbJobs){
//   return new Promise((resolve, reject) =>{
//     // this.queue.client.RedisClient._maxListeners = 2
//     const jobs = []
//     this.queue.setMaxListeners(9000)
//     this.queue.process(`${this.workers[0].name}`, nbJobs,  (job, done) =>{
//       jobs.push(job)
//       this.queue.emit('job complete', job.id)
//       if(jobs.length === nbJobs) resolve(jobs)
//     })
//   })
// }
//
//
//
//
//
//
//
//
//
//
//
// process.on('message', message=>{
//   if (message.hasOwnProperty('init')) {
//     Dispatcher.init(message.init)
//   }
//   if (message.hasOwnProperty('exec')) {
//     Dispatcher.exec()
//   }
// })
