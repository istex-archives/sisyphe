Fichier générée le {{date}}
{{pkg.name}} - v{{pkg.version}} - {{module.resources}}

Parameters :
  - input : (target file)
    - mimetype : {{{parameters.input.mimetype}}}
    - extension : {{{parameters.input.extension}}}
  - language : {{parameters.lang}} 
  - cld : {{parameters.cld.code}} ({{parameters.cld.percent}}) 
  - probability.min : {{parameters.probability.min}}

----------

{{#document.categories}}
{{level}} - {{code}} ({{verbalization}}) - {{probability}}
{{/document.categories}}