const blessed = require('blessed')
const contrib = require('blessed-contrib')
const colors = require('colors/safe')
const components = require('./component')
const monitorHelpers = require('./monitorHelpers')
const monitorController = {}

monitorController.init = function() {
  this.screen = blessed.screen({
    smartCSR: true
  });
  this.grid = new contrib.grid({
    rows: 16,
    cols: 16,
    screen: this.screen
  });
  this.workersView = components.loadInterface(this.grid)
  this.screen.key(['C-c'], (ch, key) => {
    this.workersView.question.setIndex(99999999999);
    this.workersView.question.ask('Do you want to quit Sisyphe ?', function(err, res) {
      if (res === true) {
        process.exit(0);
      }
    });
  });
  this.workersData = {
    waitingModules: {},
    doneModules: {},
    currentModule: {}
  }
  this.maxFile = 0
  this.listWorkers = []
  return this
}

monitorController.updateData = function(data) {
  let thereIsACurrent = false
  for (var i = 0; i < data.length; i++) {
    const module = data[i]
    if (module.name === 'walker-fs') continue
    if (this.listWorkers[data[i].name] === undefined || this.listWorkers[data[i].name].waiting === 0) {
      this.listWorkers[data[i].name] = {
        waiting: data[i].waiting
      }
    }
    if (this.listWorkers[data[i].name].waiting > data[i].waiting) {
      thereIsACurrent = true
      delete this.workersData.waitingModules[module.name]
      delete this.workersData.doneModules[module.name]
      this.listWorkers[module.name].waiting = module.waiting
      this.workersData.currentModule.name = module.name
      this.workersData.currentModule = module
    } else if (data[i].waiting) {
      delete this.workersData.doneModules[module.name]
      this.workersData.waitingModules[module.name] = module
    } else {
      delete this.workersData.waitingModules[module.name]
      this.workersData.doneModules[module.name] = module
    }
    this.listWorkers[data[i].name].waiting = data[i].waiting
    if (+this.maxFile< +module.maxFile) {
      this.maxFile = module.maxFile
    }
  }
  if (!thereIsACurrent) { // if no modules are in current queue, the current queue is keep and module in current queue is remove from waiting queue
    if (this.workersData.currentModule.hasOwnProperty('name'))
      delete this.workersData.waitingModules[this.workersData.currentModule.name]
  }
  const nbModulesDone = monitorHelpers.nbProperty(this.workersData.doneModules)
  const nbModulesCurrent = monitorHelpers.nbProperty(this.workersData.currentModule)
  if (!nbModulesCurrent) this.workersData.currentModule = {
    name: 'None',
    waiting: '',
    failed: ''
  }
  const currentDone = this.workersData.currentModule.completed + this.maxFile * nbModulesDone
  this.totalPercent = ~~((currentDone * 100) / (this.maxFile * this.listWorkers.length))
  return this
}

monitorController.updateView = function(data) {
  this.workersView.waitingModules.setData({
    headers: ['Modules'],
    data: monitorHelpers.propertyToArray(this.workersData.waitingModules)
  });
  this.workersView.currentModule.setData({
    headers: ['Module ' + this.workersData.currentModule.name],
    data: [
      [colors.blue('waiting'), colors.blue(this.workersData.currentModule.waiting)],
      [colors.red('failed'), colors.red(this.workersData.currentModule.failed)]
    ]
  });
  this.workersView.doneModules.setData({
    headers: ['Modules'],
    data: monitorHelpers.propertyToArray(this.workersData.doneModules)
  });
  this.workersView.walker.setContent('Walker-fs has found ' + this.maxFile.toString() + ' files');
  const percent = ~~(((this.maxFile - this.workersData.currentModule.waiting) * 100) / (this.maxFile))
  this.workersView.progress.setStack([{
    percent,
    stroke: monitorHelpers.getColorOfPercent(percent)
  }])
  this.workersView.total.setData([{
    label: 'Total',
    percent: this.totalPercent,
    color: monitorHelpers.getColorOfPercent(this.totalPercent)
  }]);
  return this
}

monitorController.refresh = function(data) {
  this.updateData(data)
  this.updateView()
  this.screen.render()
  return monitorHelpers.nbProperty(this.workersData.waitingModules) ? true : false
}


module.exports = monitorController
