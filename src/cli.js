const minimist = require('minimist');
const fs = require('fs');

const SwaggerCombine = require('./SwaggerCombine');
const pkg = require('../package.json');

function CLI(argv) {
  const args = minimist(argv);
  const config = args._[0];
  const output = args.output || args.o;
  const format = args.format || args.f;
  const watch = args.watch || args.w;
  const opts = {};

  if (args.v) {
    console.info(`v${pkg.version}`);
    return;
  }

  if (args.h) {
    console.info(
      'Usage: swagger-combine <config> [-o|--output file] [-f|--format <yaml|json>] [--continueOnError] [--continueOnConflictingPaths] [--includeDefinitions] [-w|--watch]'
    );
    return;
  }

  if (!config) {
    console.info('No config file in arguments');
    return;
  }

  if ((output && /\.ya?ml$/i.test(output)) || (format && /ya?ml/i.test(format))) {
    opts.format = 'yaml';
  }

  opts.continueOnError = !!args.continueOnError;
  opts.continueOnConflictingPaths = !!args.continueOnConflictingPaths;
  opts.includeDefinitions = !!args.includeDefinitions;
  opts.watch = watch;

  var combiner = new SwaggerCombine(config, opts);
  return combiner
    .combine()
    .then(combinedSchema => {
      if (output) {
        fs.writeFileSync(output, combinedSchema.toString());
      } else {
        console.info(combinedSchema.toString());
      }
      if (opts.watch) {
        var paths = [];
        combiner.parsers.map(parser => {
          paths = paths.concat(parser.$refs.paths("file"));
        });
        var watch = require('node-watch');
        var watchers = [];

        var fileChangeHandler = function onFileChange(evt, name) {
          console.log('%s changed.', name);
          watchers.map(watcher => {watcher.close();});
          CLI(argv);
        };

        var distinctFilesToWatch = new Set(paths);
        distinctFilesToWatch.forEach(path => {
          watchers.push(watch(path, { recursive: false }, fileChangeHandler));
          console.debug("Watching", path);
        });

        process.stdin.resume();
      }
    })
    .catch(error => {
      console.error(error.message)
      process.exit(1);
    });
}

module.exports = CLI;
