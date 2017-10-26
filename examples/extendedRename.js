const swaggerCombine = require('../src');

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
        rename: [
          {
            type: 'rename',
            from: '/pet/{petId}',
            to: '/pet/alive/{petId}'
          },
          {
            type: 'regex',
            from: /^\/pet(.*)$/,
            to: '/animal$1'
          },
          {
            type: 'function',
            to: (path) => path.indexOf('{petId}') > -1 ? path.replace('{petId}', '{animalId}') : path
          },
        ],
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
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
