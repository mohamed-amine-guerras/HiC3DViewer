FROM continuumio/anaconda
MAINTAINER Mohamed Nadhir Djekidel <djek.nad@gmail.com >


RUN apt-get update && apt-get dist-upgrade -y

# I know this part should be annoying sorry
RUN  apt-get install -y --no-install-recommends \
  apt-utils \
  automake \
  bash \
  binutils \
  perl \
  build-essential \
  bzip2 \
  c++11 \
  cdbs \
  cmake \
  cron \
  curl \
  dkms \
  dpkg-dev \
  g++ \
  gpp \
  gcc \
  gfortran \
  libblas-dev \
  libatlas-dev \
  libbz2-dev \
  liblzma-dev \
  libpcre3-dev \
  libreadline-dev \
  llvm \
  libconfig-dev \
  zlib1g-dev \
  libX11-dev libXpm-dev libXft-dev libXext-dev




## install pastiss
RUN wget https://github.com/hiclib/pastis/archive/v0.2.2.tar.gz &&
     tar -zxvf v0.2.2.tar.gz &&
     cd pastis-0.2.2 &&
     python setup.py install

#Cleanup the temp dir
RUN rm -rvf /tmp/*

#Clean up APT when done.
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    apt-get autoclean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

# insall dependencies
RUN conda install -c bioconda bx-python

# Copy HiC3D-Viewer
ADD . /app
WORKDIR /app/hicViewer

ENTRYPOINT ["python"]
CMD ["__init__.py"]









