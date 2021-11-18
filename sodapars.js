// Javascript for custom widgets for standard SODA parameters, and
// other JS support for the improvised datalink interface.
// See https://github.com/msdemlei/datalink-xslt.git
//
// The needs jquery loaded before it.
//
// Distributed by the GAVO project under Creative Commons CC0,
// see http://creativecommons.org/publicdomain/zero/1.0/


// This may need adaptation on non-DaCHS deploments
const ALADIN_CSS = "/3rdparty/aladin.min.css";
const ALADIN_JS = "/3rdparty/aladin.min.js";
const FOOTPRINT_JS = "/static/js/footprintedit.js";

///////////// Micro templating.  
/// See http://docs.g-vo.org/DaCHS/develNotes.html#built-in-templating
function htmlEscape(str) {
	return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

let renderTemplate = function () {
	var _tmplCache = {};
	let renderTemplate = function (templateId, data) {
		var err = "";
		var func = _tmplCache[templateId];
		if (!func) {
			let str = document.getElementById(templateId).innerHTML;
			let strFunc =
				"let p=[],print=function(){p.push.apply(p,arguments);};"
				+ "with(obj){p.push('"
				+ str.replace(/[\r\t\n]/g, " ")
				.split("'").join("\\'")
				.split("\t").join("'")
				.replace(/\$([a-zA-Z_]+)/g, "',htmlEscape($1),'")
				.replace(/\$!([a-zA-Z_]+)/g, "',$1,'")
				+ "');}return $.trim(p.join(''));";
				func = new Function("obj", strFunc);
				_tmplCache[str] = func;
		}
		return func(data);
	}
	return renderTemplate;
}()


/////////////////// misc. utils

// set the contents of clsid within container to val
function update_class_elements(container, clsid, val) {
	container.find("."+clsid).map(
		function(i, el) {
			$(el).text(val);
		});
}

// update a SODA (interval) widget for par name form a -low/-high/-unit
// split widget.
// soda_name is the name of the SODA parameter to be built.  conversions
// is a mapping going from -unit strings to converter functions to
// the SODA units.
function update_SODA_widget(input, soda_name, conversions) {
	var form = input.form;
	var low_element = form[soda_name+"-low"];
	var high_element = form[soda_name+"-high"];
	var unit_element = form[soda_name+"-unit"];
	var converter = conversions[unit_element.value];

	var low_val = low_element.value;
	if (low_val) {
		low_val = converter(parseFloat(low_val));
	} else {
		low_val = '-Inf';
	}

	var high_val = high_element.value;
	if (high_val) {
		high_val = converter(parseFloat(high_val));
	} else {
		high_val = '+Inf';
	}

	form[soda_name].value = low_val+" "+high_val;
}


/////////////////// Unit conversion

let LIGHT_C = 2.99792458e8;
let PLANCK_H_EV = 4.135667662e-15;

// conversions from meters to
let TO_SPECTRAL_CONVERSIONS = {
	'm': function(val) { return val; },
	'µm': function(val) { return val*1e6; },
	'Ångström': function(val) { return val*1e10; },
	'MHz': function(val) { return LIGHT_C/val*1e-6; },
	'keV': function(val) { return LIGHT_C*PLANCK_H_EV/val*1e-3; }};

// conversions to meters from
let FROM_SPECTRAL_CONVERSIONS = {
	'm': function(val) { return val; },
	'µm': function(val) { return val/1e6; },
	'Ångström': function(val) { return val/1e10; },
	'MHz': function(val) { return LIGHT_C/val/1e-6; },
	'keV': function(val) { return LIGHT_C*PLANCK_H_EV/val/1e-3; }};


// set properly marked up limits.
// this assumes that el is the unit select and the whole widget is
// within a div.
function convert_spectral_units(el, low, high) {
	var converter = TO_SPECTRAL_CONVERSIONS[el.value];
	var input_group = $(el).parents("div").first();
	update_class_elements(input_group, "low-limit", converter(low));
	update_class_elements(input_group, "high-limit", converter(high));
}


/////////////////// Individual widgets

function add_BAND_widget() {
	var old = $(".BAND-m-em_wl");
	old.map(function(index, el) {
		el = $(el);
		var form = el.parents("form");
		var low_limit = parseFloat(el.find(".low-limit").text());
		var high_limit = parseFloat(el.find(".high-limit").text());
		// TODO: validate limits?

		var new_widget = renderTemplate(
			"fancy-band-widget", {
				low_limit: low_limit,
				high_limit: high_limit});
		el.parent().prepend(new_widget);
	});
	old.hide();
}


function _draw_POLYGON_widget(poly_widget) {
	// A callback to draw the aladin light window once the required
	// javascript code is loaded are there

	var new_widget = $('#aladin-lite-div').detach();
	// I'd like to use poly_widget.parent() here, but that silently fails.
	$('div.inputpars').prepend(new_widget);
	new_widget.show();
	new_widget.before("<p>Adjust the cutout region by clicking and dragging"
		+" the handles.");

	var init_vals = $.map(
		poly_widget.find(".high-limit").text().split(" "),
		parseFloat);
	var init_poly = [];
	for (var i=0; i<init_vals.length; i+=2) {
		init_poly.push([init_vals[i], init_vals[i+1]]);
	}
	var input = poly_widget.find("input")

	embed_region_editor(
		document.getElementById("aladin-lite-div"),
		init_poly,
		function(poly) {
			input[0].value = poly.map((p) => p[0]+" "+p[1]).join(" ");
			});
}


function add_POLYGON_widget() {
	// An aladin-light-based widget letting people draw polygons to
	// cut out.  Yes, this is expensive, but it's hard to make something
	// like this with less tooling and JS madness.

	var poly_widget = $(".POLYGON-deg-phys_argArea_obs");
	
	if (poly_widget.length) {
		$("head").append(
			`<link rel='stylesheet' href='${ALADIN_CSS}'`
				+" type='text/css' />");
		$.getScript(ALADIN_JS).done(
		function() {
			$.getScript(FOOTPRINT_JS).done(
				function() {_draw_POLYGON_widget(poly_widget);})
		})
	}
}

// call the various handler functions for known three-factor widgets.
// (this is called from the document's ready handler and thus is the
// main entry point into the magic here)
function add_custom_widgets() {
	add_BAND_widget();
	add_POLYGON_widget();
	// in order to hide the extra inputs from the browser when sending
	// off the form, we need to override the submit action
	$("form.service-interface").bind("submit",
		function(event) {
			event.preventDefault();
			window.open(
				build_result_URL(event.target));
		});
}

//////////////////////////// Semantics/link hierarchy builder

// a datalink row, which is constructed with an HTML TR as produced
// by the XSLT.
// These have a link (the URL), description, semantics, and dsid
// (the ivoid).  Semantics strips a leading hash).
function Datalink(datalink_row) {
	var tds = datalink_row.querySelectorAll("td");

	if (tds.length<3) {
		// this is a malformed line (e.g., the header line).  We'll
		// ignore it
		return null;
	}

	this.link = tds[0].querySelector("a.datalink")?.href;
	this.errmsg = tds[0].querySelector(".errmsg")?.textContent;
	this.size = tds[0].querySelector(".size")?.textContent || "";
	this.description = tds[1].textContent;
	this.dsid = tds[2].querySelector(".ivoid").textContent;

	this.procref = tds[0].querySelector(".procref")?.attributes
		.href.value || null;
	if (this.procref?.startsWith("#")) {
		this.procref = this.procref.slice(1);
	}

	this.semantics = tds[2].querySelector(".semantics").textContent;
	if (this.semantics?.startsWith("#")) {
		this.semantics = this.semantics.slice(1);
	}
}

Datalink.prototype = {
	// renders the datalink container (a jquery object).
	render: function(container) {
		// extra handling for services and errors
		if (this.procref) {
			let dest_el = document.getElementById(this.procref);
			if (dest_el) {
				dest_el.parentElement.removeChild(dest_el);
				container.append($(dest_el));
			} else {
				// the referenced service wasn't rendered into a form.  Let's assume
				// it's something we can't do anyway (such as async datalink) and
				// skip it for now.  TODO: think of something less implicit.
			}

		} else if (this.errmsg) {
			container.append($(renderTemplate("js-datalinkerror", this)));

		} else {
			// default action for "normal" datalinks
			container.append($(renderTemplate("js-datalink", this)));
		}
	},
}


// a container for a node in the link tree.
// These have 
// * semantics ; the root node has semantics null.
// * links (An array of Datalinks for the semantics proper in a list)
// * children (A dict of LinkNodes of narrower resources)
function LinkNode(semantics) {
	this.init(semantics);
}

LinkNode.prototype = {
	init: function(semantics) {
		this.semantics = semantics;
		this.links = [];
		this.children = {};
	},

	// Inserts a datalink into the tree using a "trace", the sequence
	// of node labels from root to the datalink
	insert_by_trace: function(trace, datalink) {
		if (trace.length==0) {
			this.add(datalink);
		} else {
			let child_sem = trace.shift();
			if (! (child_sem in this.children)) {
				this.add(new LinkNode(child_sem));
			}
			this.children[child_sem].insert_by_trace(trace, datalink);
		}
	},

	// add a Datalink or a LinkNode to self.
	add: function(thing) {
		if (thing instanceof LinkNode) {
			this._add_child(thing);
		} else {
			// be lenient in what we accept as a datalink
			this._add_link(thing);
		}
	},

	// adds a representation of self to the jquery container;
	// voc is the desise terms from the governing vocabulary.
	render: function(container, voc) {
		let voc_meta = voc[this.semantics];
		if (!voc_meta) {
			voc_meta = {
				"label": this.semantics, 
				"description": "(not in IVOA datalink core)"}
		}

		let section = $(renderTemplate("term-section", voc_meta));
		container.append(section);

		let links_container = $("<ul class='links-from-js'/>");
		section.append(links_container);
		this.links.forEach(dl => dl.render(links_container));
		
		let child_container = $("<div class='child-terms'/>");
		section.append(child_container);
		for (child in this.children) {
			this.children[child].render(child_container, voc);
		}
	},

	_add_link: function(datalink) {
		if (datalink.semantics!=this.semantics) {
			throw new Error(
				`Cannot add ${datalink.semantics} link to ${this.semantics}`);
		} else {
			this.links.push(datalink);
		}
	},

	_add_child: function(link_node) {
		if (link_node.semantics in this.children) {
			throw Error(`LinkNode for ${link_node.semantics} already present.`);
		} else {
			this.children[link_node.semantics] = link_node;
		}
	},

};


// the root node is rendered differently from other link nodes, and
// its semantics is null (which is forbidden otherwise), so there's
// and extra class for it.
function RootNode() {
	this.init(null);
}

RootNode.prototype = Object.create(LinkNode.prototype);

RootNode.prototype.render = function(container, voc) {
	// We prescribe a sequence for the most common toplevel terms and
	// leave the rest to chance for now
	for (term of [
			"this",
			"preview",
			"proc",
			"documentation",
			"auxiliary",
			"calibration",
			"coderived",
			"counterpart",
			"derviation",
			"progenitor",]) {
		if (term in this.children) {
			this.children[term].render(container, voc);
			delete this.children[term];
		}
	}

	for (child in this.children) {
		this.children[child].render(container, voc);
	}
}


// add an out-of-vocabulary datalink (this should only ever be called on
// the root node).
RootNode.prototype.add_oov = function(dl) {
		if (! (dl.semantics in this.children)) {
			this.children[dl.semantics] = new LinkNode(dl.semantics);
		}
		this.children[dl.semantics].add(dl);
	}



// A container for all links belonging to a Dataset.  These
// these are constructed with the dataset identifier, the organising vocabulary
// (i.e., datalink core for us, most likely), and they contain a link to the
// root LinkNode.
function LinksFor(dsid, vocab) {
	this.dsid = dsid;
	this.vocab = vocab;
	this.root = new RootNode();
}

LinksFor.prototype = {
	// add another datalink for my dataset
	add: function(dl) {
		let sem = this.vocab[dl.semantics];
		if (!sem) {
			// special handling for out-of-vocabulary terms
			this.root.add_oov(dl);
			return;
		}

		// now find a trace to a top-level term...
		let cur_term = dl.semantics;
		let trace = [];
		while (cur_term) {
			trace.push(cur_term);
			cur_term = this.vocab[cur_term].wider?.pop();
		}

		trace.reverse();

		// and have LinksFor sort it in
		this.root.insert_by_trace(trace, dl);
	},

	// renders the links into the jquery container
	render: function(container) {
		let inner = $(renderTemplate("links-for-ds",
			{"ivoid": this.dsid}));
		$(container).append(inner);
		this.root.render(inner, this.vocab);
	}
}


// returns all datalinks in our document as a mapping 
// dsid -> list of datalinks
function get_datalinks() {
	let result = {};
	for (tr of document.querySelectorAll(".links tbody tr")) {
		let dl = new Datalink(tr);
		if (dl.dsid in result) {
			result[dl.dsid].push(dl);
		} else {
			result[dl.dsid] = [dl];
		}
	}
	return result;
}


// asynchronously load the Datalink vocabulary.
// This returns the xhr object; add handlers for the load event as required.
function load_vocabulary() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', "https://ivoa.net/rdf/datalink/core");
	xhr.setRequestHeader("accept", "application/x-desise+json");
	xhr.send();
	return xhr;
}


