const _ = require('lodash');
const maybe = require('call-me-maybe');

const SwaggerCombine = require('./SwaggerCombine');
const { middleware, middlewareAsync } = require('./middleware');

function swaggerCombine(config = 'docs/swagger.json', opts, cb) {
  if (_.isFunction(opts)) {
    cb = opts;
    opts = null;
  }

  return maybe(cb, new SwaggerCombine(config, opts).combineAndReturn());
}

swaggerCombine.SwaggerCombine = SwaggerCombine;
swaggerCombine.middleware = middleware;
swaggerCombine.middlewareAsync = middlewareAsync;

module.exports = swaggerCombine;
