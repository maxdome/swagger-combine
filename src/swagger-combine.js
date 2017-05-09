const $RefParser = require('json-schema-ref-parser');
const SwaggerParser = require('swagger-parser');
const maybe = require('call-me-maybe');
const traverse = require('traverse');
const _ = require('lodash');

function swaggerCombine(config = 'config/swagger.json', cb) {
  let combinedSchema;
  let apis;

  function filterPaths(schemas) {
    return schemas.map((schema, idx) => {
      if (apis[idx].paths) {
        if (apis[idx].paths.include && apis[idx].paths.include.length > 0) {
          schema.paths = _.pick(schema.paths, apis[idx].paths.include);
        } else if (apis[idx].paths.exclude && apis[idx].paths.exclude.length > 0) {
          schema.paths = _.omit(schema.paths, apis[idx].paths.exclude);
        }
      }

      return schema;
    });
  }

  function replacePaths(schemas) {
    return schemas.map((schema, idx) => {
      if (apis[idx].paths && apis[idx].paths.replace && Object.keys(apis[idx].paths.replace).length > 0) {
        _.forIn(apis[idx].paths.replace, (replacePath, pathToReplace) => {
          schema.paths = _.mapKeys(schema.paths, (value, curPath) => {
            if (pathToReplace === curPath) {
              return replacePath;
            }

            return curPath;
          });
        });
      }

      return schema;
    })
  }

  function addSecurityToPaths(schemas) {
    return schemas.map((schema, idx) => {
      if (apis[idx].paths && apis[idx].paths.security && Object.keys(apis[idx].paths.security).length > 0) {
        _.forIn(apis[idx].paths.security, (securityDefinitions, pathForSecurity) => {
          const hasHttpMethod = /\.(get|put|post|delete|options|head|patch)$/i.test(pathForSecurity);
          const pathInSchema = _.get(schema.paths, pathForSecurity);

          if (pathInSchema) {
            if (hasHttpMethod) {
              _.forIn(securityDefinitions, (scope, type) => {
                pathInSchema.security = pathInSchema.security || [];
                pathInSchema.security.push({ [type]: scope });
              });
            } else {
              _.forIn(pathInSchema, (properties, method) => {
                _.forIn(securityDefinitions, (scope, type) => {
                  pathInSchema[method].security = pathInSchema[method].security || [];
                  pathInSchema[method].security.push({ [type]: scope });
                });
              });
            }
          }
        });
      }

      return schema;
    });
  }

  function replaceTags(schemas) {
    return schemas.map((schema, idx) => {
      if (apis[idx].tags && apis[idx].tags.replace && Object.keys(apis[idx].tags.replace).length > 0) {
        _.forIn(apis[idx].tags.replace, (replaceTag, tagToReplace) => {
          traverse(schema).forEach((function traverseSchema() {
            if (this.key === 'tags' && Array.isArray(this.node) && this.node.includes(tagToReplace)) {
              this.update(this.node.map(tag => tag === tagToReplace ? replaceTag : tag)); // eslint-disable-line
            }
          }));
        });
      }

      return schema;
    });
  }

  function combineSchemas(schemas) {
    schemas.forEach((schema, idx) => {
      const conflictingPaths = _.intersection(_.keys(combinedSchema.paths), _.keys(schema.paths));
      const conflictingSecurityDefs = _.intersection(_.keys(combinedSchema.securityDefinitions), _.keys(schema.securityDefinitions));

      if (!_.isEmpty(conflictingPaths)) {
        throw new Error(`Name conflict in paths: ${conflictingPaths.join(', ')}`);
      }

      if (!_.isEmpty(conflictingSecurityDefs)) {
        throw new Error(`Name conflict in security definitions: ${conflictingSecurityDefs.join(', ')}`);
      }

      _.defaultsDeep(combinedSchema, _.pick(schema, ['paths', 'securityDefinitions']));
    });

    return combinedSchema;
  }

  function removeEmptyFields(combinedSchema) {
    return _(combinedSchema).omitBy(_.isNil).omitBy(_.isEmpty);
  }

  return maybe(cb, $RefParser.dereference(config)
    .then((configSchema) => {
      apis = configSchema.apis;
      combinedSchema = _.omit(configSchema, 'apis');

      return Promise.all(apis.map(api => SwaggerParser.dereference(api.url)));
    })
    .then(filterPaths)
    .then(replacePaths)
    .then(addSecurityToPaths)
    .then(replaceTags)
    .then(combineSchemas)
    .then(removeEmptyFields)
  );
}

swaggerCombine.middleware = (config, opts = {}) => (req, res, next) => {
  swaggerCombine(config)
    .then(combinedSchema => {
      if (opts && (opts.format === 'yaml' || opts.format === 'yml')) {
        return res.type('yaml').send($RefParser.YAML.stringify(combinedSchema));
      }

      res.json(combinedSchema)
    })
    .catch(err => next(err));
};

module.exports = swaggerCombine;
