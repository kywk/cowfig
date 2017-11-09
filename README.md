Cowfig
======
Cowfig in a JSON format template parser to generate config.json files.

JSON file is easy to use for a developer, but hard for non-developer.

In most real cases, project always co-works with some non-RD team. 
They are used to use Excel file to evaluate value set.
JSON file is too hard to read and maintenance for them.
A tool to translate excel to JSON config file is necessary.

Also, different develop staging uses different setting. Ex: IP, port, account ... etc.
It also needs a config management tools.

Cowfig is a JSON format template parser.
It parse Excel, JSON, YAML files, provides _query_ method to get value set.

Developer write the cowfig template files. 
Cowfig take care Excel parsing, different environment value set maping 
then generate final config.json files. 


Features
--------

-   Environment awared
    -   Parse same template with different environment value set
    -   Extend environment only template
_   Parser plugin system
    -   Write your file parser as plugin and use it
    -   Builtin parser: JSON, Excel, YAML, INI
-   Customize scripts
    -   Macro function for on-the-fly processing
    -   Post process after template been parsed


Installation
------------
```
npm install -g https://github.com/kywk/cowfig
```


Quick Start
-----------
__Write your template__
```
$ mkdir config config/template config/source
$ vi config/template/configTemplate.cowfig
  ...
$ vi config/source/dataSet.json
  ...
```

__Generate config.json files__

``` bash
$ cowfig -h
Usage: cowfig [-t TEMPLATE] [-s RESOURCE] [-d DESTINATION] [-e ENV] [-o overwrite]
$ cowfig -d .
```

### Arguments descript ###

-   __-t TemplateBase__: The cowfig template files path.  
    Cowfig find all .cowfig files includes sub directory under TemplateBase.
    Build the files tree, then parse those template files.
-   __-s ResourceBase__: The value set files path.  
    Store your excel or json value set file.
    Cowfig load the .xlsx .json files and provides query method to get value set.
-   __-d DestinationBase__: Where the final JSON file stores.  
    Cowfig write out find JSON files based on where they find under TemplateBase.
-   __-e Environment__: Specify the target enviroment.  
-   __-o Overwrite__:   
    If target file is already exist, overwrite it or not?
    -   'auto': (default) auto detect last modified date. 
                Overwrite if newer verseion is out.  
    -   'always': always overwrite target file.
    -   'never': never overwrite target file.  
-   __-c Cowfig option file__:  
    A cowfigOpt config file for those setting. 

### Simple example ###

__Cowfig config file: cowfig.json__
```
{
  "env": "stage",
  "templateBase": "example/template/",
  "parser": {
    "srcBase": "example/source/"
  },
  "writer": {
    "destBase": "config",
    "overwrite": "auto",
  }
};
```

__Source file tree__
```
└── example
    ├── source
    │   ├── valueSet.xlsx
    │   ├── hostInfo.json
    │   └── stage
    │       └── hostInfo.json
    └── template
        ├── host
        │   └── servers.cowfig
        └── config.cowfig
```

__Generate config.json__
Use CLI args
```
$ cowfig -t example/template -s example/source -d config -e stage
```

or Use cowfig config file
```
$ cowfig -c cowfig.json
```

__Result target files__
```
└── config
    ├── host
    │   └── servers.json
    └── config.json
```


More Information
----------------
Read the [documentation](https://github.com/kywk/cowfig/tree/master/doc)


License
-------
MIT
