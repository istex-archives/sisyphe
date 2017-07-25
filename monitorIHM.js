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

  this.grid = new contrib.grid({rows: 12, cols: 12, screen: this.screen});
  this.workers = {}
  this.leftGrid = 0
  this.topGrid = 0
  this.widthGrid = 4
  this.heightGrid= 4
  return this
}

monitorIHM.addWorker = function(name) {
  // t,l,h,w
  this.workers[name] = this.grid.set(this.topGrid, this.leftGrid, this.heightGrid, this.widthGrid, contrib.table,
    {
      fg: 'green',
      interactive: false,
      label: name,
      columnSpacing: 1,
      columnWidth: [24,10],
      noCellBorders: false,
      border: 'dashed',
      fillCellBorders: true
    });
  this.screen.append(this.workers[name])
  this.leftGrid+=this.widthGrid
  if (12/this.leftGrid<1) {
    this.leftGrid=0
    this.topGrid+=this.heightGrid
  }
}

monitorIHM.updateWorker = function(name,data) {
  const component = this.workers[name]
  component.setData({headers: ['Type', 'Count'], data: [
    [colors.green('totalPerformedFiles'), colors.green(data.waiting)]
  ]});
}

monitorIHM.refresh = function(name, data) {
  this.updateWorker(name,data)
  this.screen.render()
}





module.exports = monitorIHM
