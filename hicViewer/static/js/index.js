/**
 * Created by Mohamed Nadhir Djekidel on 10/10/14.
 */

$(document).ready(function(){

    var hv = new hicView('hicView');

    // Load existing genome
    $("button.btnLoadExisting").click(function () {
        var genome = $("select#genomes").find(":selected").text();
        var resolution = $("select#genomes").val();
        hv.waitingDialog.show("Loading model, please wait ....", { dialogSize: 'sm', progressType: 'warning' })
        var url = "/getChr/" + genome + "/" + resolution;
        $.getJSON(url, function (data) {
           if (Object.keys(data).length > 0) {
               hv.displayChromosomes(data);
           }
           hv.waitingDialog.hide();
        });

    });
});