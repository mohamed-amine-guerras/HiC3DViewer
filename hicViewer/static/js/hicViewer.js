/**
 * Created by Mohamed Nadhir Djekidel on 10/10/14.
 */


if (typeof jQuery === 'undefined') { throw new Error('jQuery is requird') }


var hicView = function(container_id) {

    this.container = $('#' + container_id);

    this.container.ratio = this.container.width() / this.container.height();

    this.camera = new THREE.PerspectiveCamera(20, this.container.ratio, 1, 800);
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
		canvas: this.container.get(0),
        antialias: true
    });

    this.renderer.setSize(this.container.width(), this.container.height() );
    this.renderer.sortObjects = false;


    //this.scene.add(this.camera);
    this.camera.position.z = -150;

    //this.container.append(this.renderer.domElement);
    this.controls = new THREE.OrbitControls(this.camera);
	//this.controls.addEventListener('change', ctrlRender);
	//var me = this;
	//function ctrlRender(){
	//	me.render();
	//}

    this.col = ["#1f78b4", "#a6cee3", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928",
             "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];

    this.chromosomes = []; // will contain the chromosomes
	this.chrVisible = []; // a logical vector indicating which chromosomes are visible
	this.chrColor = []; // a vector indicating the color of each chromosome

    this.genome ='';
	this.gui = null;

    // TODO: remove the un-unsed ones after
    this.sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
	this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1);
	this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	this.sphereRadius = 1.5;
	this.cylinderRadius = 0.4;
	this.linewidth = 2;
	this.curveWidth = 3;
	this.helixSheetWidth = 1.3;
	this.coilWidth = 0.3;
	this.thickness = 0.4;
	this.axisDIV = 5; // 3
	this.strandDIV = 6;
	this.tubeDIV = 8;



    // Modal window
    // inspired from // http://bootsnipp.com/snippets/featured/quotwaiting-forquot-modal-dialog
    this.waitingDialog = (function ($) {

    // Creating modal dialog's DOM
	var $dialog = $(
		'<div class="modal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" role="dialog" aria-hidden="true" style="padding-top:15%; overflow-y:visible;">' +
		'<div class="modal-dialog modal-m">' +
		'<div class="modal-content">' +
            '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
                '<div class="modal-title"><h5 style="margin:0;"></h5></div>' +
            '</div>' +
			'<div class="modal-body">' +
                '<p class="message">processing</p>' +
				'<div class="progress progress-striped active" style="margin-bottom:0;"><div class="progress-bar" style="width: 100%"></div></div>' +
			'</div>' +
            '<div class="modal-footer">' +
                '<button type="button" class="btn btn-primary modal-btn hide" data-dismiss="modal">OK</button>' +
            '</div>' +
		'</div></div></div>');

	return {
		/**
		 * Opens our dialog
		 * @param message Custom message
		 * @param options Custom options:
		 * 				  options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
		 * 				  options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
         * 				  options.hasbtn -  shows a modal window with a button and without a process bar.
		 */
		show: function (message,title, options) {
			// Assigning defaults
			var settings = $.extend({
				dialogSize: 'm',
				progressType: '',
                hasbtn : false

			}, options);

			if (typeof message === 'undefined') {
				message = 'Loading';
			}

            if(typeof title == 'undefinded'){
                title="Notification"
            }
			if (typeof options === 'undefined') {
				options = {};
			}
			// Configuring dialog
			$dialog.find('.modal-dialog').attr('class', 'modal-dialog').addClass('modal-' + settings.dialogSize);

			$dialog.find('.progress-bar').attr('class', 'progress-bar');
			if (settings.progressType) {
				$dialog.find('.progress-bar').addClass('progress-bar-' + settings.progressType);
			}
            //set title
			$dialog.find('.modal-header > .modal-title > h5').text(title);
            //set message
            $dialog.find(".message").text(message);

            if(settings.hasbtn == true) {
                     //hide the progress and show the button
                     $dialog.find('.progress').addClass("hide");
                     $dialog.find(".modal-btn").removeClass("hide");
                }
                else{
                    //show the progress and hide the button
                    $dialog.find('.progress').removeClass("hide");
                    $dialog.find(".modal-btn").addClass("hide");
                }
			// Opening dialog
			$dialog.modal();
		},
		/**
		 * Closes dialog
		 */
		hide: function () {
			$dialog.modal('hide');
		}
	}

    })(jQuery);

	/*
	var me = this;
	this.container.bind('contextmenu', function (e) {
		e.preventDefault();
	});
	this.container.bind('mouseup touchend', function (e) {
		me.isDragging = false;
	});
	this.container.bind('mousedown touchstart', function (e) {
		e.preventDefault();
		if (!me.scene) return;
		var x = e.pageX, y = e.pageY;
		if (e.originalEvent.targetTouches && e.originalEvent.targetTouches[0]) {
			x = e.originalEvent.targetTouches[0].pageX;
			y = e.originalEvent.targetTouches[0].pageY;
		}
		me.isDragging = true;
		me.mouseButton = e.which;
		me.mouseStartX = x;
		me.mouseStartY = y;
		me.cq = me.rot.quaternion.clone();
		me.cz = me.rot.position.z;
		me.cp = me.mdl.position.clone();
		me.cslabNear = me.slabNear;
		me.cslabFar = me.slabFar;

	});

	this.container.bind('mousemove touchmove', function (e) {
		e.preventDefault();
		if (!me.scene) return;
		if (!me.isDragging) return;
		var x = e.pageX, y = e.pageY;
		if (e.originalEvent.targetTouches && e.originalEvent.targetTouches[0]) {
			x = e.originalEvent.targetTouches[0].pageX;
			y = e.originalEvent.targetTouches[0].pageY;
		}
		var dx = (x - me.mouseStartX) * me.container.widthInv;
		var dy = (y - me.mouseStartY) * me.container.heightInv;
		if (!dx && !dy) return;

		var r = Math.sqrt(dx * dx + dy * dy);
		var rs = Math.sin(r * Math.PI) / r;
		me.rot.quaternion.set(1, 0, 0, 0).multiply(new THREE.Quaternion(Math.cos(r * Math.PI), 0, rs * dx, rs * dy)).multiply(me.cq);

		me.render();
	});

	this.container.bind('mousewheel', function (e) {
		e.preventDefault();
		if (!me.scene) return;
		me.rot.position.z -= e.originalEvent.wheelDelta * 0.025;
		me.render();
	});
	this.container.bind('DOMMouseScroll', function (e) {
		e.preventDefault();
		if (!me.scene) return;
		me.rot.position.z += e.originalEvent.detail;
		me.render();
	});
	*/
}


