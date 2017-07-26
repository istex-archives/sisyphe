const blessed = require('blessed')
const contrib = require('blessed-contrib')
const colors = require('colors/safe')

const monitorIHM = {}

monitorIHM.init = function() {
  this.screen = blessed.screen({
    smartCSR: true
  });
  this.screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0);
  });

  this.grid = new contrib.grid({
    rows: 16,
    cols: 16,
    screen: this.screen
  });
  this.workersView = {}
  this.workersData = {
    waitingModules: {},
    doneModules: {},
    currentModule: {}
  }
  this.maxFile = 0
  this.listWorkers = []
  this.loadInterface()
  return this
}

monitorIHM.addWorker = function(name) {
  if (name !== 'walker') {
    this.listWorkers.push(name)
  }
}

monitorIHM.updateData = function(data) {
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
  // let totalCurrent = 0
  let nbModulesDone = 0
  for (var name in this.workersData.doneModules) {
    if (this.workersData.doneModules.hasOwnProperty(name)) {
      nbModulesDone++
    }
  }
  const currentDone = this.workersData.currentModule.completed + this.maxFile * nbModulesDone
  this.totalPercent = ~~((currentDone * 100) / (this.maxFile * this.listWorkers.length))
  
}

monitorIHM.updateView = function(data) {
  this.workersView.waitingModules.setData({
    headers: ['Modules'],
    data: propertyToArray(this.workersData.waitingModules)
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
    data: propertyToArray(this.workersData.doneModules)
  });
  this.workersView.walker.setContent('Walker Texas Ranger has found ' + this.maxFile.toString() + ' files');
  const percent = ~~((this.workersData.currentModule.completed * 100) / (this.workersData.currentModule.completed + this.workersData.currentModule.waiting + this.workersData.currentModule.failed))
  this.workersView.progress.setStack([{
    percent,
    stroke: getColorOfGauge(percent)
  }])
  this.workersView.total.setData([{
    percent: this.totalPercent,
    label: 'total',
    'color': 'green'
  }]);

}

monitorIHM.refresh = function(data) {
  this.updateData(data)
  this.updateView()
  this.screen.render()
}

monitorIHM.loadInterface = function() {
  this.workersView.walker = this.grid.set(0, 0, 1, 16, blessed.box, {
    content: "sisyphe is starting",
    left: 'center'
  });
  this.workersView.waitingModules = this.grid.set(1, 0, 12, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Waiting modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  this.workersView.doneModules = this.grid.set(1, 12, 12, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Done modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  this.workersView.currentModule = this.grid.set(1, 4, 9, 8, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Current module',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  this.workersView.progress = this.grid.set(10, 4, 3, 8, contrib.gauge, {
    label: 'Current module progress',
    stroke: 'green',
    fill: 'white'
  })
  this.workersView.total = this.grid.set(13, 14, 3, 2, contrib.donut, {
    label: 'Total',
    radius: 8,
    arcWidth: 3,
    remainColor: 'black',
    yPadding: 2,
    data: [{
      percent: 80,
      label: 'Total',
      color: 'green'
    }]
  });
  this.workersView.time = this.grid.set(13, 12, 3, 2, blessed.box, {
    label: 'time',
    content: "0",
    left: 'center'
  });
  this.workersView.logs = this.grid.set(13, 0, 3, 12, blessed.box, {
    label: 'time',
    content: "0",
    left: 'center'
  });
}




function propertyToArray(object) {
  const arrayWaitingModules = []
  for (var value in object) {
    if (object.hasOwnProperty(value)) {
      arrayWaitingModules.push([value])
    }
  }
  return arrayWaitingModules
}

function getColorOfGauge(percent) {
  switch (true) {
    case percent > 25 && percent <= 50:
      return color = 'yellow'
      break;
    case percent > 50 && percent <= 75:
      return color = 'magenta'
      break;
    case percent > 75 && percent < 100:
      return color = 'cyan'
      break;
    case percent == 100:
      return color = 'green'
      break;
    default:
      return color = 'red'
  }
}


module.exports = monitorIHM









//
//
//
//
//
// monitorIHM.updateWorker = function(name, data) {
//
//   let totalCurrent = 0
//   for (var name in this.workers.total.current) {
//     if (this.workers.total.current.hasOwnProperty(name)) {
//       totalCurrent += this.workers.total.current[name]
//     }
//   }
//   const totalPercent = ~~((totalCurrent * 100) / this.workers.total.maxFile)
//   this.workers.total.setData([{
//     percent: totalPercent,
//     label: 'total',
//     'color': 'green'
//   }]);
// }
