const SwaggerCombine = require('./SwaggerCombine');

class Middleware {
  static sendResponse(opts, sc, req, res, next) {
    if (opts && (opts.format === 'yaml' || opts.format === 'yml')) {
      return res.type('yaml').send(sc.toString());
    }

    res.json(sc.combinedSchema);
  }

  static middleware(config, opts = {}) {
    return function(req, res, next) {
      return new SwaggerCombine(config, opts)
        .combine()
        .then(sc => Middleware.sendResponse(opts, sc, req, res, next))
        .catch(err => next(err));
    };
  }

  static middlewareAsync(config, opts = {}) {
    return new SwaggerCombine(config, opts).combine().then(sc => {
      return function(req, res, next) {
        Middleware.sendResponse(opts, sc, req, res, next);
      };
    });
  }
}

module.exports = Middleware;
