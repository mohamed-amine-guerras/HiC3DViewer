/**
 * Created by root on 13/02/15.
 */

importScripts("/static/js/theejs/three.min.js");
importScripts("/static/js/GeometryExporter.js");

var groups = [];
var binFacesIndex = [];
var col = [];
var vertices= [];
var faces =[];


function addCube(chr, bin, x, y, z) {

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({color: col[chr]});
    var cube = new THREE.Mesh(geometry, material);
    cube.position.x = x + 2;
    cube.position.y = y + 2;
    cube.position.z = z + 2;
    cube.matrixAutoUpdate = false;
    cube.updateMatrix();

    // get the number of faces before insertion
    var nbFaces = groups[chr].faces.length;
    groups[chr].merge(cube.geometry, cube.matrix);

    // Faces coordinates of the actual bin in the geometry
    var coord = {start: nbFaces, end: (groups[chr].faces.length - 1)};
    binFacesIndex[chr][bin] = {'coord': coord, 'region': undefined};
};

onmessage = function(e) {

    col = e.data.col;

    var pmin = new THREE.Vector3( 9999, 9999, 9999);
	var pmax = new THREE.Vector3(-9999,-9999,-9999);
    var psum = new THREE.Vector3();

    var exporter = new THREE.GeometryExporter();

    e.data.ids.forEach(function(i){

        groups[i] = new THREE.Geometry();
        binFacesIndex[i] = new Array(e.data.chrs[i].length);

        // Add the points
        for (var point = 0; point < e.data.chrs[i].length; point++) {

            var datum = e.data.chrs[i][point];
            addCube(i, point, datum.x, datum.y, datum.z);

            var pos = new THREE.Vector3(datum.x, datum.y, datum.z)
            psum.add(pos);
            pmin.min(pos);
            pmax.max(pos);
        }

        groups[i].computeFaceNormals();

        groups[i] = exporter.parse(groups[i])
        /*
        var m = new THREE.MeshBasicMaterial({
            color: col[i],
            vertexColors: THREE.VertexColors,
            shading: THREE.FlatShading
        });

        var materials = [m];
        groups[i] = new THREE.Mesh(groups[i], new THREE.MeshFaceMaterial(materials));
        groups[i].matrixAutoUpdate = false;
        groups[i].updateMatrix();

        for (var f = 0; f < groups[i].geometry.faces.length; f++) {
            groups[i].geometry.faces[f].materialIndex = 0;
        }
        */
    });


    var res = {//faces : faces,
        //vertices : vertices,
        geometies : groups,
        binFacesIndex : binFacesIndex,
        pmin: pmin, pmax : pmax, psum: psum,
        ids : e.data.ids,
        type : "success"
    };

    // return back the result
    postMessage(res);
}