const redis = require("redis");
const Promise = require("bluebird");
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();
const cp = require("child_process");
const fs = Promise.promisifyAll(require("fs"));

const sisyphePath = process.env.SISYPHE_PATH;
if (!sisyphePath) {
  console.log(
    "Please set environnement variable SISYPHE_PATH to the sisyphe executable"
  );
  process.exit(0);
} else {
  if (fs.existsSync(sisyphePath)) {
    launch();
  } else {
    console.log("Please verify if $SISYPHE_PATH is good");
    process.exit(0);
  }
}

async function launch() {
  let retrieveData = true;
  setInterval(_ => {
    if (!retrieveData) return;
    getCommand()
      .then(data => {
        if (data) {
          retrieveData = false;
          console.log('launch:', data)
          return new Promise((resolve, reject) => {
            const sisyphe = cp.exec(`./app ${data}`, (err, stdout, stderr) => {
              retrieveData = true
            });
          });
        }
        else {
          retrieveData=true
        }
      })
      .catch((err, err1) => {
        console.log(err);
      });
  }, 1000);
}

async function getCommand() {
  let command = await client.lpopAsync("command");
  return command;
}
