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

swaggerCombine(config)
  .then(res => console.log(JSON.stringify(res, false, 2)))
  .catch(err => console.error(err));

/* Using a callback */
// swaggerCombine(config, (err, res) => {
//   if (err) {
//     console.error(err);
//   }
//
//   console.log(JSON.stringify(res, false, 2));
// });
