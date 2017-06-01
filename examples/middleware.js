const app = (module.exports = require('express')());
const swaggerCombine = require('../src/swagger-combine');

const basicConfig = require('./basic');

app.get('/swagger.json', swaggerCombine.middleware(basicConfig));
app.get(
  '/swagger.yaml',
  swaggerCombine.middleware(basicConfig, { format: 'yaml' })
);
app.use((err, req, res, next) => console.error(err));

if (!module.parent) {
  app.listen(3333);
}
