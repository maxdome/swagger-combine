const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const expect = chai.expect;

const swaggerCombine = require('../src/swagger-combine');

const sandbox = sinon.sandbox.create();
let instance;

describe('[Unit] swagger-combine.js', () => {
  describe('Instance', () => {
    beforeEach(() => {
      instance = new swaggerCombine.SwaggerCombine();
      instance.config = {};
      instance.schemas = [
        {
          paths: {
            '/test/path/first': {
              get: {
                summary: 'GET /test/path/first',
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
        expect(Object.keys(instance.schemas[0].paths['/test/path/first'])).to.have.lengthOf(1);
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
    });

    describe('addTags()', () => {
      it('adds tags', () => {
        instance.apis = [
          {
            tags: {
              add: [
                'newTag',
              ],
            },
          },
        ];

        instance.addTags();
        expect(instance.schemas[0].paths['/test/path/first'].get.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/first'].post.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/second'].post.tags).to.include('newTag');
        expect(instance.schemas[0].paths['/test/path/second'].get.tags).to.have.lengthOf(3);
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
        expect(instance.schemas[0].securityDefinitions).to.have.keys('renamed_auth');
      });

      it('renames security in pahts', () => {
        instance.renameSecurityDefinitions();
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.not.deep.include({ test_auth: [] });
        expect(instance.schemas[0].paths['/test/path/first'].post.security).to.deep.include({ renamed_auth: [] });
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
        expect(Object.keys(instance.combinedSchema.securityDefinitions)).to.have.length(2);
        expect(instance.combinedSchema.securityDefinitions).to.have.all.keys(['test_auth', 'schema_two_auth']);
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

      it('throws an error if security defintion name already exists', () => {
        instance.schemas.push({
          securityDefinitions: {
            test_auth: {
              type: 'apiKey',
            },
          },
        });

        expect(instance.combineSchemas.bind(instance)).to.throw(/Name conflict in security definitions: test_auth/);
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

  describe('Middleware', () => {
    it('is exposed', () => {
      expect(swaggerCombine.middleware).to.be.a('function');
    });
  });
});
