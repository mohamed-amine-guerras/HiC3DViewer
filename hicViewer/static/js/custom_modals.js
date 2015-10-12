/**
 * Created by Djekidel Mohamed Nadhir on 29/12/14.
 */
     // *** Modal window ****************

var dialog;
    // http://bootsnipp.com/snippets/featured/quotwaiting-forquot-modal-dialog
    var waitingDialog = (function ($) {

    // Creating modal dialog's DOM


	return {
		/**
		 * Opens our dialog
		 * @param message Custom message
		 * @param options Custom options:
		 * 				  options.dialogSize - bootstrap postfix for dialog size, e.g. "sm", "m";
		 * 				  options.progressType - bootstrap postfix for progress bar type, e.g. "success", "warning".
		 */
		show: function (message,title, options) {
			// Assigning defaults
			var settings = $.extend({
				dialogSize: 'm',
				progressType: '',
                hasbtn : options.hasbtn

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

            var content = '<p style="text-align:center; font-size: 18px; color:white;  line-height: 1.25; font-weight: 400;">' + message +'</p>';

            if (settings.progressType) {
                content = content + '<div class="progress progress-striped active ' + 'progress-bar-' + settings.progressType +
                '" style="margin:5px;"><div class="progress-bar" style="width: 100%"></div></div>';
			}


            if(settings.hasbtn){
                content = content + '<button type="button" class="btn btn-primary" style="padding: 2px 4px; margin-left:165px; margin-right:165px; font-weight: 400" onclick="waitingDialog.hide()">OK</button>'
            }

            dialog = $.jsPanel({
                id: "modal_msg",
                paneltype: "modal",
                theme : 'black',
                content : content,
                title : title,
                size: {width: 400, height: 100},
                callback : function(jsPanel) {
                    jsPanel.content.css("")
                }
            });
		},
		/**
		 * Closes dialog
		 */
		hide: function () {
            if(dialog != null){
				dialog.close();
			}
		},
        exist: function(){
            if(dialog!=null){
                return true;
            }
        }
	}

    })(jQuery); // *** Modal window ****************


    var aboutDialog = (function($){
        return {
            show : function(){
                var about = $('<div class="col-md-12">'+
                            '        <h3>'+
                            '          About HiC3D-Viewer'+
                            '        </h3>'+
                            '        <p class="text-justify">'+
                            '          <code>HiC3D-Viewer</code>is a user-friendly tool designed to explore Hi-C data'+
                            '         in a 3D fashion. It is based on'+
                            '          <code>'+
                            '            <a href="threejs.org">thress.js</a>'+
                            '          </code>for the visualization and'+
                            '          <code>'+
                            '            <a href="https://github.com/hiclib/pastis">Pastis</a>'+
                            '          </code>for module prediction</p>'+
                            '        <p class="text-center text-info">'+
                            '          <a class="btn btn-primary btn-large">User manual</a>'+
                            '          <a class="btn btn-large btn-primary">Download</a>'+
                            '        </p>'+
                            '</div>');


			aboutPanel = $.jsPanel({								
				id : "about_panel",
				title : "HiC3D-Viewer",
				size :{ width: 400, height: 200 },
				position : 'center',
				content : about,
				theme : "medium",                
                paneltype: {
                    type: 'modal',
                    mode: 'default'
                },
				selector : "#aboutPanel"
			});

            }
        }
    })(jQuery); 

    var hicDialog = (function ($) {

        var hicPanel = null;
        var displayedGenome = null;

        var drawD3jsImg = function(imageUrl){
                     
            var width = $("svg#hicPanel_hicFrq").parent().width()*0.98;
            var height = $("svg#hicPanel_hicFrq").parent().height() * 0.88 ;
            
            var svg  = d3.select("svg#hicPanel_hicFrq")
                .attr("width", width)
                .attr("height", height);


            $("svg#hicPanel_hicFrq").empty();

            //
            //var size = Math.min(width,height) ;
                  
            svg.append("svg:image")
               .attr("width", width)
               .attr("height",height)
               .attr("viewBox","0 0" + width + ' ' + height)
               .attr("id", "hicPanel_hicImg")
               .attr("preserveAspectRatio", "none")//"xMinYMin meet")
               .attr("xlink:href", imageUrl);
        };

        var chrInfo1 = null;
        var chrInfo2 = null;
        var xscale = null;
        var yscale = null;
        var colorScale;

        var setupMultiBrushEvent = function(){

            var size = $("svg#hicPanel_hicFrq").width();

            xscale = d3.scale.linear()
                           .domain([0, chrInfo1.len])
                           .range([0, size]);

            yscale = d3.scale.linear()
                            .domain([chrInfo2.len, 0])
                            .range([0, size]);

            //var colorScale = d3.scale.category10();

            // Create a brush
            var mBrush = d3.svg.multibrush()
                .x(xscale)
                .y(yscale)
                .extentAdaption(setExtentColor)
                .on("brushend", brushed);

            // Add it to the svg
            var gBrush = d3.select("svg#hicPanel_hicFrq")
                .append("g")
                .attr("class", "brush")
                .call(mBrush)
                .selectAll("rect")

            function setExtentColor(selection){
                var nbExtent = mBrush.extent().length

                //var col = colorScale(nbExtent);

                var col = colorScale[parseInt(chrInfo1.chr) - 1][parseInt(chrInfo2.chr)-1][nbExtent];
                if(col) {
                    selection.attr("fill", d3.rgb(col.r * 255, col.g * 255, col.b * 255));
                }
            };

            // fired when we start brushing
            function brushed() {

                if( mBrush.empty()){
                    var evt = $.Event("clearHic");
                    $(document).trigger(evt);
                    return;
                }

                var extents = mBrush.extent();
                var evt = $.Event("regionSelected");
                evt.Xcoord = new Array();
                evt.Ycoord = new Array();
                evt.chr1 = $("#hicPanel_chromosome1").val();
                evt.chr2 = $("#hicPanel_chromosome2").val();

                var regionNum = 1;
                extents.forEach( function(extent){
                        // Cordinate of the regions
                        var x0 = Math.ceil(extent[0][0]);
                        var x1 = Math.ceil(extent[1][0]);

                        //
                        var y0 = Math.ceil(extent[0][1]);
                        var y1 = Math.ceil(extent[1][1]);

                        var regionX = { start: x0, end: x1 };
                        var regionY = { start: y0, end: y1 };

                        evt.Xcoord.push(regionX);
                        evt.Ycoord.push(regionY);
                    });

                $(document).trigger(evt);
            }
        };

	return {

		show: function (title,genome, imageUrl, chrlist, realchr) {

            // if it is the same genome and the panel is displayed
            // then just update the image
            if(hicPanel != null & genome == displayedGenome){
                this.updatImg(imageUrl, chrlist);
                return;
            }
            else{
                this.hide();
            }

            if(typeof title == 'undefined'){
                title="Hi-C heatmap"
            }

            displayedGenome = genome;

			//var hicCanvas = $('<canvas id="hicPanel_hicFrq" />');
			var hicCanvas = $('<div class="row" style="margin:0px;">' +
            '<div class="col-md-5" style="padding: 0px" >' +
                '<div class="form-group" style="margin: 0px;">'+
                '  <div class="input-group">'+
                '    <span class="input-group-addon" style="color: black; background: white;font-size: 12px;font-weight: bold; padding: 0px;border: 0px;">chr1 (X axis)</span>'+
                '    <span class="input-group-btn">'+
                '      <select id="hicPanel_chromosome1" class="form-control" type="select" style=" padding:0px; margin:0px 45px 0px 0px;font-size: 10px;"></select>' +
                '    </span>'+
                '  </div>'+
                '</div>' +
            '</div>'+ // col-md-4
            '<div class="col-md-5" style="padding: 0px">' +
                '<div class="form-group" style="margin: 0px;">'+
                '  <div class="input-group">'+
                '    <span class="input-group-addon" style="color: black; background: white;font-size: 12px;font-weight: bold; padding: 0px;border: 0px;">chr2 (Y axis)</span>'+
                '    <span class="input-group-btn">'+
                '      <select id="hicPanel_chromosome2" class="form-control" type="select" style=" padding: 0px; margin: 0px 45px 0px 0px;font-size: 10px;"></select>' +
                '    </span>'+
                '  </div>'+
                '</div>' +
            '</div>'+ // col-md-4
            '<div class="col-md-1">' +
            '<button class="btn btn-success btn-sm" id="getHiC" style="padding: 5px 5px 0px 5px; margin-top: 5px">OK</button>' +
            '</div>'+ // col-md-3
            '</div>' +
            '<svg id="hicPanel_hicFrq" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>');


			hicPanel = $.jsPanel({
				resizable : {
					handles:   "e, s, w, se, sw"
				},
				overflow: 'scroll',
				id : "hic_panel",
				title : title,
				size :{ width: 350, height: 315 },
				position : 'bottom right',
				content : hicCanvas,
				theme : "light",
				selector : "#displayContainer"
			});

			hicPanel.on('jspanelloaded',function(event, id){
				if(id == "hic_panel"){    

					if(chrlist.length >0){                        
						$.each(chrlist, function (key, value) {
							if(typeof value != 'undefined') {
                                if(value.displayed == 1) {
                                    if (value.displayedChr & 1) chrInfo1 = value;
                                    if (value.displayedChr & 2) chrInfo2 = value;
                                }
								$("#hicPanel_chromosome1")
									.append($('<option></option>')
										.attr("value", value.chr)
										.text(realchr[parseInt(value.chr)-1])
								)

                                $("#hicPanel_chromosome2")
									.append($('<option></option>')
										.attr("value", value.chr)
										.text(realchr[parseInt(value.chr)-1])
								)
							}
						})
					}


                    $("#hicPanel_chromosome1").val(chrInfo1.chr)
                    $("#hicPanel_chromosome2").val(chrInfo2.chr)

                    $("button#getHiC").click(function(){
                        var evt = $.Event("chrChanged");
                        evt.chr1 = $("#hicPanel_chromosome1").val();
                        evt.chr2 = $("#hicPanel_chromosome2").val();
                        $(document).trigger(evt);
                    });

                    /*$("#hicPanel_chromosome1").change(function(){
                            var evt = $.Event("chrChanged");
                            evt.chr = $("#hicPanel_chromosome1").val();
                            $(document).trigger(evt);
                        });*/
                                        
					// Show image
					if(typeof imageUrl != 'undefined') {
                        drawD3jsImg(imageUrl);
                        setupMultiBrushEvent();
					}
				}
			});

		},

        setColor : function(col){
            colorScale = col;
        },
        updatImg : function(imageUrl, chrlist){
            if(typeof imageUrl != 'undefined') {
                // Get the chromosome length
                $.each(chrlist, function (key, value) {
                    if(typeof value != 'undefined') {
                        if(value.displayed == 1) {
                            if (value.displayedChr & 1) chrInfo1 = value;
                            if (value.displayedChr & 2) chrInfo2 = value;
                        }
                    }
                })


                drawD3jsImg(imageUrl);
                setupMultiBrushEvent();
            }
        },
		/**
		 * Closes dialog
		 */
		hide: function () {
			if(hicPanel != null){
				hicPanel.close();
			}
		}
	}

    })(jQuery); // *** Modal window ****************

