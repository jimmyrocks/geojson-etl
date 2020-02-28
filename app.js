const Reader = require('./src/reader');
const Writer = require('./src/writer');

const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this usage guide.'
  },
  {
    name: 'source',
    alias: 's',
    type: String,
    multiple: false,
    description: 'An Object to describe the source'
  },
  {
    name: 'destination',
    alias: 'd',
    type: String,
    multiple: false,
    description: 'An Object to describe the destination'
  }
];

const copy = function(reader, writer) {
  return writer.streamReader(reader);
};

const main = function(source, destination, runNow) {
  var returnValue;
  var reader = new Reader(source);
  var writer = new Writer(destination);
  if (runNow) {
    returnValue = copy(reader, writer);
  } else {
    return {
      reader: reader,
      writer: writer
    };
  }
  return returnValue;
};

if (require.main === module) {
  // CLI
  const commandLineArgs = require('command-line-args');
  const commandLineUsage = require('command-line-usage');
  const options = commandLineArgs(optionDefinitions);
  const usage = commandLineUsage([{
    'header': 'esri-dump stream',
    'content': 'Stream ESRI REST Endpoints to GeoJSON'
  }, {
    'header': 'Options',
    'optionList': optionDefinitions
  }]);

  if (options.help) {
    console.log(usage);
    process.exit();
  }

  try {
    var objSource = JSON.parse(options.source);
  } catch (e) {
    console.error('Problem parsing JSON Source');
    throw e;
  }
  try {
    var objDestination = JSON.parse(options.destination);
  } catch (e) {
    console.error('Problem parsing JSON Destination');
    throw e;
  }

  main(objSource, objDestination, true)
    .then(r => r)
    .catch(e => {
      throw (e);
    });

} else {
  console.log('required as a module');
  module.exports = main;
}
