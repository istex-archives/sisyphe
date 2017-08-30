const bluebird = require('bluebird');
const redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient();
const monitoring = {
    log: {
        error: [],
        warning: [],
        info: []
    }
}
monitoring.updateLog = async function (type, string) {
    if (type === 'error') {
        console.log('====================',string)
        const error = string
        string = error.message + ': ' + error.stack.split('\n')[1];
        if (error.hasOwnProperty('infos') && Array.isArray(error.infos)) {
            for (var i = 0; i < error.infos.length; i++) {
                var info = error.infos[i];
                string += '##' + info
            }
        }
    }
    console.error(string)
    this.log[type].push(string);
    await client.hsetAsync('monitoring', 'log', JSON.stringify(this.log));
};


module.exports = monitoring