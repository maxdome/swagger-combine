const $RefParser = require('json-schema-ref-parser');
const SwaggerParser = require('swagger-parser');
const traverse = require('traverse');
const urlJoin = require('url-join');
const _ = require('lodash');

const operationTypes = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

class SwaggerCombine {
  constructor(config, opts) {
    this.config = _.cloneDeep(config);
    this.opts = opts || {};
    this.apis = [];
    this.schemas = [];
    this.combinedSchema = {};
  }

  combine() {
    return this.load()
      .then(() => this.filterPaths())
      .then(() => this.filterParameters())
      .then(() => this.renamePaths())
      .then(() => this.renameTags())
      .then(() => this.addTags())
      .then(() => this.renameSecurityDefinitions())
      .then(() => this.addSecurityToPaths())
      .then(() => this.addBasePath())
      .then(() => this.combineSchemas())
      .then(() => this.removeEmptyFields());
  }

  combineAndReturn() {
    return this.combine().then(() => this.combinedSchema);
  }

  load() {
    return $RefParser
      .dereference(this.config, this.opts)
      .then(configSchema => {
        this.apis = configSchema.apis || [];
        this.combinedSchema = _.omit(configSchema, 'apis');

        return Promise.all(
          this.apis.map((api, idx) => {
            const opts = _.cloneDeep(this.opts);
            opts.resolve = Object.assign({}, opts.resolve, api.resolve);

            if (_.has(opts, 'resolve.http.auth.username') && _.has(opts, 'resolve.http.auth.password')) {
              const basicAuth =
                'Basic ' +
                new Buffer(`${opts.resolve.http.auth.username}:${opts.resolve.http.auth.password}`).toString('base64');
              _.set(opts, 'resolve.http.headers.authorization', basicAuth);
            }

            return $RefParser
              .dereference(api.url, opts)
              .then(res => SwaggerParser.dereference(res, opts))
              .catch(err => {
                if (this.opts.continueOnError) {
                  return;
                }

                throw err;
              });
          })
        );
      })
      .then(apis => {
        this.schemas = apis;
        return this;
      });
  }