hicView.prototype = {
	constructor : hicView,

	/******************************************************
    ** Display the information panel
    **
    ** Input: chrInfo: list of visible chromosomes
    **        chrColors: the color of each chromosome
    **
    *******************************************************/
    displayGui : function(chrInfo, chrColors) {

        if (this.gui == null)
            this.gui = new dat.GUI()
        else
            this.clearGui();


        var otherParams = {
            'x': false,
            'y': false,
            'z': false,
            'trans-interactions': false,
            'v': '...',
            'display all': true
        };

        this.gui.add(otherParams, "display all")
         .onChange(function (value) {
             for (var i = 0; i < gui.__folders['Chromosomes visibility'].__controllers.length; i++) {
                 chrInfo[Object.keys(chrColors)[i]] = value;
                 var pos = parseInt(Object.keys(chrColors)[i].replace(/chr/, ''), 10);
                 this.chromosomes[pos].visible = value
                 this.gui.__folders['Chromosomes visibility'].__controllers[i].updateDisplay();
             }
         })

        // Add the chromosome visibility folder
        var chrFolder = this.gui.addFolder("Chromosomes visibility");

        for (var i = 0; i < Object.keys(chrInfo).length; i++) {
            var chr = chrFolder.add(chrInfo, Object.keys(chrInfo)[i]).listen();
            chr.onChange(function (value) {
                    var pos = parseInt(this.property.replace(/chr/, ''), 10);
					//TODO: Go through all the atoms of the same chromosome and hide them
					alert("FixMe","Go Through all the atoms of the same chromosome and hide them");
                    //groups[pos].visible = value;
                });
        }

        chrFolder.open();

        // Add the color manipulation folder
        var colFolder = this.gui.addFolder("chromosomes color");

        for (var i = 0; i < Object.keys(chrColors).length; i++) {
            colFolder.addColor(chrColors, Object.keys(chrColors)[i])
                .onChange(function (value) {
                    var pos = parseInt(this.property.replace(/chr/, ''), 10);
					//TODO: Go through all the atoms of the same chromosome and re-color them
					alert("Erro","Go through all the atoms of the same chromosome and re-color them")
                    /*if (doMerge) {
                        groups[pos].material.color.setHex(value.replace("#", "0x"));
                    }*/
                });
        }
        colFolder.open();



        var rotateFolder = this.gui.addFolder("Rotate");
        rotateFolder.add(otherParams, 'x')
            .onChange(function (value) {
                rotateX = value;
            });
        rotateFolder.add(otherParams, 'y')
            .onChange(function (value) {
                rotateY = value;
            });

        rotateFolder.add(otherParams, 'z')
            .onChange(function (value) {
                rotateZ = value;
            });

        // add the trans-interaction option
        this.gui.add(otherParams, 'trans-interactions')
            .onChange(function (value) {
                // if we have already loaded some trans-interactions then we just play on
                // their visibility
                if (transLines instanceof THREE.Object3D) {
                    transLines.visible = value;
                } else {
                    $.getJSON('/getInter', function (data) {
                        if (Object.keys(data).length > 0) {
                            transLines = new THREE.Object3D();
                            for (var i = 0; i < Object.keys(data).length; i++) {
                                this.displayInteractions(data[i].chr1, data[i].chr2, data[i].pos1, data[i].pos2, data[i].freq);
                            }
                        }
                        this.scene.add(transLines)
                    });
                }
            });

        // add the cis-interaction option
        this.gui.add(otherParams, 'v', Object.keys(chrColors)).name("cis interactions")
            .onChange(function (value) {
                var chr = parseInt(value.replace(/chr/, ''), 10);
                $.getJSON('/getIntra/' + chr, function (data) {
                    if (Object.keys(data).length > 0) {

                        if (lines) {
                            this.scene.remove(lines)
                        }

                        lines = new THREE.Object3D();
                        for (var i = 0; i < Object.keys(data).length; i++) {
                            var chr = Object.keys(data)[i];
                            var chrInfo = data[chr];
                            for (var node = 1; node < Object.keys(chrInfo).length; node++) {
                                //for (var node = 0; node < 10; node++) {
                                this.displayInteractions(chr, chr, chrInfo[node].pos1, chrInfo[node].pos2, chrInfo[node].freq);
                            }
                        }
                    }
                    this.scene.add(lines)
                });
            });

        this.gui.open();
    },

	displayInteractions : function (chr1, chr2, pos1, pos2, freq) {

        var point1 = new THREE.Vector3(chromosomes[chr1][pos1].x + 2, chromosomes[chr1][pos1].y + 2, chromosomes[chr1][pos1].z + 2);
        var point2 = new THREE.Vector3(chromosomes[chr2][pos2].x + 2, chromosomes[chr2][pos2].y + 2, chromosomes[chr2][pos2].z + 2);
        var geometry = new THREE.Geometry();
        opacity = (freq > 300) ? 1 : (0.3 + (freq * 0.7) / 300);

        var material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 5 * opacity
        });
        geometry.vertices = [point1, point2];
        line = new THREE.Line(geometry, material);

        // check if it is a trans- or cis- interaction
        if (chr1 == chr2) {
            lines.add(line);
        } else {
            transLines.add(line);
        }
    },

	clearScene : function ( ) {

		this.scene = new THREE.Scene();

		// add light to the scene :)
		var directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
		directionalLight.position.set(0.2, 0.2, -1).normalize();
		var ambientLight = new THREE.AmbientLight(0x505050);

		this.scene.add(directionalLight);
		this.scene.add(ambientLight);

		var light = new THREE.SpotLight( 0xffffff, 1.5 );
		light.position.set( 0, 500, 2000 );
		light.castShadow = true;

		light.shadowCameraNear = 200;
		light.shadowCameraFar = this.camera.far;
		light.shadowCameraFov = 50;

		light.shadowBias = -0.00022;
		light.shadowDarkness = 0.5;

		light.shadowMapWidth = 2048;
		light.shadowMapHeight = 2048;

		this.scene.add( light );

		var mp = this.mdl ? this.mdl.position : new THREE.Vector3();
		var rz = this.rot ? this.rot.position.z : 0;
		var rq = this.rot ? this.rot.quaternion : new THREE.Quaternion();
		this.mdl = new THREE.Object3D();
		this.mdl.position.copy(mp);
		this.rot = new THREE.Object3D();
		this.rot.position.z = rz;
		this.rot.quaternion.copy(rq);
		this.rot.add(this.mdl);
		this.scene.add(this.rot);
    },

    clearGui : function ( ) {
        var i;

        // Remove folders
        for (var p in this.gui.__folders) {
            if (this.gui.__folders.hasOwnProperty(p)) {
                var folder = this.gui.__folders[p];
                folder.close();
                this.gui.__ul.removeChild(folder.domElement.parentNode);
                delete this.gui.__folders[p];
            }
        }

        // Remove controlls

        for (i = 0; i < this.gui.__controllers.length; i++) {
            this.gui.__ul.removeChild(this.gui.__controllers[i].__li);
        }
        this.gui.__controllers = [];

        // resize
        this.gui.onResize();
    },

	createSphere: function (atom, defaultRadius, forceDefault, scale) {
		var mesh = new THREE.Mesh(this.sphereGeometry, new THREE.MeshLambertMaterial({ color: atom.color }));
		//mesh.scale.x = mesh.scale.y = mesh.scale.z = forceDefault ? defaultRadius : (this.vdwRadii[atom.elem] || defaultRadius) * (scale ? scale : 1);
		mesh.position.copy(atom.coord);
		this.mdl.add(mesh);
	},

	createCube: function (atom, defaultRadius, forceDefault, scale) {
		var mesh = new THREE.Mesh(this.cubeGeometry, new THREE.MeshLambertMaterial({ color: atom.color }));
		//mesh.scale.x = mesh.scale.y = mesh.scale.z = forceDefault ? defaultRadius : (this.vdwRadii[atom.elem] || defaultRadius) * (scale ? scale : 1);
		mesh.position.copy(atom.coord);
		this.mdl.add(mesh);
	},

	createSpline : function(atoms, width){

		var points  = Array();
		var colors = Array();
		for(var atom  in atoms){
			points.push(atom.coord);
			colors.push(atom.color);
		}

		var spline = new THREE.Spline(points);

		var geom = new THREE.Geometry();
		geom.vertices = spline.points;
		geom.colors = colors;

		var material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity :1, linewidth: width,
			                                          vertexColors: THREE.VertexColors })

		var mesh = new THREE.Line(geom, material );
		this.mdl.add(mesh);
	},
	createCylinder: function (p0, p1, radius, color) {
		var mesh = new THREE.Mesh(this.cylinderGeometry, new THREE.MeshLambertMaterial({ color: color }));
		mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
		mesh.matrixAutoUpdate = false;
		mesh.lookAt(p0);
		mesh.updateMatrix();
		mesh.matrix.multiply(new THREE.Matrix4().makeScale(radius, radius, p0.distanceTo(p1))).multiply(new THREE.Matrix4().makeRotationX(Math.PI * 0.5));
		this.mdl.add(mesh);
	},

	createRepresentationSub: function (atoms, f0, f01) {
		var ged = new THREE.Geometry();
		for (var i=0; i <atoms.length; i++) {
			var atom0 = atoms[i];
			f0 && f0(atom0); // add points
			if(false){
			//if(i+1 < atoms.length){
				var atom1 = atoms[i+1];
				f01 && f01(atom0, atom1);
			}
		}
	},


	createStickRepresentation: function (chromosomes, atomR, bondR, scale) {
		var me = this;

		for(var chr in chromosomes){
			var atoms = chromosomes[chr];
			// Call createRepresentationSub with the 1st function to create sphere
			// The 2nd to create cylinders
			this.createRepresentationSub(atoms, function (atom0) {
				me.createSphere(atom0, atomR, !scale, scale);
			}, function (atom0, atom1) {
				if (atom0.color === atom1.color) {
					// create a cylinder connecting the two atoms
					me.createCylinder(atom0.coord, atom1.coord, bondR, atom0.color);
				} else {
					// if we are at the e
					var mp = atom0.coord.clone().add(atom1.coord).multiplyScalar(0.5);
					me.createCylinder(atom0.coord, mp, bondR, atom0.color);
					me.createCylinder(atom1.coord, mp, bondR, atom1.color);
				}
			});
		}

	},

	createCubeRepresentation: function (chromosomes, atomR, bondR, scale) {
		var me = this;

		for(var chr in chromosomes){
			var atoms = chromosomes[chr];
			// Call createRepresentationSub with the 1st function to create sphere
			// The 2nd to create cylinders
			this.createRepresentationSub(atoms, function (atom0) {
				me.createCube(atom0, atomR, !scale, scale);
			}, function (atom0, atom1) {
				if (atom0.color === atom1.color) {
					// create a cylinder connecting the two atoms
					me.createCylinder(atom0.coord, atom1.coord, bondR, atom0.color);
				} else {
					// if we are at the e
					var mp = atom0.coord.clone().add(atom1.coord).multiplyScalar(0.5);
					me.createCylinder(atom0.coord, mp, bondR, atom0.color);
					me.createCylinder(atom1.coord, mp, bondR, atom1.color);
				}
			});
		}

	},

	createSplineRepresentation : function(chromosomes){
		for(var chr in chromosomes){
			var atoms = chromosomes[chr];
			this.createSpline(atoms, 3);
		}
	},


	createStrip: function (p0, p1, colors, div, thickness) {
		if (p0.length < 2) return;
		div = div || this.axisDIV;
		p0 = this.subdivide(p0, div);
		p1 = this.subdivide(p1, div);
		var geo = new THREE.Geometry();
		var vs = geo.vertices, fs = geo.faces;
		var axis, p0v, p1v, a0v, a1v;
		for (var i = 0, lim = p0.length; i < lim; ++i) {
			vs.push(p0v = p0[i]); // 0
			vs.push(p0v); // 1
			vs.push(p1v = p1[i]); // 2
			vs.push(p1v); // 3
			if (i < lim - 1) {
				axis = p1[i].clone().sub(p0[i]).cross(p0[i + 1].clone().sub(p0[i])).normalize().multiplyScalar(thickness);
			}
			vs.push(a0v = p0[i].clone().add(axis)); // 4
			vs.push(a0v); // 5
			vs.push(a1v = p1[i].clone().add(axis)); // 6
			vs.push(a1v); // 7
		}
		var faces = [[0, 2, -6, -8], [-4, -2, 6, 4], [7, 3, -5, -1], [-3, -7, 1, 5]];
		for (var i = 1, lim = p0.length, divInv = 1 / div; i < lim; ++i) {
			var offset = 8 * i, color = new THREE.Color(colors[Math.round((i - 1) * divInv)]);
			for (var j = 0; j < 4; ++j) {
				fs.push(new THREE.Face3(offset + faces[j][0], offset + faces[j][1], offset + faces[j][2], undefined, color));
				fs.push(new THREE.Face3(offset + faces[j][3], offset + faces[j][0], offset + faces[j][2], undefined, color));
			}
		}
		var vsize = vs.length - 8; // Cap
		for (var i = 0; i < 4; ++i) {
			vs.push(vs[i * 2]);
			vs.push(vs[vsize + i * 2]);
		};
		vsize += 8;
		fs.push(new THREE.Face3(vsize, vsize + 2, vsize + 6, undefined, fs[0].color));
		fs.push(new THREE.Face3(vsize + 4, vsize, vsize + 6, undefined, fs[0].color));
		fs.push(new THREE.Face3(vsize + 1, vsize + 5, vsize + 7, undefined, fs[fs.length - 3].color));
		fs.push(new THREE.Face3(vsize + 3, vsize + 1, vsize + 7, undefined, fs[fs.length - 3].color));
		geo.computeFaceNormals();
		geo.computeVertexNormals(false);
		this.mdl.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: THREE.FaceColors, side: THREE.DoubleSide })));
	},

	subdivide: function (_points, DIV) { // Catmull-Rom subdivision
		var ret = [];
		var points = new Array(); // Smoothing test
		points.push(_points[0]);
		for (var i = 1, lim = _points.length - 1; i < lim; ++i) {
			var p0 = _points[i], p1 = _points[i + 1];
			points.push(p0.smoothen ? p0.clone().add(p1).multiplyScalar(0.5) : p0);
		}
		points.push(_points[_points.length - 1]);
		for (var i = -1, size = points.length, DIVINV = 1 / DIV; i <= size - 3; ++i) {
			var p0 = points[i == -1 ? 0 : i];
			var p1 = points[i + 1], p2 = points[i + 2];
			var p3 = points[i == size - 3 ? size - 1 : i + 3];
			var v0 = p2.clone().sub(p0).multiplyScalar(0.5);
			var v1 = p3.clone().sub(p1).multiplyScalar(0.5);
			for (var j = 0; j < DIV; ++j) {
				var t = DIVINV * j;
				var x = p1.x + t * v0.x
						 + t * t * (-3 * p1.x + 3 * p2.x - 2 * v0.x - v1.x)
						 + t * t * t * (2 * p1.x - 2 * p2.x + v0.x + v1.x);
				var y = p1.y + t * v0.y
						 + t * t * (-3 * p1.y + 3 * p2.y - 2 * v0.y - v1.y)
						 + t * t * t * (2 * p1.y - 2 * p2.y + v0.y + v1.y);
				var z = p1.z + t * v0.z
						 + t * t * (-3 * p1.z + 3 * p2.z - 2 * v0.z - v1.z)
						 + t * t * t * (2 * p1.z - 2 * p2.z + v0.z + v1.z);
				ret.push(new THREE.Vector3(x, y, z));
			}
		}
		ret.push(points[points.length - 1]);
		return ret;
	},

	createCurveSub: function (_points, width, colors, div) {
		if (_points.length == 0) return;
		div = div || 5;
		var points = this.subdivide(_points, div);
		var geo = new THREE.Geometry();
		for (var i = 0, divInv = 1 / div; i < points.length; ++i) {
			geo.vertices.push(points[i]);
			geo.colors.push(new THREE.Color(colors[i == 0 ? 0 : Math.round((i - 1) * divInv)]));
		}

		this.mdl.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ linewidth: width, vertexColors: true }), THREE.LineStrip));
	},


	createStrand: function (num, div, fill, coilWidth, helixSheetWidth, doNotSmoothen, thickness) {
		num = num || this.strandDIV;
		div = div || this.axisDIV;
		coilWidth = coilWidth || this.coilWidth;
		doNotSmoothen = doNotSmoothen || false;
		helixSheetWidth = helixSheetWidth || this.helixSheetWidth;
		var points = {}; for (var k = 0; k < num; ++k) points[k] = [];
		var colors = [];
		var currentCA;
		var prevCO = null;

		for(var chr in this.chromosomes){
			var atoms = this.chromosomes[chr];

			for (var i = 0; i < atoms.length; i++) {
				var atom = atoms[i];
				if (i == 0) {
					currentCA = atom.coord;
					colors.push(atom.color);

				}
				else{
					var O = atom.coord.clone();
					O.sub(currentCA);
					O.normalize(); // can be omitted for performance
					O.multiplyScalar(coilWidth);
					if (prevCO != undefined && O.dot(prevCO) < 0) O.negate();
					prevCO = O;

					for (var j = 0, numM1Inv2 = 2 / (num - 1); j < num; ++j) {
						var delta = -1 + numM1Inv2 * j;
						var v = new THREE.Vector3(currentCA.x + prevCO.x * delta, currentCA.y + prevCO.y * delta, currentCA.z + prevCO.z * delta);
						//if (!doNotSmoothen ) v.smoothen = true;
						points[j].push(v);
					}
				}
			} // for atoms

			//*** draw the actual chromosome ***

			for (var j = 0; !thickness && j < num; ++j)
						this.createCurveSub(points[j], 1, colors, div);

			if (fill) this.createStrip(points[0], points[num - 1], colors, div, thickness);
			var points = {}; for (var k = 0; k < num; ++k) points[k] = [];
			colors = [];
			prevCO = null;

		} // for chromosomes
	},

	displayChromosomes : function (chrs){

		this.chromosomes = Array(Object.keys(chrs).length);
		this.clearScene();

		var pmin = new THREE.Vector3( 9999, 9999, 9999);
		var pmax = new THREE.Vector3(-9999,-9999,-9999);
		var psum = new THREE.Vector3();
		var cnt = 0;

		// Parse the data
		for (var chr in chrs) {

			var chrName = 'chr' + chr;
			this.chrVisible[chrName] = true;
            this.chrColor[chrName] = this.col[chr];
			this.chromosomes[chr] = new Array();
			for (var i = 0; i < chrs[chr].length; i++) {
				var datum = chrs[chr][i];
				var atom  = {
					color : this.col[chr],
					coord : new THREE.Vector3(datum.x, datum.y, datum.z)
				};
				this.chromosomes[chr].push(atom);

				psum.add(atom.coord);
				pmin.min(atom.coord);
				pmax.max(atom.coord);
				++cnt;
			}
		}

		// Display the atoms
		//this.createStickRepresentation(this.chromosomes, this.cylinderRadius, this.cylinderRadius)
		//this.createSplineRepresentation(this.chromosomes);
		this.createCubeRepresentation(this.chromosomes, this.cylinderRadius, this.cylinderRadius);
		//this.createStrand( 2, undefined, true, undefined, undefined, false, this.thickness)
		// Prepare the camera
		this.mdl.position.copy(psum).multiplyScalar(-1 / cnt);
		var maxD = pmax.distanceTo(pmin);
		if (maxD < 25) maxD = 25;
		this.slabNear = -maxD * 0.50;
		this.slabFar  =  maxD * 0.25;
		this.rot.position.z = maxD * 0.35 / Math.tan(Math.PI / 180.0 * 10) - 150;
		this.rot.quaternion.set(1, 0, 0, 0);

		this.render();
		this.displayGui(this.chrVisible , this.chrColor)
		var me = this;
		function animate(){
			requestAnimationFrame(animate);
			me.controls.update();
		};
		me.render();
		animate();
	},

	render : function(){
		var center = this.rot.position.z - this.camera.position.z;
		if (center < 1) center = 1;
		this.camera.near = center + this.slabNear;
		if (this.camera.near < 1) this.camera.near = 1;
		this.camera.far = center + this.slabFar;
		if (this.camera.near + 1 > this.camera.far) this.camera.far = this.camera.near + 1;
		this.camera.updateProjectionMatrix();

		this.renderer.render(this.scene, this.camera);
		this.controls.update();
	}
}