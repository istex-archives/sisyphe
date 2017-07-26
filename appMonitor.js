const monitor = require('./monitor')
const Queue = require('bull');

var redis = require("redis"),
  client = redis.createClient();

async function launchMonitor() {
  // redis client ---> keys bull:*:id




  const prefix = 'sisyphe'
  const filetype = new Queue("filetype");
  const xml = new Queue("xml");
  const walker = new Queue("walker");
  filetype.keyPrefix = prefix
  xml.keyPrefix = prefix
  walker.keyPrefix = prefix


  const nbDocs = 400
  for (var i = 0; i < nbDocs; i++) {
    await walker.add({
      id: ~~(Math.random() * 100)
    });
  }

  for (var i = 0; i < nbDocs; i++) {
    await filetype.add({
      id: ~~(Math.random() * 100)
    });
  }
  for (var i = 0; i < nbDocs; i++) {
    await xml.add({
      id: ~~(Math.random() * 100)
    });
  }


  client.keys("*sisyphe:*:id", function(err, obj) {
    const keys = []
    for (var i = 0; i < obj.length; i++) {
      keys.push(obj[i].split(':')[1]);
    }
    monitor.init({
      refresh: 200,
      prefix,
      keys
    })
    monitor.launch()
  });


  xml.process((docs, next) => {
    const xmlTimeout = setTimeout(async function() {
      const job = await xml.getJobCounts()
      if (!job.waiting) {
        clearTimeout(xmlTimeout)
        filetype.process(async (docs, next) => {
          setTimeout(function() {
            next()
          }, 10);
        });
      }
      next()
    }, 10);
  });

}
launchMonitor()
