from flask_bcrypt import Bcrypt
from flask_caching import Cache
from flask_debugtoolbar import DebugToolbarExtension
from flask_compress import Compress

bcrypt = Bcrypt()
cache = Cache()
debug_toolbar = DebugToolbarExtension()
compress = Compress()