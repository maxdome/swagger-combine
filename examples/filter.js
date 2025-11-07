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
        exclude: ['/pet/{petId}', '/pet.put'],
        parameters: {
          exclude: {
            '/pet/findByStatus': 'status',
          },
        },
      },
    }
  ],
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
