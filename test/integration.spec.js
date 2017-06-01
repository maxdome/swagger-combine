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
  it('resolves $refs in config schema', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema.info.version).to.equal(pkg.version);
    }));

  it('removes `apis` from config schema', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema.apis).to.not.be.ok;
    }));

  it('merges paths and security definitions', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema.paths).to.be.ok;
      expect(schema.securityDefinitions).to.be.ok;
    }));

  it('dereferences all $refs', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema).to.not.have.somewhere.property('$ref');
    }));

  it('removes empty fields', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema).to.not.have.keys('other');
    }));

  it('filters out excluded paths', () =>
    swaggerCombine(filterConfig).then(schema => {
      expect(schema.paths['/pet'].put).to.not.be.ok;
      expect(schema.paths['/pet/{petId}']).to.not.be.ok;
    }));

  it('filters only included paths', () =>
    swaggerCombine(filterConfig).then(schema => {
      expect(schema.paths).to.not.contain.any.keys([
        '/publications/{publicationId}/contributors',
        '/users/{authorId}/posts',
      ]);
      expect(schema.paths).to.contain.keys([
        '/users/{userId}/publications',
        '/publications/{publicationId}/posts',
        '/me',
      ]);
    }));

  it('filters out excluded parameteres', () =>
    swaggerCombine(filterConfig).then(schema => {
      expect(
        schema.paths['/pet/findByStatus'].get.parameters.some(
          param => param.name === 'status'
        )
      ).to.be.false;
    }));

  it('filters only included parameteres', () =>
    swaggerCombine(filterConfig).then(schema => {
      expect(
        schema.paths[
          '/publications/{publicationId}/posts'
        ].post.parameters.every(param => param.name === 'publicationId')
      ).to.be.true;
    }));

  it('renames paths', () =>
    swaggerCombine(renameConfig).then(schema => {
      expect(schema.paths['/pet/{petId}']).to.not.be.ok;
      expect(schema.paths['/pet/alive/{petId}']).to.be.ok;
    }));

  it('renames tags', () =>
    swaggerCombine(renameConfig).then(schema => {
      const tags = Object.values(schema.paths).reduce(
        (allTags, path) =>
          allTags.concat(
            Object.values(path)
              .map(method => method.tags)
              .reduce((a, b) => a.concat(b), [])
          ),
        []
      );

      expect(tags).to.not.include('Users');
      expect(tags).to.include('People');
    }));

  it('renames security definitions', () =>
    swaggerCombine(renameConfig).then(schema => {
      expect(schema.securityDefinitions.api_key).to.not.be.ok;
      expect(schema.securityDefinitions.KEY).to.be.ok;
      expect(schema.paths['/store/inventory'].get.security).not.to.include({
        api_key: [],
      });
      expect(schema.paths['/store/inventory'].get.security).to.include({
        KEY: [],
      });
    }));

  it('adds security to paths', () =>
    swaggerCombine(securityConfig).then(schema => {
      expect(schema.paths['/store/order'].post.security).to.include({
        petstore_auth: ['write:pets', 'read:pets'],
      });
      expect(
        schema.paths['/store/order/{orderId}'].delete.security
      ).to.include({ petstore_auth: ['write:pets', 'read:pets'] });
    }));

  it('adds base to all paths of an API', () =>
    swaggerCombine(basicConfig).then(schema => {
      expect(schema.paths).to.not.have.any.key('/betriebsstellen');
      expect(schema.paths).to.have.any.key('/bahn/betriebsstellen');
    }));

  describe('middleware', () => {
    it('returns a JSON schema', () =>
      chai.request(app).get('/swagger.json').then(res => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body.paths).to.be.ok;
      }));

    it('returns a YAML schema', () =>
      chai.request(app).get('/swagger.yaml').then(res => {
        expect(res).to.have.status(200);
        expect(res).to.have.header('content-type', /^text\/yaml/);
        expect(res.text).to.include('paths:');
      }));
  });
});
