const swaggerCombine = require('../src');

const config = (module.exports = {
  swagger: '2.0',
  info: {
    title: 'Swagger Combine Filter Example',
    version: {
      $ref: './package.json#/version',
    },
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json',
      paths: {
        include: ['.*\{petId\}.get']
      },
    },
    {
      url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml',
      paths: {
        exclude: ['.*?/publications(/.*)?'],
      },
    },
  ],
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
