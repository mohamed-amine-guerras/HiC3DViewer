"""Application configuration.

Most configuration is set via environment variables.

For local development, use a .env file to set
environment variables.
"""
from environs import Env
import os

env = Env()
env.read_env()

ENV = env.str('FLASK_ENV', default='production')
DEBUG = ENV == 'development'
BCRYPT_LOG_ROUNDS = env.int('BCRYPT_LOG_ROUNDS', default=13)
DEBUG_TB_ENABLED = DEBUG
DEBUG_TB_INTERCEPT_REDIRECTS = False
CACHE_TYPE = 'simple'  # Can be "memcached", "redis", etc.
UPLOAD_FOLDER=os.path.join(os.path.dirname(os.path.abspath(__file__)),"tmp")
SECRET_KEY = env.str("SECRET_KEY")
DATA_DIR= os.path.join(os.path.dirname(os.path.abspath(__file__)),"data")