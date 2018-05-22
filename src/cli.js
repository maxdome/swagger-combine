const minimist = require('minimist');
const fs = require('fs');

const SwaggerCombine = require('./SwaggerCombine');

function CLI(argv) {
  const args = minimist(argv);
  const config = args._[0];
  const output = args.output || args.o;
  const format = args.format || args.f;
  const opts = {};

  if (args.h) {
    console.info('Usage: swagger-combine <config> [-o|--output file] [-f|--format <yaml|json>] [--continueOnError] [--continueOnConflictingPaths]');
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

  return new SwaggerCombine(config, opts)
    .combine()
    .then(combinedSchema => {
      if (output) {
        fs.writeFileSync(output, combinedSchema.toString());
        return;
      }

      console.info(combinedSchema.toString());
    })
    .catch(console.error);
}

module.exports = CLI;
