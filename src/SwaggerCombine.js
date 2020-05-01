const $RefParser = require('json-schema-ref-parser');
const SwaggerParser = require('swagger-parser');
const traverse = require('traverse');
const urlJoin = require('url-join');
const YAML = require('js-yaml');
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
      .then(() => this.renameOperationIds())
      .then(() => this.renameSecurityDefinitions())
      .then(() => this.dereferenceSchemaSecurity())
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

                err.api = api.url;
                throw err;
              });
          })
        );
      })
      .then(apis => {
        this.schemas = apis.filter(api => !!api);
        this.apis = this.apis.filter((_api, idx) => !!apis[idx]);
        return this;
      });
  }

  matchInArray(string, expressions) {
    return expressions.filter(obj => new RegExp(obj).test(string)).length != 0;
  }

  filterPaths() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (this.apis[idx].paths) {
        if (this.apis[idx].paths.include && this.apis[idx].paths.include.length > 0) {
          const explicitIncludes = this.expandRegexPathMethod(schema, this.apis[idx].paths.include);

          schema.paths = _.merge(
            _.pick(schema.paths, explicitIncludes), 
            _.pickBy(schema.paths, (prop, path) => this.matchInArray(path, explicitIncludes))
          );
        } else if (this.apis[idx].paths.exclude && this.apis[idx].paths.exclude.length > 0) {
          const explicitExcludes = this.expandRegexPathMethod(schema, this.apis[idx].paths.exclude);

          schema.paths = _.omit(schema.paths, explicitExcludes);
          schema.paths = _.omitBy(schema.paths, (prop, path) => this.matchInArray(path, explicitExcludes));
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
        let renamings;

        if (_.isPlainObject(this.apis[idx].paths.rename)) {
          renamings = [];
          _.forIn(this.apis[idx].paths.rename, (renamePath, pathToRename) => {
            renamings.push({
              type: 'rename',
              from: pathToRename,
              to: renamePath,
            });
          });
        } else {
          renamings = this.apis[idx].paths.rename;
        }

        _.forEach(renamings, renaming => {
          schema.paths = _.mapKeys(schema.paths, (curPathValue, curPath) => this.rename(renaming, curPath));
        });
      }

      return schema;
    });

    return this;
  }

  renameOperationIds() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (
        this.apis[idx].operationIds &&
        this.apis[idx].operationIds.rename &&
        Object.keys(this.apis[idx].operationIds.rename).length > 0
      ) {
        let renamings;

        if (_.isPlainObject(this.apis[idx].operationIds.rename)) {
          renamings = [];
          _.forIn(this.apis[idx].operationIds.rename, (renameOperationId, operationIdToRename) => {
            renamings.push({
              type: 'rename',
              from: operationIdToRename,
              to: renameOperationId,
            });
          });
        } else {
          renamings = this.apis[idx].operationIds.rename;
        }

        _.forEach(renamings, renaming => {
          const rename = this.rename.bind(this);
          traverse(schema).forEach(function traverseSchema() {
            if (this.key === 'operationId') {
              const newName = rename(renaming, this.node);
              this.update(newName);
            }
          });
        });
      }

      return schema;
    });

    return this;
  }

  rename(renaming, node) {
    switch (renaming.type) {
      case 'rename':
        return this.renameByReplace(node, renaming.from, renaming.to);
      case 'regex':
      case 'regexp':
        return this.renameByRegexp(node, renaming.from, renaming.to);
      case 'fn':
      case 'fnc':
      case 'function':
        return (renaming.to || renaming.from)(node);
      default:
        return node;
    }
  }

  renameByReplace(currentValue, valueToRename, renameValue) {
    if (valueToRename === currentValue) {
      return renameValue;
    }

    return currentValue;
  }

  renameByRegexp(currentValue, valueToRename, renameValue) {
    let regex;
    if (_.isRegExp(valueToRename)) {
      regex = valueToRename;
    } else {
      regex = new RegExp(valueToRename);
    }

    return currentValue.replace(regex, renameValue);
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

  dereferenceSchemaSecurity() {
    this.schemas = this.schemas.map((schema, idx) => {
      if (schema && schema.security) {
        traverse(schema).forEach(function traverseSchema() {
          if (
            /(get|put|post|delete|options|head|patch)$/i.test(this.key) &&
            this.parent &&
            this.parent.parent &&
            this.parent.parent.key === 'paths' &&
            !this.node.security
          ) {
            this.update(Object.assign({}, this.node, { security: schema.security }));
          }
        });

        _.unset(schema, 'security');
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
      }else{
        /* native basePath support for sub schema
         if a schema has a basePath defined, 
         combine the basePath with the route paths before merge */
        if ((this.opts.useBasePath || (this.apis[idx].paths && !!this.apis[idx].paths.useBasePath) && schema.basePath)){
          schema.paths = _.mapKeys(schema.paths, (value, curPath) => {
            return urlJoin(schema.basePath, curPath);
          });
          delete schema.basePath;
        }
      }

      return schema;
    });

    return this;
  }

  combineSchemas() {
    const operationIds = [];

    this.schemas.forEach(schema => {
      const conflictingPaths = _.intersection(_.keys(this.combinedSchema.paths), _.keys(_.get(schema, 'paths')));
      const securityDefinitions = _.get(schema, 'securityDefinitions');
      const conflictingSecurityDefs = _.intersection(
        _.keys(this.combinedSchema.securityDefinitions),
        _.keys(securityDefinitions)
      ).filter(key => !_.isEqual(securityDefinitions[key], this.combinedSchema.securityDefinitions[key]));

      const newOperationIds = traverse(schema).reduce(function(acc, x) {
        if (
          'operationId' === this.key &&
          this.parent &&
          /(get|put|post|delete|options|head|patch)$/i.test(this.parent.key) &&
          this.parent.parent &&
          this.parent.parent.parent &&
          this.parent.parent.parent.key === 'paths'
        ) {
          acc.push(x);
        }
        return acc;
      }, []);
      const conflictingOperationIds = _.intersection(operationIds, newOperationIds);

      if (!_.isEmpty(conflictingPaths)) {
        if (this.opts.continueOnConflictingPaths) {
          for (let cPath of conflictingPaths) {
            const conflictingPathOps = _.intersection(
              _.keys(this.combinedSchema.paths[cPath]),
              _.keys(schema.paths[cPath])
            );
            if (!_.isEmpty(conflictingPathOps)) {
              throw new Error(`Name conflict in paths: ${cPath} at operation: ${conflictingPathOps.join(', ')}`);
            }
          }
        } else {
          throw new Error(`Name conflict in paths: ${conflictingPaths.join(', ')}`);
        }
      }

      if (!_.isEmpty(conflictingSecurityDefs)) {
        throw new Error(`Name conflict in security definitions: ${conflictingSecurityDefs.join(', ')}`);
      }

      if (!_.isEmpty(conflictingOperationIds)) {
        throw new Error(`OperationID conflict: ${conflictingOperationIds.join(', ')}`);
      }

      operationIds.push.apply(operationIds, newOperationIds);

      _.defaultsDeep(this.combinedSchema, _.pick(schema, ['paths', 'securityDefinitions']));

      if (this.opts.includeDefinitions) {
        this.includeTerm(schema, 'definitions');
      }

      if (this.opts.includeParameters) {
        this.includeTerm(schema, 'parameters');
      }

      if (this.opts.includeGlobalTags) {
        this.includeTermArray(schema, 'tags', 'name');
      }

    });

    return this;
  }

  includeTerm(schema, term) {
    const conflictingTerms = _.intersection(
      _.keys(this.combinedSchema[term]),
      _.keys(_.get(schema, term))
    ).filter(
      key => !_.isEqual(_.get(schema, `${term}.${key}`), _.get(this, `combinedSchema.${term}.${key}`))
    );

    if (!_.isEmpty(conflictingTerms)) {
      throw new Error(`Name conflict in ${term}: ${conflictingTerms.join(', ')}`);
    }

    _.defaultsDeep(this.combinedSchema, _.pick(schema, [term]));
  }

  includeTermArray(schema, term, matchBy) {
    if (!_.has(schema, term)) {
      return
    }

    const conflictingTerms = _.intersectionBy(
      this.combinedSchema[term] || [], 
      _.get(schema, term),
      matchBy
    );

    if (!_.isEmpty(conflictingTerms)) {
      throw new Error(`Name conflict in ${term}: ${conflictingTerms.join(', ')}`);
    }

    if (!_.has(this.combinedSchema, term)) {
      _.defaultsDeep(this.combinedSchema, _.pick(schema, [term]));
    } else {
      this.combinedSchema[term] = this.combinedSchema[term].concat(_.get(schema, term));
    }
  }

  removeEmptyFields() {
    this.combinedSchema = _(this.combinedSchema)
      .omitBy(_.isNil)
      .omitBy(_.isEmpty)
      .value();
    return this;
  }

  // Expand `pathMatchList` into a set of defined path.method strings that exist in `schema`
  expandRegexPathMethod(schema, pathMatchList) {
    const dotPaths = Object.keys(schema.paths)
      .reduce((allDotPaths, currentPath) => {
        allDotPaths.push(currentPath);
        const methods = Object.keys(schema.paths[currentPath]).filter(method => operationTypes.includes(method));
        return allDotPaths.concat(methods.map((method) => `${currentPath}.${method}`));
      }, []);
    const explicitIncludes = dotPaths.filter((dotPath) => this.matchInArray(dotPath, pathMatchList));
    return explicitIncludes;
  }

  toString(format = this.opts.format) {
    if (String(format).toLowerCase() === 'yaml' || String(format).toLowerCase() === 'yml') {
      return YAML.safeDump(this.combinedSchema);
    }

    return JSON.stringify(this.combinedSchema, null, 2);
  }
}

module.exports = SwaggerCombine;
