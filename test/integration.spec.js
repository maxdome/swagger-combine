const chai = require('chai');
chai.use(require('chai-somewhere'));
chai.use(require('chai-http'));

const expect = chai.expect;
const swaggerCombine = require('../src/swagger-combine');
const pkg = require('../package.json');
const basicConfig = require('../examples/basic');
const filterConfig = require('../examples/filter');
const renameConfig = require('../examples/rename');
const securityConfig = require('../examples/security');
const app = require('../examples/middleware');

describe('[Integration] swagger-combine.js', () => {
  it('resolves $refs in config schema', () => swaggerCombine(basicConfig)
    .then((schema) => {
      expect(schema.info.version).to.equal(pkg.version);
    })
  );

  it('removes `apis` from config schema', () => swaggerCombine(basicConfig)
    .then((schema) => {
      expect(schema.apis).to.not.be.ok;
    })
  );

  it('merges paths and security definitions', () => swaggerCombine(basicConfig)
    .then((schema) => {
      expect(schema.paths).to.be.ok;
      expect(schema.securityDefinitions).to.be.ok;
    })
  );

  it('dereferences all $refs', () => swaggerCombine(basicConfig)
    .then((schema) => {
      expect(schema).to.not.have.somewhere.property('$ref');
    })
  );

  it('removes empty fields', () => swaggerCombine(basicConfig)
    .then((schema) => {
      expect(schema.info.description).to.not.be.ok;
    })
  );

  it('filters out excluded paths', () => swaggerCombine(filterConfig)
    .then((schema) => {
      expect(schema.paths['/pet'].put).to.not.be.ok;
      expect(schema.paths['/pet/{petId}']).to.not.be.ok;
    })
  );

  it('filters only included paths', () => swaggerCombine(filterConfig)
    .then((schema) => {
      expect(schema.paths).to.not.have.keys([
        '/publications/{publicationId}/contributors',
        '/users/{authorId}/posts',
        '/publications/{publicationId}/posts',
        '/users/{authorId}/posts'
      ]);
      expect(schema.paths['/me'].get).to.be.ok;
      expect(schema.paths['/users/{userId}/publications']).to.be.ok;
    })
  );

  it('renames paths', () => swaggerCombine(renameConfig)
    .then((schema) => {
      expect(schema.paths['/pet/{petId}']).to.not.be.ok;
      expect(schema.paths['/pet/alive/{petId}']).to.be.ok;
    })
  );

  it('renames tags', () => swaggerCombine(renameConfig)
    .then((schema) => {
      const tags = Object.values(schema.paths).reduce((allTags, path) => allTags
        .concat(Object.values(path)
          .map(method => method.tags)
          .reduce((a, b) => a.concat(b), [])
          ),
        []);

      expect(tags).to.not.include('Users');
      expect(tags).to.include('People');
    })
  );

  it('adds security to paths', () => swaggerCombine(securityConfig)
    .then((schema) => {
      expect(schema.paths['/store/order'].post.security).to.include({ petstore_auth: ['write:pets', 'read:pets'] });
      expect(schema.paths['/store/order/{orderId}'].delete.security).to.include({ petstore_auth: ['write:pets', 'read:pets'] });
    })
  );

  describe('middleware', () => {
    it('returns a JSON schema', () => chai.request(app)
      .get('/swagger.json')
      .then(({ body }) => {
        expect(body).to.be.an.object;
        expect(body.paths).to.be.ok;
      })
    );

    it('returns a YAML schema', () => chai.request(app)
      .get('/swagger.yaml')
      .then(({ text }) => {
        expect(text).to.include('paths:');
      })
    );
  });
});
