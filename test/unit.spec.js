const chai = require('chai');
const http = require('http');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const expect = chai.expect;

const swaggerCombine = require('../src');

const sandbox = sinon.sandbox.create();
let instance;

describe('[Unit] SwaggerCombine.js', () => {
  describe('Instance', () => {
    beforeEach(() => {
      instance = new swaggerCombine.SwaggerCombine();
      instance.config = {};
      instance.schemas = [
        {
          security: [
            {
              test_schema_auth: [],
            },
          ],
          paths: {
            '/test/path/first': {
              get: {
                summary: 'GET /test/path/first',
                operationId: 'getFirst',
                parameters: [
                  {
                    name: 'testParam',
                    in: 'query',
                  },
                  {
                    name: 'testParamTwo',
                    in: 'header',
                  },
                  {
                    name: 'testParamThree',
                    in: 'body',
                  },
                  {
                    name: 'testParamsFour',
                    in: 'path',
                  },
                ],
              },
              post: {
                summary: 'POST /test/path/first',
                security: [
                  {
                    test_auth: [],
                  },
                ],
                parameters: [
                  {
                    name: 'testParam',
                    in: 'query',
                  },
                  {
                    name: 'testParamTwo',
                    in: 'header',
                  },
                ],
              },
              parameters: [
                {
                  name: 'sharedParam',
                  in: 'query',
                },
              ],
            },
            '/test/path/second': {
              get: {
                summary: 'GET /test/path/second',
                tags: ['testTagFirst', 'testTagSecond'],
              },
              post: {
                summary: 'POST /test/path/second',
                tags: ['testTagFirst', 'testTagSecond'],
              },
            },
          },
          securityDefinitions: {
            test_auth: {
              type: 'apiKey',
            },
            test_schema_auth: {
              type: 'apiKey',
            },
          },
        },
      ];
    });

    describe('combine()', () => {
      beforeEach(() => {
        sandbox.spy(instance, 'load');
        sandbox.spy(instance, 'filterPaths');
        sandbox.spy(instance, 'renamePaths');
        sandbox.spy(instance, 'renameTags');
        sandbox.spy(instance, 'renameSecurityDefinitions');
        sandbox.spy(instance, 'dereferenceSchemaSecurity');
        sandbox.spy(instance, 'addSecurityToPaths');
        sandbox.spy(instance, 'combineSchemas');
        sandbox.spy(instance, 'removeEmptyFields');
      });

      it('returns a promise', () => {
        expect(instance.combine()).to.be.a('promise');
      });

      it('calls all functions', () =>
        instance.combine().then(() => {
          expect(instance.load).to.have.been.calledOnce;
          expect(instance.filterPaths).to.have.been.calledOnce;
          expect(instance.renamePaths).to.have.been.calledOnce;
          expect(instance.renameTags).to.have.been.calledOnce;
          expect(instance.renameSecurityDefinitions).to.have.been.calledOnce;
          expect(instance.dereferenceSchemaSecurity).to.have.been.calledOnce;
          expect(instance.addSecurityToPaths).to.have.been.calledOnce;
          expect(instance.combineSchemas).to.have.been.calledOnce;
          expect(instance.removeEmptyFields).to.have.been.calledOnce;
        }));

      afterEach(() => sandbox.restore());
    });

    describe('combineAndReturn()', () => {
      it('returns a promise with combined schema', () => {
        instance.config = { test: 'test' };

        return instance.combineAndReturn().then(schema => {
          expect(schema).to.eql({ test: 'test' });
        });
      });
    });

    describe('load()', () => {
      beforeEach(() => {
        sandbox.stub(http, 'get');
      });

      it('transforms auth to authorization header and sends it on http request', () => {
        instance.config = {
          apis: [
            {
              url: 'http://test/swagger.json',
              resolve: {
                http: {
                  auth: {
                    username: 'admin',
                    password: 'secret12345',
                  },
                },
              },
            },
          ],
        };

        return instance
          .load()
          .then(() => {
            throw new Error('Should fail');
          })
          .catch(err => {
            expect(http.get).to.have.been.calledWithMatch(
              sinon.match({
                headers: {
                  authorization: sinon.match.string,
                },
              })
            );
          });
      });

      it('sets authorization headers on http request', () => {
        const token =
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImFkbWluIiwiYWRtaW4iOnRydWV9.44lJS0jlltzcglq7vgjXMXYRTecBxseN3Dec_LO_osI';
        instance.config = {
          apis: [
            {
              url: 'http://test/swagger.json',
              resolve: {
                http: {
                  headers: {
                    authorization: token,
                  },
                },
              },
            },
          ],
        };

        return instance
          .load()
          .then(() => {
            throw new Error('Should fail');
          })
          .catch(err => {
            expect(http.get).to.have.been.calledWithMatch(
              sinon.match({
                headers: {
                  authorization: token,
                },
              })
            );
          });
      });

      afterEach(() => sandbox.restore());
    });

    describe('filterPaths()', () => {
      it('filters included path', () => {
        instance.apis = [
          {
            paths: {
              include: ['/test/path/second'],
            },
          },
        ];

        instance.filterPaths();
        expect(instance.schemas[0].paths).to.have.all.keys(['/test/path/second']);
        expect(Object.keys(instance.schemas[0].paths)).to.have.lengthOf(1);
      });

      it('filters included method in path', () => {
        instance.apis = [
          {
            paths: {
              include: ['/test/path/second.get'],
            },
          },
        ];

        instance.filterPaths();
        expect(instance.schemas[0].paths).to.have.all.keys(['/test/path/second']);
        expect(instance.schemas[0].paths['/test/path/second']).to.have.all.keys(['get']);
        expect(Object.keys(instance.schemas[0].paths)).to.have.lengthOf(1);
        expect(Object.keys(instance.schemas[0].paths['/test/path/second'])).to.have.lengthOf(1);
      });

      it('filters out excluded path', () => {
        instance.apis = [
          {
            paths: {
              exclude: ['/test/path/first'],
            },
          },
        ];

        instance.filterPaths();
        expect(instance.schemas[0].paths).to.not.have.keys('/test/path/first');
        expect(Object.keys(instance.schemas[0].paths)).to.have.lengthOf(1);
      });

      it('filters out excluded method in path', () => {
        instance.apis = [
          {
            paths: {
              exclude: ['/test/path/first.get'],
            },
          },
        ];

        instance.filterPaths();
        expect(instance.schemas[0].paths['/test/path/first']).to.not.have.keys('get');
        expect(Object.keys(instance.schemas[0].paths['/test/path/first'])).to.have.lengthOf(2);
        expect(Object.keys(instance.schemas[0].paths)).to.have.lengthOf(2);
      });
    });

    describe('filterParameters()', () => {
      it('filters included parameter for method in path', () => {
        instance.apis = [
          {
            paths: {
              parameters: {
                include: {
                  '/test/path/first.get': 'testParam',
                },
              },
            },
          },
        ];

        instance.filterParameters();
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters).to.have.lengthOf(1);
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters.every(param => param.name === 'testParam'))
          .to.be.true;
      });

      it('filters included parameter for path', () => {
        instance.apis = [
          {
            paths: {
              parameters: {
                include: {
                  '/test/path/first': 'testParam',
                },
              },
            },
          },
        ];

        instance.filterParameters();
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters).to.have.lengthOf(1);
        expect(instance.schemas[0].paths['/test/path/first'].post.parameters).to.have.lengthOf(1);
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters.every(param => param.name === 'testParam'))
          .to.be.true;
        expect(instance.schemas[0].paths['/test/path/first'].post.parameters.every(param => param.name === 'testParam'))
          .to.be.true;
      });

      it('filters out excluded parameter for method in path', () => {
        instance.apis = [
          {
            paths: {
              parameters: {
                exclude: {
                  '/test/path/first.get': 'testParam',
                },
              },
            },
          },
        ];

        instance.filterParameters();
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters).to.have.lengthOf(3);
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters.some(param => param.name === 'testParam'))
          .to.be.false;
      });

      it('filters out excluded parameter for path', () => {
        instance.apis = [
          {
            paths: {
              parameters: {
                exclude: {
                  '/test/path/first': 'testParam',
                },
              },
            },
          },
        ];

        instance.filterParameters();
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters).to.have.lengthOf(3);
        expect(instance.schemas[0].paths['/test/path/first'].post.parameters).to.have.lengthOf(1);
        expect(instance.schemas[0].paths['/test/path/first'].get.parameters.some(param => param.name === 'testParam'))
          .to.be.false;
        expect(instance.schemas[0].paths['/test/path/first'].post.parameters.some(param => param.name === 'testParam'))
          .to.be.false;
      });
    });

    describe('renamePaths()', () => {
      it('renames path', () => {
        instance.apis = [
          {
            paths: {
              rename: {
                '/test/path/first': '/test/path/renamed',
              },
            },
          },
        ];

        instance.renamePaths();
        expect(instance.schemas[0].paths).to.not.have.keys('/test/path/first');
        expect(instance.schemas[0].paths).to.have.any.keys('/test/path/renamed');
      });
    });

    describe('renameTags()', () => {
      it('renames tags', () => {
        instance.apis = [
          {
            tags: {
              rename: {
                testTagFirst: 'testTagRenamed',
              },
            },
          },
        ];

        instance.renameTags();
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.not.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.include('testTagRenamed');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.have.lengthOf(2);
      });

      it('filters out duplicate tags', () => {
        instance.apis = [
          {
            tags: {
              rename: {
                testTagFirst: 'testTagSecond',
              },
            },
          },
        ];

        instance.renameTags();
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.not.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.include('testTagSecond');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.have.lengthOf(1);
      });
    });

    describe('addTags()', () => {
      it('adds tags', () => {
        instance.apis = [
          {
            tags: {
              add: ['newTag'],
            },
          },
        ];

        instance.addTags();
        expect(instance.schemas[0].paths['/test/path/first'].get.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/first'].post.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/first'].parameters).to.have.lengthOf(1);

        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/second'].post.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.have.lengthOf(3);
      });

      it('filters out duplicate tags', () => {
        instance.apis = [
          {
            tags: {
              add: ['testTagFirst'],
            },
          },
        ];

        instance.addTags();
        expect(instance.schemas[0].paths['/test/path/first'].get.tags).to.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/first'].post.tags).to.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/first'].parameters).to.have.lengthOf(1);

        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/second'].post.tags).to.include('testTagFirst');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.have.lengthOf(2);
      });
    });

    describe('renameSecurityDefinitions()', () => {
      beforeEach(() => {
        instance.apis = [
          {
            securityDefinitions: {
              rename: {
                test_auth: 'renamed_auth',
              },
            },
          },
        ];
      });

      it('renames security definitions', () => {
        instance.renameSecurityDefinitions();
        expect(instance.schemas[0].securityDefinitions).to.not.have.keys('test_auth');
        expect(instance.schemas[0].securityDefinitions).to.have.keys('renamed_auth', 'test_schema_auth');
      });

      it('renames security in pahts', () => {
        instance.renameSecurityDefinitions();
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.not.deep.include({ test_auth: [] });
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.deep.include({ renamed_auth: [] });
      });
    });

    describe('dereferenceSchemaSecurity()', () => {
      beforeEach(() => {
        instance.apis = [{}];
      });

      it('dereference schema security', () => {
        instance.dereferenceSchemaSecurity();
        expect(instance.schemas[0]).to.not.have.keys('security');
      });

      it('dereference schema security adds security in paths', () => {
        instance.dereferenceSchemaSecurity();
        expect(instance.schemas[0].paths['/test/path/first'].get.security).to.deep.include({ test_schema_auth: [] });
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.deep.include({ test_auth: [] });
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.not.deep.include({ test_schema_auth: [] });
        expect(instance.schemas[0].paths['/test/path/second'].get.security).to.deep.include({ test_schema_auth: [] });
        expect(instance.schemas[0].paths['/test/path/second'].post.security).to.deep.include({ test_schema_auth: [] });
      });
    });

    describe('addSecurityToPaths()', () => {
      it('adds security to all methods in path', () => {
        instance.apis = [
          {
            paths: {
              security: {
                '/test/path/second': {
                  test_security: [],
                },
              },
            },
          },
        ];

        instance.addSecurityToPaths();
        expect(instance.schemas[0].paths['/test/path/second'].get.security).to.deep.include({ test_security: [] });
        expect(instance.schemas[0].paths['/test/path/second'].post.security).to.deep.include({ test_security: [] });
      });

      it('adds security to method in path', () => {
        instance.apis = [
          {
            paths: {
              security: {
                '/test/path/second.get': {
                  test_security: [],
                },
              },
            },
          },
        ];

        instance.addSecurityToPaths();
        expect(instance.schemas[0].paths['/test/path/second'].get.security).to.deep.include({ test_security: [] });
        expect(instance.schemas[0].paths['/test/path/second'].post.security).to.not.be.ok;
      });
    });

    describe('addBasePath()', () => {
      it('adds a base to all paths of an API', () => {
        instance.apis = [
          {
            paths: {
              base: '/base',
            },
          },
        ];

        instance.addBasePath();
        expect(Object.keys(instance.schemas[0].paths).every(path => /^\/base\/.*/.test(path))).to.be.ok;
      });
    });

    describe('combineSchemas()', () => {
      it('combines schema paths', () => {
        instance.schemas.push({
          paths: {
            '/schematwo/test': {
              get: {
                summary: 'GET /schematwo/test',
              },
            },
          },
        });

        instance.combineSchemas();
        expect(Object.keys(instance.combinedSchema.paths)).to.have.lengthOf(3);
        expect(instance.combinedSchema.paths).to.have.all.keys([
          '/test/path/first',
          '/test/path/second',
          '/schematwo/test',
        ]);
      });

      it('combines schema security definitions', () => {
        instance.schemas.push({
          securityDefinitions: {
            schema_two_auth: {
              type: 'apiKey',
            },
          },
        });

        instance.combineSchemas();
        expect(Object.keys(instance.combinedSchema.securityDefinitions)).to.have.length(3);
        expect(instance.combinedSchema.securityDefinitions).to.have.all.keys(['test_auth', 'test_schema_auth', 'schema_two_auth']);
      });

      it('throws an error if path name already exists', () => {
        instance.schemas.push({
          paths: {
            '/test/path/first': {
              get: {
                summary: 'GET /test/path/first duplicate',
              },
            },
          },
        });

        expect(instance.combineSchemas.bind(instance)).to.throw(/Name conflict in paths: \/test\/path\/first/);
      });

      it('throws an error if security defintion name with a different configuration already exists', () => {
        instance.schemas.push({
          securityDefinitions: {
            test_auth: {
              type: 'apiKey_2',
            },
          },
        });

        expect(instance.combineSchemas.bind(instance)).to.throw(/Name conflict in security definitions: test_auth/);
      });

      it('accepts identical security defintions with the same name', () => {
        instance.schemas.push({
          securityDefinitions: {
            test_auth: {
              type: 'apiKey',
            },
          },
        });

        expect(instance.combineSchemas.bind(instance)).to.not.throw(/Name conflict in security definitions: test_auth/);
      });

      it('accepts different operationIds', () => {
        instance.schemas.push({
          paths: {
            '/test/path/third': {
              get: {
                summary: 'GET /test/path/third',
                operationId: 'getThird',
              }
            }
          }
        });

        expect(instance.combineSchemas.bind(instance)).to.not.throw(/OperationID conflict: getThird/);
      });

      it('throws an error if an operationId is not unique', () => {
        instance.schemas.push({
          paths: {
            '/test/path/third': {
              get: {
                summary: 'GET /test/path/third',
                operationId: 'getFirst',
              }
            }
          }
        });

        expect(instance.combineSchemas.bind(instance)).to.throw(/OperationID conflict: getFirst/);
      });
    });

    describe('removeEmptyFields()', () => {
      it('removes empty fields', () => {
        instance.combinedSchema.empty = '';
        instance.combinedSchema.emptyTwo = {};
        instance.combinedSchema.emptyThree = [];

        instance.removeEmptyFields();
        expect(instance.combinedSchema).to.not.have.any.keys(['empty', 'emptyTwo', 'emptyThree']);
      });
    });

    describe('toString()', () => {
      beforeEach(() => {
        instance.combinedSchema = {
          test: 'test',
          testTwo: ['test'],
        };
      });

      it('returns stringified combined schema', () => {
        expect(instance.toString()).to.equal('{"test":"test","testTwo":["test"]}');
      });

      it('returns YAML string if specified', () => {
        expect(instance.toString('yaml')).to.equal('test: test\ntestTwo:\n  - test\n');
      });

      it('returns YAML string if spcified in opts', () => {
        instance.opts = { format: 'yaml' };
        expect(instance.toString()).to.equal('test: test\ntestTwo:\n  - test\n');
      });
    });
  });
});

describe('[Unit] middleware.js', () => {
  describe('middleware()', () => {
    it('is exposed', () => {
      expect(swaggerCombine.middleware).to.be.a('function');
    });

    it('returns a middleware function', () => {
      expect(swaggerCombine.middleware({})).to.be.a('function');
    });
  });

  describe('middlewareAsync()', () => {
    it('is exposed', () => {
      expect(swaggerCombine.middlewareAsync).to.be.a('function');
    });

    it('returns a promise yielding a middleware', async () => {
      const mw = swaggerCombine.middlewareAsync({});

      expect(mw).to.be.a('promise');
      return expect(await mw).to.be.a('function');
    });
  });
});
