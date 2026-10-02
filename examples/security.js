const swaggerCombine = require('../src');

const config = (module.exports = {
  swagger: '2.0',
  info: {
    title: 'Swagger Combine Security Example',
    version: {
      $ref: './package.json#/version',
    },
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json',
      paths: {
        security: {
          '/store/order': {
            petstore_auth: ['write:pets', 'read:pets'],
          },
          '/store/order/{orderId}.delete': {
            petstore_auth: ['write:pets', 'read:pets'],
          },
        },
      },
    },
    {
      url: 'https://raw.githubusercontent.com/amardeshbd/medium-api-specification/master/medium-api-specification.yaml',
    },
  ],
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
