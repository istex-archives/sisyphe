Fichier générée le {{date}}
{{pkg.name}} - v{{pkg.version}} - {{module.resources}}

Parameters :
  - input : (target file)
    - mimetype : {{{parameters.mime}}}
    - extension : {{{parameters.extension}}}
  - language : {{parameters.lang}}
  - truncate : {{parameters.truncate}}
  - sort : {{parameters.sort}}
  - filters :
    - title :
      - minOccur : {{parameters.filters.title.minOccur}}
      - noLimitStrength : {{parameters.filters.title.noLimitStrength}}
    - fulltext :
      - minOccur : {{parameters.filters.fulltext.minOccur}}
      - noLimitStrength : {{parameters.filters.fulltext.noLimitStrength}}

----------

{{#document.keywords}}
{{term}} - {{segments}} - {{frequency}} - {{factor}}
{{/document.keywords}}