  filterPaths() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].paths) {
        if (this.apis[idx].paths.include && this.apis[idx].paths.include.length > 0) {
          schema.paths = _.pick(schema.paths, this.apis[idx].paths.include);
        } else if (this.apis[idx].paths.exclude && this.apis[idx].paths.exclude.length > 0) {
          schema.paths = _.omit(schema.paths, this.apis[idx].paths.exclude);
        }
      }

      return schema;
    });

    return this;
  }

  filterParameters() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].paths && this.apis[idx].paths.parameters) {
        const excludeParameters = this.apis[idx].paths.parameters.exclude;
        const includeParameters = this.apis[idx].paths.parameters.include;

        if (includeParameters && !_.isEmpty(includeParameters)) {
          _.forIn(includeParameters, (parameterToInclude, parameterPath) => {
            const hasHttpMethod = /\.(get|put|post|delete|options|head|patch)$/i.test(parameterPath);
            const pathInSchema = _.get(schema.paths, parameterPath);

            if (pathInSchema) {
              if (hasHttpMethod) {
                pathInSchema.parameters = _.filter(
                  pathInSchema.parameters,
                  curParam => curParam.name === parameterToInclude
                );
              } else {
                _.forIn(pathInSchema, (properties, method) => {
                  pathInSchema[method].parameters = _.filter(
                    pathInSchema[method].parameters,
                    curParam => curParam.name === parameterToInclude
                  );
                });
              }
            }
          });
        } else if (excludeParameters && !_.isEmpty(excludeParameters)) {
          _.forIn(excludeParameters, (parameterToExclude, parameterPath) => {
            const hasHttpMethod = /\.(get|put|post|delete|options|head|patch)$/i.test(parameterPath);
            const pathInSchema = _.get(schema.paths, parameterPath);

            if (pathInSchema) {
              if (hasHttpMethod) {
                pathInSchema.parameters = _.remove(
                  pathInSchema.parameters,
                  curParam => curParam.name !== parameterToExclude
                );
              } else {
                _.forIn(pathInSchema, (properties, method) => {
                  pathInSchema[method].parameters = _.remove(
                    pathInSchema[method].parameters,
                    curParam => curParam.name !== parameterToExclude
                  );
                });
              }
            }
          });
        }
      }

      return schema;
    });

    return this;
  }

  renamePaths() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].paths && this.apis[idx].paths.rename && Object.keys(this.apis[idx].paths.rename).length > 0) {
        _.forIn(this.apis[idx].paths.rename, (renamePath, pathToRename) => {
          schema.paths = _.mapKeys(schema.paths, (value, curPath) => {
            if (pathToRename === curPath) {
              return renamePath;
            }

            return curPath;
          });
        });
      }

      return schema;
    });

    return this;
  }

  renameTags() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].tags && this.apis[idx].tags.rename && Object.keys(this.apis[idx].tags.rename).length > 0) {
        _.forIn(this.apis[idx].tags.rename, (newTagName, tagNameToRename) => {
          traverse(schema).forEach(function traverseSchema() {
            if (this.key === 'tags' && Array.isArray(this.node) && this.node.includes(tagNameToRename)) {
              this.update(_.uniq(this.node.map(tag => (tag === tagNameToRename ? newTagName : tag))));
            }
          });
        });
      }

      return schema;
    });

    return this;
  }

  addTags() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].tags && this.apis[idx].tags.add && this.apis[idx].tags.add.length > 0) {
        this.apis[idx].tags.add.forEach(newTagName => {
          traverse(schema).forEach(function traverseSchema() {
            if (
              this.parent &&
              this.parent.parent &&
              this.parent.parent.key === 'paths' &&
              operationTypes.includes(this.key)
            ) {
              const newTags =
                this.node.tags && Array.isArray(this.node.tags)
                  ? _.uniq(this.node.tags.concat(newTagName))
                  : [newTagName];

              this.update(Object.assign({}, this.node, { tags: newTags }));
            }
          });
        });
      }

      return schema;
    });

    return this;
  }

  renameSecurityDefinitions() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (
        this.apis[idx].securityDefinitions &&
        this.apis[idx].securityDefinitions.rename &&
        Object.keys(this.apis[idx].securityDefinitions.rename).length > 0
      ) {
        _.forIn(this.apis[idx].securityDefinitions.rename, (newName, curName) => {
          if (_.has(schema.securityDefinitions, curName)) {
            _.set(schema.securityDefinitions, newName, schema.securityDefinitions[curName]);
            _.unset(schema.securityDefinitions, curName);

            traverse(schema).forEach(function traverseSchema() {
              if (this.key === 'security' && Array.isArray(this.node) && this.node.some(sec => !!sec[curName])) {
                this.update(
                  this.node.map(sec => {
                    if (_.has(sec, curName)) {
                      _.set(sec, newName, sec[curName]);
                      _.unset(sec, curName);
                    }

                    return sec;
                  })
                );
              }
            });
          }
        });
      }

      return schema;
    });

    return this;
  }

  addSecurityToPaths() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (
        this.apis[idx].paths &&
        this.apis[idx].paths.security &&
        Object.keys(this.apis[idx].paths.security).length > 0
      ) {
        _.forIn(this.apis[idx].paths.security, (securityDefinitions, pathForSecurity) => {
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

    return this;
  }

  addBasePath() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].paths && this.apis[idx].paths.base) {
        schema.paths = _.mapKeys(schema.paths, (value, curPath) => {
          return urlJoin(this.apis[idx].paths.base, curPath);
        });
      }

      return schema;
    });

    return this;
  }

  combineSchemas() {
    this.schemas.forEach(schema => {
      const conflictingPaths = _.intersection(_.keys(this.combinedSchema.paths), _.keys(_.get(schema, 'paths')));
      const conflictingSecurityDefs = _.intersection(
        _.keys(this.combinedSchema.securityDefinitions),
        _.keys(_.get(schema, 'securityDefinitions'))
      );

      if (!_.isEmpty(conflictingPaths)) {
        throw new Error(`Name conflict in paths: ${conflictingPaths.join(', ')}`);
      }

      if (!_.isEmpty(conflictingSecurityDefs)) {
        throw new Error(`Name conflict in security definitions: ${conflictingSecurityDefs.join(', ')}`);
      }

      _.defaultsDeep(this.combinedSchema, _.pick(schema, ['paths', 'securityDefinitions']));
    });

    return this;
  }

  removeEmptyFields() {
    this.combinedSchema = _(this.combinedSchema)
      .omitBy(_.isNil)
      .omitBy(_.isEmpty)
      .value();
    return this;
  }

  toString(format = this.opts.format) {
    if (String(format).toLowerCase() === 'yaml' || String(format).toLowerCase() === 'yml') {
      return $RefParser.YAML.stringify(this.combinedSchema);
    }

    return JSON.stringify(this.combinedSchema);
  }
}

module.exports = SwaggerCombine;
