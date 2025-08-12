<?xml version="1.0" encoding="UTF-8"?>

<!-- A stylesheet to turn IVOA datalink documents 
(http://www.ivoa.net/documents/DataLink) into HTML pages.

Assumptions on document content beyond conforming datalink content:

(1) null value of content_length is -1
(2) VOTable namespace is 1.3 (as long as you know what version you're handing
    out, just fix xmlns:vot below)


This stylesheet is made available under CC-0 by the GAVO project,
http://www.g-vo.org.  
See http://creativecommons.org/publicdomain/zero/1.0/ for details.
-->


<xsl:stylesheet
    xmlns:vot="http://www.ivoa.net/xml/VOTable/v1.3"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
   	xmlns="http://www.w3.org/1999/xhtml"
    version="1.0">
   
    <!-- ############################################## Global behaviour -->

   <xsl:output method="html" encoding="UTF-8" indent="yes"/>

    <!-- Don't spill the content of unknown elements. -->
    <xsl:template match="text()"/>

    <xsl:key
        name="fields"
        match="vot:RESOURCE[@type='results']/vot:TABLE/vot:FIELD"
        use="count(preceding::vot:FIELD)+1"/>

    <xsl:variable
        name="id_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='ID']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="access_url_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='access_url']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="service_def_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='service_def']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="error_message_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='error_message']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="description_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='description']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="semantics_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='semantics']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="content_type_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='content_type']/preceding::vot:FIELD)+1"/>
    <xsl:variable
        name="content_length_index"
        select="count(vot:VOTABLE/vot:RESOURCE[@type='results']/vot:TABLE/
            vot:FIELD[@name='content_length']/preceding::vot:FIELD)+1"/>
            
    <!-- ################################### links table -->
    
    <xsl:template match="vot:RESOURCE[@type='results']">
        <xsl:call-template name="fetch_preview"/>
        <xsl:apply-templates/>
    </xsl:template>

    <xsl:template match="vot:TABLEDATA">
      <table class="links">
        <thead>
        <tr><th>Where?</th><th>Description</th><th>What?</th></tr>
        </thead>
        <tbody>
        <xsl:apply-templates/>
        </tbody>
      </table>
    </xsl:template>

    <xsl:template name="normal_row">
        <!-- a datalink table row not requring extra processing -->
        <tr>
        <xsl:attribute name="class">
            <xsl:value-of select="substring(vot:TD[$semantics_index], 2)"/>
        </xsl:attribute>
        <td>
            <xsl:apply-templates select="vot:TD[$access_url_index]"
                mode="access_url"/>
            <xsl:apply-templates select="vot:TD[$content_length_index]"
                mode="content_length"/>
            <xsl:apply-templates select="vot:TD[$error_message_index]"
                mode="error_message"/>
            <xsl:apply-templates select="vot:TD[$service_def_index]"
                mode="proc_ref"/>
        </td>
        <td>
            <xsl:apply-templates select="vot:TD[$description_index]"
                mode="description"/>
        </td>
        <td>
            <xsl:apply-templates select="vot:TD[$semantics_index]"
                mode="semantics"/><br/>
            <xsl:apply-templates select="vot:TD[$id_index]"
                mode="id"/>
        </td>

        </tr>
    </xsl:template>

    <xsl:template match="vot:TR">
      <!-- this intermediate template is for when we want to switch
      to different templates for errors and services -->
      <xsl:call-template name="normal_row"/>
    </xsl:template>

    <xsl:template match="vot:TD" mode="id">
        <span class="ivoid-container">
            <span class="ivoid">
                <xsl:value-of select="."/>
            </span>
        </span>
    </xsl:template>

    <xsl:template match="vot:TD" mode="semantics">
            <span class="semantics"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="vot:TD" mode="access_url">
      <xsl:if test="string(.)">
           <a class="datalink">
               <xsl:attribute name="href">
                    <xsl:value-of select="."/>
               </xsl:attribute>Link</a>
      </xsl:if>
    </xsl:template>

    <xsl:template name="format-file-size">
        <xsl:param name="file-size"/>
        <xsl:choose>
            <xsl:when test="$file-size&lt;2000">
                <xsl:value-of select="$file-size"/> Bytes</xsl:when>
            <xsl:when test="$file-size&lt;1500000">
                <xsl:value-of select="round($file-size div 1024)"
                    /> kiB</xsl:when>
            <xsl:when test="$file-size&lt;1500000000">
                <xsl:value-of select="round($file-size div 1048576)"
                    /> MiB</xsl:when>
            <xsl:when test="$file-size&lt;20000000000">
                <xsl:value-of select="round($file-size div 1073741824)"
                    /> GiB</xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$file-size"/> Bytes</xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="vot:TD" mode="content_length">
        <xsl:if test=". and number(.)!=-1">
            <span class="size">
                (<xsl:call-template name="format-file-size">
                    <xsl:with-param name="file-size" select="number(.)"/>
                </xsl:call-template>)
            </span>
        </xsl:if>
    </xsl:template>

    <xsl:template match="vot:TD" mode="error_message">
        <xsl:if test="string(.)">
            <span class="errmsg">
                    <xsl:value-of select="."/>
            </span>
        </xsl:if>
    </xsl:template>

    <xsl:template match="vot:TD" mode="proc_ref">
        <xsl:if test="string(.)">
            <a class="procref">
                    <xsl:attribute name="href"
                      >#<xsl:value-of select="."/></xsl:attribute>
                (Form)</a>
        </xsl:if>
    </xsl:template>

    <xsl:template match="vot:TD" mode="description">
            <p class="description">
                    <xsl:value-of select="."/>
            </p>
    </xsl:template>

    <!-- ################################### service interface -->

    <xsl:template name="add-default">
      <!-- called on PARAM-s to fiddle out DaCHS-custom LINK #pre-set
        defaults and set them on the current node. -->
      <xsl:if test="vot:LINK[@action='rdf' and @content-role='#pre-set']">
        <xsl:attribute name="value">
          <xsl:value-of select="vot:LINK/@value"/>
        </xsl:attribute>
      </xsl:if>
    </xsl:template>

    <xsl:template match="vot:RESOURCE[@utype='adhoc:service']">
        <xsl:if test="vot:PARAM[@name='standardID']/@value=
           'ivo://ivoa.net/std/SODA#sync-1.0'">
            <form class="service-interface" method="GET">
                <xsl:attribute name="action">
                    <xsl:value-of select="vot:PARAM[@name='accessURL']/@value"/>
                </xsl:attribute>
                <xsl:attribute name="id">
                    <xsl:value-of select="@ID"/>
                </xsl:attribute>
                <h2>SODA data access</h2>
                <p>In the parameters below, leave everything you do not
                want constrained empty.</p>
                <div style="text-align:right">
                    <input type="submit" value="Retrieve data"
                        style="width:14em;height:8ex"/>
                </div>
                <div class="inputpars">
                    <xsl:apply-templates select="vot:GROUP[@name='inputParams']"
                        mode="build-inputs"/>
                </div>
            </form>
        </xsl:if>
    </xsl:template>

    <!-- **vot:PARAM -> html:input translation**: we match with various
        templates and control conflicts through priority.  Please
        sort rules by descending priority. 
        
        Priorities >=200 are for protocol-specified cases.
        Priorities ]100, 200[ are for 3-factor semantics 
        Priorities <=100 are for heuristics. 
   
        Also, there's a common template for assembling the tree fragments
        that should be used for consistency if at all possible.

        Regrettably, XSLT1 apparently cannot meaningfully pass tree fragments
        in template parameters (11.1: "An operation is permitted on a result 
        tree fragment only if that operation would be permitted on a string").
        Hence, we have this incredibly clumsy interface to the 
        format-an-input-key template.  If anyone knows a hack to work around
        this, you're most welcome.
    -->

    <xsl:template name="format-an-input-key">
        <xsl:param name="typedesc"/>
        <xsl:param name="widget"/>
        <div>
            <xsl:attribute name="class">
                <xsl:value-of select="concat('input ', @name, '-', 
                    @unit, '-', translate(@ucd, '.;', '__'))"/>
            </xsl:attribute>
            <p class="input-header">
                <span class="param-name"><xsl:value-of select="@name"/></span>
                <xsl:text> </xsl:text>
                <span class="typedesc"><xsl:copy-of select="$typedesc"/></span>
            </p>
            <p class="widget">
                <xsl:copy-of select="$widget"
                    />&#xa0;<span class="unit">
                <xsl:value-of select="@unit"/></span></p>
            <p class="param-description">
                <xsl:copy-of select="vot:DESCRIPTION"/>
            </p>
        </div>
    </xsl:template>

    <!-- circles and polygons get seeded with the max values -->

    <xsl:template match="vot:PARAM[@xtype='polygon' or @xtype='circle']" 
        mode="build-inputs" priority="250">
      <xsl:call-template name="format-an-input-key">
         <xsl:with-param name="typedesc">A shape on the sky
             (space-separated numbers in degrees). Maximum extent:
             <span class="high-limit">
                 <xsl:value-of select="vot:VALUES/vot:MAX/@value"/>
             </span>
         </xsl:with-param>
         <xsl:with-param name="widget">
             <input type="text" class="soda dw-input">
                 <xsl:attribute name="name">
                     <xsl:value-of select="@name"/>
                 </xsl:attribute>
                 <xsl:attribute name="placeholder">
                     <xsl:value-of select="vot:VALUES/vot:MAX/@value"/>
                 </xsl:attribute>
             </input>
         </xsl:with-param>
       </xsl:call-template>
    </xsl:template>

    <!-- params with a value always become hidden 
      (TODO: but we should make them editable if there's VALUES on them) -->
    <xsl:template match="vot:PARAM[@value!='']" mode="build-inputs"
            priority="200">
        <input type="hidden" class="soda">
            <xsl:attribute name="name">
                <xsl:value-of select="@name"/>
            </xsl:attribute>
            <xsl:attribute name="value">
                <xsl:value-of select="@value"/>
            </xsl:attribute>
        </input>
    </xsl:template>

    <!-- interval-valued params get an interval-valued placeholder -->

    <xsl:template match="vot:PARAM[@xtype='interval']" mode="build-inputs"
            priority="100">
        <xsl:call-template name="format-an-input-key">
            <xsl:with-param name="typedesc">An interval 
                (space-separated pair of numbers),
                where the limits have to be between
                <span class="low-limit">
                    <xsl:value-of select="vot:VALUES/vot:MIN/@value"/>
                </span>
                and
                <span class="high-limit">
                    <xsl:value-of select="vot:VALUES/vot:MAX/@value"/>
                </span>
            </xsl:with-param>
            <xsl:with-param name="widget">
                <input type="text" class="soda interval-input">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@name"/>
                    </xsl:attribute>
                    <xsl:attribute name="placeholder">
                        <xsl:value-of select="vot:VALUES/vot:MIN/@value"/>
                        <xsl:text> </xsl:text>
                        <xsl:value-of select="vot:VALUES/vot:MAX/@value"/>
                    </xsl:attribute>
                </input>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>

    <!-- ... params with options become a select box.  Yes, this
    collides with the interval priority.  We'll resolve this when
    we see an interval-valued enumerated parameter. -->

    <xsl:template match="vot:PARAM[vot:VALUES/vot:OPTION]" mode="build-inputs"
            priority="100">
        <xsl:call-template name="format-an-input-key">
            <xsl:with-param name="typedesc"
                >Select zero, one, or possibly more options</xsl:with-param>
            <xsl:with-param name="widget">
                <select class="soda" multiple="multiple">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@name"/>
                    </xsl:attribute>
                    <xsl:apply-templates select="vot:VALUES" 
                        mode="build-inputs"/>
                </select>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>

    <xsl:template match="vot:OPTION" mode="build-inputs">
        <option>
            <xsl:attribute name="value">
                <xsl:value-of select="@value"/>
            </xsl:attribute>
            <xsl:choose>
                <xsl:when test="@name">
                    <xsl:value-of select="@name"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="."/>
                </xsl:otherwise>
            </xsl:choose>
        </option>
    </xsl:template>

    <!-- ...non-interval params having min and max get pre-filled with the
        min -->

    <xsl:template match="vot:PARAM[vot:VALUES/vot:MIN]" mode="build-inputs"
            priority="50">
        <xsl:call-template name="format-an-input-key">
            <xsl:with-param name="typedesc"
                >A value between
                <span class="limit">
                    <xsl:value-of select="vot:VALUES/vot:MIN/@value"/>
                </span>
                and
                <span class="limit">
                    <xsl:value-of select="vot:VALUES/vot:MAX/@value"/>
                </span></xsl:with-param>
            <xsl:with-param name="widget">
                <input type="text" class="soda">
                    <xsl:attribute name="name">
                        <xsl:value-of select="@name"/>
                    </xsl:attribute>
                    <xsl:attribute name="placeholder">
                        <xsl:value-of select="vot:VALUES/vot:MIN/@value"/>
                    </xsl:attribute>
                    <xsl:call-template name="add-default"/>
                </input>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>

    <!-- ...everything else is just a text input -->

    <xsl:template match="vot:PARAM" mode="build-inputs" priority="0">
      <xsl:call-template name="format-an-input-key">
        <xsl:with-param name="typedesc"/>
        <xsl:with-param name="widget">
          <input type="text" class="soda generic-input">
            <xsl:attribute name="name">
              <xsl:value-of select="@name"/>
            </xsl:attribute>
            <xsl:call-template name="add-default"/>
          </input>
        </xsl:with-param>
      </xsl:call-template>
    </xsl:template>


    <!-- ################################### utility, top-level -->

    <xsl:template name="fetch_preview">
        <xsl:variable name="preview_url" 
            select="//vot:TR[vot:TD[$semantics_index]='#preview']/vot:TD[$access_url_index]"/>
        <xsl:if test="$preview_url">
            <p><img alt="[PREVIEW]">
                <xsl:attribute name="src">
                    <xsl:value-of select="$preview_url"/>
                </xsl:attribute>
            </img></p>
        </xsl:if>
    </xsl:template>


    <xsl:template match="/">
    	<html>
    	<head>
    	<title>Datalink response</title>
    	<style type="text/css"><![CDATA[
    	  table {
    	      border-spacing: 0pt;
    	      border-collapse: collapse;
    	  }

    	  td {
    	      padding: 8pt;
    	      border-left: 2pt solid grey;
    	      border-right: 2pt solid grey;
    	  }

    	  span.ivoid-container {
    	      display:inline-block;
    	      width: 20em;
    	      overflow: hidden;
    	  }

    	  span.ivoid {
    	      padding: 2pt;
    	      white-space: nowrap;
    	      background-color: white;
    	  }

        .errmsg {
          border: 2pt solid red;
          padding: 1ex;
        }

    	  span.ivoid-container:hover {
    	      overflow: visible;
    	  }

    	  p.description {
    	      max-width: 20em;
        }

        tr.science {
            background: #AAFFAA;
        }

        tr.calib {
            background: #FFFFAA;
        }

        tr.unknown{
            color: #777777;
        }

        tr.calibration{
            background: #DDDDDD;
        }

        tr.this{
            font-weight: bold;
            background-color: #FFAAAA;
        }

        tr.preview, tr.preview-image {
            background: #FFDDDD;
        }

        tr.access {
            color: #999999;
        }

        form.service-interface {
            margin-top: 3ex;
            max-width: 50em;
            background: #EEEE99;
            border: 2pt solid #DDDD88;
            margin-left:auto;
            margin-right:auto;
            padding-left: 0.5ex;
        }

        div.inputpars div.input {
            border-top: 1pt solid #DDDD88;
            margin-left: 1em;
        }

        .param-name {
            font-weight: bold;
            font-size: 130%;
            margin-left: -1em;
            margin-right: 0.5em;
        }

        .typedesc {
            font-size: 70%;
        }

        .typedesc .low-limit {
            font-size: 100%;
            font-weight: bold;
        }

        .typedesc .high-limit {
            font-size: 100%;
            font-weight: bold;
        }
 
        .pos-canvas {
            position: absolute;
            background-color: none;
            top:0px;
            left: 0px;
            z-index: 10;
        }

        .pos-image {
            position: absolute;
            top: 0px;
            left: 0px;
            z-index: 0;
        }

        .custom-POS {
            position: relative;
        }

        input.generic-input {
            width:20em;
        }

        input.interval-input {
            width:20em;
        }

        /* formatting the javascript-morphed result tree */
        h2.voc-label {
          margin-bottom: 2pt;
          margin-top: 1ex;
          font-size: 120%;
          position: relative;
        }
        p.voc-description {
          margin-top: 0pt;
          margin-top: 0.5ex;
          padding-left: 2em;
          font-style: italic;
        }
        button.toggler {
          position:relative;
          border: 0px solid white;
          padding: 0pt;
          margin-right: 4pt;
          font-size: 140%;
          background-color: #fde;
        }
        .foldable header {
          padding: 3pt;
        }
        .folded {
          border-bottom: 2pt dotted #dab;
        }
        section.foldable {
          background-color: #fde;
          margin-top:0pt;
          padding-bottom:8pt;
        }
        section.foldable ul {
          margin-left: 2em;
          margin-bottom: 0pt;
          list-style-type: none;
        }
        section.foldable ul li {
          background-color: #fef;
          margin-bottom: 8pt;
          margin-right: 8pt;
          padding: 1ex;
        }
        div.child-terms {
          margin-left: 2em;
        }

        li.dl-error {
          border-left: 4pt dotted #f00;
          border-right: 4pt dotted #f00;
          padding: 0pt 4pt;
        }
        ]]>
    	</style>
    	<script type="text/javascript" 
    	  src="/static/js/jquery-gavo.js"/>
      <script type="text/javascript" 
        src="/static/js/samp.js"/>
      <script type="text/javascript"
        src="/static/js/sodapars.js"/>
    	</head>
    	<body>
    	  
    	<div id="aladin-lite-div"
    	  style="width: 100%; height:10cm; display:none">
		  </div>

    	<xsl:apply-templates/>

    	<script type="text/html" id="fancy-band-widget">
        <div class="input custom-BAND">
            <p class="input-header">
                <span class="param-name">Spectral range</span>
                <span class="typedesc">Enter the spectral range you want
                to cut out in your preferred units</span>
            </p>
            <p class="widget">
                <input type="text" name="BAND-low"
                  onchange="update_SODA_widget(this, 'BAND', FROM_SPECTRAL_CONVERSIONS)"/>
                <span class="low-limit">$low_limit</span>
                <input type="text" name="BAND-high"
                  onchange="update_SODA_widget(this, 'BAND', FROM_SPECTRAL_CONVERSIONS)"/>
                <span class="high-limit">$high_limit</span>
                <select name="BAND-unit"
                    onchange="convert_spectral_units(
                      this, $low_limit, $high_limit);
                      update_SODA_widget(this, 'BAND', FROM_SPECTRAL_CONVERSIONS)">
                    <option>m</option>
                    <option>µm</option>
                    <option>Ångström</option>
                    <option>MHz</option>
                    <option>keV</option>
                </select>
            </p>
        </div>
    	</script>

      <!-- a template is for the js-based links browser
      (see _morph_table) -->
    	<script type="text/html" id="links-for-ds">
    	  <section class="morphed-links">
    	  <h1>Links for <span class="ivoid">$ivoid</span></h1>
    	  </section>
    	</script>
      
      <!-- a template for a single term in the js-created links -->
      <script type="text/html" id="term-section">
        <section class="foldable $term">
          <header>
          <h2 class="voc-label">$label</h2>
          <p class="voc-description">$description</p>
          </header>
        </section>
      </script>

      <!-- a template for a single datalink row -->
      <script type="text/html" id="js-datalink">
        <li><a href="$link">$description</a>
        <span class="linksize">$size</span>
        </li>
      </script>

      <!-- a template for a datalink error -->
      <script type="text/html" id="js-datalinkerror">
        <li class="dl-error">$errmsg</li>
      </script>

      <!-- I have no idea why this is, but when I do the following with
      a text/html template, I can't attach event handlers to it.
      Cross browser.  Sigh. -->

      <button id="samp-template" title="Broadcasts the result as a FITS image
          to all connected clients (if you have a WebSAMP-enabled
          hub running" style="display:none">Broadcast dataset via SAMP</button>

    	</body>
    	</html>
    </xsl:template>

</xsl:stylesheet>


<!-- vim:et:sw=2:sta
-->
