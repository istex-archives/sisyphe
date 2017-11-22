Fichier générée le {{date}}
{{pkg.name}} - v{{pkg.version}} - {{module.resources}}

Parameters :
  - input : (target file)
    - mimetype : {{{parameters.input.mimetype}}}
    - extension : {{{parameters.input.extension}}}
  - language : {{parameters.lang}}
  - filters :
    - title :
      - minOccur : {{filters.title.minOccur}}
      - noLimitStrength : {{filters.title.noLimitStrength}}
    - fulltext :
      - minOccur : {{filters.fulltext.minOccur}}
      - noLimitStrength : {{filters.fulltext.noLimitStrength}}

----------

term - segments - frequency - factor
{{#document.keywords}}
{{term}} - {{segments}} - {{frequency}} - {{factor}}
{{/document.keywords}}