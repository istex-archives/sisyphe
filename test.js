const redis = require("redis")
const client = redis.createClient();
const Queue = require('bull');



const monitor = {}


monitor.launch = function () {
  setInterval(function () {
    getQueue()
  }, 1000);
}


function getQueue() {

    client.keys("*" + 'bull' + ":*:id", function(err, obj) {
      if (err) {
        reject(err);
        return;
      }
      for (var i = 0; i < obj.length; i++) {

        keys.push(new Queue(obj[i].split(':')[1]));
      }
    })
}
monitor.launch()
