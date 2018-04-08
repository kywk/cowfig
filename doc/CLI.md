Cowfig Command Line Interface (CLI)
===================================


``` bash
$ cowfig -h
usage: cowfig.js [-t TEMPLATE] [-s RESOURCE] [-d DESTINATION] [-e ENV] [-o overwrite] [-f]
```

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
