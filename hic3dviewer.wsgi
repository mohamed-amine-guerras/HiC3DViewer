## This file is only needed in the case you want to use APACHE
## insall mod_wsgi in APACHE and and configure you webhost to point the this file
##in case you want to test on your computer without using APACHE, run:
##
## python hicViewer/__init__.py
##
## make sure flask is installed
##

import sys
import os

## Add paths to pastis and other libraries if installed elsewere 
sys.path = [ '/home/software/otherlibs']

sys.path.append("/home/web/html/HiC3DViewer/")
os.chdir("/home/web/html/member/nadhir/HiC3DViewer/")
from hicViewer import *
os.chdir("/home/web/html/member/HiC3DViewer/hicViewer")
application = app


