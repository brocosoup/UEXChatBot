module.exports = {
  log,
  setLogLevel
};

var logLevel = 1;

function log(message, level = 0) {
  if (level >= logLevel)
    console.log("LOGGER: " + message);
}

function setLogLevel(newLogLevel) {
  logLevel = newLogLevel
  return logLevel;
}