import uuid;

from flask import Flask, render_template, views, Response, request, session, send_file, send_from_directory
from flask.ext.compress import Compress
from werkzeug.utils import secure_filename


#print("loading cheMesh")
from chrMesh import *
#print("loading spatialModel")
from spatialModel import *
from pastis.config import parse
import shutil
import json
import matplotlib
import numpy

UPLOAD_FOLDER = "/tmp"
SECRET_KEY = "#@#$$%TRECE#$#@&H^||"


#def start_app():
#    app = Flask(__name__)
#    compress.init_app(app)
#    return app

app = Flask(__name__)
app.secret_key = SECRET_KEY
Compress(app)

if app.debug is not True:   
    import logging
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler('/tmp/python.log', maxBytes=1024 * 1024 * 100, backupCount=20)
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)


# Make the WSGI interface available at the top level so wfastcgi can get it.
wsgi_app = app.wsgi_app

@app.errorhandler(500)
def internal_error(exception):
    app.logger.exception(exception)

def getAvailableGenome():
    ## load the info.json in the data folder
    fileName = os.path.join("./data", "info.json")
    with open(fileName, 'r') as genomes_info:
        genomes_data = json.load(genomes_info)

    ## load the info.json in the session fold if it exists
    if ('uid' in session.keys()):
        fileName = os.path.join(UPLOAD_FOLDER, str(session['uid']), 'model', "info.json")
        if (os.path.exists(fileName)):
            with open(fileName, 'r') as genomes_info:
                genomes_data2 = json.load(genomes_info)
            genomes_data.extend(genomes_data2)
    app.logger.error("returning available genomes")
    return genomes_data


# Make the WSGI interface available at the top level so wfastcgi can get it.
wsgi_app = app.wsgi_app

#@app.route('/')
#def index():
#   return render_template("index.html")


@app.route('/')
def Viewer(): 
   app.logger.error("Entring the viewer")
   if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0 ):
            session['uid'] = uuid.uuid4()
   return render_template("viewer.html", genomes=getAvailableGenome() )


@app.route('/getChr/<genome>/<resolution>', methods=['GET', 'POST'])
def getChr(genome, resolution):
    try:
        app.logger.error("Getting genome %s" % genome)
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
                genomePath = os.path.join("./data",species[0]['name'])
                mesh = chrMesh(genomePath);
            else:
                mesh = chrMesh(os.path.join(UPLOAD_FOLDER, str(session['uid']), 'model'))

            mesh.getCoordinates(species[0]['file']);
            app.logger.error( "Got coordinates")
            ##Convert it to json file and send it back
            jsonRes = json.dumps(mesh.position);
            app.logger.error("converted to json")
            ## set the session paramters before returning
            session['genome'] = genome
            session['resolution'] = resolution
            app.logger.error("returning response")
            return Response(jsonRes, mimetype="application/json")
        else:
            jsonRes = json.dumps({"error": "The provided genome does not exist"});
            return Response(jsonRes, mimetype="application/json")

    except Exception as e:
        app.logger.exception(e)
        return 'Could not load the specified chromosome'

def get_interaction(chromosomes, genome, isIntra = True):

    genomes = getAvailableGenome()

    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]
    if (len(species) > 0 ):
        mesh = None;
        ## if the it is a pre-built genome load it from the data folder otherwise load it from the user's folder
        if (species[0]['type'] == "prebuilt"):
            genomePath = os.path.join("./data", species[0]['name'])
            modelPath = os.path.join(genomePath, species[0]['file'])
            mesh = chrMesh(genomePath)
        else:
            genomePath = os.path.join(UPLOAD_FOLDER, str(session['uid']), species[0]['name'])
            modelPath = os.path.join(UPLOAD_FOLDER, str(session['uid']), 'model', species[0]['file'])
            mesh = chrMesh(genomePath)


        resolution = species[0]['resolution']

        if isIntra:
            chromosomes = int(chromosomes.decode('utf-8'))
            maxFreq =mesh.getIntra(genomePath, modelPath, chromosomes, resolution)
            jsonRes = {"interactions": mesh.interactions, "maxFreq" : maxFreq}
            jsonRes = json.dumps(jsonRes)
        else:
            if chromosomes is not None:
                chromosomes = [int(x.decode('utf-8')) for x in chromosomes]
            maxFreq = mesh.getInter( genomePath, modelPath, resolution, chromosomes)
            jsonRes = {"interactions": mesh.transInteractions, "maxFreq" : maxFreq}
            jsonRes = json.dumps(jsonRes)
    else:
        jsonRes = json.dumps({"error": "Error while processing interactions"})
    return jsonRes


