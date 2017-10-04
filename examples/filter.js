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
    },
    {
      url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml',
      paths: {
        include: ['/users/{userId}/publications', '/publications/{publicationId}/posts', '/me.get'],
        parameters: {
          include: {
            '/publications/{publicationId}/posts.post': 'publicationId',
          },
        },
      },
    },
  ],
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
