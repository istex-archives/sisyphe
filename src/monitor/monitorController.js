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

monitorController.addWorker = function(name) {
  if (name !== 'walker') {
    this.listWorkers.push(name)
  }
}

monitorController.updateData = function(data) {
  // reinitData for the loop
  this.workersData = {
    waitingModules: {},
    doneModules: {},
    currentModule: {}
  }
  for (var i = 0; i < data.length; i++) {
    const module = data[i]
    if (module.name === 'walker') {
      this.maxFile = module.waiting
      break
    }
    if ((module.completed + module.failed) > 0 && module.waiting > 0) {
      // current module
      this.workersData.currentModule.name = module.name
      this.workersData.currentModule = module
    }
    if (module.waiting && !(module.completed + module.failed)) {
      // waiting modules
      this.workersData.waitingModules[module.name] = {}
    }
    if (module.waiting === 0 && (module.completed + module.failed)) {
      // done modules
      this.workersData.doneModules[module.name] = {}
    }
  }
  const nbModulesDone = monitorHelpers.nbProperty(this.workersData.doneModules)
  const nbModulesCurrent = monitorHelpers.nbProperty(this.workersData.currentModule)
  if (!nbModulesCurrent) this.workersData.currentModule = {
    name: 'None',
    waiting: '',
    completed: '',
    failed: ''
  }
  const currentDone = this.workersData.currentModule.completed + this.maxFile * nbModulesDone
  this.totalPercent = ~~((currentDone * 100) / (this.maxFile * this.listWorkers.length))
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
      [colors.green('completed'), colors.green(this.workersData.currentModule.completed)],
      [colors.red('failed'), colors.red(this.workersData.currentModule.failed)]
    ]
  });
  this.workersView.doneModules.setData({
    headers: ['Modules'],
    data: monitorHelpers.propertyToArray(this.workersData.doneModules)
  });
  this.workersView.walker.setContent('Walker Texas Ranger has found ' + this.maxFile.toString() + ' files');
  const percent = ~~((this.workersData.currentModule.completed * 100) / (this.workersData.currentModule.completed + this.workersData.currentModule.waiting + this.workersData.currentModule.failed))
  this.workersView.progress.setStack([{
    percent,
    stroke: monitorHelpers.getColorOfPercent(percent)
  }])
  this.workersView.total.setData([{
    label: 'Total',
    percent: this.totalPercent,
    color: monitorHelpers.getColorOfPercent(this.totalPercent)
  }]);

}

monitorController.refresh = function(data) {
  this.updateData(data)
  this.updateView()
  this.screen.render()
}


module.exports = monitorController
