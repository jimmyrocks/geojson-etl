var Reader = require('./src/reader');
var Writer = require('./src/writer');

var source = {
  'type': 'ogr2ogr',
  'connectionString': '/code/test.geojson',
  'ogrOptions': []
};

var dest = {
  'type': 'stdout'
};

var ogrReader = new Reader(source.type)(source);
var ogrWriter = new Writer(dest.type)(dest);

ogrWriter.open();
ogrReader.open();

ogrReader.stream().pipe(ogrWriter); //.on('data', line => ogrWriter.writeLine(line));
ogrReader.stream().on('end', () => ogrWriter.save());

ogrReader.promise().then(r => {
  ogrWriter.close();
  console.error(':)', r);
}).catch(e => {
  console.error(':(', e);
});
