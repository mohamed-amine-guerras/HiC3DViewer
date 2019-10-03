
$(document).ready(function () {
     var showinlines= false;
    var baseURL = window.location.pathname.replace(/\/$/,"");
    var filename={
        "Yeast": "3d_yeast_centered.bed",
        "Human": "liberman_MDS.txt",
        "Drosophila": "drosophila_40k_centered.bed"
    };
    var oldhighlightedRegions = null;
    var highlightedRegions;
    var lastevt;
    var translinewidth = 1;
    var cislinewidth = 1;
    var hicmapcolor = 0;
    var rotatespeed = 1;
    var colnum={
        'Yellow-Orange-Red': 0,
        'Yellow-Orange-Brown': 1,
        'Yellow-Green-Blue': 2,
        'Yellow-Green': 3,
        'Red': 4,
        'Red-Purple': 5,
        'Purple': 6,
        'Purple-Red': 7,
        'Purple-Blue-Green': 8,
        'Purple-Blue': 9,
        'Orange-Red': 10,
        'Oranges': 11,
        'Greys': 12,
        'Greens': 13,
        'Green-Blue': 14,
        'Blue-Purple': 15,
        'Blue-Green': 16,
        'Blues': 17
    };
    var lastchr1;
    var lastchr2;
    var chrwidth = 1;
    var container = $('#dis_HiC');
    var WIDTH = $('#dis_HiC').width()*0.93;
    var HEIGHT = (window.innerHeight - 100) * 0.95;
    var scene = new THREE.Scene();
    var scene2 = new THREE.Scene();
    var chrgravityx;
    var chrgravityy;
    var chrgravityz;
    var gui = new dat.GUI({width: 264});
    var chrDrawZone;
    var species;
    var colrandom = new Array();
    var colorScale = d3.scale.category10();
    var col = ["#1f78b4", "#a6cee3", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928",
        "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];
    var axes;
    var label;
    var labelx;
    var labely;
    var labelz;
    var cislines;
    var transLines;
    var cislinesvisible;
    var highlightvisible;
    var chrom;
    var chrom2;
    var chrStart;
    var chrid;
    var realchr;
    var chromosome;
    var positions;
    var points;
    var locus;
    var genome;
    var resolution;
    var gravityx;
    var gravityy;
    var gravityz;
    var rotateX = false;
    var rotateY = false;
    var rotateZ = false;
    var minColor = new THREE.Color(0xFFDD3B);
    var maxColor = new THREE.Color(0xFF3434);
    var maxcisLineColor = 0xFFF7FB;
    var maxtransLineColor = 0xFFF7FB;
    var pmin = new THREE.Vector3();
    var pmax = new THREE.Vector3();
    var triangle = [
        [0, 1, 4],
        [1, 4, 5],
        [0, 3, 4],
        [3, 4, 7],
        [2, 3, 7],
        [2, 6, 7],
        [1, 2, 5],
        [2, 5, 6]
    ];
    var triangle2 = [
        [0, 1, 2],
        [0, 2, 3],
        [4, 5, 6],
        [4, 6, 7]
    ];

    var actualGenome = '';
    var vertex = new Array(8);

    var chrCytobands = new Array();
    var chrCenters = new Array();
    var chromInfo;


    function clearScene() {
        var obj, i;
        for (i = scene.children.length - 1; i >= 0; i--) {
            obj = scene.children[i];
            if (obj !== camera) {
                scene.remove(obj);
            }
        }
        for (i = scene2.children.length - 1; i >= 0; i--) {
            obj = scene2.children[i];
            if (obj !== camera) {
                scene2.remove(obj);
            }
        }
	lastevt = null;
        var parent = "div#regionInfo";
            $(parent).empty();
    }

    function buildAxes(length) {
        axes = new THREE.Object3D();

        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), 0xD73027, false)); // +X
        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), 0xD73027, true)); // -X
        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), 0x66BD63, false)); // +Y
        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0x66BD63, true)); // -Y
        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), 0x3288BD, false)); // +Z
        axes.add(buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), 0x3288BD, true)); // -Z

        label = new THREE.Object3D();

        labelx = new THREE.Mesh(new THREE.TextGeometry('X', {
                size: length / 20, height: 1, curveSegments: 6, font: "helvetiker", weight: "normal", style: "normal"}),
            new THREE.MeshBasicMaterial({color: 0xff0000}));
        labelx.position.set(length + length / 20, 0, 0);

        labely = new THREE.Mesh(new THREE.TextGeometry('Y', {
                size: length / 20, height: 1, curveSegments: 6, font: "helvetiker", weight: "normal", style: "normal"}),
            new THREE.MeshBasicMaterial({color: 0x00ff00}));
        labely.position.set(0, length + length / 20, 0);

        labelz = new THREE.Mesh(new THREE.TextGeometry('Z', {
                size: length / 20, height: 1, curveSegments: 6, font: "helvetiker", weight: "normal", style: "normal"}),
            new THREE.MeshBasicMaterial({color: 0x0000ff}));
        labelz.position.set(0, 0, length + length / 20);

        label.add(labelx);
        label.add(labely);
        label.add(labelz);
        axes.add(label);
    }

    function buildAxis(src, dst, colorHex, dashed) {
        var geom = new THREE.Geometry(),
            mat;

        if (dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
        }

        geom.vertices.push(src.clone());
        geom.vertices.push(dst.clone());
        geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        var axis = new THREE.Line(geom, mat, THREE.LinePieces);

        return axis;

    }

    function sortBins(a, b) {
        var info1 = a.split('\t');
        var info2 = b.split('\t');

        var diff = parseInt(info1[0]) - parseInt(info2[0]);
        if (diff == 0) {
            return parseInt(info1[1] - parseInt(info2[1]));
        }
        else {
            return diff;
        }
    }

    function calculatepoints(i) {
        var x1, x2, x3, y1, y2, y3, z1, z2, z3, l;
        x1 = points[i + 1][0] - points[i][0];
        y1 = points[i + 1][1] - points[i][1];
        z1 = points[i + 1][2] - points[i][2];
        if (x1 == 0) {
            x2 = 1;
            y2 = 0;
            z2 = 0;
        }
        else {
            x2 = (y1 - z1) / x1;
            y2 = -1.0;
            z2 = 1.0;
        }
        x3 = y1 * z2 - y2 * z1;
        y3 = x2 * z1 - x1 * z2;
        z3 = x1 * y2 - x2 * y1;

        l = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2) * 2;
        x2 /= l;
        y2 /= l;
        z2 /= l;
        vertex[0][0] = points[i][0] + x2 * chrwidth;
        vertex[0][1] = points[i][1] + y2 * chrwidth;
        vertex[0][2] = points[i][2] + z2 * chrwidth;
        vertex[2][0] = points[i][0] - x2 * chrwidth;
        vertex[2][1] = points[i][1] - y2 * chrwidth;
        vertex[2][2] = points[i][2] - z2 * chrwidth;

        l = Math.sqrt(x3 * x3 + y3 * y3 + z3 * z3) * 2;
        x3 /= -l;
        y3 /= -l;
        z3 /= -l;
        vertex[1][0] = points[i][0] + x3 * chrwidth;
        vertex[1][1] = points[i][1] + y3 * chrwidth;
        vertex[1][2] = points[i][2] + z3 * chrwidth;
        vertex[3][0] = points[i][0] - x3 * chrwidth;
        vertex[3][1] = points[i][1] - y3 * chrwidth;
        vertex[3][2] = points[i][2] - z3 * chrwidth;

    }

    function calculatepoints2(i) {
        var x1, x2, x3, y1, y2, y3, z1, z2, z3, l , l2;
        x1 = points[i + 1][0] - points[i][0];
        y1 = points[i + 1][1] - points[i][1];
        z1 = points[i + 1][2] - points[i][2];

        x2 = vertex[0][0] - points[i][0];
        y2 = vertex[0][1] - points[i][1];
        z2 = vertex[0][2] - points[i][2];
        l2 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
        if (l2 == 0) {
            for (var j = 0; j < 4; j++) {

                    for (var k = 0; k < 3; k++) {
                        vertex[j + 4][k] = vertex[j][k];
                    }
                }
        }
        else {
            l = (x1 * x2 + y1 * y2 + z1 * z2) / l2;
            x3 = vertex[0][0] + x1 - l * x1 / l2;
            y3 = vertex[0][1] + y1 - l * y1 / l2;
            z3 = vertex[0][2] + z1 - l * z1 / l2;

            x2 = x3 - points[i + 1][0];
            y2 = y3 - points[i + 1][1];
            z2 = z3 - points[i + 1][2];

            x3 = y1 * z2 - y2 * z1;
            y3 = x2 * z1 - x1 * z2;
            z3 = x1 * y2 - x2 * y1;

            l = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2) * 2;
            x2 /= l;
            y2 /= l;
            z2 /= l;
            vertex[4][0] = points[i + 1][0] + x2 * chrwidth;
            vertex[4][1] = points[i + 1][1] + y2 * chrwidth;
            vertex[4][2] = points[i + 1][2] + z2 * chrwidth;

            vertex[6][0] = points[i + 1][0] - x2 * chrwidth;
            vertex[6][1] = points[i + 1][1] - y2 * chrwidth;
            vertex[6][2] = points[i + 1][2] - z2 * chrwidth;

            l = Math.sqrt(x3 * x3 + y3 * y3 + z3 * z3) * 2;
            x3 /= -l;
            y3 /= -l;
            z3 /= -l;

            vertex[5][0] = points[i + 1][0] + x3 * chrwidth;
            vertex[5][1] = points[i + 1][1] + y3 * chrwidth;
            vertex[5][2] = points[i + 1][2] + z3 * chrwidth;

            vertex[7][0] = points[i + 1][0] - x3 * chrwidth;
            vertex[7][1] = points[i + 1][1] - y3 * chrwidth;
            vertex[7][2] = points[i + 1][2] - z3 * chrwidth;
        }
    }
    function Showinmesh() {
        for (var i = 0; i < 8; i++) {
            vertex[i] = new Float32Array(3);
        }

        for (var chr = 0; chr < chrStart.length - 1; chr++) {

            calculatepoints(chrStart[chr]);

            chromosome[chr] = new THREE.BufferGeometry();
            positions[chr] = new Float32Array((chrStart[chr + 1] - chrStart[chr] - 1) * 3 * 8 * 3 + 36);
            for (var j = 0; j < 2; j++) {
                for (var k = 0; k < 3; k++) {
                    positions[chr][j * 9 + k * 3 + 0] = vertex[triangle2[j][k]][0];
                    positions[chr][j * 9 + k * 3 + 1] = vertex[triangle2[j][k]][1];
                    positions[chr][j * 9 + k * 3 + 2] = vertex[triangle2[j][k]][2];
                }
            }
            for (var i = chrStart[chr]; i < chrStart[chr + 1] - 1; i++) {

                calculatepoints2(i);

                for (var j = 0; j < 8; j++) {

                    for (var k = 0; k < 3; k++) {

                        positions[chr][18 + (i - chrStart[chr]) * 72 + j * 9 + k * 3 + 0] = vertex[triangle[j][k]][0];
                        positions[chr][18 + (i - chrStart[chr]) * 72 + j * 9 + k * 3 + 1] = vertex[triangle[j][k]][1];
                        positions[chr][18 + (i - chrStart[chr]) * 72 + j * 9 + k * 3 + 2] = vertex[triangle[j][k]][2];

                    }
                }

                for (var j = 0; j < 4; j++) {

                    for (var k = 0; k < 3; k++) {
                        vertex[j][k] = vertex[j + 4][k];
                    }
                }
            }
            for (var j = 2; j < 4; j++) {
                for (var k = 0; k < 3; k++) {
                    positions[chr][(chrStart[chr + 1] - chrStart[chr] - 1) * 3 * 8 * 3 + j * 9 + k * 3 + 0] = vertex[triangle2[j][k]][0];
                    positions[chr][(chrStart[chr + 1] - chrStart[chr] - 1) * 3 * 8 * 3 + j * 9 + k * 3 + 1] = vertex[triangle2[j][k]][1];
                    positions[chr][(chrStart[chr + 1] - chrStart[chr] - 1) * 3 * 8 * 3 + j * 9 + k * 3 + 2] = vertex[triangle2[j][k]][2];
                }
            }

            chromosome[chr].addAttribute('position', new THREE.BufferAttribute(positions[chr], 3));
            chromosome[chr].computeBoundingSphere();

            chrom[chr] = new THREE.Mesh(chromosome[chr], new THREE.MeshBasicMaterial({ color: new THREE.Color(col[chr]), combine: THREE.MixOperation,  side: THREE.DoubleSide}));
            scene.add(chrom[chr]);
        }
    }
    function Showinline(){
        for (var chr = 0; chr < chrStart.length - 1; chr++) {
                var chromosome = new THREE.BufferGeometry();
                var positions = new Float32Array((chrStart[chr + 1] - chrStart[chr]) * 3 );
                for (var i = chrStart[chr]; i < chrStart[chr + 1]; i++) {
                    positions[(i - chrStart[chr]) * 3 + 0] = points[i][0];
                    positions[(i - chrStart[chr]) * 3 + 1] = points[i][1];
                    positions[(i - chrStart[chr]) * 3 + 2] = points[i][2] ;

                }
                chromosome.addAttribute('position', new THREE.BufferAttribute(positions, 3));
                chromosome.computeBoundingSphere();
                chrom[chr] = new THREE.Line(chromosome,new THREE.LineBasicMaterial( { color: new THREE.Color(col[chr]), combine: THREE.MixOperation}));
                scene.add(chrom[chr]);
            }
    }
    function display(ishicdata) {

        chrom = new Array();
        if(showinlines){
            Showinline();
        }
        else{
            Showinmesh();
        }
        setupGUI(ishicdata);
        controls.target = new THREE.Vector3(0, 0, 0);



    }
    function calculatecol(){
        var colchr;
        var colchr2;
        var colchr3;
        var colchr4;
        var colchr5;
        for (var i = 0; i < chrStart.length - 1; i++) {
            colrandom[i] = new Array();
            for( var j = 0; j < chrStart.length - 1; j++) {
                colrandom[i][j] = new Array();
                var js = 0;
                for (var k = 0; k < 20; k++,js++) {
                    colrandom[i][j][k] = new THREE.Color(colorScale(js));
                    colchr = chrom[i].material.color;
                    colchr2 = chrom[j].material.color;
                    colchr3 = new THREE.Color(1,1,0);
                    colchr4 = new THREE.Color(1,1,1);
                    colchr5 = new THREE.Color(0,0,0)
                    while (Math.sqrt(Math.pow(colrandom[i][j][k].r - colchr.r, 2) + Math.pow(colrandom[i][j][k].g - colchr.g, 2) + Math.pow(colrandom[i][j][k].b - colchr.b, 2)) < 0.25
                        || Math.sqrt(Math.pow(colrandom[i][j][k].r - colchr2.r, 2) + Math.pow(colrandom[i][j][k].g - colchr2.g, 2) + Math.pow(colrandom[i][j][k].b - colchr2.b, 2)) < 0.25
                        || Math.sqrt(Math.pow(colrandom[i][j][k].r - colchr3.r, 2) + Math.pow(colrandom[i][j][k].g - colchr3.g, 2) + Math.pow(colrandom[i][j][k].b - colchr3.b, 2)) < 0.25
                        || Math.sqrt(Math.pow(colrandom[i][j][k].r - colchr4.r, 2) + Math.pow(colrandom[i][j][k].g - colchr4.g, 2) + Math.pow(colrandom[i][j][k].b - colchr4.b, 2)) < 0.25
                        || Math.sqrt(Math.pow(colrandom[i][j][k].r - colchr5.r, 2) + Math.pow(colrandom[i][j][k].g - colchr5.g, 2) + Math.pow(colrandom[i][j][k].b - colchr5.b, 2)) < 0.25) {
                        js++;
                        colrandom[i][j][k] = new THREE.Color(colorScale(js));
                    }

                }
            }
        }
    }
    function setupScene() {

            camera.position.z = pmax.z * 1.2;
            camera.position.x = pmax.x * 1.2;
            camera.position.y = pmax.y * 1.2;
            camera.lookAt({x: 0, y: 0, z: 0 });//设置视野的中心坐标

            cislinesvisible = false;
            buildAxes((pmax.x + pmax.y + pmax.z) / 2.4);
            axes.visible = true;
            scene.add(axes);

    }

    function handleFiles(content, ishicdata) {
        oldhighlightedRegions = null;
        transLines = null;
        cislines = null;
        chrStart = new Array();
        chromosome = new Array();
        positions = new Array();
        chrgravityx = new Array();
        chrgravityy = new Array();
        chrgravityz = new Array();
        pmin = new THREE.Vector3(9999, 9999, 9999);
        pmax = new THREE.Vector3(-9999, -9999, -9999);
        var lines = content.split('\n');
        // remove empty lines
        lines = lines.filter(function(e){return e}); 
        lines.sort(sortBins);
        points = new Array(lines.length - 2);
        locus = new Array(lines.length - 2);
        translinewidth = 1;
        cislinewidth = 1;
        gravityx = 0;
        gravityy = 0;
        gravityz = 0;
        hicmapcolor = 0;
        lastchr1 = '1';
        lastchr2 = '1';
        for (var l = 1; l < lines.length - 1; l++) {
            var info = lines[l].split('\t');
            var pos = new Array(3);
            if(!ishicdata){
                if(info[0].search('chromosome') != -1){
                    info[0].replace('chromosome', 'chr');
                }
                else if(info[0].search('chr') == -1){
                    info[0] = 'chr' + info[0];
                }
                if(!(info[0] in chrid)){
                    chrid[info[0]] = chrStart.length;
                    realchr[chrStart.length] = info[0];
                    info[0] = String(chrStart.length + 1);
                }
                if (!(chrid[info[0]] in chrStart)) {
                chrgravityx[chrStart.length] = 0;
                chrgravityy[chrStart.length] = 0;
                chrgravityz[chrStart.length] = 0;
                chrStart[chrStart.length] = l - 1;
            }
            }
            else {
                if (!(parseInt(info[0]) - 1 in chrStart)) {
                    chrgravityx[chrStart.length] = 0;
                    chrgravityy[chrStart.length] = 0;
                    chrgravityz[chrStart.length] = 0;
                    chrStart[chrStart.length] = l - 1;
                }
            }
            locus[l - 1] = parseInt(info[1]);
            pos[0] = parseFloat(info[2]);
            gravityx += pos[0];
            chrgravityx[chrStart.length - 1] += pos[0];
            pos[1] = parseFloat(info[3]);
            gravityy += pos[1];
            chrgravityy[chrStart.length - 1] += pos[1];
            pos[2] = parseFloat(info[4]);
            gravityz += pos[2];
            chrgravityz[chrStart.length - 1] += pos[2];
            points[l - 1] = pos;
            pmin.min(new THREE.Vector3(pos[0], pos[1], pos[2]));
            pmax.max(new THREE.Vector3(pos[0], pos[1], pos[2]));
        }

         gravityx /= lines.length - 2;
        gravityy /= lines.length - 2;
        gravityz /= lines.length - 2;
        locus[chrStart.length] = locus[lines.length - 3] + 1;
        chrStart[chrStart.length] = lines.length - 2;
        for (var i = 0; i < chrStart.length - 1; i++) {
            chrgravityx[i] /= chrStart[i + 1] - chrStart[i];
            chrgravityy[i] /= chrStart[i + 1] - chrStart[i];
            chrgravityz[i] /= chrStart[i + 1] - chrStart[i];
	    chrgravityx[i] -= gravityx;
	    chrgravityy[i] -= gravityy;
            chrgravityz[i] -= gravityz;
        }
        for (var i = 0; i < points.length; i++) {
            points[i][0] -= gravityx;
            points[i][1] -= gravityy;
            points[i][2] -= gravityz;
        }
        pmax.x -= gravityx;
        pmax.y -= gravityy;
        pmax.z -= gravityz;
        pmin.x -= gravityx;
        pmin.y -= gravityy;
        pmin.z -= gravityz;
        // add cytobands
        if(species && species != "Others") {
            var cytobands = "/data/" + species + "/cytobands.json";
            getChromosomeInfo(cytobands);
        }

        if(ishicdata){
            highlightedRegions = new Array();
            for(var i = 0; i < chrStart.length - 1; i ++){
                highlightedRegions[String(i+1)] = 1;
            }
        }

        setupScene();
        display(ishicdata);
        calculatecol();

        if(ishicdata) {
            hicDialog.setColor(colrandom);
            getHicMap(actualGenome, 1, 1, hicmapcolor);
        }
        else{
            hicDialog.hide();
        }
        waitingDialog.hide();
        $(document).on("regionSelected", hicChangeColor);
        $(document).on("clearHic", Clear);
        $(document).on("chrChanged", updateHic);
    }
    function Clear(){
        ClearColor();
        lastevt = null;
    }
    function updateHic(evt) {
        var genome = $("select#genomes").find(":selected").text();
        if(genome.search('res') != -1) {
            genome = genome.split('(res:')[0];
        }
        getHicMap(genome, evt.chr1, evt.chr2, hicmapcolor);
        lastchr1 = evt.chr1;
        lastchr2 = evt.chr2;
        lastevt = null;
        ClearColor();
    }

    function binarysearch(x, chr) {
        var l = chrStart[chr];
        var r = chrStart[chr + 1];
        var m;
        while (l < r) {
            if (l == r - 1)
                return l;
            m = Math.floor((l + r) / 2);
            if (x < locus[m]) {
                r = m;
            }
            else if (x >= locus[m + 1]) {
                l = m + 1;
            }
            else
                return m;
        }
    }

    function hicChangeColor(evt) {
        // TODO: This should be changed into a post
        lastevt = evt;
        ClearColor();
        var region;
        var parent = "div#regionInfo";
        var chrom = String(parseInt(evt.chr1));

        for(var i = 0; i < evt.Xcoord.length; i++) {
            var j = evt.Xcoord.length-i-1;
            var startx = binarysearch(evt.Xcoord[j].start + locus[chrStart[parseInt(evt.chr1) - 1]], parseInt(evt.chr1) - 1);
            var endx = binarysearch(evt.Xcoord[j].end + locus[chrStart[parseInt(evt.chr1) - 1]], parseInt(evt.chr1) - 1);
            var starty = binarysearch(evt.Ycoord[j].start + locus[chrStart[parseInt(evt.chr2) - 1]], parseInt(evt.chr2) - 1);
            var endy = binarysearch(evt.Ycoord[j].end + locus[chrStart[parseInt(evt.chr2) - 1]], parseInt(evt.chr2) - 1);

            changeRegionColor(startx, endx, colrandom[parseInt(evt.chr1) - 1][parseInt(evt.chr2) - 1][j], i * 2 + 0, parseInt(evt.chr1) - 1);
            changeRegionColor(starty, endy, colrandom[parseInt(evt.chr1) - 1][parseInt(evt.chr2) - 1][j], i * 2 + 1, parseInt(evt.chr2) - 1);

            if (evt.chr1 == evt.chr2) {
                DisplayChromosome(chrom, parent, evt.Xcoord[j].start, evt.Xcoord[j].end, evt.Ycoord[j].start, evt.Ycoord[j].end);
                region = {start: evt.Xcoord[j].start, end: evt.Xcoord[j].end};
                highlightchr(chrom, parent, region, colrandom[parseInt(evt.chr1) - 1][parseInt(evt.chr2) - 1][j]);

                region = {start: evt.Ycoord[j].start, end: evt.Ycoord[j].end};
                highlightchr(chrom, parent, region, colrandom[parseInt(evt.chr1) - 1][parseInt(evt.chr2) - 1][j]);

            }
        }
    }

    function ClearColor() {

        if(chrom2) {
            for (var i = 0; i < chrom2.length; i++) {
                chrom2[i].geometry.dispose();
                chrom2[i].material.dispose();
                scene2.remove(chrom2[i]);

            }
        }
        chrom2 = new Array();
        highlightvisible = new Array();
        var parent = "div#regionInfo";
        $(parent).empty();

    }

    function clearGUI() {
        var i;

        // Remove folders
        for (var p in gui.__folders) {
            if (gui.__folders.hasOwnProperty(p)) {
                var folder = gui.__folders[p];
                folder.close();
                gui.__ul.removeChild(folder.domElement.parentNode);
                delete gui.__folders[p];
            }
        }

        // Remove controlls

        for (i = 0; i < gui.__controllers.length; i++) {
            gui.__ul.removeChild(gui.__controllers[i].__li);
        }
        gui.__controllers = [];

        // resize
        gui.onResize();
    }

    function initiateGUI() {
        var visFolder = gui.addFolder('Chromosomes visibility');
        visFolder.close();
        var colFolder = gui.addFolder("Chromosomes color");
        colFolder.close();
        var linecolFolder = gui.addFolder("Contact lines settings");
        linecolFolder.close();
        var otherParams = {
            'x': false,
            'y': false,
            'z': false,
            'hide axes': false,
            'trans-interactions': false,
            'cis-interactions': false,
            'v': '...',
            'chr thickness': chrwidth,
            'display in lines': showinlines,
            'HiC-Map Color': 'YlOrRD',
            'rotate speed': rotatespeed
        };
        var rotateFolder = gui.addFolder("Rotate");
        rotateFolder.add(otherParams, 'x')
            .onChange(function (value) {
            });
        rotateFolder.add(otherParams, 'y')
            .onChange(function (value) {
            });

        rotateFolder.add(otherParams, 'z')
            .onChange(function (value) {
            });
        rotateFolder.add(otherParams, 'rotate speed',0,5)
            .onChange(function(value){
            rotatespeed = value;
        });
        rotateFolder.close();
        var otherFolder = gui.addFolder("Others");
        otherFolder.add(otherParams, 'display in lines').onChange(function (value) {
            showinlines = value;
        });
        otherFolder.add(otherParams, 'HiC-Map Color',['Yellow-Orange-Red',
        'Yellow-Orange-Brown',
        'Yellow-Green-Blue',
        'Yellow-Green',
        'Red',
        'Red-Purple',
        'Purple',
        'Purple-Red',
        'Purple-Blue-Green',
        'Purple-Blue',
        'Orange-Red',
        'Oranges',
        'Greys',
        'Greens',
        'Green-Blue',
        'Blue-Purple',
        'Blue-Green',
        'Blues']).onChange(function (value){
            hicmapcolor = parseInt(colnum[value]);
        });
        otherFolder.add(otherParams, 'hide axes').onChange(function (value) {
        });
        otherFolder.add(otherParams, 'chr thickness', 0.05 , 5).onChange(function(value){
        chrwidth = value;
	});
        otherFolder.add(otherParams, 'trans-interactions')
            .onChange(function (value) {
            });
        otherFolder.add(otherParams, 'cis-interactions').
            onChange(function (value) {
            });
        otherFolder.open();
    }

    function setupGUI(ishicdata) {

        clearGUI();
        var chrVisi = {};
        var chrCols = {};
        for (var i = 0; i < chrStart.length - 1; i++) {
            var chrName = realchr[i];
            chrVisi[chrName] = true;
            chrCols[chrName] = col[i];
        }
        var visFolder = gui.addFolder('Chromosomes visibility');
        var displayall = {'display all': true};
        var chr = visFolder.add(displayall, 'display all').listen();
        chr.onChange(function (value) {
            highlightedRegions = new Array();
            for (var i = 0; i < chrStart.length - 1; i++) {
                chrom[i].visible = value;
                var chrName = realchr[i];
                chrVisi[chrName] = value;
                gui.__folders['Chromosomes visibility'].__controllers[i + 1].updateDisplay();
                gui.__folders['Chromosomes visibility'].__controllers[i + 1].__prev = value;

                if(value){
                    highlightedRegions[String(i+1)] = 1;
                }
            if(chrom2) {
                for (var j = 0; j < chrom2.length; j++) {
                    if (highlightvisible[j] == i) {
                        chrom2[j].visible = value;
                    }
                }
            }
            }
            controls.target = new THREE.Vector3(0, 0, 0);
            controls.update();
            camera.lookAt(new THREE.Vector3(0, 0, 0));
        });
        for (var i = 0; i < chrStart.length - 1; i++) {
            var chr = visFolder.add(chrVisi, Object.keys(chrVisi)[i]).listen();
            chr.onChange(function (value) {
                var pos = this.property;
                if(!value && highlightedRegions[String(chrid[pos]+1)]){
                    delete(highlightedRegions[String(chrid[pos]+1)]);
                }
                else{
                    highlightedRegions[String(chrid[pos]+1)] = 1;
                }
                chrom[chrid[pos]].visible = value;
                gravityx = 0;
                gravityy = 0;
                gravityz = 0;
                var pointnum = 0;
                for (i = 0; i < chrStart.length - 1; i++) {
                    if (chrom[i].visible) {
                        pointnum += chrStart[i + 1] - chrStart[i];
                        gravityx += chrgravityx[i] * (chrStart[i + 1] - chrStart[i]);
                        gravityy += chrgravityy[i] * (chrStart[i + 1] - chrStart[i]);
                        gravityz += chrgravityz[i] * (chrStart[i + 1] - chrStart[i]);
                    }
                }
                gravityx /= pointnum;
                gravityy /= pointnum;
                gravityz /= pointnum;
                //controls.target = new THREE.Vector3(gravityx, gravityy, gravityz);
                //controls.update();
                camera.lookAt(new THREE.Vector3(gravityx, gravityy, gravityz));
                if(chrom2) {
                    for (var j = 0; j < chrom2.length; j++) {
                        if (highlightvisible[j] == chrid[pos]) {
                            chrom2[j].visible = value;

                        }
                    }
                }
            });
        }
        visFolder.close();

        var colFolder = gui.addFolder("Chromosomes color");

        for (var i = 0; i < chrStart.length - 1; i++) {
            colFolder.addColor(chrCols, Object.keys(chrCols)[i])
                .onChange(function (value) {
                    var pos = this.property;
                    chrom[chrid[pos]].material.color = new THREE.Color(value);
                    calculatecol();
                    hicDialog.setColor(colrandom,chrid);
                });
        }

        colFolder.close();
        if(ishicdata) {
            var linecolFolder = gui.addFolder("Contact lines settings");
            var linecol = {
                'cis-lines color': maxcisLineColor,
                'trans-lines color': maxtransLineColor,
                'trans-lines width': translinewidth,
                'cis-lines width': cislinewidth
            };
            linecolFolder.addColor(linecol, 'cis-lines color').onChange(function (value) {
                maxcisLineColor = value;
                if(cislines) {
                    for (var i = cislines.children.length - 1; i >= 0; i--) {
                        cislines.children[i].material.color = new THREE.Color(maxcisLineColor);
                    }
                }
            });
            linecolFolder.add(linecol, 'cis-lines width', 0.1, 5).onChange(function (value) {
                cislinewidth= value;
                if(cislines) {
                    for (var i = cislines.children.length - 1; i >= 0; i--) {
                        cislines.children[i].material.linewidth = cislinewidth;
                    }
                }
            });
            linecolFolder.addColor(linecol, 'trans-lines color').onChange(function (value) {
                maxtransLineColor = value;
                if(transLines) {
                    for (var i = transLines.children.length - 1; i >= 0; i--) {
                        transLines.children[i].material.color = new THREE.Color(maxtransLineColor);
                    }
                }
            });
            linecolFolder.add(linecol, 'trans-lines width', 0.1, 5).onChange(function (value) {
                translinewidth= value;
                if(transLines) {
                    for (var i = transLines.children.length - 1; i >= 0; i--) {
                        transLines.children[i].material.linewidth = translinewidth;
                    }
                }
            });
            linecolFolder.close();
        }
        var otherParams = {
            'x': false,
            'y': false,
            'z': false,
            'hide axes': false,
            'trans-interactions': false,
            'cis-interactions': false,
            'v': '...',
            'chr thickness': chrwidth,
            'display in lines': showinlines,
            'HiC-Map Color': 'YlOrRD',
            'rotation speed': rotatespeed
        };

        var rotateFolder = gui.addFolder("Rotate");
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
        rotateFolder.add(otherParams, 'rotation speed',0,5)
            .onChange(function (value) {
                rotatespeed = value;
            });
        rotateFolder.close();

        var otherFolder = gui.addFolder("Others");
        otherFolder.add(otherParams, 'display in lines').onChange(function (value) {
            showinlines = value;
            var vis = new Array();
            var vis2 = new Array();
            var colour = new Array();
            var colour2 = new Array();
            if(chrom) {
                    for (var i = 0; i < chrom.length; i++) {
                        chrom[i].material.dispose();
                        chrom[i].geometry.dispose();
                        scene.remove(chrom[i]);
                        vis[i] = chrom[i].visible;
                        colour[i] = chrom[i].material.color;
                    }
                }
            if(chrom2) {
                    for (var i = 0; i < chrom2.length; i++) {
                        chrom2[i].material.dispose();
                        chrom2[i].geometry.dispose();
                        scene2.remove(chrom2[i]);
                        vis2[i] = chrom2[i].visible;
                        colour2[i] = chrom2[i].material.color;
                    }
            }
            if(showinlines){
                Showinline();
                if(chrom) {
                    for (var i = 0; i < chrom.length; i++) {
                        chrom[i].visible = vis[i];
                        chrom[i].material.color = colour[i];
                        chrom[i].material.linewidth = chrwidth;
                    }
                }
                if(lastevt) {
                    hicChangeColor(lastevt);
                    if(chrom2){
                        for(var i = 0; i < chrom2.length; i++){
                            chrom2[i].visible = vis2[i];
                            chrom2[i].material.color = colour2[i];
                            chrom2[i].material.linewidth = chrwidth;
                        }
                    }
                }
            }
            else{
                Showinmesh();
                for(var i = 0; i < chrom.length; i++){
                    chrom[i].visible = vis[i];
                    chrom[i].material.color = colour[i];
                }
                if(lastevt){
                    hicChangeColor(lastevt);
                    if(chrom2) {
                        for (var i = 0; i < chrom2.length; i++) {
                            chrom2[i].visible = vis2[i];
                            chrom2[i].material.color = colour2[i];
                        }
                    }
                }
            }
        });
        otherFolder.add(otherParams, 'hide axes').onChange(function (value) {
            axes.visible = !value;
        });
        if(ishicdata) {
            otherFolder.add(otherParams, 'HiC-Map Color', ['Yellow-Orange-Red',
                'Yellow-Orange-Brown',
                'Yellow-Green-Blue',
                'Yellow-Green',
                'Red',
                'Red-Purple',
                'Purple',
                'Purple-Red',
                'Purple-Blue-Green',
                'Purple-Blue',
                'Orange-Red',
                'Oranges',
                'Greys',
                'Greens',
                'Green-Blue',
                'Blue-Purple',
                'Blue-Green',
                'Blues']).onChange(function (value) {
                hicmapcolor = parseInt(colnum[value]);
                if (genome) {
                    getHicMap(genome, lastchr1, lastchr2);
                }
            });
        }
        otherFolder.add(otherParams, 'chr thickness', 0.05 , 5).onChange(function(value){
            chrwidth = value;
            if(showinlines) {
                for (var i = 0; i < chrStart.length - 1; i++) {
                    chrom[i].material.linewidth = value;
                }
                if(chrom2) {
                    for (var i = 0; i < chrom2.length; i++) {
                        chrom2[i].material.linewidth = value;
                    }
                }
            }
            else{
                var vis = new Array();
                var vis2 = new Array();
                var colour = new Array();
                var colour2 = new Array();
                if(chrom) {
                    for (var i = 0; i < chrom.length; i++) {
                        chrom[i].material.dispose();
                        chrom[i].geometry.dispose();
                        scene.remove(chrom[i]);
                        vis[i] = chrom[i].visible;
                        colour[i] = chrom[i].material.color;
                    }
                }
                if(chrom2) {
                    for (var i = 0; i < chrom2.length; i++) {
                        chrom2[i].material.dispose();
                        chrom2[i].geometry.dispose();
                        scene2.remove(chrom2[i]);
                        vis2[i] = chrom2[i].visible;
                        colour2[i] = chrom2[i].material.color;
                    }
                }
                Showinmesh();
                for(var i = 0; i < chrom.length; i++){
                    chrom[i].visible = vis[i];
                    chrom[i].material.color = colour[i];
                }
                if(lastevt){
                    hicChangeColor(lastevt);
                    if(chrom2) {
                        for (var i = 0; i < chrom2.length; i++) {
                            chrom2[i].visible = vis2[i];
                            chrom2[i].material.color = colour2[i];
                        }
                    }
                }
            }
        });
        if(ishicdata) {
            otherFolder.add(otherParams, 'trans-interactions')
                .onChange(function (value) {
                    // if we have already loaded some trans-interactions then we just play on
                    // their visibility
                    if(!value){
                            transLines.visible = false;
                    }
                    else if (transLines && isSame(oldhighlightedRegions,Object.keys(highlightedRegions))) {
                        transLines.visible = value;
                    }
                    else {
                        if(Object.keys(highlightedRegions).length <= 1) {
                             waitingDialog.show("You have to select at least two chromsomes.", "Error", {
                            dialogSize: 'sm',
                            hasbtn: true
                            });
                            otherParams['trans-interactions'] = false;
                        }
                        else {
                            showtranslines(value);
                        }
                    }
                });
            otherFolder.add(otherParams, 'cis-interactions').
                onChange(function (value) {
                    cislines.visible = value;
                    cislinesvisible = value;
                }
            );
        }
        if(ishicdata) {
            otherFolder.add(otherParams, 'v', Object.keys(chrCols)).name("cis interactions")
                .onChange(function (value) {
                    showcislines(value);

                });
            showcislines('chr1');
        }
        otherFolder.open();
    }
    function isSame( a , b ){
        if(a.length != b.length){
            return false;
        }
        else{
            for(var i = 0; i < a.length; i++){
                if(a[i]!=b[i]){
                    return false;
                }
            }
            return true;
        }
    }
    function showtranslines(value) {
        if(value) {
             waitingDialog.show("Loading trans-interactions", "Trans-interaction Generation", {
                            dialogSize: 'sm',
                            progressType: 'warning'
                        });
            var genome = $("#genomes option:selected").text();
            if (genome.search('res:') != -1) {
                genome = genome.split('(res:')[0];
            }
            data = {genome: genome};
            data.chromosomes = Object.keys(highlightedRegions);
            oldhighlightedRegions = Object.keys(highlightedRegions);

            var url = baseURL +  '/getInter';

            $.ajax({
                type: "POST",
                url: url,
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function (data) {

                    if (data.hasOwnProperty("error")) {
                        waitingDialog.hide();
                        waitingDialog.show(data['error'], "Error", { dialogSize: 'm', hasbtn: true});
                    }
                    if (Object.keys(data).length > 0) {

                        var maxFreq = 100;
                        if (data.hasOwnProperty("maxFreq"))
                            maxFreq = data.maxFreq;
                        if (data.hasOwnProperty("interactions"))
                            data = data.interactions;
                        else
                            return;

                        transLines = new THREE.Object3D();
                        for (var i = 0; i < Object.keys(data).length; i++) {
                            displayInteractions(data[i].chr1 - 1, data[i].chr2 - 1, data[i].pos1, data[i].pos2, data[i].freq, maxFreq);
                        }
                    }
                    scene.add(transLines);
                    transLines.visible = value;
                    waitingDialog.hide();
                },
                error: function () {
                    waitingDialog.hide();
                    waitingDialog.show(data['error'], "Error", { dialogSize: 'm', hasbtn: true})
                }
            });
        }
    }

    function showcislines(value) {
        var chr = chrid[value] + 1;
        var genome = $("#genomes option:selected").text();
        if(genome.search('res:') != -1) {
            genome = genome.split('(res:')[0];
        }
        var url = baseURL +  '/getIntra/' + genome + '/' + chr;
        $.getJSON(url, function (data) {
            if (Object.keys(data).length > 0) {

                if (cislines) {
                    scene.remove(cislines)
                }
                var maxFreq = 100
                if (data.hasOwnProperty("maxFreq"))
                    maxFreq = data.maxFreq;
                if (data.hasOwnProperty("interactions"))
                    data = data.interactions;
                else
                    return;

                cislines = new THREE.Object3D();
                for (var i = 0; i < Object.keys(data).length; i++) {
                    chr = Object.keys(data)[i];
                    var chrInfo = data[chr];
                    for (var node = 0; node < Object.keys(chrInfo).length; node++) {
                        displayInteractions(parseInt(chr)-1, parseInt(chr) - 1, chrInfo[node].pos1, chrInfo[node].pos2, chrInfo[node].freq, maxFreq);
                    }
                }
            }
            cislines.visible = cislinesvisible;
            scene.add(cislines);
        });
    }

    function Highlightinmesh(start, end, selectedcolor, chromid, chr){
        
        if(end < start){
           waitingDialog.hide();
           waitingDialog.show("The start coordinate should always be smaller than the end coordinates", "Error", { dialogSize: 'm', hasbtn: true})
        }
        var positions2 = new Float32Array((end - start) * 3 * 8 * 3 + 36);

        calculatepoints(start);

        for (var j = 0; j < 2; j++) {
            for (var k = 0; k < 3; k++) {
                positions2[j * 9 + k * 3 + 0] = vertex[triangle2[j][k]][0];
                positions2[j * 9 + k * 3 + 1] = vertex[triangle2[j][k]][1];
                positions2[j * 9 + k * 3 + 2] = vertex[triangle2[j][k]][2];
            }
        }
        for (var i = start; i < end; i++) {

            calculatepoints2(i);

            for (var j = 0; j < 8; j++) {

                for (var k = 0; k < 3; k++) {

                    positions2[(i - start) * 72 + 18 + j * 9 + k * 3 + 0] = vertex[triangle[j][k]][0];
                    positions2[(i - start) * 72 + 18 + j * 9 + k * 3 + 1] = vertex[triangle[j][k]][1];
                    positions2[(i - start) * 72 + 18 + j * 9 + k * 3 + 2] = vertex[triangle[j][k]][2];

                }
            }
            for (var j = 0; j < 4; j++) {

                for (var k = 0; k < 3; k++) {
                    vertex[j][k] = vertex[j + 4][k];
                }
            }
        }
        for (var j = 2; j < 4; j++) {
            for (var k = 0; k < 3; k++) {
                positions2[(end - start) * 3 * 8 * 3 + j * 9 + k * 3 + 0] = vertex[triangle2[j][k]][0];
                positions2[(end - start) * 3 * 8 * 3 + j * 9 + k * 3 + 1] = vertex[triangle2[j][k]][1];
                positions2[(end - start) * 3 * 8 * 3 + j * 9 + k * 3 + 2] = vertex[triangle2[j][k]][2];
            }
        }
        var chromosome2 = new THREE.BufferGeometry();
        chromosome2.addAttribute('position', new THREE.BufferAttribute(positions2, 3));
        chromosome2.computeBoundingSphere();
        chrom2[chromid] = new THREE.Mesh(chromosome2, new THREE.MeshBasicMaterial({ color: selectedcolor, combine: THREE.MixOperation, side: THREE.DoubleSide}));
        highlightvisible[chromid] = chr;
        chrom2[chromid].visible = chrom[chr].visible;
        scene2.add(chrom2[chromid]);
    }

    function Highlightinline(start, end, selectedcolor, chromid, chr){

                var chromosome2 = new THREE.BufferGeometry();
                var positions2 = new Float32Array((end - start ) * 3 + 3 );
                for (var i = start; i <= end; i++) {
                    positions2[(i - start) * 3 + 0] = points[i][0];
                    positions2[(i - start) * 3 + 1] = points[i][1];
                    positions2[(i - start) * 3 + 2] = points[i][2];

                }
                chromosome2.addAttribute('position', new THREE.BufferAttribute(positions2, 3));
                chromosome2.computeBoundingSphere();
                chrom2[chromid] = new THREE.Line(chromosome2,new THREE.LineBasicMaterial( { color: selectedcolor, combine: THREE.MixOperation}));
                highlightvisible[chromid] = chr;
                chrom2[chromid].visible = chrom[chr].visible;
                scene2.add(chrom2[chromid]);
    }

    function changeRegionColor(start, end, selectedcolor, chromid, chr) {

        if(showinlines){
            Highlightinline(start, end, selectedcolor, chromid, chr);
        }
        else {
            Highlightinmesh(start, end, selectedcolor, chromid, chr);
        }

    }

    function render() {
        requestAnimationFrame(render);
        //camera.lookAt(scene.position);
        renderer.clear();

        if (rotateX || rotateY || rotateZ) {
            var rx = 0.5,
                ry = 0.5,
                rz = 0.5;
        if(chrom) {
            for (var i = 0; i < chrom.length; i++) {
                if (rotateX) chrom[i].rotation.x += rx / 30 * rotatespeed;
                if (rotateY) chrom[i].rotation.y += ry / 30 * rotatespeed;
                if (rotateZ) chrom[i].rotation.z += rz / 30 * rotatespeed;
            }
        }
        if(chrom2) {
            for (var i = 0; i < chrom2.length; i++) {
                if (rotateX) chrom2[i].rotation.x += rx / 30 * rotatespeed;
                if (rotateY) chrom2[i].rotation.y += ry / 30 * rotatespeed;
                if (rotateZ) chrom2[i].rotation.z += rz / 30 * rotatespeed;
            }
        }
        }
	if(transLines) {
                if (rotateX) transLines.rotation.x += rx / 30 * rotatespeed;
                if (rotateY) transLines.rotation.y += ry / 30 * rotatespeed;
                if (rotateZ) transLines.rotation.z += rz / 30 * rotatespeed;
        }
        if(cislines) {
                if (rotateX) cislines.rotation.x += rx / 30 * rotatespeed;
                if (rotateY) cislines.rotation.y += ry / 30 * rotatespeed;
                if (rotateZ) cislines.rotation.z += rz / 30 * rotatespeed;
        }
        if (label) {

            labelx.lookAt(camera.position);
            labely.lookAt(camera.position);
            labelz.lookAt(camera.position);
        }
        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(scene2, camera);
    }

    var camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 5000);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    //renderer.setClearColor(0xe0e0e0);
    renderer.setSize(WIDTH, HEIGHT);
    container.append(renderer.domElement);
    renderer.autoClear = false;
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxDistance = 5000;

    initiateGUI();

    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {
        WIDTH = $("#dis_HiC").width()*0.93;
        HEIGHT = (window.innerHeight- 100) * 0.95;
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
        renderer.setSize(WIDTH, HEIGHT);
    }

    render();
    //controls.update();

    $("button.btnLoadExisting").click(function () {
        genome = $("select#genomes").find(":selected").text();
        if(genome.search('res') != -1) {
            genome = genome.split('(res:')[0];
            resolution = $("select#genomes").find(":selected").text().split('(res:')[1];
            resolution = resolution.replace(')', '');
        }
        else{
            resolution = 0;
        }
        getGenome(genome, resolution, $("select#genomes").val());
    });

    $("#fileUpload").fileupload({
        url: baseURL + "/uploadModel/" + 0,
        dataType: 'json',
        maxNumberOfFiles: 1,
        acceptFileTypes: /(\.|\/)(txt|bed)$/i,
        add: function (e, data) {
            data.context = $("button.submitPet").click(function () {
                //data.context = $('<span id="fileUploadRate">').text("0%").appendTo($(this))
            var jqXHR = data.submit();
                if(!waitingDialog.exist()) {
                    waitingDialog.show("Uploading file, please wait ....", "Uploading model", { dialogSize: 'm', progressType: 'warning' });
                }

            });
        },
        done: function (e, data) {
           waitingDialog.hide();

            if (data.result['files'].hasOwnProperty("error")) {
                // TODO: displat error
                waitingDialog.show(data.result['files']['error'], "Error", { dialogSize : 'm', hasbtn : true})
            }
            else {

                if (data.result['genome'].length > 0) {
                    // update genomes list
                    $("#genomes").empty();

                    for (i = 0; i < data.result['genome'].length; i++) {
                        if(data.result['genome'][i]['resolution'] == 0){
                        $("#genomes").append($("<option></option>")
                            .attr("value", data.result['genome'][i]['modelPath'] + '/' + data.result['genome'][i]['file'])
                            .text(data.result['genome'][i]['name']))
                        }
                        else{
                            $("#genomes").append($("<option></option>")
                            .attr("value", data.result['genome'][i]['modelPath'] + '/' + data.result['genome'][i]['file'])
                            .text(data.result['genome'][i]['name'] + "(res:" + data.result['genome'][i]['resolution'] + ")"))
                        }

                    }
                        waitingDialog.show("Your model has been loaded successfully. Please load it from builded models.", "Model Uploaded Successfully", { dialogSize: 'm', hasbtn: true});
                }

            }
        }
    });

    $("button.btnLoadSpecies").click(function () {
        species = $("select#species").find(":selected").text();
        species = species.split('(')[0];
        chromInfo =  new Array();
        if(chrStart) {
            var cytobands = "/data/" + species + "/cytobands.json";
            getChromosomeInfo(cytobands);
        }
        var parent = "div#regionInfo";
        $(parent).empty();
        if(species && species != 'Others') {
            waitingDialog.show(species + ' cytobands load successfully.', "",
                    { dialogSize: 'm', hasbtn: true});
        }
    });

    function displayInteractions(chr1, chr2, pos1, pos2, freq, maxFreq) {

        var linepoints = new Float32Array(6);

        linepoints[0] = points[chrStart[chr1] + pos1][0];
        linepoints[1] = points[chrStart[chr1] + pos1][1];
        linepoints[2] = points[chrStart[chr1] + pos1][2];
        linepoints[3] = points[chrStart[chr2] + pos2][0];
        linepoints[4] = points[chrStart[chr2] + pos2][1];
        linepoints[5] = points[chrStart[chr2] + pos2][2];

        var geometry = new THREE.BufferGeometry();
        opacity = Math.min(freq, maxFreq) / maxFreq;
        //opacity = opacity < 0.5 ? 0.5 : opacity;
        if(chr1 == chr2) {
            var highlightColor = maxcisLineColor;
        }
        else{
            var highlightColor = maxtransLineColor;
        }

        //highlightColor.lerp(maxLineColor, opacity);

        var material = new THREE.LineBasicMaterial({
            color: new THREE.Color(highlightColor),
            transparent: true,
            opacity: opacity
        });
        geometry.addAttribute('position', new THREE.BufferAttribute(linepoints, 3));
        var line = new THREE.Line(geometry, material);

        // check if it is a trans- or cis- interaction
        if (chr1 == chr2) {
            cislines.add(line);
        } else {
            transLines.add(line);
        }
    }

    $("#annotUpload").fileupload({
        url:baseURL +  "/annotRegions",
        dataType: "json",
        acceptFileTypes: /(\.|\/)(txt|bed)$/i,
        add: function (e, data) {
            data.context = $("button.submitAnnot").click(function () {
                var jqXHR = data.submit()
                handleAnnot(data.files);
            });
        }
    });

    function handleAnnot(files) {
        if (files.length) {
            var file = files[0];
            var reader = new FileReader();
            reader.onload = function () {
                ClearColor();
                var content = reader.result;
                var lines = content.split('\n');
                for (var l = 0; l < lines.length; l++) {
                    if (lines[l] != '') {
                        var info = lines[l].replace(/\t/g," ").split(' ');
                        var js = 0;
                        var chrname;
                        var start;
                        var end;
                        var freq;
                        for (var k = 0; k < info.length && js < 4; k++) {
                            if (info[k] != '') {
                                if (js == 0) {
                                    chrname = info[k];
                                    if (chrname.search('chromosome') != -1) {
                                        chrname.replace(/chromosome/, 'chr');
                                    }
                                    else if (chrname.search('chr') == -1) {
                                        chrname = 'chr' + chrname;
                                    }
                                }
                                else if (js == 1) {
                                    start = binarysearch(locus[chrStart[chrid[chrname]]] + parseInt(info[k]), chrid[chrname]);
                                }
                                else if (js == 2) {
                                    end = binarysearch(locus[chrStart[chrid[chrname]]] + parseInt(info[k]), chrid[chrname]);
                                }
                                else {
                                    freq = parseFloat(info[k]);
                                }
                                js++;
                            }
                        }
                        var highlightColor = minColor.clone();
                        highlightColor.lerp(maxColor, freq);
                        changeRegionColor(start, end, highlightColor, l, chrid[chrname]);
                    }
                }
                render();
            };
            reader.readAsText(file);
        }
    }

    function getchrname(content){
        chrid = new Array();
        realchr = new Array();

        var lines = content.split('\n');
        for(var i = 0; i < lines.length; i++) {
            if(lines[i]!="") {
                var info = lines[i].split('\t');
                if (info[0].search("chromosome") != -1) {
                    info[0].replace(/chromosome/, "chr");
                }
                else if (info[0].search("chr") == -1) {
                    info[0] = "chr" + info[0];
                }
                chrid[info[0]] = parseInt(info[1]) - 1;
                realchr[parseInt(info[1]) - 1] = info[0];
            }
        }
    }

    function getGenome(genome, resolution) {

        waitingDialog.show("Loading model, please wait ....", "Model Generation", {
            dialogSize: 'sm',
            progressType: 'warning'
        });
        clearScene();

         if(resolution != 0) {
            var url = baseURL + "/getChrNames/" + genome;

            $.ajax({ url: url,
                type: "GET",
                success: function (data) {
                    getchrname(data);
                    actualGenome = genome;
                    var url = baseURL + $("select#genomes").val();
                    $.ajax({ url: url,
                    type: "GET",
                    success: function (data) {
                    handleFiles(data, true);

                    }
                    });
                }
            });
        }
        else {
            actualGenome = genome;
            var url = baseURL + $("select#genomes").val();
            $.ajax({ url: url,
                type: "GET",
                success: function (data) {
                    chrid = new Array();
                    realchr = new Array();
                    if (data.search("locus") == -1) {
                        data = "chrom\tlocus\t3D_x\t3D_y\3D_z\n" + data;
                    }
                    handleFiles(data, false);

                }
            });
        }



    };


    function getHicMap(genome, chromosome1, chromosome2) {


        var url = baseURL +  "/displayHic/" + genome + '/' + chromosome1 + '/' + chromosome2 + '/' + hicmapcolor;

        $.getJSON(url, function (data) {

            if (Object.keys(data).length > 0) {

                if (data.hasOwnProperty('error')) {
                    //waitingDialog.show(data['error'], "Error",
                    //                    { dialogSize : 'm', hasbtn : true})
                    return;
                }
                var title = "Hi-C contact map of " + genome;

                var imgUrl =baseURL + '/getHicImg/' + data['imgUrl']
                chrIndex = data['chrInfo']


                hicDialog.show(title, genome, imgUrl, chrIndex,realchr);
            }
            // TODO: Display an error message
            else {
                waitingDialog.show("No data returned", "Error",
                    { dialogSize: 'm', hasbtn: true})
            }
        });
    }

    function fct(error, data) {
            if(data) {
                chrCytobands = data.cytobands;
                chrCenters = data.centers;
                var chrLen = 0;
                //Create a gradiant color scale for each chromosome
                if(data.centers) {
                    for (var chr = 0; chr < chrStart.length - 1; chr++) {
                        chrLen = locus[chrStart[chr + 1] - 1];
                        var chrname = realchr[chr].replace(/chr/,'');
                        chromInfo[chrname] = { "chrLength": chrLen,
                            "bands": chrCytobands[chrname],
                            "centers": chrCenters[chrname],
                            "chr": chrname};
                    }
                }
                else{
                    for (var chr = 0; chr < chrStart.length - 1; chr++) {
                        chrLen = locus[chrStart[chr + 1] - 1];
                        var chrname = realchr[chr].replace(/chr/,'');
                        chromInfo[chrname] = { "chrLength": chrLen,
                            "bands": chrCytobands[chrname],
                            "chr": chrname};
                    }
                }
                if(lastevt){
                hicChangeColor(lastevt);
                }
            }
        }

    function getChromosomeInfo(url) {
        url = baseURL + url;
	d3.json(url,fct);
    }

    function highlightchr (chr, parent, region, color) {
        if( region && chromInfo){
            //mark the gene region in
            chr = realchr[chr - 1];
            chr = chr.replace(/chr/,'');
            var data  = chromInfo[chr];
            if(data) {
                var height = 20;
                var width = $(parent).parent().width();
                var scaleX = d3.scale.linear()
                    .domain([0, data.chrLength])
                    .range([5, width - 10]);

                chrDrawZone.append("svg:rect")
                    .attr("class", "highlight_region")
                    .attr("height", height)
                    .attr("width", scaleX(region.end) - scaleX(region.start))
                    .attr("x", scaleX(region.start))
                    .attr("y", 20)
                    .attr("stroke", "transparent")
                    .attr("fill", d3.rgb(color.r * 255, color.g * 255, color.b * 255))
                    .attr("fill-opacity", 0.5)
            }
        }
    }

    DisplayChromosome = function (chr, parent, start1, end1, start2, end2) {

        if (chromInfo) {
            chr = realchr[chr - 1];
            chr = chr.replace(/chr/,'');
            var data = chromInfo[chr];
            var height = 20;

            var width = $(parent).parent().width();

            //TODO: change it
            chrDrawZone = d3.select(parent)
                .append("div")
                .attr("class", "chrDiv")
                .attr("width", width)
                .attr("height", height + 30)
                .append("svg")
                .attr("width", width)
                .attr("height", height + 30)
                .append("g")
                .attr("class", "chromSVG")
                .attr("stroke", "black")
                .attr('transform', "translate(0, 5)")

            var l1;
            var length1 = end1 - start1;
            while (length1 > 0) {
                if (!l1) {
                    l1 = length1 % 1000;
                    if (l1 < 10) {
                        l1 = "00" + l1;
                    }
                    else if (l1 < 100) {
                        l1 = "0" + l1;
                    }
                }
                else {
                    l1 = length1 % 1000 + "," + l1;
                    if (Math.floor(length1 / 1000) > 0) {
                        if (length1 % 1000 < 10) {
                            l1 = "00" + l1;
                        }
                        else if (length1 % 1000 < 100) {
                            l1 = "0" + l1;
                        }
                    }
                }
                length1 = Math.floor(length1 / 1000);
            }

            var l2;
            var length2 = end2 - start2;
            while (length2 > 0) {
                if (!l2) {
                    l2 = length2 % 1000;
                    if (l2 < 10) {
                        l2 = "00" + l2;
                    }
                    else if (l2 < 100) {
                        l2 = "0" + l2;
                    }
                }
                else {
                    l2 = length2 % 1000 + "," + l2;
                    if (Math.floor(length2 / 1000) > 0) {
                        if (length2 % 1000 < 10) {
                            l2 = "00" + l2;
                        }
                        else if (length2 % 1000 < 100) {
                            l2 = "0" + l2;
                        }
                    }
                }
                length2 = Math.floor(length2 / 1000);
            }

            var s1;
            while (start1 > 0) {
                if (!s1) {
                    s1 = start1 % 1000;
                    if (s1 < 10) {
                        s1 = "00" + s1;
                    }
                    else if (s1 < 100) {
                        s1 = "0" + s1;
                    }
                }
                else {
                    s1 = start1 % 1000 + "," + s1;
                    if (Math.floor(start1 / 1000) > 0) {
                        if (start1 % 1000 < 10) {
                            s1 = "00" + s1;
                        }
                        else if (start1 % 1000 < 100) {
                            s1 = "0" + s1;
                        }
                    }
                }
                start1 = Math.floor(start1 / 1000);
            }
            var s2;
            while (start2 > 0) {
                if (!s2) {
                    s2 = start2 % 1000;
                    if (s2 < 10) {
                        s2 = "00" + s2;
                    }
                    else if (s2 < 100) {
                        s2 = "0" + s2;
                    }
                }
                else {
                    s2 = start2 % 1000 + "," + s2;
                    if (Math.floor(start2 / 1000) > 0) {
                        if (start2 % 1000 < 10) {
                            s2 = "00" + s2;
                        }
                        else if (start2 % 1000 < 100) {
                            s2 = "0" + s2;
                        }
                    }
                }
                start2 = Math.floor(start2 / 1000);
            }
            var e1;
            while (end1 > 0) {
                if (!e1) {
                    e1 = end1 % 1000;
                    if (e1 < 10) {
                        e1 = "00" + e1;
                    }
                    else if (e1 < 100) {
                        e1 = "0" + e1;
                    }
                }
                else {
                    e1 = end1 % 1000 + "," + e1;
                    if (Math.floor(end1 / 1000) > 0) {
                        if (end1 % 1000 < 10) {
                            e1 = "00" + e1;
                        }
                        else if (end1 % 1000 < 100) {
                            e1 = "0" + e1;
                        }
                    }
                }
                end1 = Math.floor(end1 / 1000);
            }
            var e2;
            while (end2 > 0) {
                if (!e2) {
                    e2 = end2 % 1000;
                    if (e2 < 10) {
                        e2 = "00" + e2;
                    }
                    else if (e2 < 100) {
                        e2 = "0" + e2;
                    }
                }
                else {
                    e2 = end2 % 1000 + "," + e2;
                    if (Math.floor(end2 / 1000) > 0) {
                        if (end2 % 1000 < 10) {
                            e2 = "00" + e2;
                        }
                        else if (end2 % 1000 < 100) {
                            e2 = "0" + e2;
                        }
                    }
                }
                end2 = Math.floor(end2 / 1000);
            }

            var scaleX = d3.scale.linear()
                .domain([0, data.chrLength])
                .range([5, width - 10]);

            chrDrawZone.append("text")
                .style("font-family", "helvetica, arial, sans-serif")
                .style("font-size", "14px")
                .attr("x", 0)
                .attr("y", 12)
                .text("Regions: " + s1 + "bp ~ " + e1 + "bp ( length: " + l1 + "bp ) & " + s2 + "bp ~ " + e2 + "bp ( length: " + l2 + "bp )")

            var chrRect = chrDrawZone.selectAll(".chr")
                .data(data.bands);

            chrRect.enter().append("rect")
                .attr("class", function (d) {
                    return "chr " + d.fill
                })
                .attr("height", height)
                .attr("width", function (d) {
                    return scaleX(d.end) - scaleX(d.start)
                })
                .attr("x", function (d) {
                    return scaleX(d.start)
                })
                .attr("y", 20)

                if(data.centers) {
                    var chrCetro = chrDrawZone.selectAll(".centro")
                        .data(data.centers);

                    chrCetro.enter().append("path")
                        .attr("class", function (d) {
                            return "centro " + d.fill;
                        })
                        .attr("d", function (d) {
                            if (d.fill == "acen1") {
                                return "M " + scaleX(d.start) + " " + String(20) + " L " + scaleX(d.end) + " " + String(30) + " L " + scaleX(d.start) + " " + String(40) + " Z";
                            }
                            else {
                                return "M " + scaleX(d.start) + " 30 L " + scaleX(d.end) + " 20 L " + scaleX(d.end) + " 40 Z";
                            }
                        })
                }
            }
        }


     /*****************************************************
    **  Upload Hi-C matrix and chr lengths
    ******************************************************/
    $(".submitHiC").click(function(){
        // Will hold information about the files
        var data = new FormData();

        // read the content of the Hi-C and lengths input files
        var hicupload =$('input[type="file"][id="hiCupload"]')[0];
        var chrupload = $('input[type="file"][id="chrLenghtUpload"]')[0];

        // check if they are filled
        if(hicupload.files.length == 0){
            waitingDialog.show("Please select Hi-C frequency matrix file", "Error",
                               { dialogSize: 'm',  hasbtn: true })
            return;
        }

        if(chrupload.files.length == 0){
            waitingDialog.show("Please select the chromosome lenghts files", "Error",
                               { dialogSize: 'm',  hasbtn: true })
            return;
        }

        // Get the files
        var hicFile = hicupload.files[0];
        var lengthsFile = chrupload.files[0];

        // prepare the data to send
        data.append("Hic",hicFile);
        data.append("chrLengths",lengthsFile);

        // read the resolution
        var resolution = $("#hicResolution").val();

        if(resolution == "") resolution = 1000000;
        data.append('resolution', resolution);

        var method = $(".pastisMethod").val();
        data.append("method", method);

        var normalize = $("#normalizeHic")[0].checked;
        data.append("normalize",normalize);

        var alpha = $("#alpha").val();
        var beta = $("#beta").val();
        var seed = $("#seed").val();

        data.append("alpha",alpha);
        data.append("beta",beta);
        data.append("seed",seed);
        
        waitingDialog.show("Uploading files, please wait ...", "Uploading Hi-C files",
                               { dialogSize: 'm', progressType: 'warning'});
        // upload the files
        $.ajax({
            url:baseURL +  "/uploadHic",
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            success : function(data){
                waitingDialog.hide();

                if('error' in data){
                    var msg = "Error while uploading the file : "  + data['error']
                    waitingDialog.show(msg, "Error",
                               { dialogSize: 'm', hasbtn: true })
                    return
                }else{
                    if('success' in data){
                        // predict the 3D model                        
                        predictModel();
                    }
                }
            }
        })

    });

       /*****************************************************
    **  lunch model prediction
    ******************************************************/

    function predictModel(){

        var method = $(".pastisMethod").val();
        var url =baseURL +  "/buildModel/"+ method;
           waitingDialog.show("Predicting Model, please wait ...", "Model Prediction",
                               { dialogSize: 'm', progressType: 'warning'});
        $.getJSON(url, function (data) {
            waitingDialog.hide();
            if (Object.keys(data).length > 0) {
                if(data.hasOwnProperty('error')){
                    waitingDialog.show(data['error'], 'Error', { dialogSize : 'm', hasbtn : true})
                }
                else{
                    if(data.hasOwnProperty('genome')){
                        if (data['genome'].length > 0) {
                            // update genomes list
                            $("#genomes").empty();

                            for (i = 0; i < data['genome'].length; i++) {
                                $("#genomes").append($("<option></option>")
                                    .attr("value", data['genome'][i]['modelPath'] + '/' + data['genome'][i]['file'])
                                    .text(data['genome'][i]['name'] + '(res:' + data['genome'][i]['resolution']+')')
                                    )
                            }
                        }
                    }
                    waitingDialog.show("The model has been predicted successfully. Please load it from the built models.", "Model Predicted Successfully",
                               { dialogSize: 'm',  hasbtn: true });
                }
            }
        })
    }

});
