from flask import  views, Response, request, session
from hicViewer.utils import *
from hicViewer.chrMesh import *
import json
import os

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
