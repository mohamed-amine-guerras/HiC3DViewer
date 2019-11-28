import uuid;

from flask import Blueprint, Flask, render_template, views, Response, request, session, send_file, send_from_directory
from flask import current_app as app
from flask_compress import Compress
from werkzeug.utils import secure_filename


from hicViewer.utils import *
from pastis.config import parse
import shutil
import json
import matplotlib
import numpy
import traceback


main = Blueprint("main",__name__, static_folder="../static", template_folder="../template")


@main.route('/')
def Viewer():    
   if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0 ):
            session['uid'] = uuid.uuid4()
   return render_template("viewer.html", genomes=getAvailableGenome() )


@main.route('/getChr/<genome>/<resolution>', methods=['GET', 'POST'])
def getChr(genome, resolution):
    try:
        app.logger.info("Getting genome %s" % genome)
        ## Create a session ID if it didn't exisit
        if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0 ):
            session['uid'] = uuid.uuid4()
        ## Get bins position for each chromosome
        genomes = getAvailableGenome()       
        ## Check if our genome is there
        species = [x for x in genomes if x['name'] == genome]
        if (len(species) > 0 ):
            mesh = None;
            ## if the it is a pre-built genome load it from the data folder
            ## otherwise load it from the user's folder
            if (species[0]['type'] == "prebuilt"):
                genomePath = os.path.join(settings.DATA_DIR,species[0]['name'])
                mesh = chrMesh(genomePath);
            else:
                mesh = chrMesh(os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), 'model'))

            mesh.getCoordinates(species[0]['file']);
            app.logger.info( "Got coordinates")
            ##Convert it to json file and send it back
            jsonRes = json.dumps(mesh.position);
            app.logger.info("converted to json")
            ## set the session paramters before returning
            session['genome'] = genome
            session['resolution'] = resolution
            app.logger.info("returning response")
            return Response(jsonRes, mimetype="application/json")
        else:
            jsonRes = json.dumps({"error": "The provided genome does not exist"});
            return Response(jsonRes, mimetype="application/json")

    except Exception as e:
        app.logger.exception(e)
        app.logger.error(traceback.format_exc())
        return 'Could not load the specified chromosome'



@main.route('/getIntra/<genome>/<chromosomes>', methods=['GET'])
def getIntra(genome, chromosomes):
    jsonRes = ''
    try:
        jsonRes = get_interaction(chromosomes, genome, isIntra= True)
    except Exception as e:
        jsonRes = {'error': 'Could not load the specified chromosome interactions'}

    return Response(jsonRes, mimetype="application/json")


@main.route('/getInter', methods=['POST'])
def getInter():

    data = request.json
    chromosomes = None
    genome = None
    if 'chromosomes' in data.keys():
        chromosomes = data['chromosomes']

    if 'genome' in data.keys():
        genome = data['genome']
    else:
        return

    jsonRes = ''
    #try:
    jsonRes = get_interaction(chromosomes, genome, isIntra= False)
    #except Exception as e:
    #    jsonRes = {'error': 'Could not load the specified chromosome interactions'}
    return Response(jsonRes, mimetype="application/json")


@main.route("/data/<genome>/cytobands.json")
def getCytobands(genome):
    genome = genome.encode('ascii','ignore');
    filepath= os.path.join(settings.DATA_DIR,genome,"cytobands.json")
    with open(filepath) as cyto:
        res = cyto.read();
    return Response(res, mimetype="application/json")


@main.route("/getChrNames/<genome>")
def getChrNames(genome):
    genome = genome.encode('ascii','ignore');

    genomes = getAvailableGenome()

    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]
    if (len(species) > 0 ):
        ## if the it is a pre-built genome load it from the data folder otherwise load it from the user's folder
        if (species[0]['type'] == "prebuilt"):
            genomePath = os.path.join(settings.DATA_DIR, species[0]['name'])
            namesPath = os.path.join(genomePath, "chr_names.txt")
        else:
            genomePath = os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), species[0]['name'])
            namesPath = os.path.join(genomePath, "chr_names.txt")


    with open(namesPath) as chrNames:
        res = chrNames.read();
    return Response(res, mimetype="text/plain")



