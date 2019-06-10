Swagger Combine
===============

[![Build Status](https://travis-ci.org/maxdome/swagger-combine.svg)](https://travis-ci.org/maxdome/swagger-combine)
[![Coverage Status](https://coveralls.io/repos/github/maxdome/swagger-combine/badge.svg?branch=develop)](https://coveralls.io/github/maxdome/swagger-combine?branch=develop)
[![dependencies Status](https://david-dm.org/maxdome/swagger-combine/status.svg)](https://david-dm.org/maxdome/swagger-combine)
[![devDependencies Status](https://david-dm.org/maxdome/swagger-combine/dev-status.svg)](https://david-dm.org/maxdome/swagger-combine?type=dev)
[![npm](https://img.shields.io/npm/v/swagger-combine.svg)](https://www.npmjs.com/package/swagger-combine)
[![Greenkeeper badge](https://badges.greenkeeper.io/maxdome/swagger-combine.svg)](https://greenkeeper.io/)

>Combines multiple Swagger schemas into one dereferenced schema.

## Install

```sh
$ npm install --save swagger-combine
```

#### Globally for CLI usage

```sh
$ npm install -g swagger-combine
```

## Usage

```js
const swaggerCombine = require('swagger-combine');

swaggerCombine('docs/swagger.json')
    .then(res => console.log(JSON.stringify(res)))
    .catch(err => console.error(err));
```

**Swagger Combine** returns a promise by default. Alternatively a callback can be passed as second argument:

```js
swaggerCombine('docs/swagger.json', (err, res) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(res));
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

### Async Middleware

```js
const swaggerCombine = require('swagger-combine');
const app = require('express')();

(async function() {
  try {
    app.get('/swagger.json', await swaggerCombine.middlewareAsync('docs/swagger.json'));
    app.get('/swagger.yaml', await swaggerCombine.middlewareAsync('docs/swagger.json', { format: 'yaml' }));
  } catch (e) {
    console.error(e);
  }

  app.listen(3333);
})();

```

### CLI

```sh
$ swagger-combine config.json
```

#### Help

```sh
$ swagger-combine -h
```

#### Save to File

```sh
$ swagger-combine config.json -o combinedSchema.json
```

#### YAML Output

The output is in YAML if the output filename ends with `.yaml` or `.yml`:

```sh
$ swagger-combine config.json -o combinedSchema.yaml
```

Alternatively the `--format` or `-f` argument can be used:

```sh
$ swagger-combine config.json -f yaml
```

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

Paths can be filtered by using an array of paths and regex strings to `exclude` or `include`.

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

Example of using Regex Strings (in combination with path string)

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
          ".*\{petId\}.get"
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "paths": {
        "include": [
          ".*?/publications(/.*)?",
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
This will replace each key matched by path with the new value. 

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine simple Rename Example",
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

Paths can also be replaced by regular expressions and functions.

To configure this, it's necessary to use an array like structure instead of an object with key/value pairs to ensure the order of replacements.

In the `swagger.json` file only "renaming" and/or a string like regular expression can be used. For regular expression objects or functions the (swagger)json configuration must be generated by javascript and used as input parameter of the swaggerCombine function.

The next example equals the simple example above but used an extended configuration style.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine simple Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "rename": [
          { 
            "type": "rename",
            "from": "/pet/{petId}",
            "to": "/pet/alive/{petId}"
          } 
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```

To change the basePath of all paths a regular expression can be used.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Rename by regular expression Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "paths": {
        "rename": [
          { 
            "type": "regex",
            "from": "^\/pet\/(.*)",
            "to": "/pet/alive/$1"
          } 
        ]
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```

An example of dynamic generated configuration and renamings with regular expressions and functions. 

```javascript
const swaggerJson = {
  swagger: "2.0",
  info: {
    title: "Swagger Combine Rename by regular expression Example",
    version: "1.0.0"
  },
  apis: [
    {
      url: "http://petstore.swagger.io/v2/swagger.json",
      paths: {
        rename: [
          { 
            type: "regex",
            from: /\/pet\/(.*)/,
            to: "/pet/alive/$1"
          },
          { 
            type: "function",
            to: (path) => path === "/pet/alive/{petId}" ? "/pet/alive/{petAliveId}" : path
          }
        ]
      }
    },
    {
      url: "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}

swaggerCombine(swaggerJson)
...
```

### Renaming Tags

Tags can be renamed in the same manner as paths with simple, object like configuration style, using the `tags.rename` field.

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

### Renaming Path OperationIds

When merging different swagger definitions there are situations were the operationIds used in these separate swaggers could collide. If this is the case and changing source isn't desired or possible. OperationIds can be renamed by specifying the existing id to rename and the new id as key/value pairs in `operationIds.rename`.

This will replace each operationId matched by the provided key with the new value.

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Simple OperationId Rename Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "operationIds": {
        "rename": {
          "addPet": "createPet"
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml"
    }
  ]
}
```

### Adding Tags

Tags can be added to all operations in a schema, using the `tags.add` field.

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
}
```

### Renaming Security Definitions

Security definitions can be renamed like paths (simple) and tags in the `securityDefinitions.rename` field. All usages of the security definition in the paths are renamed as well.

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

### Authentication & Request Headers

To retrieve Swagger schemas that are access protected, basic auth information (username and password) or any headers to be sent with the http request can be specified:

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Swagger Combine Authentication Example",
    "version": "1.0.0"
  },
  "apis": [
    {
      "url": "http://petstore.swagger.io/v2/swagger.json",
      "resolve": {
        "http": {
          "auth": {
            "username": "admin",
            "password": "secret12345"
          }
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/medium.com/1.0.0/swagger.yaml",
      "resolve": {
        "http": {
          "headers": {
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImFkbWluIiwiYWRtaW4iOnRydWV9.44lJS0jlltzcglq7vgjXMXYRTecBxseN3Dec_LO_osI"
          }
        }
      }
    },
    {
      "url": "https://api.apis.guru/v2/specs/deutschebahn.com/betriebsstellen/v1/swagger.json",
      "resolve": {
        "http": {
          "headers": {
            "authorization": "Basic YWRtaW46c2VjcmV0MTIz"
          }
        }
      }
    }
  ]
}
```

For all possible resolve options have a look at the [documentation of json-schema-ref-parser](https://github.com/BigstickCarpet/json-schema-ref-parser/blob/master/docs/options.md#resolve-options).


## API

### swaggerCombine(config, [options], [callback])

**Returns** `promise` with dereferenced and combined schema.

#### config `string|object`

> URL/path to config schema file or config schema object.
>
> **Default:** `docs/swagger.json`

#### options `object` *(optional)*

* **format** - `string`

    Content type of the response. `yaml` or `json` *(default)*.

* **continueOnError** - `boolean`

    Continue if Swagger configs cannot be resolved or are invalid (default: `false`). *No warning or error message is returned if this option is enabled.*

* **continueOnConflictingPaths** - `boolean`

    Continue if Swagger schemas have conflicting paths (default: `false`). An error is only thrown if conflicting paths also have conflicting operations (e.g. if two Swagger schemas both have `/pets.get` and `/pets.get` defined).

> See [JSON Schema $Ref Parser Options](https://github.com/BigstickCarpet/json-schema-ref-parser/blob/master/docs/options.md) for a complete list of options.

#### callback `function(err, combinedSchema)` *(optional)*

> Callback with error and the dereferenced and combined schema.


### swaggerCombine.middleware(config, [options])

**Returns** `function(req, res, next)` for usage as middleware.

#### config `string|object`

*see above*

#### options `object` *(optional)*

*see above*

### swaggerCombine.middlewareAsync(config, [options])

**Returns** a `promise` yielding a `function(req, res, next)` for usage as middleware.

#### config `string|object`

*see above*

#### options `object` *(optional)*

*see above*
