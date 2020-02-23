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


var Writer = function(options) {
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

  var callbackPromise = {};
  var promise = new Promise((res, rej) => {
    callbackPromise.res = res;
    callbackPromise.rej = rej;
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
    writeLine: function(line) {
      var returnValue;
      if (hasHeader && !hasFooter && !closed) {
        returnValue = writer.write((first ? '' : delimiter) + line);
        first = false;
        return returnValue;
      } else {
        throw new Error('Line cannot be written: hasHeader:' + hasHeader + ' hasFooter:' + hasFooter + ' closed:' + closed);
      }
    },
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
    streamReader: function(reader) {
      reader.open();
      reader.stream().pipe(outStream);
      reader.stream().on('end', () => fns.save());
      reader.promise().then(r => {
        fns.close();
        callbackPromise.res(r);
      }).catch(e => callbackPromise.rej(e));
      return promise;
    },
    promise: function() {
      return promise;
    }
  };

  var outStream = new Writable({
    write(chunk, encoding, callback) {
      first && !hasHeader && !closed && fns.open();
      chunk.toString().split('\n').forEach(line => {
        // if (line.match(new RegExp(' {0,}{ {0,}"type": {0,}"Feature".+?},?$'))) {
        fns.writeLine(line); //.replace(/, {0,}$/,''));
        // }
      });
      callback();
    }
  });

  for (var fn in fns) {
    outStream[fn] = fns[fn];
  }
  return outStream;
};

module.exports = Writer;
