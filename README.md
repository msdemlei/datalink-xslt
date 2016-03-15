An XSLT stylesheet to turn IVOA datalink into HTML documents.

On Datalink, see http://ivoa.net/documents/DataLink/index.html

Auxiliary resources (logos, css?) would go here, too.

A file to try this out on could be
http://dc.g-vo.org/califa/q2/dl/dlmeta?ID=ivo%3A//org.gavo.dc/~%3Fcalifa/datadr2/UGC12519.V500.rscube.fits

TODO: 

(1) This hardcodes the VOTable namespace to version 1.2.  This is a huge pain,
and having a hack to say "ignore the namespace URI" would be great.

(2) This needs much more styling.  I'd like nice logos for the various
pieces of metadata.  Grouping, perhaps?  Folding in of categories?

(3) Right now, this pulls javascript from the GAVO data center.  This
should be made more configurable.  As should be general appearance.
I guess we should pull out the root template and tell users to simply
write that.

(4) We're not checking if there's multiple datasets described in the
response.  While something would come out of the XSLT even in that case,
its utility would be questionable, and so we should really do something
if we detect multiple ids.
