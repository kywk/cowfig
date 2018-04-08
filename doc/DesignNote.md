Cowfig design note & API detail
===============================

cowfig-parser
-------------

The cowfig template engine. 
Parse .cowfig, read data from JavaScript, Json, YAML, Excel ... etc format.
Then generate value mapped json object.

### Constructor: Parser(config) ###

#### Argument ####

- config (object)

##### object: config #####

- base:     null (string)
- env:      null (string)
- cache:    false (boolean) 
    store content in parse.db when $filename been queried.
- hook:     false (boolean) 
    auto update parse.db.$filename when modified.

#### Return: new parser (object) ####

- fmt (object)      - 
- db (object)       - store #filename content as a database
- cache (object)    - cached for parsed .cowfig content

##### object: fmt #####

- $ext: $parser

##### object: db, cache #####

- $filename: $content of filename



### register(ext, parser) ###

#### Argument ####

- ext (string)      - the extension for this registered parser.
- parser (object)   - file content parser object. see Parser Plugins API for detail.

#### Return: null ####


### parseFile(filename) ###

Step:
1.  Load base/filename.cowfig(.json), parse to _base
2.  Load base/env/filename.cowfig(.json), parse to _env
3.  Generate result based on type
    3.1 'override': ride all _env value and structure to _base
    3.2 'patch': use _base structure, patch with _env values
    3.3 'replace': use _env values set only
4.  Call parse(result) to get real values

#### Argument ####

- filename (string) -

#### Resurn: object ####

- error: 0 (int, require)
- data (object)


### parse(content) ###



Parser Plugins API
------------------

### Constructor: plugin(config) ###

### query(query, parser.\_cache) ###

#### Argument ####

#### Return: result ####

- value (object)
- cache (object)





runtime
-------





CLI
---

A offline config template parser for generate online config.json format.

Working flow:



TODOs
-----
- valueSetBase support
