const swaggerCombine = require('../src');

const config = (module.exports = {
  swagger: '2.0',
  info: {
    title: 'Swagger Combine Authentication Example',
    version: {
      $ref: './package.json#/version',
    },
  },
  apis: [
    {
      url: 'http://petstore.swagger.io/v2/swagger.json',
      resolve: {
        http: {
          auth: {
            username: 'admin',
            password: 'secret12345'
          }
        }
      }
    },
    {
      url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml',
      resolve: {
        http: {
          headers: {
            authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImFkbWluIiwiYWRtaW4iOnRydWV9.44lJS0jlltzcglq7vgjXMXYRTecBxseN3Dec_LO_osI'
          }
        }
      }
    },
    {
      url: 'https://api.apis.guru/v2/specs/deutschebahn.com/betriebsstellen/v1/swagger.json',
      resolve: {
        http: {
          headers: {
            authorization: 'Basic YWRtaW46c2VjcmV0MTIz'
          }
        }
      }
    },
  ]
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));

}
