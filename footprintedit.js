// A javascript region editor, inspired by
// https://github.com/lmichel/sky-region-editor
//
// Distributed by the GAVO project under Creative Commons CC0,
// see http://creativecommons.org/publicdomain/zero/1.0/
//
// Usage:
// 
// Make a div styled according to your needs, pull in aladin lite
// and then arrange for this to be called:
//
// addEventListener("load", function() {
//		embed_region_editor(document.getElementById("regionedit"),
//			init_poly,
//			function(poly) { do-whatever-updating-you-need });
// });
//
// The initial polygon needs to be an array of ICRS [ra, dec] arrays,
// and the updated arrays are passed in in the same way.


// furnish coo with a method to re-normalise after futzing around
// with its unit sphere coordinates.
Coo.prototype.normalize = function() {
	var current_length = Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
	this.x /= current_length;
	this.y /= current_length;
	this.z /= current_length;
}
	

var _GEO = {
	// returns the minimal distance between a 2-array point
	// and a line between two points.
	euclid_dist_line: function(p, l1, l2) {
		return Math.abs(
				(l2[0]-l1[0])*(l1[1]-p[1])-(l1[0]-p[0])*(l2[1]-l1[1]))
			/Math.sqrt((l2[0]-l1[0])**2+(l2[1]-l1[1])**2)
	},

	// return the sum for item[index] for all items in arr
	_sum_over: function(arr, index)  {
		var sum = 0;
		for (var i=0; i<arr.length; i++) {
			sum += arr[i][index];
		}
		return sum;
	},

	// return {ra: .., dec: .., size: ..} for a view enclosing a spherical
	// polygon enclosing an array of [ra, dec] points (this is mostly due 
	// to Laurent)
	get_enclosing_view: function(points) {
		// we do our computations in unit sphere coordinates
		var vertices = points.map((p) => new Coo(p[0], p[1], 8));

		// the we compute the center as the mean of the of the vertices
		// (which can break in so many ways; let's say: we only deal
		// with smallish, well-behaved polygons here).
		var center = new Coo();
		center.x = _GEO._sum_over(vertices, "x")*1./vertices.length;
		center.y = _GEO._sum_over(vertices, "y")*1./vertices.length;
		center.z = _GEO._sum_over(vertices, "z")*1./vertices.length;
		center.normalize();
		center.computeLonLat()

		// center.ra, center.dec is now the center of the polygon (in
		// some sense).  The view size is twice the largest distance
		// of our polygon points from this.
		var view_radius = 0.001; // I claim that's a sane minimum
		vertices.forEach((p) => {
			view_radius = Math.max(view_radius, center.distance(p));});
		
		return {
			ra: center.lon,
			dec: center.lat,
			size: view_radius*2};
	}
}

function AladinWithFootprint(container, footprint, change_callback) {
	// The actual region editor, with is aladin lite with the footprint
	// and an editable overlay.
	//
	// footprint is a sequence of 2-arrays containing ICRS world
	// coordinates; it will be marked on the aladin display as
	// an indication where the polygon can possibly be drawn.
	// It doubles as an initial polygon.

	this.init(container, footprint, change_callback);
}

