const swaggerCombine = require('../src');

const config = (module.exports = {
  swagger: '2.0',
  info: {
    title: 'Swagger Combine Rename OperationId Example',
    version: {
      $ref: './package.json#/version',
    },
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json',
      paths: {
        include: "/pet.post"
      },
      operationIds: {
        rename: {
          'addPet': 'createPet',
        },
      }
    }
  ],
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
