Excel parser for Cowfig template
================================

Cowfig template content format
------------------------------

```
%FILENAME.xlsx?QUERY_STRING
```



How to locate a field
---------------------

__Standard field name__

Format: `SheetName.A0`  

Use standard Excel field name rule to locate a field.

__ID related__

Format: `#ID_NAME(col_shift, row_shift)`  

Parser find the field data equal to #ID_NAME first, 
then get relative location with col-shift and row-shift.  
Ex: Assume __#A__ stored in __Sheet0.B5__, _#A(1,2)_ means field _Sheet0.C7_.



How to get value
----------------

### Single field ###

It is very simple, just specify the field in QUERY_STRING.

### Array ###

Format: `FieldA [~|:] FieldB`

-   Use `~` for a column major array.  
-   Use `:` for a row major array.  
-   Parser will auto detect one or two dimensional array.
-   Use `::` or `~~` to force in a two dimensional array.

Example: _array.cowfig_
``` json 
{
    col_major: "%example.xlsx?Sheet1.A1~Sheet1.C5,
    row_major: "%example.xlsx?#A(0, 1):#A(5, 5)",
    auto_one_way: "%example.xlsx?#B(0, 1)~#B(0, 10)",
    force_two_way: "example.xlsx?#B(0, 1)~~#B(0, 10)"
}
```



Inner Table Query
-----------------

In real case, the Excel file always contain many same KEYs in different table.
It's hard and not intuition to specify different #ID_NAME for each KEYs.
Thus, the parser provide inner table query.

For inner table query, `#ID_NAME` and `#END_ID_NAME` is needed to specify the table range.

Format: `#ID_NAME{R(ROW_KEY_A, ROW_KEY_B, ROW_KEY_C)~C(COL_KEY_A, COL_KEY_B)}` 



for KEY
-------

`__for__@` + `任意同層的 key 的名字`

Example: _for.cowfig_
``` json
{ 
  "types": ["jp0", "jp1", "y0", "y1"],  // 該 key 被 __for__@ 使用後即會被刪除
  "__for__@types": {
    "__key__Description": "This is __key__ ...", 
    "price": '%source/fruits.xlsx? #FRUIT_PRICE{C(__key__) : R(TW, US, JP)}'
  }
}
```

Output likes:
```
{ 
  "apple": {
    "appleDescription": "This is apple ...", 
    "price": [30, 3, 90]
  },
  "banana": {
    "bananaDescription": "This is banana ...", 
    "price": [30, 3, 90]
  }
}
```


`__for__` + `cowfig query 語句`

下面例子假設 %source/fruits.xlsx? #FRUIT_NAME(0, 1) : #END_FRUIT_NAME(0, -1) 的結果為 ['apple','banana']

*.cowfig

``` javascript
{ 
  "__for__%source/fruits.xlsx? #FRUIT_NAME(0, 1) : #END_FRUIT_NAME(0, -1)": {
    "__key__Description": "This is __key__ ...", 
    "price": '%source/fruits.xlsx? #FRUIT_PRICE{C(__key__) : R(TW, US, JP)}'
  }
}
```

output

```
{ 
  "apple": {
    "appleDescription": "This is apple ...", 
    "price": [30, 3, 90]
  },
  "banana": {
    "bananaDescription": "This is banana ...", 
    "price": [30, 3, 90]
  }
}
```



Memo
----

1.  `#ID_NAME` must be unique in all file.
2.  `#ID_NAME` and `#END_ID_NAME` used to specify inner query range.
