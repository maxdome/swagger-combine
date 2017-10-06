const SwaggerCombine = require('./SwaggerCombine');

exports.middleware = (config, opts = {}) => {
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

exports.middlewareAsync = (config, opts = {}) => {
  return new SwaggerCombine(config, opts).combine().then(sc => {
    return function(req, res, next) {
      if (opts && (opts.format === 'yaml' || opts.format === 'yml')) {
        return res.type('yaml').send(sc.toString());
      }

      res.json(sc.combinedSchema);
    };
  });
};
