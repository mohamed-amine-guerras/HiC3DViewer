import uuid;

from flask import Flask, render_template
from hicViewer.extensions import bcrypt, cache,  compress
from hicViewer.classes import annotRegions



def create_app(config_object='hicViewer.settings'):
    """
    :param config_object: The configuration object to use.
    """
    app = Flask(__name__.split('.')[0])
    app.config.from_object(config_object)
    register_extensions(app)
    register_blueprints(app)
    register_errorhandlers(app) 

    app.add_url_rule("/annotRegions", view_func=annotRegions.as_view("annotRegions"), methods=["GET", "POST"])       

    return app


def register_extensions(app):
    """Register Flask extensions."""
    bcrypt.init_app(app)    
    cache.init_app(app)      
    compress.init_app(app)
    return None


def register_blueprints(app):
    """Register Flask blueprints."""
    from hicViewer.main.views import main        


    app.register_blueprint(main)    
    return None


def register_errorhandlers(app):
    """Register error handlers."""
    def render_error(error):
        """Render error template."""
        # If a HTTPException, pull the `code` attribute; default to 500
        error_code = getattr(error, 'code', 500)
        return render_template('{0}.html'.format(error_code)), error_code
    for errcode in [401, 404, 500]:
        app.errorhandler(errcode)(render_error)
    return None

def register_logger(app):
    import logging
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler('./tmp/python.log', maxBytes=1024 * 1024 * 100, backupCount=20)
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(formatter)
    app.logger.addHandler(file_handler)




