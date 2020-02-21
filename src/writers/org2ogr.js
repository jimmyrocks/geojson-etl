/* eslint-env node, es6 */
const {
  Readable
} = require('stream');
const org2ogr = require('ogr2ogr');

var ogr2ogr = function (options) {
  var writeStream;
  if (options.stream) {
    writeStream = new Readable();
    writeStream._read = function () {};
  }

  // set defaults
  var inFormat = options.inFormat || 'GeoJSON';
  var outFormat = options.outFormat || 'GeoJSON';
  var destination = options.destination || 'stdout'; //TODO, better default?
  var ogrOptions = options.ogrOptions || [];
  var callPromise = {};

  var promise = new Promise((resolve, reject) => {
    callPromise.res = resolve;
    callPromise.rej = reject;
  });

  var open = function () {
    ogr2ogr(writeStream, inFormat)
      .options(ogrOptions)
      .format(outFormat)
      .destination(destination)
      .exec((e,r) => {
        e ? callPromise.rej(e) : callPromise.res(r);
      });
  };
  var save = function () {};
  var close = function () {
    if (writeStream) {
      writeStream.push(null);
    }
  };
  var write = function (line) {
    if (writeStream) {
      writeStream.push(line);
    } else {
      process.ogr2ogr.write(line);
    }
  };
  return {
    'open': open,
    'close': close,
    'write': write,
    'save': save,
    'stream': writeStream,
    'promise': promise
  };
};

module.exports = ogr2ogr;
