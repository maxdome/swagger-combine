const $RefParser = require('json-schema-ref-parser');
const SwaggerParser = require('swagger-parser');
const maybe = require('call-me-maybe');
const traverse = require('traverse');
const _ = require('lodash');

function swaggerCombine(config = 'config/swagger.json', cb) {
  let combinedSchema;
  let apis;

  return maybe(cb, $RefParser.parse(config)
    .then((configSchema) => {
      apis = configSchema.apis;
      combinedSchema = _.omit(configSchema, 'apis');

      return Promise.all(apis.map(api => SwaggerParser.dereference(api.url)));
    })
    .then((data) => {
      data.forEach((schema, idx) => {
        if (apis[idx].paths) {
          // Filter paths by excluding paths
          if (apis[idx].paths.exclude && apis[idx].paths.exclude.length > 0) {
            schema.paths = _.omit(schema.paths, apis[idx].paths.exclude);
          }

          // Filter paths by only using included paths
          if (apis[idx].paths.include && apis[idx].paths.include.length > 0) {
            schema.paths = _.pick(schema.paths, apis[idx].paths.include);
          }

          // Replace paths
          if (apis[idx].paths.replace && Object.keys(apis[idx].paths.replace).length > 0) {
            _.forIn(apis[idx].paths.replace, (replacePath, pathToReplace) => {
              schema.paths = _.mapKeys(schema.paths, (value, curPath) => {
                if (pathToReplace === curPath) {
                  return replacePath;
                }

                return curPath;
              });
            });
          }

          // Add security to paths
          if (apis[idx].paths.security && Object.keys(apis[idx].paths.security).length > 0) {
            _.forIn(apis[idx].paths.security, (securityDefinitions, pathForSecurity) => {
              const pathComponents = pathForSecurity.split('.');
              const pathInSchema = _.get(schema.paths, pathForSecurity);

              if (pathInSchema) {
                if (pathComponents.length === 1) {
                  _.forIn(pathInSchema, (properties, method) => {
                    _.forIn(securityDefinitions, (scope, type) => {
                      pathInSchema[method].security = pathInSchema[method].security || [];
                      pathInSchema[method].security.push({ [type]: scope });
                    });
                  });
                } else if (pathComponents.length === 2) {
                  _.forIn(securityDefinitions, (scope, type) => {
                    pathInSchema.security = pathInSchema.security || [];
                    pathInSchema.security.push({ [type]: scope });
                  });
                }
              }
            });
          }
        }

        // Replace Tags
        if (apis[idx].tags && apis[idx].tags.replace && Object.keys(apis[idx].tags.replace).length > 0) {
          _.forIn(apis[idx].tags.replace, (replaceTag, tagToReplace) => {
            traverse(schema).forEach((function traverseSchema() {
              if (this.key === 'tags' && Array.isArray(this.node) && this.node.includes(tagToReplace)) {
                this.update(this.node.map(tag => tag === tagToReplace ? replaceTag : tag)); // eslint-disable-line
              }
            }));
          });
        }

        const conflictingPaths = _.intersection(_.keys(combinedSchema.paths), _.keys(schema.paths));

        if (!_.isEmpty(conflictingPaths)) {
          throw new Error(`Name conflict in paths: ${conflictingPaths.join(', ')}`);
        }

        _.defaultsDeep(combinedSchema, _.pick(schema, ['paths', 'securityDefinitions']));
      });

      _.forEach(combinedSchema, (value, key) => {
        if (!value || _.isEmpty(value)) {
          _.unset(combinedSchema, key);
        }
      });

      return combinedSchema;
    })
  );
}

swaggerCombine.middleware = config => (req, res, next) => {
  swaggerCombine(config)
    .then(combinedSchema => res.send(combinedSchema))
    .catch(err => next(err));
};

module.exports = swaggerCombine;
