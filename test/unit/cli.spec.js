const chai = require('chai');
const sinon = require('sinon');
const mock = require('mock-require');
const fs = require('fs');
chai.use(require('sinon-chai'));
const expect = chai.expect;

describe('[Unit] cli.js', () => {
  const testSchema = { test: '1' };
  const swaggerCombineMock = sinon.stub().resolves(testSchema);
  let swaggerCombine;
  let consoleLogStub;
  let consoleErrorStub;
  let fsWriteFileSyncStub;
  let CLI;

  beforeEach(() => {
    mock('../../src', swaggerCombineMock);
    swaggerCombine = mock.reRequire('../../src');
    CLI = require('../../src/cli');
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    fsWriteFileSyncStub = sinon.stub(fs, 'writeFileSync')
  });

  it('is a function', () => {
    expect(CLI).to.be.a('function');
  });

  it('returns usage info with `-h`', () => {
    CLI(['-h'])
    expect(consoleLogStub).to.have.been.calledWith('Usage: swagger-combine <config> [-o|--output file]')
  });

  it('returns info message if config is missing', () => {
    CLI([])
    expect(consoleLogStub).to.have.been.calledWith('No config file in arguments')
  });

  it('logs schema by default', () => {
    return CLI(['test.json']).then(() => {
      expect(consoleLogStub).to.have.been.calledWith(testSchema)
    })
  });

  it('writes file with `-o` or `--output`', () => {
    const testOutputFilename = 'testOutput.json';
    return Promise.all([
      CLI(['test.json', '-o', testOutputFilename]).then(() => {
        expect(fsWriteFileSyncStub).to.have.been.calledWith(testOutputFilename, JSON.stringify(testSchema, null, 2))
      }),
      CLI(['test.json', '--output', testOutputFilename]).then(() => {
        expect(fsWriteFileSyncStub).to.have.been.calledWith(testOutputFilename, JSON.stringify(testSchema, null, 2))
      })
    ])
  });

  it('logs error message on error', () => {
    const error = new Error('test error');
    swaggerCombineMock.rejects(error)
    return CLI(['test.json']).then(() => {
      expect(consoleErrorStub).to.have.been.calledWith(error)
    })
  });

  afterEach(() => {
    mock.stop('../../src');
    consoleLogStub.restore();
    consoleErrorStub.restore();
    fsWriteFileSyncStub.restore();
  });
});
