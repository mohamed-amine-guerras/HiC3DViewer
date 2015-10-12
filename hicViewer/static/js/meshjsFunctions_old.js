
$(document).ready(function () {
    //var WIDTH = $("#dis_HiC").parent().width();
    var WIDTH = $("#dis_HiC").width();
    var HEIGHT = WIDTH;

    var container = $('#dis_HiC');
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 3000);
    var renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    var controls;
    var lines;
    var transLines;
    var useSpline = false;
    var minColor = new THREE.Color(0xFFDD3B);
    var maxColor = new THREE.Color(0xFF3434);
    var minLineColor = new THREE.Color(0xFFEDBC);
    var maxLineColor = new THREE.Color(0xFFFFFF)
    
    var mouseVector = new THREE.Vector3();
    var projector = new THREE.Projector();
    var isDraggin = false;
    var highlightedRegions = null;
    var baseURL = ""
    var txtOptions = { fontsize: 32, backgroundColor: {r:255, g:100, b:100, a:1} };
    chromosomes = [];

    //renderer.setClearColor(0xffffff);
    renderer.setSize(WIDTH, HEIGHT);
    renderer.sortObjects = false;
    renderer.setClearColor(0x000000, 1);

    scene.add(camera);
    camera.position.z = 300;
    renderer.setSize(WIDTH, HEIGHT);
    container.append(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    binFacesIndex = new Array();
    Regions = new Array()

    var col = ["#1f78b4", "#a6cee3", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928",
             "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"];

    var groups = [];
    //We allow both modes in case in the future on of them is not convinient
    //we can use the other
    var doMerge = true;
    var useCube2 = false;
    var rotateX = false;
    var rotateY = false;
    var rotateZ = false;
    var gui = null;

     // *** Modal window ****************



    function addCube(chr, bin, x, y, z) {
        var geometry = new THREE.BoxGeometry(1, 1, 1);

        var material = new THREE.MeshBasicMaterial({ color: col[chr]});
        var cube = new THREE.Mesh(geometry, material);
        cube.position.x = x + 2;
        cube.position.y = y + 2;
        cube.position.z = z + 2;
        cube.matrixAutoUpdate = false;
        cube.updateMatrix();

        if (doMerge) {
            // get the number of faces before insertion
            var nbFaces = groups[chr].faces.length;
            groups[chr].merge(cube.geometry, cube.matrix);

            // Faces coordinates of the actual bin in the geometry
            var coord = {start :nbFaces, end :  (groups[chr].faces.length -1) };
            binFacesIndex[chr][bin] = {'coord' :coord, 'region': undefined } ;

            //add the bin attribute to the newly added vertices
            /*for (f = nbFaces; f < groups[chr].faces.length; f++) {
                groups[chr].faces[f].bin = bin;
            }*/

        } else {
            groups[chr].add(cube);
        }
    }

    function displayInteractions(chr1, chr2, pos1, pos2, freq, maxFreq) {
        
        
        var point1 = new THREE.Vector3(chromosomes[chr1][pos1].x + 2, chromosomes[chr1][pos1].y + 2, chromosomes[chr1][pos1].z + 2);
        var point2 = new THREE.Vector3(chromosomes[chr2][pos2].x + 2, chromosomes[chr2][pos2].y + 2, chromosomes[chr2][pos2].z + 2);
        var geometry = new THREE.Geometry();
        opacity = Math.min(freq,maxFreq) / maxFreq;
        opacity = opacity < 0.5 ? 0.5 : opacity;
        var highlightColor = minLineColor.clone();
        highlightColor.lerp(maxLineColor, opacity);
        
        var material = new THREE.LineBasicMaterial({
            color: highlightColor,
	    transparent: true,
            opacity: opacity,
            linewidth: 2
        });
        geometry.vertices = [point1, point2];
        line = new THREE.Line(geometry, material);

        // check if it is a trans- or cis- interaction
        if (chr1 == chr2) {
            lines.add(line);
        } else {
            transLines.add(line);
        }
    };

    /******************************************************
    ** Display the information panel
    **
    ** Input: chrInfo: list of visible chromosomes
    **        chrColors: the color of each chromosome
    **
    *******************************************************/
    function displayGui(chrInfo, chrColors) {

        if (gui == null)
            gui = new dat.GUI()
        else
            clearGui();


        var otherParams = {
            'x': false,
            'y': false,
            'z': false,
            'trans-interactions': false,
            'v': '...',
            'display all': true
        };

        gui.add(otherParams, "display all")
         .onChange(function (value) {
             for (var i = 0; i < gui.__folders['Chromosomes visibility'].__controllers.length; i++) {
                 chrInfo[Object.keys(chrColors)[i]] = value;
                 var pos = parseInt(Object.keys(chrColors)[i].replace(/chr/, ''), 10);
                 groups[pos].visible = value
                 gui.__folders['Chromosomes visibility'].__controllers[i].updateDisplay();
             }
         })

        // Add the chromosome visibility folder
        var chrFolder = gui.addFolder("Chromosomes visibility");

        for (var i = 0; i < Object.keys(chrInfo).length; i++) {
            var chr = chrFolder.add(chrInfo, Object.keys(chrInfo)[i]).listen();
            chr.onChange(function (value) {
                    var pos = parseInt(this.property.replace(/chr/, ''), 10);
                    groups[pos].visible = value;
                });
        }

        chrFolder.open();

        // Add the color manipulation folder
        var colFolder = gui.addFolder("chromosomes color");

        for (var i = 0; i < Object.keys(chrColors).length; i++) {
            colFolder.addColor(chrColors, Object.keys(chrColors)[i])
                .onChange(function (value) {
                    var pos = parseInt(this.property.replace(/chr/, ''), 10);
                    if (doMerge) {
                        groups[pos].material.materials[0].color.setHex(value.replace("#", "0x"));
                    }
                });
        }
        colFolder.open();



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

        // add the trans-interaction option
        gui.add(otherParams, 'trans-interactions')
            .onChange(function (value) {
                // if we have already loaded some trans-interactions then we just play on
                // their visibility
                if (transLines instanceof THREE.Object3D ) {
                    transLines.visible = value;
                } else {
                    if(!value){
                        return;
                    }
                    var genome = $("#genomes option:selected").text();

                    data = {genome : genome};
                    if(highlightedRegions != null){
                        data.chromosomes = Object.keys(highlightedRegions)
                    }

                    var url = baseURL + '/getInter';

                    $.ajax({
                        type: "POST",
                        url: url,
                        contentType: 'application/json',
                        dataType: 'json',
                        data: JSON.stringify(data),
                        success: function (data) {
                            if (Object.keys(data).length > 0) {

                                var maxFreq = 100
                                if (data.hasOwnProperty("maxFreq"))
                                    maxFreq = data.maxFreq;
                                if (data.hasOwnProperty("interactions"))
                                    data = data.interactions;
                                else
                                    return;

                                transLines = new THREE.Object3D();
                                for (var i = 0; i < Object.keys(data).length; i++) {
                                    displayInteractions(data[i].chr1, data[i].chr2, data[i].pos1, data[i].pos2, data[i].freq, maxFreq);
                                }
                            }
                            scene.add(transLines)
                        }
                    });

                    /*
                    $.getJSON(url, function (data) {
                        if (Object.keys(data).length > 0) {
                            
                            var maxFreq = 100
                            if(data.hasOwnProperty("maxFreq")) 
                                maxFreq = data.maxFreq;
                            if(data.hasOwnProperty("interactions")) 
                                data = data.interactions;
                            else
                                return;
                            
                            transLines = new THREE.Object3D();
                            for (var i = 0; i < Object.keys(data).length; i++) {
                                displayInteractions(data[i].chr1, data[i].chr2, data[i].pos1, data[i].pos2, data[i].freq, maxFreq);
                            }
                        }
                        scene.add(transLines)
                    });*/
                }
            });

        // add the cis-interaction option
        gui.add(otherParams, 'v', Object.keys(chrColors)).name("cis interactions")
            .onChange(function (value) {

                var chr = parseInt(value.replace(/chr/, ''), 10);
                var genome = $("#genomes option:selected").text();
                var url = baseURL + '/getIntra/' + genome + '/'+ chr
                $.getJSON(url, function (data) {
                    if (Object.keys(data).length > 0) {

                        if (lines) {
                            scene.remove(lines)
                        }
                        var maxFreq = 10
                        if(data.hasOwnProperty("maxFreq")) 
                            maxFreq = Math.log10(data.maxFreq);
                        if(data.hasOwnProperty("interactions")) 
                            data = data.interactions;
                        else
                            return;
                        
                        lines = new THREE.Object3D();
                        for (var i = 0; i < Object.keys(data).length; i++) {
                            var chr = Object.keys(data)[i];
                            var chrInfo = data[chr];
                            for (var node = 1; node < Object.keys(chrInfo).length; node++) {
                                displayInteractions(chr, chr, chrInfo[node].pos1, chrInfo[node].pos2, Math.log10(chrInfo[node].freq), maxFreq);
                         }
                        }
                    }
                    scene.add(lines)
                });
            });

        gui.open();
    };


    /***********************************************************
     ** Load a pre-existing genome
     ** Output: Display it on the page
     ***********************************************************/
    function clearScene() {
        var obj, i;
        for (i = scene.children.length - 1; i >= 0; i--){
            obj = scene.children[i]
            if(obj !== camera){
                scene.remove(obj);
            }
        }
    }

    function clearGui() {
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


    function getHicMap(genome, chromosome1, chromosome2){


        var url = baseURL + "/displayHic/" + genome + '/' + chromosome1 + '/' + chromosome2

        $.getJSON(url, function(data){

            if(Object.keys(data).length >0){

                if(data.hasOwnProperty('error')){
                    //waitingDialog.show(data['error'], "Error",
                    //                    { dialogSize : 'm', hasbtn : true})
                    return;
                }
                var title = "Hi-C contact map of " + genome;

                var imgUrl = baseURL + '/getHicImg/' + data['imgUrl']
                chrIndex = data['chrInfo']


                hicDialog.show(title, genome, imgUrl, chrIndex);
            }
            // TODO: Display an error message
            else{
                waitingDialog.show("No data returned", "Error",
                                        { dialogSize : 'm', hasbtn : true})
            }
        });
    }

    // inspired from : http://soledadpenades.com/articles/three-js-tutorials/drawing-the-coordinate-axes/
    function buildAxes( length ) {
        var axes = new THREE.Object3D();

        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xFF0000, false ) ); // +X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xFF0000, true) ); // -X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x00FF00, false ) ); // +Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x00FF00, true ) ); // -Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x0000FF, false ) ); // +Z
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x0000FF, true ) ); // -Z

        return axes;

    }

    function buildAxis( src, dst, colorHex, dashed ) {
        var geom = new THREE.Geometry(),
            mat;

        if(dashed) {
                mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
        } else {
                mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
        }

        geom.vertices.push( src.clone() );
        geom.vertices.push( dst.clone() );
        geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        var axis = new THREE.Line( geom, mat, THREE.LinePieces );

        return axis;

    }


    function addlighting(){

        hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
		hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
		hemiLight.position.set( 0, 500, 0 );
		scene.add( hemiLight );

        dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1.75, 1 );
        dirLight.position.multiplyScalar( 50 );
        scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        var d = 50;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;

    }
    function getGenome(genome, resolution) {

        waitingDialog.show("Loading model, please wait ....","Model Generation", { dialogSize: 'sm', progressType: 'warning' })
        var url = baseURL + "/getChr/" + genome + "/" + resolution;
        $.getJSON(url, function (data) {
            if (Object.keys(data).length > 0) {
                if ("error" in data) {
                    //TO DO display alert
                    console.log("error")
                } else {
                    chromosomes = data;
                    //Will hold the chromosome meshs
                    groups = Array(Object.keys(data).length);
                    // Index for each bin's start and end per-chromosome
                    binFacesIndex = Array( groups.length);

                    var pmin = new THREE.Vector3( 9999, 9999, 9999);
		            var pmax = new THREE.Vector3(-9999,-9999,-9999);
		            var psum = new THREE.Vector3();
		            var cnt = 0;

                    // a boolean vector indicating if the chromosome is visible or not
                    var chrVisi = {};
                    // a vector holding the colors of each chromosome
                    var chrCols = {};

                    // first remove any pre-existing object on the screen
                    clearScene();

                    for (var i in data) {

                        groups[i] = doMerge ? new THREE.Geometry() : new THREE.Object3D();

                        //Init the index for each chromosome
                        binFacesIndex[i] = new Array( data[i].length);

                        // draw each point in that chromosome
                        var chrName = 'chr' + i;
                        chrVisi[chrName] = true;
                        chrCols[chrName] = col[i];

                        // Add the points
                        for (var point = 0; point < data[i].length; point++) {

                            datum = data[i][point];
                            addCube(i, point, datum.x, datum.y, datum.z);

                            var pos = new THREE.Vector3(datum.x, datum.y, datum.z)
                            psum.add(pos);
                            pmin.min(pos);
			    pmax.max(pos);
                        }


                        groups[i].computeFaceNormals();
                        var m = new THREE.MeshBasicMaterial({ color: col[i],
                            vertexColors: THREE.VertexColors,
                            shading: THREE.FlatShading});

                        var materials = [m];
                        groups[i] = new THREE.Mesh(groups[i], new THREE.MeshFaceMaterial(materials));
                        groups[i].matrixAutoUpdate = false;
                        groups[i].updateMatrix();
                        /*for (var f = 0; f < groups[i].geometry.faces.length; f++) {
                            groups[i].geometry.faces[f].materialIndex = 0;
                        }*/
                        // Add the chromosome to the sceen
                        groups[i].chromosome = i;
                        scene.add(groups[i]);
                    }// end for i

                    // ************* set camera *********
                    camera.position.z = pmax.z * 1.5;
                    camera.position.x = (pmin.x + pmax.y) / 2;
                    camera.position.y = (pmin.y + pmax.y) / 2;

                    //************** add light ***********
                    addlighting();

                    // ***** Add the axes *****
                    var axes = buildAxes(200)
                    scene.add(axes);

                    // ***** display the gui ******
                    displayGui(chrVisi, chrCols);

                    function render() {
                        requestAnimationFrame(render);
                        camera.lookAt(scene.position);

                        if (rotateX || rotateY || rotateZ) {
                            var time = Date.now() * 0.001;
                            var rx = Math.sin(time * 0.7) * 0.5,
                                ry = Math.sin(time * 0.3) * 0.5,
                                rz = Math.sin(time * 0.2) * 0.5;

                            for (var i = 1; i < groups.length; i++) {
                                if (rotateX) groups[i].rotation.x += rx;
                                if (rotateY) groups[i].rotation.y += ry;
                                if (rotateZ) groups[i].rotation.z += rz;
                            }
                        }

                        renderer.render(scene, camera);
                    }
                    render();
                    controls.update();
                    waitingDialog.hide();
                    //load the Hi-C heatmap
                    getHicMap(genome,1,1);

                    $(document).on("regionSelected",getBrushedRegion);
                    $(document).on("clearHic", function(e) {clearRegions() });
                    $(document).on("chrChanged", updateHic);
                }
            }
        });
    };

    /*****************************************************
    **  Upload 3D model
    ******************************************************/

    $("#fileupload").fileupload({
        url: "/uploadModel/" + 1000000,
        dataType: 'json',
        maxNumberOfFiles: 1,
        acceptFileTypes: /(\.|\/)(txt|bed)$/i,
        add: function (e, data) {
            data.context = $("button.submitPet").click(function () {
                data.context = $('<span id="fileUploadRate">').text("0%").appendTo($(this))
                var jqXHR = data.submit()
                waitingDialog.show("Uploading file, please wait ....","Uploading model" ,{ dialogSize: 'sm', progressType: 'warning' })
            });
        },
        done: function (e, data) {
            $("button.petUpload").removeAttr("disabled");
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
                        $("#genomes").append($("<option></option>")
                            .attr("value", data.result['genome'][i]['resolution'])
                            .text(data.result['genome'][i]['name'])
                            )
                    }
                }

            }
        },
        progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            //Diplay the Progress Bar
            $("div#fileuploadProgressBar").css("width", progress + "%")
            $("div.progress-bar-container").attr("qtip-val", progress);
            $("span#fileUploadRate").text(progress + "%")
        }
    });

    /*****************************************************
    **  lunch model prediction
    ******************************************************/

    function predictModel(){

        var method = $(".pastisMethod").val();
        var method = $(".pastisMethod").val();
        var url = baseURL + "/buildModel/"+ method
        $.getJSON(url, function (data) {
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
                                    .attr("value", data['genome'][i]['resolution'])
                                    .text(data['genome'][i]['name'])
                                    )
                            }
                        }
                    }

                }
            }
        })
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
                               { dialogSize: 'm', progressType: 'warning', hasbtn: true })
            return;
        }

        if(chrupload.files.length == 0){
            waitingDialog.show("Please select the chromosome lenghts files", "Error",
                               { dialogSize: 'm', progressType: 'warning', hasbtn: true })
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
        var method = $(".pastisMethod").val();

        if(resolution == "") resolution = 1000000;
        data.append('resolution', resolution);

        waitingDialog.show("Upload files, please wait ...", "Uploading Hi-C files",
                               { dialogSize: 'm', progressType: 'warning'});
        // upload the files
        $.ajax({
            url: baseURL + "/uploadHic",
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
                               { dialogSize: 'm', progressType: 'warning', hasbtn: true })
                    return
                }else{
                    if('success' in data){
                        // predict the 3D model
                        predictModel();
                    }
                }
            }
        })

    })

    /** Color the faces located in a certain chromosome
     in a certain location */
    function colorFaces(chr,start,end, color, region){
        for(var f= start; f <= end; f++){

            var face = groups[chr].geometry.faces[f];
            face.region = region;
            var nbSlides = ( face instanceof THREE.Face3) ? 3 : 4;

            for(var j =0; j < nbSlides; j++){
                face.vertexColors[j] = color;
            }
        }
    }

    function clearFaceColors(chr,start,end){
        for(var f= start; f <= end; f++){
            var face = groups[chr].geometry.faces[f];
            face.vertexColors = new Array();
            face.region = undefined;
        }
    }

    /** Reset the chromosomes colors **/
    function clearRegions(){
        for(var chr in Regions){
            for(var i=0; i < Regions[chr].length; i++){
                var interval  = Regions[chr][i];
                // Restor the initial chromosome colors
                clearFaceColors(chr, interval.start.start, interval.stop.end);
            }
            groups[chr].geometry.colorsNeedUpdate = true;
        }
        Regions = new Array(groups.length);
    }


    /*****************************************************
     * **  color regions in 3C model
     ******************************************************/


    function annot3DModel(data) {
                
        clearRegions();
        highlightedRegions = data;
        for (var i in data) {
            //for each point in the chromosome
            Regions[i] = new Array(data[i].length);
            var colorScale = d3.scale.category10();
            for (var point = 0; point < data[i].length; point++) {

                var highlightColor = minColor.clone();

                var interval = data[i][point];
                if(interval.hasOwnProperty("region")){
                    highlightColor = new THREE.Color( colorScale(interval.region) );
                }
                else {
                 highlightColor.lerp(maxColor, interval.freq);
                }

                var binStart = binFacesIndex[i][interval.binStart]['coord'];
                var binStop = binFacesIndex[i][interval.binStop]['coord'];

                Regions[i][point] = {'start': binStart, 'stop': binStop, 'name': interval.name};

                colorFaces(i, binStart.start, binStop.end, highlightColor, point);

                for (var x = interval.binStart; x <= interval.binStop; x++) {
                    binFacesIndex[i][interval.binStart]['region'] = point;
                }
            }
            groups[i].geometry.colorsNeedUpdate = true;
        }
    }

    /*****************************************************
     **  Upload domain annotations
     ******************************************************/
    function getDomainAnnotations() {
        var url = baseURL + "/annotRegions"
        $.getJSON(url, function (data) {
            // if there is somethig returned
            if (Object.keys(data).length > 0) {
                if(data.hasOwnProperty('bins')){
                    annot3DModel(data['bins']);
                }

                if(data.hasOwnProperty('genomicRegions')){
                    hicDialog.displayRegions(data['genomicRegions'])
                }


            }
        })
    };

    /*****************************************************
     **  Annotate brushed region
     ******************************************************/
    function getBrushedRegion(evt) {
        // TODO: This should be changed into a post

        var data = {};
        data["xcoord"] = evt.Xcoord;
        data["ycoord"] = evt.Ycoord;
        data["chr1"] = evt.chr1;
        data["chr2"] = evt.chr2;

        $.ajax({
            type: "POST",
            url : baseURL + "/annotBrush",
            contentType : 'application/json',
            dataType: 'json',
            data : JSON.stringify(data),
            success: function(answer){
                // if there is somethig returned
                if (Object.keys(answer).length > 0) {
                    annot3DModel(answer);
                }
            },
            error: function(jqXHR, textStatus)
            {
                alert(textStatus);
            }
        });
    };

    $("#annotUpload").fileupload({
        url: "/annotRegions",
        dataType: "json",
        acceptFileTypes: /(\.|\/)(txt|bed)$/i,
        add: function (e, data) {
            data.context = $("button.submitAnnot").click(function () {
                var jqXHR = data.submit()
            });
        },
        done: function (e, data) {
            getDomainAnnotations();
        },
        progressall: function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            //Diplay the Progress Bar
            $("div#fileuploadProgressBar").css("width", progress + "%")
            $("div.progress-bar-container").attr("qtip-val", progress);
            $("span#fileUploadRate").text(progress + "%")

        }
    });

    function updateHic(evt){
        var genome = $("select#genomes").find(":selected").text();
        getHicMap(genome,evt.chr1, evt.chr2);
    }
    //*************** Main menu interactions **************************

    // Load existing genome
    $("button.btnLoadExisting").click(function () {
        var genome = $("select#genomes").find(":selected").text();
        var resolution = $("select#genomes").val();
        getGenome(genome, resolution);
    });

    window.addEventListener( 'resize', onWindowResize, false );

    function onWindowResize( e ) {
            var containerWidth = container.width();
            var containerHeight = container.height();
            var size= Math.min(containerWidth,containerHeight);

            renderer.setSize( size, size );
            camera.aspect = 1;
            camera.updateProjectionMatrix();
    }


    container.mousedown(onMouseDown);
    function onMouseDown(e){
        e.preventDefault();
        isDraggin = true;
    };

    container.mouseup(onMouseUp);
    function onMouseUp(e){
        isDraggin = false;
    }

    container.mousemove(onMouseMove);
    function onMouseMove( e ) {
        e.preventDefault();
        if(isDraggin) return;
        var highlightColor = new THREE.Color(0xFFFF33);
        var p_x = container.offset().left;
        var p_y = container.offset().top;
        mouseVector.x = 2 * ( (e.clientX- p_x) / container.width()) - 1;
		mouseVector.y = 1 - 2 * ( (e.clientY- p_y ) / container.height() );

		var raycaster = projector.pickingRay( mouseVector.clone(), camera );

        var intersects = raycaster.intersectObjects(scene.children, true);

        if(intersects.length ==0) return;


        for(var i=0; i < intersects.length; i++){

            // Color only the first visible object
            if(intersects[i].object.visible){
                if( ! intersects[i].object.hasOwnProperty("chromosome")) return;
                var chr = intersects[i].object.chromosome;
                // Which region
                if(! intersects[i].hasOwnProperty('face') ) return;
                var RegionInfo = intersects[i].face.region;

                if(RegionInfo == undefined) return;

                var interval  = Regions[chr][RegionInfo];
                // Display Label

                $("#regionIfno").text("Chromosome: "+ chr +" Region: "+ interval.name );
                /*var labPos = calcLabelPosition(chr, interval.start.start, interval.stop.end);

                var lbl =makeTextSprite(interval.name, txtOptions)
                lbl.position = labPos;
                scene.add(lbl);*/

                //colorFaces(chr, interval.start.start, interval.stop.end, highlightColor, RegionInfo);

                // update colors
                //groups[chr].geometry.colorsNeedUpdate = true;
                return;
            }
        }

    };


    function calcLabelPosition(chr, start, end){

        var maxVertices = [new THREE.Vector3(-9999,-9999,-9999), new THREE.Vector3(-9999,-9999,-9999)] ;
        var faceIndices=['a', 'b', 'c','d'];
        var pos = [start, end];
        groups[chr].geometry.faces[start];

        // Get the position of the maximum index in both sides
        for(var f=0; f < pos.length; f++){

            var face = groups[chr].geometry.faces[pos[f]];
            var nbSlides = ( face instanceof THREE.Face3) ? 3 : 4;

            for(var j =0; j < nbSlides; j++){
                var vertexIndex = face[ faceIndices[ j ] ];
                var vertex = groups[chr].geometry.vertices[vertexIndex]
                maxVertices[f].max(vertex);
            }
        }

        var labPos = maxVertices[0].add(maxVertices[1]).multiplyScalar(0.5)
        labPos.y += 10;
        return(labPos);
    }

    // From : https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Labeled-Geometry.html
    function makeTextSprite( message, parameters )
    {
        if ( parameters === undefined ) parameters = {};

        var fontface = parameters.hasOwnProperty("fontface") ?
            parameters["fontface"] : "Arial";

        var fontsize = parameters.hasOwnProperty("fontsize") ?
            parameters["fontsize"] : 18;

        var borderThickness = parameters.hasOwnProperty("borderThickness") ?
            parameters["borderThickness"] : 4;

        var borderColor = parameters.hasOwnProperty("borderColor") ?
            parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };

        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
            parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
        //var spriteAlignment = parameters.hasOwnProperty("alignment") ?
        //	parameters["alignment"] : THREE.SpriteAlignment.topLeft;
        //var spriteAlignment = THREE.SpriteAlignment.topLeft;

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;

        // get size data (height depends only on font size)
        var metrics = context.measureText( message );
        var textWidth = metrics.width;

        // background color
        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
                                      + backgroundColor.b + "," + backgroundColor.a + ")";
        // border color
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
                                      + borderColor.b + "," + borderColor.a + ")";
        context.lineWidth = borderThickness;
        roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
        // 1.4 is extra height factor for text below baseline: g,j,p,q.

        // text color
        context.fillStyle = "rgba(0, 0, 0, 1.0)";
        context.fillText( message, borderThickness, fontsize + borderThickness);

        // canvas contents will be used for a texture
        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial(
            { map: texture, useScreenCoordinates: false }); //, alignment: spriteAlignment } );
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(100,50,1.0);
        return sprite;
    }
    // function for drawing rounded rectangles
    function roundRect(ctx, x, y, w, h, r)
    {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }


});