AladinWithFootprint.prototype = {
	// the constructor
	init: function(container, footprint, change_callback) {
		// the basic footprint
		this.footprint = footprint;
		// the currently selected polygon, initially the footprint
		this.polygon = footprint.slice();
		// the element embedding Aladin lite, a plain DOM element.
		this.container = container;
		// pixel radius of our handles
		this.handle_radius = 15;

		this.aladin = A.aladin($(this.container), {
			showControl: true, 
			cooFrame: "ICRS", 
			survey: "P/DSS2/color", 
			showFullscreenControl: false, 
			showFrame: false, 
			showGotoControl: false});

		this.eventSource = this.aladin.view.reticleCanvas;
	
		var init_view = _GEO.get_enclosing_view(footprint);
		this.aladin.gotoRaDec(init_view.ra, init_view.dec);
		// For when Aladin isn't square, fudge view size with the aspect
		// ratio
		var aspect = container.offsetWidth/container.offsetHeight;
		if (aspect<1) {
			aspect = 1./aspect;
		}
		this.aladin.setFov(init_view.size*aspect);
		this.add_footprint_overlay();
		this.add_polygon_overlay();

		// on click and hold, see if it's on one of our handles and 
		// start dragging if so.  Pass on to aladin otherwise
		this.eventSource.addEventListener("mousedown",
			(ev) => {
				var bounds = this.container.getBoundingClientRect();
				var index_clicked = this.get_poly_index(
					ev.clientX-bounds.x, ev.clientY-bounds.y);
				if (index_clicked!=null) {
					ev.preventDefault();
					ev.stopPropagation();
					// turn off AL's dragging
					this.aladin.view.dragging = false;
					
					this.start_dragging(index_clicked, change_callback);
				}
			});
	},

	// close a polygon defined by its vertices
	close_poly: function(vert_list) {
		var closed = vert_list.slice();
		closed.push(vert_list[0]);
		return closed;
	},

	// return a handle close to the canvas coordinates x, y, null if there
	// is none
	get_poly_index: function(x, y) {
		for (index=0; index<this.polygon.length; index++) {
			var pt = this.polygon[index];
			var pc = this.aladin.world2pix(pt[0], pt[1]);
			var dist = AstroMath.hypot(x-pc[0], y-pc[1]);
			if (dist<=this.handle_radius*1.1) {
				return index;
			}
		}
		return null;
	},

	// set things up so the polygon vertex poly_index is being dragged
	// as the mouse moves.
	start_dragging: function(poly_index, change_callback) {
		if (this.dragging_now) {
			return;
		}
		this.dragging_now = true;

		var bounds = this.container.getBoundingClientRect();
		var root_x = bounds.x;
		var root_y = bounds.y;
		var self = this;

		var move_listener = (ev) => {
			ev.preventDefault();
			ev.stopPropagation();

			var new_pos = self.aladin.pix2world(
				ev.clientX-root_x, ev.clientY-root_y);
			self.polygon[poly_index] = new_pos;
			self.update_polygon_overlay();
		};

		var finisher = (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
		
			self.eventSource.removeEventListener("mousemove", move_listener);
			self.eventSource.removeEventListener("mouseup", finisher);
			self.dragging_now = false;

			if (change_callback) {
				change_callback(this.polygon);
			}
		};

		this.eventSource.addEventListener("mousemove", move_listener);
		this.eventSource.addEventListener("mouseup", finisher);
	},

	// add the basic footprint as an overlay
	add_footprint_overlay: function() {
		var footprint_overlay = A.graphicOverlay({color: 'blue'});
		this.aladin.addOverlay(footprint_overlay);
		footprint_overlay.add(A.polyline(
			this.close_poly(this.footprint)));
	},

	// add the overlay for the editable polygon (and another one for
	// the draggable handles
	add_polygon_overlay: function() {
		this.polygon_overlay = A.graphicOverlay({color: 'red'});
		this.aladin.addOverlay(this.polygon_overlay);

		this.handle_overlay = A.catalog({
			name: "Polygon handles",
			shape: "circle", 
			sourceSize: self.handle_radius, 
			color: "red"});
		this.aladin.addCatalog(this.handle_overlay);

		this.update_polygon_overlay();
	},

	// update the polygon and the handles after the polygon has been
	// changed.
	update_polygon_overlay: function() {
		this.polygon_overlay.removeAll();
		this.handle_overlay.removeAll();

		this.polygon_overlay.add(
			A.polyline(
				this.close_poly(this.polygon)));

		for (var i=0; i<this.polygon.length; i++) {
			var marker = A.source(
				this.polygon[i][0], this.polygon[i][1],
				{"index": i});
			this.handle_overlay.addSources([marker]);
		}
	},

	// return a world coordinate sequence as pixel coordinates using
	// the current aladin view
	to_pixel_coordinates: function(world_points) {
		var a = this.aladin;
		return world_points.map(function(p) {
			return a.world2pix(p[0], p[1]);
		});
	}
};

// our API function: Embed the region editor in the DOM element container,
// starting with footprint, calling change_callback whenever
// the polygon is edited.
function embed_region_editor(container, footprint, change_callback) {
	var awf = new AladinWithFootprint(container, footprint, change_callback);
}
