const SwaggerCombine = require('./SwaggerCombine');

module.exports = (config, opts = {}) => {
  return function(req, res, next) {
    new SwaggerCombine(config, opts)
      .combine()
      .then(sc => {
        if (opts && (opts.format === 'yaml' || opts.format === 'yml')) {
          return res.type('yaml').send(sc.toString());
        }

        res.json(sc.combinedSchema);
      })
      .catch(err => next(err));
  };
};