@main.route("/annotBrush", methods=["POST"])
def annotBrush():

    if request.json is None:
        return

    data = request.json;
    if not checkCoords(data):
        return

    if session["genome"] is None or len(str(session["genome"])) > 0:

        genome = str(session["genome"])
        # Get bins position for each chromosome
        genomes = getAvailableGenome()
        # Check if our genome is there
        species = [x for x in genomes if x['name'] == genome]

        if len(species) > 0:
            modelroot = os.path.join(settings.DATA_DIR, genome)

            if str(species[0]["type"]) == "user":
                modelroot = os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), 'model')

            mesh = chrMesh(modelroot)
            resolution = int(session["resolution"])

            regions = []
            chrom1 = data['chr1']
            chrom2 = data['chr2']
            for i in range(len(data["xcoord"])):
                xtmp = data['xcoord'][i]
                ytmp = data['ycoord'][i]

                regions.append([chrom1,
                    xtmp['start'], xtmp['end'],
                    -1, # frequency
                    "%s:%s-%s" % (chrom1,xtmp['start'], xtmp['end']), #name
                    i+1 #region number
                ])

                regions.append([chrom2,
                    ytmp['start'], ytmp['end'],
                    -1,
                    "%s:%s-%s" % (chrom2,ytmp['start'], ytmp['end']),
                    i+1 #region number
                ])

            annot = mesh.getAnnotationFromList(regions, species[0]['file'], resolution)

            results = json.dumps(annot)
        else:
            results = {"status": "error"}
        return Response(results, mimetype="application/json")




@main.route("/uploadModel/<resolution>", methods=['POST'])
def uploadModel(resolution):
    content = {'files': [], "genome": []}

    ## Associate a user id to the user
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        session['uid'] = uuid.uuid4();

    file = request.files['file3Dmodel']
    filename = secure_filename(file.filename)
    root = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]))

    try:
        ## check if there is a folder for the session
        ## if not create it
        if not os.path.exists(root):
            os.mkdir(root)

        ## create a folder for the models
        modelPath = os.path.join(root, "model")

        if not os.path.exists(modelPath):
            os.mkdir(modelPath)

        uploadPath = os.path.join(modelPath, filename)

        file.save(uploadPath)
        session["filename"] = filename
        content["files"] = {
            "name": file.filename,
            "size": request.content_length,
            "url": "",
            "thumbnailUrl": "",
            "deleteUrl": "",
            "deleteType": "DELETE"
        }
        check_model_exists(filename, modelPath, str(session["uid"]), resolution)  ## update the list of available genomes
        content["genome"] = getAvailableGenome();

    except Exception as e:
        content["files"] = {
            "name": file.filename,
            "size": request.content_length,
            "error": "Error when loading the file please try again"
        }
    return Response(json.dumps(content), mimetype='application/json');





@main.route("/uploadHic", methods=["POST"])
def uploadHic():
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        session['uid'] = uuid.uuid4();

    root = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]))
    content = {}
    
    ## check if we have any file uploaded    
    if not os.path.exists(root):
        os.mkdir(root);
        
    ## get the attributs
    resolution = int(request.form['resolution'].encode('ascii'))
    alpha = float(request.form['alpha'].encode('ascii'))
    beta = float(request.form['beta'].encode('ascii'))
    seed = int(request.form['seed'].encode('ascii'))
    normalize = False
    if request.form["normalize"].encode("ascii") == "true" :
        normalize = True
    method = request.form["method"].encode("ascii")
    
    hicfile = request.files['Hic']
    hicFileName = secure_filename(hicfile.filename)
    
    dirName = os.path.splitext(os.path.basename(hicFileName))[0]
    dirName = os.path.join(root, method + "_" + dirName)
    
    if (('.mcool' in hicFileName) or ('.cool' in hicFileName)):
        return  Response(upload_hic_cooler(root, hicfile, hicFileName, dirName, resolution, alpha, beta, seed, method, normalize), mimetype='application/json') 

    else:
        lengthsFile = request.files['chrLengths']
        return  Response(upload_hic_old(root, hicfile, hicFileName, dirName, lengthsFile, resolution, alpha, beta, seed, method, normalize), mimetype='application/json') 


