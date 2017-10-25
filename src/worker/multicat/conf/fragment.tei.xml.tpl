<?xml version="1.0" encoding="UTF-8"?>
<!-- Fichier générée le {{date}} -->
<!-- {{pkg.name}} - v{{pkg.version}} - {{module.resources}} -->
<TEI>
  <standOff>
    <teiHeader>
      <fileDesc>
        <titleStmt>
          <title>Catégorisation de documents</title>
          <respStmt>
            <resp>enrichissement catégorisation {{module.resp.label}}</resp>
            <name resp="{{module.resp.id}}">{{module.resp.label}}</name>
          </respStmt>
        </titleStmt>
        <publicationStmt>
          <authority>Inist-CNRS</authority>
          <availability status="restricted">
            <licence target="http://creativecommons.org/licenses/by/4.0/">
              <p>L’élément standOff de ce document est distribué sous licence Creative Commons 4.0 non transposée (CC BY 4.0)</p>
              <p>Ce standOff a été créé dans le cadre du projet ISTEX – Initiative d’Excellence en Information Scientifique et Technique</p>
            </licence>
          </availability>
        </publicationStmt>
        <sourceDesc>
          <biblStruct>
            <idno type="ISTEX">{{document.id}}</idno>
          </biblStruct>
        </sourceDesc>
      </fileDesc>
      <encodingDesc>
        <appInfo>
          <application ident="{{pkg.name}}" version="{{pkg.version}}">
            <label>{{module.label}}</label>
          </application>
        </appInfo>
        <classDecl>
          {{#categorizations}}
          <taxonomy xml:id="{{id}}">
            <bibl>{{{label}}}<ptr target="{{{scheme}}}"/></bibl>
          </taxonomy>
          {{/categorizations}}
        </classDecl>
      </encodingDesc>
      <revisionDesc>
        <change when="2016-06-24" who="{{module.resp.id}}" xml:id="{{pkg.name}}">catégorisation par appariement</change>
      </revisionDesc>
    </teiHeader>
    <listAnnotation type="{{pkg.name}}">
      <annotationBlock xmls="https//www.tei-c.org/ns/1.0">
        {{#document.categories}}
          {{#values}}
        <keywords change="#{{pkg.name}}" resp="#{{module.resp.id}}" scheme="#{{id}}">
            {{#.}}
          <term level="{{level}}">{{value}}</term>
            {{/.}}
        </keywords>
          {{/values}}
        {{/document.categories}}
      </annotationBlock>
    </listAnnotation>
  </standOff>
</TEI>