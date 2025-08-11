An XSLT stylesheet to turn IVOA datalink into HTML documents.

On Datalink, see http://ivoa.net/documents/DataLink/

You can run this (or something somewhat updated) on your own datalink documents
at https://dc.g-vo.org/shomydl/q/f

If you hand out datalink documents, consider using the files provided here on
your site.  See below for `adoption instructions`_.

Notes:

(1) This hardcodes the VOTable namespace to version 1.3, which is what the VO
    will keep for the rest of VOTable 1.  If you really still use
    version 1.2, you will need to update your VOTable writer.

(2) This could certainly use quite a bit more styling, in particular for the
    non-javascript version.  PRs are welcome.

(3) Without javascript, multiple datasets in one response are not terribly
    conspicuous.


Adoption Instructions
---------------------

**Dirty Secret Alert:** Regrettably, all major browser engines suck when
you mix XSLT and Javascript (but perhaps *ready* is just the wrong
signal to catch for initialisation?).  That is why DaCHS currently
arranges for client-side application of the stylesheet when it suspects
it is talking to a browser rather than a proper client.  Somewhat
surprisingly, this still seems to be necessary 10 years after this
software was written.  If you can figure out what the actual trouble is,
do let us know.

You can of course organise the various files differently, but here is a
run-down of things needed for having your datalinks formatted.

(1) make a directory on your web server that will contain the XSLT and
    the auxiliary files; we'll call it X, and the place it is visible
    at Y.

(2) Copy datalink-to-html.xsl, sodapars.js, and footprintedit.js from
    this distribution to X.

(3) Make a sufficiently recent jquery available through the web
    server, e.g., by installing libjs-jquery on Debian or by pulling it
    from https://jquery.com/

(4) Get samp.js from https://github.com/astrojs/sampjs.git and put it
    into X.

(5) Get
    https://aladin.u-strasbg.fr/AladinLite/api/v2/latest/aladin.min.js and
    https://aladin.u-strasbg.fr/AladinLite/api/v2/latest/aladin.min.css
    and put them into X.

(6) In datalink-to-html.xsl, look for ``<script`` and fix the paths to
    jquery.js (wherever that is),  and samp.js and sodapars.js (which
    would be in Y).

(7) At the top of sodapars.js, fix the three paths at the top of to file
    to the aladin files and footprintedit javascript (which would be in
    Y).

(8) After all these preparations, simply arrange for::

      <?xml-stylesheet href='X/datalink-to-html.xsl' type='text/xsl'?>

    to be output at the top of your datalink documents.
