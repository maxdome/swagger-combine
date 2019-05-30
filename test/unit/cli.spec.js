const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const SwaggerCombine = require('../../src/SwaggerCombine');

describe('[Unit] cli.js', () => {
  const testSchema = { test: '1' };
  const expectedYamlOutput = "test: '1'\n";
  const expectedJsonOutput = JSON.stringify(testSchema, null, 2);
  let combineStub;
  let processExitStub;
  let consoleInfoStub;
  let consoleErrorStub;
  let fsWriteFileSyncStub;
  let CLI;

  beforeEach(() => {
    CLI = require('../../src/cli');
    combineStub = sinon.stub(SwaggerCombine.prototype, 'combine').callsFake(function(a, b, c) {
      this.combinedSchema = testSchema;
      return Promise.resolve(this);
    });
    processExitStub = sinon.stub(process, 'exit');
    consoleInfoStub = sinon.stub(console, 'info');
    consoleErrorStub = sinon.stub(console, 'error');
    fsWriteFileSyncStub = sinon.stub(fs, 'writeFileSync');
  });

  it('is a function', () => {
    expect(CLI).to.be.a('function');
  });

  it('returns version with `-v`', () => {
    CLI(['-v']);
    expect(consoleInfoStub).to.have.been.calledWith(sinon.match(/^v.*/));
  });

  it('returns usage info with `-h`', () => {
    CLI(['-h']);
    expect(consoleInfoStub).to.have.been.calledWith(sinon.match.string);
  });

  it('returns info message if config is missing', () => {
    CLI([]);
    expect(consoleInfoStub).to.have.been.calledWith('No config file in arguments');
  });

  it('logs JSON schema by default', () =>
    CLI(['test.json']).then(() => {
      expect(consoleInfoStub).to.have.been.calledWith(expectedJsonOutput);
    }));

  it('logs YAML schema with format argument set to `yaml` or `yml`', () =>
    Promise.all([
      CLI(['test.json', '-f', 'yaml']),
      CLI(['test.json', '-f', 'yml']),
      CLI(['test.json', '--format', 'yaml']),
      CLI(['test.json', '--format', 'yml']),
    ]).then(() => {
      expect(consoleInfoStub)
        .to.have.callCount(4)
        .and.have.always.been.calledWith(expectedYamlOutput);
    }));

  it('writes JSON to file with `-o` or `--output`', () => {
    const testOutputFilename = 'testOutput.json';

    return Promise.all([
      CLI(['test.json', '-o', testOutputFilename]),
      CLI(['test.json', '--output', testOutputFilename]),
    ]).then(() => {
      expect(fsWriteFileSyncStub).to.have.been.calledTwice.and.have.always.been.calledWith(
        testOutputFilename,
        expectedJsonOutput
      );
    });
  });

  it('writes YAML to file with output filename ending with `yaml` or `yml`', () =>
    Promise.all([
      CLI(['test.json', '-o', 'testOutput.yaml']).then(() => {
        expect(fsWriteFileSyncStub).to.have.been.calledWith('testOutput.yaml', expectedYamlOutput);
      }),
      CLI(['test.json', '--output', 'testOutput.yml']).then(() => {
        expect(fsWriteFileSyncStub).to.have.been.calledWith('testOutput.yml', expectedYamlOutput);
      }),
    ]));

  it('sets format option', done => {
    combineStub.callsFake(function() {
      expect(this.opts.format).to.eql('yaml');
      done();
    });
    CLI(['test.json', '-f', 'yaml']);
  });

  it('sets continueOnError option', done => {
    combineStub.callsFake(function() {
      expect(this.opts.continueOnError).to.be.true;
      done();
    });
    CLI(['test.json', '--continueOnError']);
  });

  it('sets continueOnConflictingPaths option', done => {
    combineStub.callsFake(function() {
      expect(this.opts.continueOnConflictingPaths).to.be.true;
      done();
    });
    CLI(['test.json', '--continueOnConflictingPaths']);
  });

  it('sets includeDefinitions option', done => {
    combineStub.callsFake(function() {
      expect(this.opts.includeDefinitions).to.be.true;
      done();
    });
    CLI(['test.json', '--includeDefinitions']);
  });

  it('sets useBasePath option', done => {
    combineStub.callsFake(function() {
      expect(this.opts.useBasePath).to.be.true;
      done();
    });
    CLI(['test.json', '--useBasePath']);
  });

  it('logs error message on error', () => {
    const error = new Error('test error');
    combineStub.rejects(error);
    return CLI(['test.json']).then(() => {
      expect(consoleErrorStub).to.have.been.calledWith(error.message);
    });
  });

  it('exits process with error code on error', () => {
    const error = new Error('test error');
    combineStub.rejects(error);
    return CLI(['test.json']).then(() => {
      expect(processExitStub).to.have.been.calledWith(1);
    });
  });

  afterEach(() => {
    combineStub.restore();
    processExitStub.restore();
    consoleInfoStub.restore();
    consoleErrorStub.restore();
    fsWriteFileSyncStub.restore();
  });
});