@app.route('/getIntra/<genome>/<chromosomes>', methods=['GET'])
def getIntra(genome, chromosomes):
    jsonRes = ''
    try:
        jsonRes = get_interaction(chromosomes, genome, isIntra= True)
    except Exception as e:
        jsonRes = {'error': 'Could not load the specified chromosome interactions'}

    return Response(jsonRes, mimetype="application/json")


@app.route('/getInter', methods=['POST'])
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


@app.route("/data/<genome>/cytobands.json")
def getCytobands(genome):
    genome = genome.encode('ascii','ignore');
    filepath= os.path.join("./data",genome,"cytobands.json")
    with open(filepath) as cyto:
        res = cyto.read();
    return Response(res, mimetype="application/json")


@app.route("/getChrNames/<genome>")
def getChrNames(genome):
    genome = genome.encode('ascii','ignore');

    genomes = getAvailableGenome()

    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]
    if (len(species) > 0 ):
        ## if the it is a pre-built genome load it from the data folder otherwise load it from the user's folder
        if (species[0]['type'] == "prebuilt"):
            genomePath = os.path.join("./data", species[0]['name'])
            namesPath = os.path.join(genomePath, "chr_names.txt")
        else:
            genomePath = os.path.join(UPLOAD_FOLDER, str(session['uid']), species[0]['name'])
            namesPath = os.path.join(genomePath, "chr_names.txt")


    with open(namesPath) as chrNames:
        res = chrNames.read();
    return Response(res, mimetype="text/plain")



@app.route("/annotBrush", methods=["POST"])
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
            modelroot = os.path.join("./data", genome)

            if str(species[0]["type"]) == "user":
                modelroot = os.path.join(UPLOAD_FOLDER, str(session['uid']), 'model')

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


## Check if the provided coordinate data structure is ok.

def checkCoords(data):

    if len(["xcoord", "ycoord", "chr1", "chr2"] & data.viewkeys()) != 4:
        return False

    if len(data["xcoord"])== 0 or len(data["ycoord"]) == 0:
        return False

    if len(data["xcoord"]) != len(data["ycoord"]):
        return False

    return True


class annotRegions(views.MethodView):
    ## Get the domains corrdinates
    def get(self):
        if (session["filename"] is not None or len(str(session["filename"]))):
            ## get the path were the file is saved
            filePath = os.path.join(UPLOAD_FOLDER, str(session["uid"]), str(session["filename"]))
            genome = str(session["genome"])
            ## Get bins position for each chromosome
            genomes = getAvailableGenome()
            ## Check if our genome is there
            species = [x for x in genomes if x['name'] == genome]

            if (len(species) > 0 ):

                mesh = chrMesh('./data')
                if( str(species[0]["type"]) == "user" ):
                    modelroot = os.path.join(UPLOAD_FOLDER, str(session['uid']), 'model')
                    mesh = chrMesh(modelroot)

                resolution = int(session["resolution"])
                annot = mesh.getAnnotationFromFile(filePath, species[0]['file'], resolution)

                results = json.dumps(annot)
            else:
                results = {"status": "error"}
            return Response(results, mimetype="application/json")

    ## Upload the file to the server
    def post(self):

        content = {'files': []}

        if (session["genome"] is None or len(str(session["genome"])) > 0):
            file = request.files['fileannot']
            ## Associate a user id to the user
            if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
                session['uid'] = uuid.uuid4();

            filename = secure_filename(file.filename)
            root = os.path.join(UPLOAD_FOLDER, str(session["uid"]))
            uploadPath = os.path.join(root, filename)
            try:
                if not os.path.exists(root):
                    os.mkdir(root)

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
            except Exception as e:
                content["files"] = {
                    "name": file.filename,
                    "size": request.content_length,
                    "error": "Error when loading the file please try again"
                }
        else:
            content["files"] = {
                "name": file.filename,
                "size": request.content_length,
                "error": "Error when loading the file please try again"
            }

        return Response(json.dumps(content), mimetype='application/json');


