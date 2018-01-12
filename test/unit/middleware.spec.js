const chai = require('chai');
const http = require('http');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const expect = chai.expect;

const { middleware, middlewareAsync } = require('../../src');

const sandbox = sinon.sandbox.create();
let instance;

describe('[Unit] middleware.js', () => {
  describe('middleware()', () => {
    it('is exposed', () => {
      expect(middleware).to.be.a('function');
    });

    it('returns a middleware function', () => {
      expect(middleware({})).to.be.a('function');
    });
  });

  describe('middlewareAsync()', () => {
    it('is exposed', () => {
      expect(middlewareAsync).to.be.a('function');
    });

    it('returns a promise yielding a middleware', async () => {
      const mw = middlewareAsync({});

      expect(mw).to.be.a('promise');
      return expect(await mw).to.be.a('function');
    });
  });
});
