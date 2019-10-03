from hicViewer.chrMesh import *
from hicViewer.spatialModel import *
from hicViewer import settings
from flask import current_app as app
from flask import session

import numpy as np
import json
import os



def getAvailableGenome():
    ## load the info.json in the data folder
    fileName = os.path.join(settings.DATA_DIR, "info.json")
    with open(fileName, 'r') as genomes_info:
        genomes_data = json.load(genomes_info)

    ## load the info.json in the session fold if it exists
    if ('uid' in session.keys()):
        fileName = os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), 'model', "info.json")
        if (os.path.exists(fileName)):
            with open(fileName, 'r') as genomes_info:
                genomes_data2 = json.load(genomes_info)
            genomes_data.extend(genomes_data2)
    app.logger.info("returning available genomes")
    return genomes_data



def get_interaction(chromosomes, genome, isIntra = True):

    genomes = getAvailableGenome()

    ## Check if our genome is there
    species = [x for x in genomes if x['name'] == genome]
    if (len(species) > 0 ):
        mesh = None;
        ## if the it is a pre-built genome load it from the data folder otherwise load it from the user's folder
        if (species[0]['type'] == "prebuilt"):
            genomePath = os.path.join(settings.DATA_DIR, species[0]['name'])
            modelPath = os.path.join(genomePath, species[0]['file'])
            mesh = chrMesh(genomePath)
        else:
            genomePath = os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), species[0]['name'])
            modelPath = os.path.join(settings.UPLOAD_FOLDER, str(session['uid']), 'model', species[0]['file'])
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


## Check if the provided coordinate data structure is ok.
def checkCoords(data):

    if len(["xcoord", "ycoord", "chr1", "chr2"] & data.viewkeys()) != 4:
        return False

    if len(data["xcoord"])== 0 or len(data["ycoord"]) == 0:
        return False

    if len(data["xcoord"]) != len(data["ycoord"]):
        return False

    return True


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


def check_model_exists(filename, modelPath, sessionid, resolution):
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
                              'modelPath': os.path.join("tmp",sessionid,"model"),
                              'type': 'user'})

    # if this is the first model then just create the file
    else:        
        modelInfo = [{'resolution': resolution,
                      'name': os.path.splitext(os.path.basename(filename))[0],
                      'file': filename,
                      'modelPath': os.path.join("tmp",sessionid,"model"),
                      'type': 'user'
                     }]
    # update the info.json file
    with open(modelInfoFile, 'w') as f:
        json.dump(modelInfo, f)

