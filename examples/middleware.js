const express = require('express');

const app = (exports.app = express());
const app2 = (exports.app2 = express());

const swaggerCombine = require('../src');
const basicConfig = require('./basic');

app.get('/swagger.json', swaggerCombine.middleware(basicConfig));
app.get('/swagger.(yaml|yml)', swaggerCombine.middleware(basicConfig, { format: 'yaml' }));
app.use((err, req, res, next) => console.error(err));

if (!module.parent) {
  app.listen(3333);
}

(async function() {
  try {
    app2.get('/swagger.json', await swaggerCombine.middlewareAsync(basicConfig));
    app2.get('/swagger.(yaml|yml)', await swaggerCombine.middlewareAsync(basicConfig, {format: 'yaml'}));
  } catch (e) {
    console.error(e);
  }

  if (!module.parent) {
    app2.listen(4444);
  }
})();
