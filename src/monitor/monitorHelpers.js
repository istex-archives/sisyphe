module.exports.propertyToArray = function(object) {
  const arrayWaitingModules = []
  for (var value in object) {
    if (object.hasOwnProperty(value)) {
      arrayWaitingModules.push([value])
    }
  }
  return arrayWaitingModules
}

module.exports.getColorOfPercent = function(percent) {
  switch (true) {
    case percent >= 0 && percent <= 20:
      return color = 'red'
      break;
    case percent > 20 && percent <= 40:
      return color = 'yellow'
      break;
    case percent > 40 && percent <= 60:
      return color = 'magenta'
      break;
    case percent > 60 && percent <= 80:
      return color = 'cyan'
      break;
    case percent > 80 && percent <= 100:
      return color = 'green'
      break;
    default:
      return color = 'red'
  }
}
module.exports.nbProperty = function(object) {
  let nbProperty = 0
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      nbProperty++
    }
  }
  return nbProperty
}
