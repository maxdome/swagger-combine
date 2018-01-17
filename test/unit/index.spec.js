const chai = require('chai');
const sinon = require('sinon');
const mock = require('mock-require');
chai.use(require('sinon-chai'));
const expect = chai.expect;

describe('[Unit] index.js', () => {
  const SwaggerCombineMock = sinon.stub();
  SwaggerCombineMock.prototype.combineAndReturn = sinon.stub().resolves();
  let swaggerCombine;

  beforeEach(() => {
    mock('../../src/SwaggerCombine', SwaggerCombineMock);
    swaggerCombine = mock.reRequire('../../src');
  });

  it('is a function', () => {
    expect(swaggerCombine).to.be.a('function');
  });

  it('exposes SwaggerCombine', () => {
    expect(swaggerCombine.SwaggerCombine).to.be.a('function');
  });

  it('exposes middleware', () => {
    expect(swaggerCombine.middleware).to.be.a('function');
  });

  it('exposes middlewareAsync', () => {
    expect(swaggerCombine.middlewareAsync).to.be.a('function');
  });

  it('uses docs/swagger.json as default config', () => {
    return swaggerCombine().then(() => {
      expect(SwaggerCombineMock).to.have.been.calledWithNew;
      expect(SwaggerCombineMock).to.have.been.calledWith('docs/swagger.json');
    });
  });

  it('handles opts parameter as callback if opts is a function', done => {
    swaggerCombine('testConfigPath', () => {
      expect(SwaggerCombineMock).to.have.been.calledWith(sinon.match.any, null);
      done();
    });
  });

  afterEach(() => {
    mock.stop('../../src/SwaggerCombine');
  });
});