// morph the links table to our semantics-based tree.
// This is being used as a success handler for vocabulary loading and
// should not called otherwise.
function _morph_table(load_event) {
	let dlcore = JSON.parse(load_event.currentTarget.responseText)["terms"];
	let byds = get_datalinks();

	// make a container for the new, hierarchical links;
	// this will replace the existing flat table at the end of this function.
	var outer_container = document.createElement("div");
	outer_container.id = 'links-container';
	var links_table = document.querySelectorAll("table.links")[0];

	// make trees out of the datalinks and render them
	for (let dsid in byds) {
		let cur_links = new LinksFor(dsid, dlcore);
		for (let dl of byds[dsid]) {
			cur_links.add(dl);
		}
		cur_links.render(outer_container);
	}

	links_table.parentNode.replaceChild(
		outer_container, links_table);

	$(".foldable").each((ind, obj) => make_foldable(obj));
}

// Initiate the morphing of the links table.
// This just fires off the retrieval of the vocabulary, the actual work
// being done in that load's event handler.
function start_table_morphing() {
	load_vocabulary().addEventListener("load", _morph_table);
	// we ignore errors here; this just means the table will stand
	// un-morphed.
}


// helper function for make_foldable
function _toggle_fold(target) {
	let jqt = $(target);
	if (jqt.hasClass("folded")) {
		jqt.children("ul,div").show();
		jqt.removeClass("folded");
		jqt.children("header").find(".toggler").text('▼');
	} else {
		jqt.children("ul,div").hide();
		jqt.addClass("folded");
		jqt.children("header").find(".toggler").text('▶');
	}
}


