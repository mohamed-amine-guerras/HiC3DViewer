# -*- coding: utf-8 -*-
"""
Created on Tue Dec  9 20:33:34 2014

@author: nadhir
"""
from __future__ import print_function, unicode_literals

import logging
from datetime import datetime

from pastis.algorithms import run_mds, run_nmds, run_pm1, run_pm2
from pastis.config import parse
from math import ceil
import matplotlib
matplotlib.use('Agg')
#print("loading matplot.lib")
import matplotlib.pyplot as plt
#print("loading symLognorm")
from matplotlib.colors import SymLogNorm
import numpy as np
import re
import os
#from gridmap import Job, process_jobs


class spatialModel(object):
    """This class reads a Hi-C matrix, chromosome lengths and do the 3D prediction"""

    def __init__(self):
        #logging.captureWarnings(True)
        #logging.basicConfig(format=('%(asctime)s - %(name)s - %(levelname)s - ' +
        #                        '%(message)s'), level=logging.INFO)
        self.method = {
            'MDS': lambda directory: run_mds(directory),
            'NMDS': lambda directory: run_nmds(directory),
            'PM1': lambda directory: run_pm1(directory),
            'PM2': lambda directory: run_pm2(directory)
        };
        self.MDSPATH ="/home/web/html/member/nadhir/.local/bin/MDS_all";
        self.PMPATH="/home/web/html/member/nadhir/.local/bin/PM_all"
        self.colors  = [plt.cm.YlOrRd, plt.cm.YlOrBr, plt.cm.YlGnBu, plt.cm.YlGn, plt.cm.Reds, plt.cm.RdPu, plt.cm.Purples,
                        plt.cm.PuRd, plt.cm.PuBuGn, plt.cm.PuBu, plt.cm.OrRd, plt.cm.Oranges, plt.cm.Greys, plt.cm.Greens,
                        plt.cm.GnBu, plt.cm.BuPu, plt.cm.BuGn, plt.cm.Blues];

    def predict3D(self, method, directory):
        try:
             
            #job = Job(self.method[method], directory, queue='all.q')
            #job_outputs = process_jobs(functionJobs, max_processes=8)
            #for (i, result) in enumerate(job_outputs):
            #     print("Job {0}- result: {1}".format(i, result))
            
            self.method[method](directory)
            pattern  = "( MDS\.(log|sh)$ ) | ( wish_distances\.txt )  | (\.tmp\..+$) | (\.pdb\.txt)"
            ## remove the other files
            for f in  os.listdir(directory):
                if re.search(pattern, f):
                    os.remove(f)
            return (1);
        except Exception as e:
            pass

    def convertToMatrix5(self, contactMap):

        nrow = contactMap.shape[0]

        res = np.zeros((nrow,5))

        res[:, 0] = contactMap[:,0]
        res[:, 1] = (contactMap[:,1] + contactMap[:,2])/2
        res[:, 2] = contactMap[:,3]
        res[:, 3] = (contactMap[:,4] + contactMap[:,5])/2
        res[:, 4] = contactMap[:,6]
        return res

    def fixDataSizes(self, countsName, fname, folder, hiCnp, lengths, resolution):
        ## check if the lengths presented in the file are not larger than the matrix
        totalBins = lengths.sum()
        if totalBins > hiCnp.shape[0]:
            toUse = [i for i in range(len(lengths)) if lengths[:i].sum() <= hiCnp.shape[0]]
            ## if the provided lengths is less than the provided matrix
            ## trim the matrix
            if ( hiCnp.shape[0] - lengths[toUse].sum() > 0):
                if max(toUse) == len(lengths):
                    ## trim the HiC matrix
                    hiCnp = hiCnp[:lengths[toUse].sum(), :lengths[toUse].sum()]
            ## if the provided lengths are more than the matrix
            ## trim the lengths
            else:
                lengths[max(toUse)] -= lengths[toUse].sum() - hiCnp.shape[0]
                # toUse.append(max(toUse)+1)
                lengths = lengths[toUse] * resolution
                lengths = lengths.astype(np.int64)
                np.savetxt(fname, lengths, fmt=str("%i"))

                chrNamespath = os.path.join(folder, countsName, "chr_names.txt")
                if os.path.exists(chrNamespath):
                    chrNames = np.genfromtxt(chrNamespath, dtype=None)
                    f = open(chrNamespath, "w")
                    for p in toUse:
                        f.write("{0}\t{1}\n".format(chrNames[p][0], chrNames[p][1]))
                    f.close()

        return hiCnp


    def prepareFolder(self, folder, resolution, chrs, HiC):

        configFile = os.path.join(folder, 'config.ini')
        try:
            with open(configFile, 'w') as cfgFile:
                ## Fill in the configuration options
                ## TODO: make the mds and pm binnary path in config file
                cfgFile.write("[all]\n")
                cfgFile.write("binary_mds: {0}\n".format(self.MDSPATH))
                cfgFile.write("binary_pm: {0}\n".format(self.PMPATH))
                cfgFile.flush()
                print("flushing content to config.ini")
                countsName = os.path.splitext(os.path.basename(HiC))[0]
                ## set resoutlion
                cfgFile.write("resolution: %d\n" % resolution)
                ## set the pdb file name
                cfgFile.write("output_name: %s.pdb\n" % countsName)
                ## set the chromosomes length file name
                cfgFile.write("organism_structure: %s/%s\n" % (countsName, chrs))

                hicPath = os.path.join(folder, countsName, HiC)
                ## read HiC matrix
                hiCnp = np.loadtxt(hicPath)

                ## TODO : Check format
                hicOut = os.path.join(folder, countsName, "%s.npy" % countsName)
                ##  save it as a numpy object
                #np.save(hicOut, hiCnp)

                ## convert it into a matrix and then save it
                fname = os.path.join(folder, countsName, chrs)
                lengths = np.loadtxt(fname)
                lengths = np.array([ceil(x/resolution) for x in lengths])

                ## convert it into a matrix before loading it
                #print("Check if the matrix format needs a conversion or not")

                ## if it is a sequare matrix save it directly
                if(hiCnp.shape[0] == hiCnp.shape[1]):
                    if hiCnp.shape[0] > 2000:
                       raise(Exception("Hi-C matrices with less than 2000 bins are allowed in this online version, please download the full version at our website"))
                    hiCnp = self.fixDataSizes(countsName, fname, folder, hiCnp, lengths, resolution)
                    ##  save it as a numpy object
                    np.save(hicOut, hiCnp)
                else:
                    if not hiCnp.shape[1] in [3,5,7]:
                        raise(Exception("Data format incorrect : a 3, 5 or a 7 columned table should be provided"))

                    ## convert to the 5 columns format
                    if hiCnp.shape[1] ==3 :
                        hicSize = hiCnp[:,0:2].max()
                        hic = np.zeros((hicSize, hicSize))
                        ## we suppose bins numer are 1-based
                        hic[hiCnp[:,0].astype(int)-1, hiCnp[:,1].astype(int)-1] = hiCnp[:,2]
                        hic = self.fixDataSizes(countsName, fname, folder, hic, lengths, resolution)
                        if hic.shape[0] > 2000:
                          raise(Exception("Hi-C matrices with less than 2000 bins are allowed in this online version, please download the full version at our website"))
                        np.save(hicOut, hic)
                    else:
                        ## similar code to treat 7 and 5 columned hic

                        if(hiCnp.shape[1] ==7):
                           hiCnp = self.convertToMatrix5(hiCnp)

                        ## write the bin id for the left interactions
                        lengths1 = [lengths[:x].sum() for x in (hiCnp[:, 0]-1)]
                        hiCnp[:, 1] = np.ceil(hiCnp[:, 1]/resolution)
                        hiCnp[:, 1] = hiCnp[:, 1] + lengths1

                        ## write the bin id for the left interactions
                        lengths2 = [lengths[:x].sum() for x in (hiCnp[:, 2]-1)]
                        hiCnp[:, 3] = np.ceil(hiCnp[:, 3]/resolution)
                        hiCnp[:, 3] = hiCnp[:, 3] + lengths2
                        dim = hiCnp[:,(1,3)].max() +1
                        hic = np.zeros((dim,dim))
                        hic[hiCnp[:, 1].astype(int), hiCnp[:, 3].astype(int)] = hiCnp[:, 4]
                        hic = self.fixDataSizes(countsName, fname, folder, hic, lengths, resolution)
                        if hic.shape[0]:
                           raise(Exception("Hi-C matrices with less than 2000 bins are allowed in this online version, please download the full version at our website"))
                        np.save(hicOut, hic)

                cfgFile.write("counts: %s/%s.npy\n" % (countsName, countsName))

                ## set the number of chromosomes
                chrsFname = os.path.join(folder, countsName, chrs)

                ## remove the Hi-C text file as we don't need it anymore
                #os.remove(hicPath)
                nbchrs = sum(1 for line in open(chrsFname, 'r'))

                chrsToUse = ','.join(str(i+1) for i in xrange(nbchrs))

                ## write the chromosomes to use
                ## TODO: maybe add it as a selectable option by the user
                cfgFile.write("chromosomes: %s\n" % chrsToUse)
                #print("Written all, closing")
                ## close the file
                #cfgFile.close()
        except IOError as e:
            print("Error preparing file {0}".format(e))
            pass

    def getHic(self, directory, genome, chromosome1, chromosome2, outpath, col):

        cfgFile = os.path.join(directory, genome, "config.ini");

        if not os.path.exists(cfgFile):
            return

        options = parse(cfgFile)

        hicFile = options['counts']
        hicFile = os.path.join(directory, hicFile)

        if not os.path.exists(hicFile):
            return

        hicMap = np.load(hicFile)

        lengthsFile = options['organism_structure']
        lengthsFile = os.path.join(directory, lengthsFile)

        if not os.path.exists(lengthsFile) :
            return

        lengths = np.loadtxt(lengthsFile)
        resolution = float(options['resolution'])

        try:
            len(lengths)
        except TypeError:
            lengths = np.array([lengths])

        if chromosome1 > len(lengths) or chromosome1 < 1:
            return {'error': 'The provided chromosome does not exist'}

        startPos = lengths[:(chromosome1-1)].sum()
        startPos = ceil(startPos / resolution)

        endPos = lengths[:chromosome1].sum()
        endPos = ceil(endPos / resolution)

        startPos2 = lengths[:(chromosome2-1)].sum()
        startPos2 = ceil(startPos2 / resolution)

        endPos2 = lengths[:chromosome2].sum()
        endPos2 = ceil(endPos2 / resolution)

        hicChr = hicMap[startPos:endPos, startPos2:endPos2]

        ## Make symetric as in our case only the upper triangle has values
        ## copy just the non-zero elements
        noZero = np.nonzero(hicChr)
        for n in range(len(noZero[0])):
            i = noZero[0][n]
            j = noZero[1][n]
            ## in case the matrix in not square
            if(i < hicChr.shape[1] and j < hicChr.shape[0]):
                hicChr[j, i] = hicChr[i, j]

        #print("printing hic")
        fig, ax = plt.subplots()
        fig= ax.matshow(hicChr, cmap= self.colors[col], norm=SymLogNorm(1), origin='buttom')
        fig.axes.get_xaxis().set_visible(False)
        fig.axes.get_yaxis().set_visible(False)
        plt.axis('off')
        #print("printed")
        ## check if the outpath exists, if not create it
        if not os.path.exists(outpath):
            os.mkdir(outpath);

        imgName = "%s_%s_%s_%s.png" % (genome, chromosome1, chromosome2, int(col))
        figPath = os.path.join(outpath, imgName)
        plt.savefig(figPath, bbox_inches='tight', pad_inches = 0)

        chrInfo = []
        for chrom in  range(lengths.shape[0]):
            isDisplayed = chrom == (chromosome1 -1) or chrom == (chromosome2 -1)
            id = -1
            if chrom == (chromosome1 -1):
                id = 1 if chromosome1 != chromosome2 else 3
            else:
                if chrom == (chromosome2 -1): id = 2

            chrInfo.append({"chr": chrom+1,
                            "len": lengths[chrom],
                            'displayed': 1 if isDisplayed else 0,
                            'displayedChr': id
                           })

        res = {'chrInfo': chrInfo, 'imgUrl': imgName}
        return res


