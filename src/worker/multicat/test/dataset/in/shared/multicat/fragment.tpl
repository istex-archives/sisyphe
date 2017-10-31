Sample template for {{pkg.name}}

{{#document.categories}}
  {{#values}}
    {{#.}}
{{level}} - {{value}}
    {{/.}}
  {{/values}}
{{/document.categories}}