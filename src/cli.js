const minimist = require('minimist');
const fs = require('fs');

const swaggerCombine = require('.');

function CLI(argv) {
  const args = minimist(argv.slice(2));
  const config = args._[0];

  swaggerCombine(config)
    .then(schema => {
      const output = args.output || args.o;
      
      if (output) {
        fs.writeFileSync(output, JSON.stringify(schema, null, 2));
        return;
      }

      console.log(schema);
    })
    .catch(console.error);
}

module.exports = CLI;
