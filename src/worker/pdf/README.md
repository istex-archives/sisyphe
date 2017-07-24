[![Build Status](https://travis-ci.org/istex/sisyphe-pdf.svg?branch=master)](https://travis-ci.org/istex/sisyphe-pdf)
[![bitHound Overall Score](https://www.bithound.io/github/istex/sisyphe-pdf/badges/score.svg)](https://www.bithound.io/github/istex/sisyphe-pdf)

sisyphe-pdf
=======
[Sisyphe](https://github.com/istex/sisyphe) module of generating PDF's informations

### What does it do ?
Sisyphe PDF will add some kind of informations about PDF files  (Pdf verison, author, Software used to build it & date ...)
If a file is not a PDF it will just "next" it.

![sisyphe-pdf-out](/worker/sisyphe-pdf/sisyphe-pdf-out.png)


### How it works ?
Sisyphe PDF use Mozilla "PDFJS" to obtains PDF informations.

### Test
Just exec `npm test`


### Dev
Don't forget to add env SISYPHEDEBUG (to any value) in your bashrc (or whatever ..) or you won't see error logs.