def check_model_exists(filename, modelPath, resolution):
    # check if the user already uploaded some models befoe
    modelInfoFile = os.path.join(modelPath, "info.json")
    modelInfo = []
    # if the some models exist then just load it
    if ( os.path.exists(modelInfoFile)):
        with open(modelInfoFile, 'r') as genomes_info:
            modelInfo = json.load(genomes_info)

        # check if the file existed before
        exists = [x for x in range(len(modelInfo)) if modelInfo[x]['file'] == filename]

        if (len(exists) > 0):
            modelInfo[exists[0]]['resolution'] = resolution
        else:
            modelInfo.append({'resolution': resolution,
                              'name': os.path.splitext(os.path.basename(filename))[0],
                              'file': filename,
                              'modelPath': modelPath,
                              'type': 'user'})

    # if this is the first model then just create the file
    else:
        modelInfo = [{'resolution': resolution,
                      'name': os.path.splitext(os.path.basename(filename))[0],
                      'file': filename,
                      'modelPath': modelPath,
                      'type': 'user'
                     }]
    # update the info.json file
    with open(modelInfoFile, 'w') as f:
        json.dump(modelInfo, f)


@app.route("/uploadModel/<resolution>", methods=['POST'])
def uploadModel(resolution):
    content = {'files': [], "genome": []}

    ## Associate a user id to the user
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        session['uid'] = uuid.uuid4();

    file = request.files['file3Dmodel']
    filename = secure_filename(file.filename)
    root = os.path.join(UPLOAD_FOLDER, str(session["uid"]))

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
        check_model_exists(filename, modelPath, resolution)  ## update the list of available genomes
        content["genome"] = getAvailableGenome();

    except Exception as e:
        content["files"] = {
            "name": file.filename,
            "size": request.content_length,
            "error": "Error when loading the file please try again"
        }
    return Response(json.dumps(content), mimetype='application/json');


def extractChrName( root ,filePath):

    import numpy as np

    original_lengths = np.genfromtxt(filePath, dtype= None)

    plengths  = os.path.join(root, "chr_lengths.txt")
    pchrNames = os.path.join(root, "chr_names.txt")


    flenghts = open(plengths,"w")
    fchrName = open(pchrNames, "w")
    for i in range(len((original_lengths))):
        flenghts.write("%s\n" % original_lengths[i][1])
        fchrName.write("%s\t%s\n" % (original_lengths[i][0],i))

    flenghts.close()
    fchrName.close()

    res = ["chr_lengths.txt", pchrNames]

    return res



@app.route("/uploadHic", methods=["POST"])
def uploadHic():
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        session['uid'] = uuid.uuid4();

    root = os.path.join(UPLOAD_FOLDER, str(session["uid"]))
    content = {}
    try:
        ## check if we have any file uploaded    
        if not os.path.exists(root):
            os.mkdir(root);

        ## check if the 'Hic' and 'chrlengths' files are sent
        if not all(name in request.files.keys() for name in ['Hic', 'chrLengths']):
            content = {'error': "Both of HiC and chromosome lengths should be uploaded"}

        ## upload the Hi-C matrix
        hicfile = request.files['Hic']
        hicFileName = secure_filename(hicfile.filename)

        method = request.form["method"].encode("ascii")

        dirName = os.path.splitext(os.path.basename(hicFileName))[0]
        dirName = os.path.join(root, method + "_" + dirName)

        if not  os.path.exists(dirName):
            os.mkdir(dirName)

        hicUploadPath = os.path.join(dirName, hicFileName)
        hicfile.save(hicUploadPath)

        ## upload the chromosome lengths file

        lengthsFile = request.files['chrLengths']
        chrlenFileName = secure_filename(lengthsFile.filename)
        lengthsUploadPath = os.path.join(dirName, chrlenFileName)

        lengthsFile.save(lengthsUploadPath)

        ## check how many columns are in the lengths file
        f = open(lengthsUploadPath)
        line = f.readline()
        line = line.strip()
        line = line.split()

        if(len(line)>2):
            content = {"error": "The lengths file should contain a maximum of 2 columns"}
            Exception(content)

        if(len(line) ==2):
            f.close()
            res = extractChrName(dirName, lengthsUploadPath)
            chrlenFileName = res[0]
        else:
            pname = os.path.join(dirName, "chr_names.txt")
            fname = open(pname, "w")
            lengths = np.loadtxt(lengthsUploadPath)
            for i in range(lengths.shape[0]):
                fname.write("chr%s\t%s\n" % (i+1, i+1))

            fname.close()

        resolution = int(request.form['resolution'].encode('ascii'))

        normalize = False
        if request.form["normalize"].encode("ascii") == "true" :
            normalize = True

        app.logger.error("initiating a spatialModel class")
        modelprep = spatialModel()
        app.logger.error("spatialModel preparing folder")
        modelprep.prepareFolder(root, resolution, chrlenFileName, hicFileName, method, normalize)
        app.logger.error("finished folder preparation and prediction")
        content = {'success': 1}
    except Exception as e:
        app.logger.error("sessionID: {0} Function: UploadHic Error: {1}".format(str(session["uid"]), e))
        content = {'error': "Error while uploading file"}

    return Response(json.dumps(content), mimetype='application/json')



