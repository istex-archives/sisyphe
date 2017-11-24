Module OCR-ISTEX (OI) de type "LoadIstex" de détection de langue.

### Installation
```
git clone ssh://$USER@vsistex.intra.inist.fr:22222/istex/oi-lang-detect.git
cd oi-lang-detect
npm install
```

### Fonctionnement

Le module oi-lang-detect récupère les fichiers texte renseignés dans l'objet documentaire et effectue une détection de langue sur chacun. Les informations génerés sont ensuite renseignés dans l'objet documentaire JSON.

### Structure du docObject (objet documentaire JSON)

**AVANT**

    {
      idIstex: '123456789ABCD',
      corpusName: 'john-doe',
      cartoType: 'john-doe',
      fulltext: [
        {
          path: 'test/data/test.pdf',
          mime: 'application/pdf',
          original: true
        },{
          path: '/path/to/1/2/3/123456789ABCD/fulltext/123456789ABCD-tesseract.txt',
          mime: 'text/plain',
          original: false
        }
      ],
      corpusOutput: 'test/data/output'
    }

**APRES**

    {
      idIstex: '123456789ABCD',
      corpusName: 'john-doe',
      cartoType: 'john-doe',
      fulltext: [
        {
          path: 'test/data/test.pdf',
          mime: 'application/pdf',
          original: true
        },{
          path: '/path/to/1/2/3/123456789ABCD/fulltext/123456789ABCD-tesseract.txt',
          mime: 'text/plain',
          original: false,
          langDetect: {
            reliable: true,
            textBytes: 8779,
            languages: [
              { name: 'FRENCH', code: 'fr', percent: 51, score: 636 },
              { name: 'ENGLISH', code: 'en', percent: 48, score: 1299 }
            ],
            chunks: [
              { name: 'ENGLISH', code: 'en', offset: 0, bytes: 4187 },
              { name: 'FRENCH', code: 'fr', offset: 4187, bytes: 622 },
              { name: 'FRENCH', code: 'fr', offset: 5059, bytes: 1983 },
              { name: 'FRENCH', code: 'fr', offset: 7193, bytes: 352 },
              { name: 'FRENCH', code: 'fr', offset: 7760, bytes: 1250 }
            ]
          }
        }
      ],
      corpusOutput: 'test/data/output'
    }
