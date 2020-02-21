/* eslint-env node, es6 */
const Writers = {
  file: require('./writers/file.js'),
  // ogr2ogr: require('./writers/ogr2ogr.js'),
  postgres: require('./writers/postgres.js'),
  sqlite: require('./writers/sqlite.js'),
  stdout: require('./writers/stdout.js')
};

const {
  Writable
} = require('stream');

var Writer = function(type) {
  return function(options) {
    options.type = type;
    return geojsonWriter(options);
  };
};

var geojsonWriter = function(options) {
  var header = '{"type": "FeatureCollection", "features": [';
  var footer = ']}';
  var bboxFooter = '], "bbox":{bbox}}';
  var delimiter = ',';

  // Set default options to stdout
  options = options || {};
  options.type = options.type || 'stdout';

  if (options['line-delimited'] || options.type === 'sqlite' || options.type === 'postgres') {
    header = footer = bboxFooter = '';
    delimiter = '\n';
  }

  var writer = new Writers[options.type](options);
  writer.open();

  var hasHeader = false;
  var hasFooter = false;
  var closed = false;
  var first = true;

  var writeLine = function(line) {
    var returnValue;
    if (hasHeader && !hasFooter && !closed) {
      returnValue = writer.write((first ? '' : delimiter) + line);
      first = false;
      return returnValue;
    } else {
      throw new Error('Line cannot be written: hasHeader:' + hasHeader + ' hasFooter:' + hasFooter + ' closed:' + closed);
    }
  };

  var outStream = new Writable({
    write(chunk, encoding, callback) {
      writeLine(chunk);
      callback();
    }
  });

  var fns = {
    open: function() {
      if (first && !hasHeader && !closed) {
        hasHeader = true;
        return writer.write(header);
      } else {
        throw new Error('Header already added');
      }
    },
    save: function() {
      if (hasHeader && !hasFooter && !closed) {
        return writer.save();
      } else {
        throw new Error('Cannot save');
      }
    },
    writeLine: writeLine,
    close: function(bbox) {
      var thisFooter = bbox ? bboxFooter.replace('{bbox}', JSON.stringify(bbox)) : footer;
      if (hasHeader && !hasFooter && !closed) {
        hasFooter = true;
        writer.write(thisFooter);
      } else {
        throw new Error(hasFooter ? 'Footer already added' : 'No header exists');
      }
      if (!closed) {
        closed = true;
        return writer.close();
      } else {
        throw new Error(options.type + ' already closed');
      }
    },
    stream: writer.stream,
    promise: writer.promise || {
      'then': function(callback) {
        return callback();
      }
    }
  };

  for (var fn in fns) {
    outStream[fn] = fns[fn];
  }
  return outStream;
};

module.exports = Writer;