@app.route('/buildModel/<method>', methods=['GET'])
def buildModel(method):
    content = {'genome'}
    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
        content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
        return Response(json.dumps(content), mimetype='application/json')

    root = os.path.join(UPLOAD_FOLDER, str(session["uid"]))

    try:

        pastisModel = spatialModel()
        method = method.encode('ascii')

        results = pastisModel.predict3D(method, root)

        content = {'success': "model predicted successfully, please check the models list"}

        cfgfile = os.path.join(root, 'config.ini')

        options = parse(cfgfile)
        filename = options['output_name'].replace(".pdb", '.bed')
        filename = os.path.basename(filename)
        modelPath = os.path.join(root, 'model')
        #modelPath = root

        if not os.path.exists(modelPath):
            os.mkdir(modelPath)

        check_model_exists(filename, modelPath, options['resolution'])

        newCfgPath = os.path.join(root, os.path.dirname(options['counts']), 'config.ini')
        shutil.move(cfgfile, newCfgPath)
        content['genome'] = getAvailableGenome()

    except IOError as e:
        content = {'error': "Error while processing data"}

    return Response(json.dumps(content), mimetype="application/json")


@app.route('/displayHic/<genome>/<chromosome1>/<chromosome2>/<col>', methods=['GET'])
def displayHic(genome, chromosome1,chromosome2, col):
    ##return content = {'%s,%s,%s,%s' % (genome,chromosome1,chromosome2))
    app.logger.error("displaying genome= %s, chr1=%s chr2=%s" % (genome, chromosome1,chromosome2))    
    genomes = getAvailableGenome()

    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]

    if len(species) == 0:
        content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
        return Response(json.dumps(content), mimetype='application/json')

    root=''
    if (species[0]['type'] == "prebuilt"):
        root = "./data"

    else:
        if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            content = {'error': "It seems that the previous session was closed\n please re-upload your data"}
            return Response(json.dumps(content), mimetype='application/json')
        else:
            root = os.path.join(UPLOAD_FOLDER, str(session["uid"]))

    ## always write to the users workspace
    outpath = os.path.join(UPLOAD_FOLDER, str(session["uid"]))

    app.logger.error("gethic: output path is :%s" % outpath)
    try:
        sModel = spatialModel()
        app.logger.error("getting hic" )
        res = sModel.getHic(root, genome, float(chromosome1), float(chromosome2), outpath, int(col))
        print res
	print outpath
        if res is None:			
            content = {'error': 'error while processing data, no results'}
        else:
            content = res
            

    except Exception as e:
        content = {'error': "Error while processing data %s" % str(e)}

    return Response(json.dumps(content), mimetype="application/json")


@app.route("/getHicImg/<imgName>")
def getHicImg(imgName):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    imgPath = os.path.join(UPLOAD_FOLDER, str(session["uid"]), imgName)
    if not os.path.exists(imgPath):
        ##FIXME : return an error image
        return

    return send_file(imgPath, mimetype='image/png')


@app.route("/data/<genome>/<file>")
def data(genome,file):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    filePath = os.path.join("./data",genome,file);
    if not os.path.exists(filePath):
        ##FIXME : return an error image
        return

    session["genome"] = genome
    return send_file(filePath, mimetype='text/plain')


@app.route("/tmp/<sessionID>/model/<file>")
def getTmp(sessionID, file):

    if ('uid' not in session.keys() or session['uid'] is None or len(str(session['uid'])) == 0):
            ## FIXME: return an error image
            return

    if str(session['uid']) != sessionID:
        return

    filePath = os.path.join(UPLOAD_FOLDER,sessionID,"model",file);
    if not os.path.exists(filePath):
        ##FIXME : return an error message
        return

    return send_file(filePath, mimetype='text/plain')


@app.route("/userManual/")
def userManual():
    filePath = os.path.join(app.root_path,"/data/")
    return send_from_directory(filePath, 'UserManual.pdf')

app.add_url_rule("/annotRegions", view_func=annotRegions.as_view("annotRegions"), methods=["GET", "POST"])





if __name__ == '__main__':
    os.chdir("/Users/djekidelmohamednadhir1/PycharmProjects/hic3dviewer/hicViewer")
    host = '0.0.0.0'
    app.run(host, 5000)
