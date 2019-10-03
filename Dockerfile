FROM continuumio/anaconda:latest
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
  libatlas-base-dev \
  libbz2-dev \
  liblzma-dev \
  libpcre3-dev \
  libreadline-dev \
  llvm \
  libconfig-dev \
  zlib1g-dev 



# Set the PATH (sometimes it cannot find pip)
ENV PATH /opt/conda/bin:$PATH


# insall dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt


#Clean up APT when done.
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    apt-get autoclean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/


# Copy HiC3D-Viewer
ADD . /app
WORKDIR /app

# Specify the entry point
ENV FLASK_APP=autoapp.py

EXPOSE 5000
CMD ["flask","run","-h","0.0.0.0"]

