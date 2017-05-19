const swaggerCombine = require('../src/swagger-combine');

const config = (module.exports = {
  swagger: '2.0',
  info: {
    title: 'Swagger Combine Rename Example',
    version: {
      $ref: './package.json#/version',
    },
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json',
      paths: {
        rename: {
          '/pet/{petId}': '/pet/alive/{petId}',
        },
      },
      securityDefinitions: {
        rename: {
          api_key: 'KEY',
        },
      },
    },
    {
      url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml',
      tags: {
        rename: {
          Users: 'People',
        },
      },
    },
  ],
});

if (!module.parent) {
  swaggerCombine(config)
    .then(res => console.log(JSON.stringify(res, false, 2)))
    .catch(err => console.error(err));
}
