const swaggerCombine = require('../src/swagger-combine');

const config = (module.exports = {
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "tags": {
        "add": [
          "pet"
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "tags": {
        "add": [
          "medium"
        ]
      }
    }
  ]
});

if (!module.parent) {
  swaggerCombine(config).then(res => console.log(JSON.stringify(res, false, 2))).catch(err => console.error(err));
}
