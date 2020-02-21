//TODO MORE!

module.exports = function(type) {
  return require('./readers/' + type);
};
