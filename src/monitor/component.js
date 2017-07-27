const blessed = require('blessed')
const contrib = require('blessed-contrib')

module.exports.loadInterface = function(grid) {
  const components = {}
  components.walker = grid.set(0, 0, 1, 16, blessed.box, {
    content: "sisyphe is starting",
    left: 'center'
  });
  components.waitingModules = grid.set(1, 0, 12, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Waiting modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.doneModules = grid.set(1, 12, 12, 4, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Done modules',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.currentModule = grid.set(1, 4, 9, 8, contrib.table, {
    fg: 'green',
    interactive: false,
    label: 'Current module',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  components.progress = grid.set(10, 4, 3, 8, contrib.gauge, {
    label: 'Current module progress',
    stroke: 'green',
    fill: 'white'
  })
  components.total = grid.set(13, 14, 3, 2, contrib.donut, {
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
  components.time = grid.set(13, 12, 3, 2, blessed.box, {
    label: 'time',
    content: "0",
    left: 'center'
  });
  components.logs = grid.set(13, 0, 3, 12, blessed.box, {
    label: 'time',
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
