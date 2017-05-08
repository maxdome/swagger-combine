const app = require('express')(); // eslint-disable-line
const swaggerCombine = require('../src/swagger-combine');

const config = {
  swagger: '2.0',
  info: {
    title: 'Basic Swagger Combine Example',
    version: '1.0.0'
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json'
    },
    {
      url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml'
    }
  ]
};

app.get('/swagger.json', swaggerCombine.middleware(config));
app.get('/swagger.yaml', swaggerCombine.middleware(config, { format: 'yaml' }));
app.use((err, req, res, next) => console.error(err));

app.listen(3333);
