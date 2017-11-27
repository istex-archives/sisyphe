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
    - minOccur : {{filter.minOccur}}
    - noLimitStrength : {{filter.noLimitStrength}}

----------

term - frequency - specificity - probability
{{#document.keywords}}
{{term}} - {{frequency}} - {{specificity}} - {{probability}}
{{/document.keywords}}