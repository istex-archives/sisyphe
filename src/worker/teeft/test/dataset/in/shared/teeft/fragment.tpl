Fichier générée le {{date}}
{{pkg.name}} - v{{pkg.version}} - {{module.resources}}

Parameters :
  - input : (target file)
    - mimetype : {{{parameters.input.mimetype}}}
    - extension : {{{parameters.input.extension}}}
  - language : {{parameters.lang}}
  - truncate : {{parameters.truncate}}
  - sort : {{parameters.sort}}
  - filter :
    - minOccur : {{parameters.filter.minOccur}}
    - noLimitStrength : {{parameters.filter.noLimitStrength}}

----------

{{#document.keywords}}
{{term}} - {{frequency}} - {{specificity}}
{{/document.keywords}}