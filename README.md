# README #

**HiC-3DViewer** is an interactive web-based tool designed to provide an intuitive environment for investigators to facilitate the 3D exploratory analysis of Hi-C data. It contains   many useful visualization and  annotation functionalities.

The user manual and description of the installation details can be consulted at : `HiC3DViewer/hicViewer/static/data/`

![Screen Shot 2015-10-12 at 5.52.19 PM.png](https://bitbucket.org/repo/nnrpjM/images/366262424-Screen%20Shot%202015-10-12%20at%205.52.19%20PM.png)


**Downloading the repository**

You can directly clone the repository using:


```bash
    git clone https://nadhir@bitbucket.org/nadhir/hic3dviewer.git
```


To run the `HiC-3DViwer` you need first to make sure that all the depencies are installed


```bash
   cd hic3dviewer/
   pip install -r requirements.txt
```

**Run HiC-3DViwer using python directly**

You can then specify `autoapp.py` as our entry point.

- In Windows

```bash
   set FLASK_APP=autoapp.py
   flask run -h 0.0.0.0
```

- In unix

```bash
   export FLASK_APP=autoapp.py
   flask run -h 0.0.0.0
```


In your browser go to `localhost:5000` if you are running it in own computer or `<serverip>:5000` if you are running in a server whith an ip `serverip`.

**Using the docker image**

Because some users had some dificulties running HiC-3DViewer and because I don't have acess to the web-version on Tsinghua server, I created a docker image to make it easy to run HiC-3DViwer.


To build the image, the easiest way it to use `docker-compose` as follow:


```bash
   git clone https://nadhir@bitbucket.org/nadhir/hic3dviewer.git
   cd hic3dviewer/
   docker-compose build
```


When the image is built, you have two options, you can just go to the app directory and write


```bash
    docker-compose up
```
If your docker image is in another directory you can do 


```bash
     docker-compose -f <destination_file/docker-compose.yml> up
```

The app should be running.

In your browser go to :


```bash
   localhost:5000
```

HiC-3DViewer should display.
