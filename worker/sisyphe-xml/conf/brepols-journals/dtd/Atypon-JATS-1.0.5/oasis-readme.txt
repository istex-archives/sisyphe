

<!--                    NAME OASIS NAMESPACE PREFIX                -->
<!--                    Construct the OASIS namespace prefix to be 
                        used in the xmlns pseudo-attribute from:
                          - the word "xmlns", 
                          - a colon, and 
                          - the prefix just defined in %oasis.prefix;
                        Implementor's Note: This is the parameter 
                        entity that can be set off to get rid of the
                        OASIS namespace prefix, turning "oasis:table"
                        into "table", for example. Removing the prefix
                        is accomplished by setting this parameter 
                        entity to "xmlns". Caution: Note the lack of 
                        a colon.                                   -->
<!ENTITY % oasis.xmlns.attrname
                        "xmlns:%oasis.prefix;"                       >


<!--                    SET OASIS NAMESPACE PREFIX                 -->
<!--                    Set the OASIS prefix string to the prefix
                        "oasis" plus a colon ==> "oasis:" for use
                        in the QNames of elements. This is NOT used in
                        setting up the OASIS prefix in the XMLNS
                        pseudo-attribute, only for naming elements.
                        Implementor's Note:
                        To turn off the prefix, set this parameter
                        entity to the null string "".              -->
<!ENTITY % oasis.pfx     "%oasis.prefix;:"                            >


<!--                    NAME OASIS NAMESPACE PREFIX                -->
<!--                    Construct the OASIS namespace prefix to be 
                        used in the xmlns pseudo-attribute from:
                          - the word "xmlns", 
                          - a colon, and 
                          - the prefix just defined in %oasis.prefix;
                        Implementor's Note: This is the parameter 
                        entity that can be set off to get rid of the
                        OASIS namespace prefix, turning "oasis:table"
                        into "table", for example. Removing the prefix
                        is accomplished by setting this parameter 
                        entity to "xmlns". Caution: Note the lack of 
                        a colon.                                   -->
<!ENTITY % oasis.xmlns.attrname
                        "xmlns"                                      >


<!--                    SET OASIS NAMESPACE PREFIX                 -->
<!--                    Set the OASIS prefix string to the prefix
                        "oasis" plus a colon ==> "oasis:" for use
                        in the QNames of elements. This is NOT used in
                        setting up the OASIS prefix in the XMLNS
                        pseudo-attribute, only for naming elements.
                        Implementor's Note:
                        To turn off the prefix, set this parameter
                        entity to the null string "".              -->
<!ENTITY % oasis.pfx    ""                                           >



<!-- ============================================================= -->
<!--                    TABLE CLASSES                              -->
<!-- ============================================================= -->


<!--                    ALTERNATIVES DISPLAY CLASS ELEMENTS        -->
<!--                    Display elements that can be alternatives to
                        each  other inside an alternatives element.
                          XHTML Table Model    table
                          OASIS CALS Table     oasis:table         -->
<!ENTITY % alternatives-display.class
                        "array | chem-struct | graphic |
                         inline-graphic |
                         inline-supplementary-material |
                         media | preformat |private-char |
                         supplementary-material | 
                         table | %otable.qname; |
                         textual-form"                               >


<!--                    TABLE CLASS ELEMENTS                       -->
<!--                    Elements that will be used to contain the
                        rows and columns inside the Table Wrapper
                        element <tbl>.  The following elements can
                        be set up for inclusion:
                          XHTML Table Model    table
                          OASIS CALS Table     oasis:table         -->
<!ENTITY % table.class  "table | %otable.qname;"                     >


<!--                    TABLE BODY CLASS                           -->
<!--                    To include just a table body <tbody> 
                        element. Both XHTML and OASIS table types. -->
<!ENTITY % tbody.class  "tbody | %otbody.qname;"                     >




<!-- ============================================================= -->
<!--                    TABLE CLASSES                              -->
<!-- ============================================================= -->


<!--                    ALTERNATIVES DISPLAY CLASS ELEMENTS        -->
<!--                    Display elements that can be alternatives to
                        each  other inside an alternatives element.
                          OASIS CALS Table      table              -->
<!ENTITY % alternatives-display.class
                        "array | chem-struct | graphic |
                         inline-graphic |
                         inline-supplementary-material |
                         media | preformat |private-char |
                         supplementary-material | 
                         table | textual-form"                       >


<!--                    TABLE CLASS ELEMENTS                       -->
<!--                    Elements that will be used to contain the
                        rows and columns inside the Table Wrapper
                        element <tbl>.  The following elements can
                        be set up for inclusion:
                          OASIS CALS Table     table               -->
<!ENTITY % table.class  "table"                                      >


<!--                    TABLE BODY CLASS                           -->
<!--                    To include just a table body <tbody> 
                        element. OASIS table type only.            -->
<!ENTITY % tbody.class  "tbody"                                      >