// furnish a section with a handle to fold it in and out,
// and fold it in.
function make_foldable(section) {
	let toggler = $("<button class='toggler'>▼</span>");
	$(section).find(".voc-label").first().prepend(toggler);
	$(section).children("header").on("click", _ => _toggle_fold(section));

	if (! (
			section.classList.contains("this")
			|| section.classList.contains("proc"))) {
		_toggle_fold(section);
	}
}


//////////////////////////// SAMP interface/result URL building

// The thing sent to the SAMP clients is a URL built from all input
// items that have a soda class.  The stylesheet must arrange it so
// all input/select items generated from the declared service  parameters
// have a soda class.

// return a list of selected items for a selection element for URL inclusion
function get_selected_entries(select_element) {
	var result = new Array();
	var i;

	for (i=0; i<select_element.length; i++) {
		if (select_element.options[i].selected) {
			result.push(select_element.name+"="+encodeURIComponent(
				select_element.options[i].value))
		}
	}
	return result;
}

// return a URL fragment for a form item
function make_query_item(form_element, index) {
	var val = "";

	if (! $(form_element).hasClass("soda")) {
		return;
	}
	switch (form_element.nodeName.toUpperCase()) {
		case "INPUT":
		case "TEXTAREA":
			if (form_element.type=="radio" || form_element.type=="checkbox") {
				if (form_element.checked) {
					val = form_element.name+"="+encodeURIComponent(form_element.value);
				}
			} else if (form_element.name && form_element.value) {
				val = form_element.name+"="+encodeURIComponent(form_element.value);
			}
			break;
		case "SELECT":
			return get_selected_entries(form_element).join("&");
			break;
	}
	return val;
}


