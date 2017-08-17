const blessed = require('blessed')
const contrib = require('blessed-contrib')

module.exports.loadInterface = function(grid) {
  const components = {}
  components.walker = grid.set(0, 0, 2, 16, blessed.box, {
    content: "sisyphe is starting",
    left: 'center'
  });
  components.waitingModules = grid.set(2, 0, 10, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Waiting modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.doneModules = grid.set(2, 12, 10, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Done modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.currentModule = grid.set(2, 4, 7, 8, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Current module',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.progress = grid.set(9, 4, 3, 8, contrib.gauge, {
    label: 'Current module progress',
    stroke: 'green',
    fill: 'white'
  })
  components.total = grid.set(12, 14, 4, 2, contrib.donut, {
    label: 'Total',
    radius: 8,
    arcWidth: 3,
    remainColor: 'black',
    yPadding: 2,
    data: [{
      percent: 0,
      label: 'Total',
      color: 'red'
    }]
  });
  components.time = grid.set(14, 12, 2, 2, blessed.box, {
    label: 'Time',
    content: "0",
    left: 'center'
  });
  components.logs = grid.set(12, 0, 4, 12, blessed.box, {
    label: 'Logs',
    content: "0",
    left: 'center',
    keys: true,
    scrollable:true,
    focused:true,
    scrollbar: {
      ch: ' ',
      inverse: true
    }
  });
  components.loadAverage = grid.set(12, 12, 2, 2, blessed.box, {
    label: 'Load Average',
    content: "0",
    left: 'center'
  });
  components.question = grid.set(7, 6, 2, 4, blessed.question, {
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: ' {red-fg}Question{/red-fg} ',
    tags: true,
    keys: true,
    vi: true,
    style: {
      border: {
        fg: 'red'
      }
    }
  });
  return components
}
