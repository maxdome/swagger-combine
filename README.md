Swagger Combine
===============

Combines multiple Swagger configurations into one dereferenced schema.

## Install

```sh
$ npm install --save swagger-combine
```

## Usage

```js
const swaggerCombine = require('swagger-combine');

swaggerCombine('config/swagger.json')
    .then(combinedSchema => console.log(combinedSchema))
    .catch(err => console.error(err));
```

## Configuration

**swagger-combine** requires one configuration schema which resembles a standard swagger schema except for an additional `apis` field. The default path for this file is `config/swagger.json`.
The schema can be passed to **swagger-combine** as a file path, an URL or a JS object.

### Basic Configuration

**swagger.json**

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Basic Swagger Combine Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json"
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```

**swagger.yaml**

```yaml
swagger: '2.0'
info:
  title: Basic Swagger Combine Example
  version: 1.0.0
apis:
  - url: 'http://petstore.swagger.io/v2/swagger.json'
  - url: 'https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml'
```

*All example configurations are located in the `examples` folder.*


### Filtering Paths

Paths can be filtered by using an array of paths to `exclude` or `include`. 

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Filtering Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "exclude": [
          "/pet/{petId}"
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "paths": {
        "include": [
          "/users/{userId}/publications"
        ]
      }
    }
  ]
}
```

### Replacing Paths

Paths can be replaced by specifying the path to replace and the replacement path as key/value pairs in `paths.replace`.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Replacing Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "replace": {
          "/pet/{petId}": "/pet/alive/{petId}"
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```

### Replacing Tags

Tags can be replaced in the same manner as paths, using the `tags.replace` field.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Replacing Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json"
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "tags": {
        "replace": {
          "Users": "People"
        }
      }
    }
  ]
}
```

### Path Security

Security can be specified per path using the `paths.security` field.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Security Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "security": {
          "/store/order": {
            "petstore_auth": [
              "write:pets",
              "read:pets"
            ]
          }
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```