@main.route('/buildModel/<method>', methods=['GET'])
def buildModel(method):
    content = {'genome'}
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
        return Response(json.dumps(content), mimetype='application/json')

    root = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]))

    try:

        pastisModel = spatialModel()
        method = method.encode('ascii')
        app.logger.info("Predicting 3D model")
        results = pastisModel.predict3D(method, root)
        app.logger.info("Prediction done")

        content = {'success': "model predicted successfully, please check the models list"}

        app.logger.info("Saving model")
        cfgfile = os.path.join(root, 'config.ini')
        options = parse(cfgfile)
        filename = options['output_name'].replace(".pdb", '.bed')
        filename = os.path.basename(filename)
        modelPath = os.path.join(root, 'model')
        #modelPath = root

        if not os.path.exists(modelPath):
            os.mkdir(modelPath)

        check_model_exists(filename, modelPath, str(session['uid']), options['resolution'])

        newCfgPath = os.path.join(root, os.path.dirname(options['counts']), 'config.ini')
        shutil.move(cfgfile, newCfgPath)
        content['genome'] = getAvailableGenome()

    except IOError as e:
        content = {'error': "Error while processing data"}

    return Response(json.dumps(content), mimetype="application/json")


@main.route('/displayHic/<genome>/<chromosome1>/<chromosome2>/<col>', methods=['GET'])
def displayHic(genome, chromosome1,chromosome2, col):
    ##return content = {'%s,%s,%s,%s' % (genome,chromosome1,chromosome2))
    app.logger.info("displaying genome= %s, chr1=%s chr2=%s" % (genome, chromosome1,chromosome2))    
    genomes = getAvailableGenome()
    app.logger.info( genomes)
    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]

    if len(species) == 0:
        content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
        return Response(json.dumps(content), mimetype='application/json')

    root=''
    if (species[0]['type'] == "prebuilt"):
        root = settings.DATA_DIR

    else:
        if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
            return Response(json.dumps(content), mimetype='application/json')
        else:
            root = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]))

    ## always write to the users workspace
    outpath = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]))    
    try:
        sModel = spatialModel()
        app.logger.info("%s : getting hic" % str(session["uid"]) )        
        res = sModel.getHic(root, genome, int(chromosome1), int(chromosome2), outpath, int(col))        
        if res is None:			
            content = {'error': 'error while processing data, no results'}
        else:
            content = res
            

    except Exception as e:
        content = {'error': "Error while processing data %s" % str(e)}
        app.logger.error(traceback.format_exc())

    return Response(json.dumps(content), mimetype="application/json")


@main.route("/getHicImg/<imgName>")
def getHicImg(imgName):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    imgPath = os.path.join(settings.UPLOAD_FOLDER, str(session["uid"]), imgName)
    if not os.path.exists(imgPath):
        ##FIXME : return an error image
        return

    return send_file(imgPath, mimetype='image/png')


@main.route("/data/<genome>/<file>")
def data(genome,file):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    filePath = os.path.join(settings.DATA_DIR,genome,file);
    if not os.path.exists(filePath):
        ##FIXME : return an error image
        return

    session["genome"] = genome
    return send_file(filePath, mimetype='text/plain')


@main.route("/tmp/<sessionID>/model/<file>")
def getTmp(sessionID, file):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    if str(session['uid']) != sessionID:
        return

    filePath = os.path.join(settings.UPLOAD_FOLDER,sessionID,"model",file);
    if not os.path.exists(filePath):
        ##FIXME : return an error message
        return

    return send_file(filePath, mimetype='text/plain')


@main.route("/userManual/")
def userManual():
    filePath = os.path.join(app.root_path,"/data/")
    return send_from_directory(filePath, 'UserManual.pdf')