// return the URL that sending off cur_form would retrieve
function build_result_URL(cur_form) {
	var fragments = $.map(cur_form.elements, make_query_item);
	dest_url = cur_form.getAttribute("action")+"?"+fragments.join("&");
	return dest_url;
}


// send the current selection as a FITS image
function send_SAMP(conn, cur_form) {
	var msg = new samp.Message("image.load.fits", {
		"url": build_result_URL(cur_form),
		"name": "SODA result"});
	conn.notifyAll([msg]);
}

function completeURL(uriOrPath) {
	if (uriOrPath[0]=="/") {
		return window.location.protocol+"//"+window.location.host+uriOrPath;
	}
	return uriOrPath;
}

// return the callback for a successful hub connection
// (which disables-re-registration and sends out the image link)
function _make_SAMP_success_handler(samp_button, cur_form) {
	return function(conn) {
		conn.declareMetadata([{
			"samp.description": "SODA processed data from"+document.URL,
			"samp.icon.url": completeURL("/favicon.png")
		}]);

		// set the button up so clicks send again without reconnection.
		$(samp_button).unbind("click");
		$(samp_button).click(function(e) {
			e.preventDefault();
			send_SAMP(conn, cur_form);
		});

		// make sure we unregister when the user leaves the page
		$(window).on("unload", function() {
			conn.unregister();
		});

		// send the stuff once (since the connection has been established
		// in response to a click alread)
		send_SAMP(conn, cur_form);
	};
}

// connect to a SAMP hub and, when the connection is established,
// send the current cutout result.
function connect_and_send_SAMP(samp_button, cur_form) {
	samp.register("SODA processor",
		_make_SAMP_success_handler(samp_button, cur_form),
				function(err) {
					alert("Could not connect to SAMP hub: "+err);
				}
			);
		}


// create a samp sending button in a SODA form
function enable_SAMP_on_form(index, cur_form) {
	try {
		var samp_button = $("#samp-template").clone()[0]
		$(samp_button).show()
		$(samp_button).attr({"id": ""});
		$(cur_form).prepend(samp_button);
		$(samp_button).click(function (e) {
			e.preventDefault();
			connect_and_send_SAMP(samp_button, cur_form);
		});
	} catch (e) {
		throw(e);
		// we don't care if there's no SAMP.  Log something?
	}
}

// enable SAMP sending for all forms that look promising
function enable_SAMP() {
	$("form.service-interface").each(enable_SAMP_on_form);
}

$(document).ready(add_custom_widgets);
$(document).ready(enable_SAMP);
$(document).ready(start_table_morphing);
