Swagger Combine
===============

[![Build Status](https://travis-ci.org/maxdome/swagger-combine.svg)](https://travis-ci.org/maxdome/swagger-combine)
[![dependencies Status](https://david-dm.org/maxdome/swagger-combine/status.svg)](https://david-dm.org/maxdome/swagger-combine)
[![devDependencies Status](https://david-dm.org/maxdome/swagger-combine/dev-status.svg)](https://david-dm.org/maxdome/swagger-combine?type=dev)
[![npm](https://img.shields.io/npm/v/swagger-combine.svg)](https://www.npmjs.com/package/swagger-combine)

>Combines multiple Swagger schemas into one dereferenced schema.

## Install

```sh
$ npm install --save swagger-combine
```

## Usage

```js
const swaggerCombine = require('swagger-combine');

swaggerCombine('docs/swagger.json')
    .then(combinedSchema => console.log(JSON.stringify(combinedSchema)))
    .catch(err => console.error(err));
```

**Swagger Combine** returns a promise by default. Alternatively a callback can be passed as second argument:

```js
swaggerCombine('docs/swagger.json', (err, res) => {
  if (err) console.error(err);

  console.log(JSON.stringify(res));
});
```

### Middleware

```js
const swaggerCombine = require('swagger-combine');
const app = require('express')();

app.get('/swagger.json', swaggerCombine.middleware('docs/swagger.json'));
app.get('/swagger.yaml', swaggerCombine.middleware('docs/swagger.json', { format: 'yaml' }));
app.listen(3333);
```

The middleware runs the combine function on every request. Since Swagger documentations tend not to change that frequently, the use of a caching mechanism like [apicache](https://github.com/kwhitley/apicache) is encouraged in conjungtion with this middleware.

## Configuration

* **Swagger Combine** requires one configuration schema which resembles a standard Swagger schema except for an additional `apis` field.
* Since this module uses [Swagger Parser](https://github.com/BigstickCarpet/swagger-parser) and [JSON Schema $Ref Parser](https://github.com/BigstickCarpet/json-schema-ref-parser) internally the schema can be passed to **Swagger Combine** as a file path, a URL or a JS object.
* All `$ref` fields in the configuration schema are getting dereferenced. 
* The default path for the configuration file is `docs/swagger.json`.
* The configuration file can be `JSON` or `YAML`.

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
    },
    {
      "url": "https://api.apis.guru/v2/specs/deutschebahn.com/betriebsstellen/v1/swagger.json",
      "paths": {
        "base": "/bahn"
      }
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
  - url: 'https://api.apis.guru/v2/specs/deutschebahn.com/betriebsstellen/v1/swagger.json'
    paths:
      base: '/bahn'
```

*All example configurations are located in the `examples` folder.*


### Filtering Paths

Paths can be filtered by using an array of paths to `exclude` or `include`. 

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Filter Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "exclude": [
          "/pet/{petId}",
          "/pet.put"
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "paths": {
        "include": [
          "/users/{userId}/publications",
          "/me.get"
        ]
      }
    }
  ]
}
```

### Filtering Parameters

Parameters can be filtered by specifying the path and the parameter name as to `exclude` or `include` as key/value pairs in `paths.parameters`.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Filter Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "parameters": {
          "exclude": {
            "/pet/findByStatus": "status"
          }
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "paths": {
        "include": [
          "/users/{userId}/publications",
          "/publications/{publicationId}/posts",
          "/me.get"
        ],
        "parameters": {
          "include": {
            "/publications/{publicationId}/posts.post": "publicationId"
          }
        }
      }
    }
  ]
}
```

### Renaming Paths

Paths can be renamed by specifying the path to rename and the new path name as key/value pairs in `paths.rename`.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "rename": {
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

### Renaming Tags

Tags can be renamed in the same manner as paths, using the `tags.rename` field.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json"
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "tags": {
        "rename": {
          "Users": "People"
        }
      }
    }
  ]
}
```

### Renaming Security Definitions

Security definitions can be renamed like paths and tags in the `securityDefinitions.rename` field. All usages of the security definition in the paths are renamed as well.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "securityDefinitions": {
        "rename": {
          "api_key": "KEY"
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
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
          },
          "/store/order/{orderId}.delete": {
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

## API

### swaggerCombine(config, [options], [callback])

**Returns** `promise` with dereferenced and combined schema.

#### config 

**`string|object`**

> URL/path to config schema file or config schema object. 
>
> **Default:** `docs/swagger.json`

#### options

**`object`** *(optional)*

> See [JSON Schema $Ref Parser Options](https://github.com/BigstickCarpet/json-schema-ref-parser/blob/master/docs/options.md) for a complete list of options.

#### callback

**`function(err, combinedSchema)`** *(optional)*

> Callback with error and the dereferenced and combined schema.


### swaggerCombine.middleware(config, [options])

**Returns** `function(req, res, next)` for usage as middleware.

#### config 

**`string|object`**

> URL/path to config schema file or config schema object. 
>
> **Default:** `docs/swagger.json`

#### options

**`object`** *(optional)*

> Additional options

* **format** - `string`

    Content type of the response. `yaml` or `json` *(default)*.

* **continueOnError** - `boolean`

    Continue if Swagger configs cannot be resolved or are invalid (default: `false`). *No warning or error message is returned if this option is enabled.*

> See [JSON Schema $Ref Parser Options](https://github.com/BigstickCarpet/json-schema-ref-parser/blob/master/docs/options.md) for a list of options for the parser.
