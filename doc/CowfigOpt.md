Cowfig options
==============

__Default__
```json
{
  "env": process.env.NODE_ENV,
  "envPrefix": "_",
  "templateBase": CWD + "config/template/",
  "consoleLog": {
    "env": "true",
    "progress": "true"
  },
  "finder": {
    "ignore": ["EXAMPLE"]
  },
  "parser": {
    "srcBase": CWD + "config/source/",
    "override": "override"
  },
  "writer": {
    "pretty": {
      "maxLength": 128,
      "indent": 2
    },
    "destBase": CWD,
    "overwrite": "auto",
    "keep": [],
    "emptyObj": false
  }
}
```


global
------


finder
------


parser
------


writer
------

-   __destBase__

-   __overwrite__

-   __keep__

-   __emptyObj__
