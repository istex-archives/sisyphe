const path = require('path')
const cp = require("child_process")
const dispatcher = require('./dispatcher')
const StartWorkers = {}


dispatcher.init()

StartWorkers.start = function (nbWorkers) {
  
}


module.exports = StartWorkers
