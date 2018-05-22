const chai = require('chai');
const http = require('http');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const sandbox = sinon.createSandbox();

const Middleware = require('../../src/middleware');
const { middleware, middlewareAsync, sendResponse } = Middleware;
const SwaggerCombine = require('../../src/SwaggerCombine');

describe('[Unit] middleware.js', () => {
  describe('sendResponse(opts, sc, req, res, next)', () => {
    const combinedSchema = { test: 'combinedSchema' };
    const stringifiedSchema = JSON.stringify(combinedSchema);
    let opts;
    let sc;
    let req;
    let res;
    let next;

    beforeEach(() => {
      opts = {};
      sc = {
        combinedSchema,
        toString: sandbox.stub().returns(stringifiedSchema),
      };
      req = sandbox.stub();
      res = {
        json: sandbox.stub(),
        type: sandbox.stub().returnsThis(),
        send: sandbox.stub(),
      };
      next = sandbox.stub();
    });

    it('calls res.json with combined schema', () => {
      sendResponse(opts, sc, req, res, next);
      expect(res.json).to.have.been.calledWithExactly(combinedSchema);
    });

    it('calls res.type and res.send with stringified schema if opts.format is `yaml`', () => {
      opts.format = 'yaml';
      sendResponse(opts, sc, req, res, next);
      expect(res.type).to.have.been.calledWithExactly('yaml');
      expect(res.send).to.have.been.calledWithExactly(stringifiedSchema);
    });

    it('calls res.type and res.send with stringified schema if opts.format is `yml`', () => {
      opts.format = 'yml';
      sendResponse(opts, sc, req, res, next);
      expect(res.type).to.have.been.calledWithExactly('yaml');
      expect(res.send).to.have.been.calledWithExactly(stringifiedSchema);
    });
  });

  describe('middleware(config, opts)', () => {
    let mw;
    let sc;
    let req;
    let res;
    let next;

    beforeEach(() => {
      mw = middleware({});
      sc = { combinedSchema: { test: 'combinedSchema' } };
      req = sandbox.stub();
      res = sandbox.stub();
      next = sandbox.stub();
    });

    it('is exposed', () => {
      expect(middleware).to.be.a('function');
    });

    it('returns a middleware function', () => {
      expect(mw).to.be.a('function');
    });

    it('calls SwaggerCombine#combine', () => {
      sandbox.stub(SwaggerCombine.prototype, 'combine').resolves();
      return mw(req, res, next).then(() => {
        expect(SwaggerCombine.prototype.combine).to.have.been.calledWithExactly();
      });
    });

    it('calls Middleware.sendResponse with opts, sc and context', () => {
      sandbox.stub(SwaggerCombine.prototype, 'combine').resolves(sc);
      sandbox.stub(Middleware, 'sendResponse');
      return mw(req, res, next).then(() => {
        expect(Middleware.sendResponse).to.have.been.calledWithExactly({}, sc, req, res, next);
      });
    });

    it('calls next with error if SwaggerCombine#combine throws an error', () => {
      const error = new Error('TestError');
      sandbox.stub(SwaggerCombine.prototype, 'combine').rejects(error);
      return mw(req, res, next).then(() => {
        expect(next).to.have.been.calledWithExactly(error);
      });
    });
  });

  describe('middlewareAsync()', () => {
    let sc;
    let req;
    let res;
    let next;

    beforeEach(() => {
      sc = { combinedSchema: { test: 'combinedSchema' } };
      req = sandbox.stub();
      res = sandbox.stub();
      next = sandbox.stub();
    });

    it('is exposed', () => {
      expect(middlewareAsync).to.be.a('function');
    });

    it('returns a promise yielding a middleware', async () => {
      const mw = middlewareAsync({});

      expect(mw).to.be.a('promise');
      return expect(await mw).to.be.a('function');
    });

    it('calls SwaggerCombine#combine', () => {
      sandbox.spy(SwaggerCombine.prototype, 'combine');
      return middlewareAsync({}).then(() => {
        expect(SwaggerCombine.prototype.combine).to.have.been.calledWithExactly();
      });
    });

    it('calls Middleware.sendResponse with opts, sc and context', () => {
      const opts = {};
      sandbox.stub(SwaggerCombine.prototype, 'combine').resolves(sc);
      sandbox.stub(Middleware, 'sendResponse');
      return middlewareAsync({}, opts).then(mw => {
        mw(req, res, next);
        expect(Middleware.sendResponse).to.have.been.calledWithExactly(opts, sc, req, res, next);
      });
    });
  });

  afterEach(() => {
    sandbox.restore();
  });
});
