Fichier générée le {{date}}
{{pkg.name}} - v{{pkg.version}} - {{module.resources}}

Parameters :
  - input : (target file)
    - mimetype : {{{parameters.input.mimetype}}}
    - extension : {{{parameters.input.extension}}}

----------

{{#document.categories}}
  {{#values}}
    {{#.}}
{{level}} - {{value}}
    {{/.}}
  {{/values}}
{{/document.categories}}