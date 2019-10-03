import re;
import os;
from collections import  defaultdict;
from math import ceil, floor
import random
import numpy as np
from pastis.config import parse
from bx.intervals.intersection import IntervalTree;


class chrMesh(object):
    """This class reads the 3D coordinates of chromosome and convert it into an array"""

    def __init__(self, root):
        self.position = defaultdict(lambda: list())
        self.interactions = defaultdict(lambda: list())
        self.transInteractions = []
        self.root = root
        self.chrSize = []
        self.hic = []

    def getCoordinates(self, genome):
        
        fileName = os.path.join(self.root, genome)

        nbLine = 0
        with open(fileName, "r") as coordinates:            
            
                for position in coordinates:
                     if(nbLine >0):                        
                        pos = re.split('\s+', position.strip())

                        if(len(pos) != 5):
                            raise SyntaxError('Only three dimentional coordinates are supported')

                        ## ceck if the digits are float

                        for i in range(5):
                            try:
                                float(pos[i]);
                            except:
                                raise SyntaxError('Only numbers are accepted');                

                        #if(pos[0] in chr):
                        self.position[pos[0]].append({'locus': pos[1], 'x': float(pos[2]), 'y': float(pos[3]), 'z': float(pos[4])})
                     nbLine +=1

    # TODO: This part needs re-writing
    # take 10% of the interactions
    # Find the bins with witch they interact
    # Return the 3D coordinates
    def getIntra_old(self,fname, chr, resolution):
       
        filename = os.path.join(self.root, fname)
        
        with open(filename,'r') as interactions:
            content = interactions.readlines()

        content = content[1:]
        pattern = '^%s\t' % chr
        inChr =[x for x in content if re.search(pattern,x)]

        selection = int(ceil(len(inChr) * 0.1))
        ## Select only 10% of interactions
        toUse = random.sample(inChr, selection )
        nbLine = 1
        for inter in toUse:            
            pos = re.split('\s+', inter.strip())
            if(len(pos) < 5):
                raise Exception('The file should at leat have 5 columns : chr1\tlocus1\tchr2\tlocus2\tfreq');

            for i in range(5):
                try:
                    float(pos[i])
                except:
                    raise SystemError('Line %d : Should be numeric' % (nbLine +1 ))

            loc1 = 0
            loc2 =0
            #I don't know why I did this ???
            if(float(pos[1]) < 5000):
                loc1 =   floor(float(pos[1])/ float(resolution))
            else:
                loc1 =   floor((float(pos[1])-5000)/ 500 +5)

            if(float(pos[3]) < 5000):
                loc2 =   floor(float(pos[3])/ float(resolution))
            else:
                loc2 =   floor((float(pos[3])-5000)/ 500 +5)

            locusIDs = [ loc1 ,loc2];
            
            self.interactions[pos[0]].append({'chr': chr, 'pos1' : locusIDs[0],'pos2': locusIDs[1], 'freq': pos[4]});

    def getInter_old(self,fname, resolution):
       
        filename = os.path.join(self.root, fname)
        
        with open(filename,'r') as interactions:
            content = interactions.readlines()

        content = content[1:]        

        ## Select only 10% of interactions
        toUse = random.sample(content, ceil(len(content) * 0.01))        


        for inter in toUse:            
            pos = re.split('\s+', inter.strip())
            if(len(pos) < 5):
                raise Exception('The file should at leat have 5 columns : chr1\tlocus1\tchr2\tlocus2\tfreq');

            for i in range(5):
                try:
                    float(pos[i])
                except:
                    raise SystemError('Line %d : Should be numeric' % (nbLine +1 ))

            loc1 = 0
            loc2 =0
            if(float(pos[1]) < 5000):
                loc1 =   floor(float(pos[1])/ float(resolution))
            else:
                loc1 =   floor((float(pos[1])-5000)/ 500 +5)

            if(float(pos[3]) < 5000):
                loc2 =   floor(float(pos[3])/ float(resolution))
            else:
                loc2 =   floor((float(pos[3])-5000)/ 500 +5)

            locusIDs = [ loc1 ,loc2];
            
            self.transInteractions.append({'chr1': pos[0], 'pos1' : locusIDs[0],'chr2': pos[2] ,'pos2': locusIDs[1], 'freq': pos[4]});


    def getInter(self, hicPath, modelPath, resolution, chromosomes):

        self.transInteractions = []

        if not os.path.exists(modelPath) or not os.path.exists(hicPath):
            return

        self.loadModelinfo(hicPath)

        interactions = self.sampleInter(chromosomes, resolution)

        usedChr = np.unique(np.concatenate((interactions['chr1'], interactions['chr2'])))

        ranges = self.getChrs3Dposition(modelPath,resolution,usedChr)
        totalInter =len(interactions['x'])
        maxFreq= -1
        for i in range(totalInter):
            xBin = interactions['x'][i]
            xChr = interactions['chr1'][i]
            yBin = interactions['y'][i]
            yChr = interactions['chr2'][i]


            ## set the x and y positions relatively to their chromosome start
            xBin_rel = xBin - self.chrBins[xChr-1]
            yBin_rel = yBin - self.chrBins[yChr-1]

            bin1Overlaps = ranges[xChr].find(xBin_rel * resolution, (xBin_rel+1)*resolution)
            bin2Overlaps = ranges[yChr].find(yBin_rel * resolution, (yBin_rel+1)*resolution)

            if len(bin1Overlaps) > 0 and isinstance(bin1Overlaps, list):
                if len(bin1Overlaps) == 1:
                    bin1Overlaps = bin1Overlaps[0]
                else:
                    bin1Overlaps = bin1Overlaps[int(ceil(len(bin1Overlaps)/2))]

            if len(bin2Overlaps) > 0 and isinstance(bin2Overlaps, list):
                if len(bin2Overlaps) == 1 :
                    bin2Overlaps = bin2Overlaps[0]
                else:
                    bin2Overlaps = bin2Overlaps[int(ceil(len(bin2Overlaps)/2))]

            try:
                self.transInteractions.append({'chr1': xChr, 'pos1': bin1Overlaps['bin'],
                                                  'chr2': yChr, 'pos2': bin2Overlaps['bin'],
                                                   'freq': self.hic[xBin, yBin]})
                maxFreq = self.hic[xBin, yBin] if maxFreq < self.hic[xBin, yBin] else maxFreq
            except  Exception as exp:
               print(exp)
            #for bin1 in bin1Overlaps:
            #    for bin2 in bin2Overlaps:
            #        self.transInteractions.append({'chr1': xChr, 'pos1': bin1['bin'],
            #                                      'chr2': yChr, 'pos2': bin2['bin'],
            #                                       'freq': self.hic[xBin, yBin]})
        return maxFreq

    def getIntra(self, hicPath, modelPath, chr, resolution):

        if not os.path.exists(hicPath):
            return

        self.loadModelinfo(hicPath)

        interactions = self.sampleIntra(chr, resolution)

        ranges = self.getChrs3Dposition(modelPath, resolution, [chr])

        chrStart = ceil(self.chrSize[:chr-1].sum()/resolution)
        maxFreq = -1
        for i in range(len(interactions['x'])):
            ##print "processing position %s" % i
            xBin = interactions['x'][i]
            yBin = interactions['y'][i]

            bin1Overlaps = ranges[chr].find(xBin * resolution, (xBin+1)*resolution)
            bin2Overlaps = ranges[chr].find(yBin * resolution, (yBin+1)*resolution)

            ##print "gettng bin OVERLAPS"
            ## if there is a lot of bins involved take the middle one
            ## generally a bin is not represented by many bins
            if len(bin1Overlaps) > 1:
                bin1Overlaps = bin1Overlaps[int(ceil(len(bin1Overlaps)/2))]

            if len(bin2Overlaps) > 1:
                bin2Overlaps = bin2Overlaps[int(ceil(len(bin2Overlaps)/2))]

            ##print "len(en(bin1Overlaps)) = %s" % len(bin1Overlaps)
            ##print "len(en(bin2Overlaps)) = %s" % len(bin2Overlaps)
            try :
                ##print "appending"
                self.interactions[chr].append({'chr1': chr, 'pos1': bin1Overlaps['bin'],
                                                       'chr2': chr, 'pos2': bin2Overlaps['bin'],
                                                       'freq': self.hic[chrStart + xBin, chrStart + yBin]})
                ##print "getting max freq"
                maxFreq = self.hic[chrStart + xBin, chrStart + yBin] if maxFreq < self.hic[chrStart + xBin, chrStart + yBin] else maxFreq
            except Exception as e:
                print(e);
            #for bin1 in bin1Overlaps:
            #    for bin2 in bin2Overlaps:
            #        self.interactions[chr].append({'chr1': chr, 'pos1': bin1['bin'],
            #                                       'chr2': chr, 'pos2': bin2['bin'],
            #                                       'freq': self.hic[chrStart + xBin, chrStart + yBin]})
            
        return maxFreq

    def maskIntraInteractions(self, resolution):

        for i in range(self.chrSize.shape[0]):
            startPos = ceil(self.chrSize[:i].sum()/resolution)
            endtPos = ceil(self.chrSize[:i+1].sum()/resolution)
            self.hic[startPos:endtPos, startPos:endtPos] = 0

    def loadModelinfo(self, hicPath):

        cfgFile = os.path.join(hicPath, "config.ini")
        options = parse(cfgFile)

        hicFile = options['counts']
        hicFile = os.path.join(hicPath, os.path.split(hicFile)[1])
        if not os.path.exists(hicFile):
            return

        self.hic = np.load(hicFile)

        lengthsFile = options['organism_structure']
        lengthsFile = os.path.join(hicPath, os.path.split(lengthsFile)[1])

        if not os.path.exists(lengthsFile):
            return

        self.chrSize = np.loadtxt(lengthsFile)




    # Sample 10% of the Intra chromosomal interaction
    def sampleIntra(self, chrID, resolution):
        ## Get the position of the chromosome in the whole matrix
        startPos = ceil(self.chrSize[:(chrID-1)].sum() / resolution)
        endPos = ceil(self.chrSize[:chrID].sum()/resolution)
        ## Get the HI-C matrix
        chrHic = self.hic[startPos:endPos, startPos:endPos]
        pos = np.nonzero(chrHic)
        # remove very big a very small values
        # sample only from more or less significant values
        small = np.percentile(chrHic[pos[0], pos[1]], 10)
        big = np.percentile(chrHic[pos[0], pos[1]], 90)
        pos = np.where(chrHic <= small)
        chrHic[pos[0], pos[1]] = 0
        pos = np.where(chrHic >= big)
        chrHic[pos[0], pos[1]] = 0
        #chrHic[pos[0], pos[1]] = (chrHic[pos[0],pos[1]] - chrHic[pos[0],pos[1]].min()) / ( chrHic[pos[0],pos[1]].max() - chrHic[pos[0],pos[1]].min())
        self.hic[startPos:endPos, startPos:endPos] = chrHic
        ## Get the non-zero elements
        interactPos = np.nonzero(chrHic)
        nbInteract = np.count_nonzero(chrHic)

        ## Sample 10% of the interactions
        nbSample = int(ceil(nbInteract * 0.1)) if nbInteract <= 6000 else int(ceil(nbInteract * 0.01))

        samplePos = random.sample(range(nbInteract), nbSample)

        xpos = np.array(interactPos[0][samplePos], dtype= np.int64)
        ypos = np.array(interactPos[1][samplePos], dtype= np.int64)

        return {"x": xpos, "y": ypos}

    def maskOtherChromosomes(self, chromosomes, resolution):

        allChr = list(range(len(self.chrSize)))
        toUse = [x for x in allChr if not x+1 in chromosomes]
        for chrom in toUse:
            start = ceil(self.chrSize[:chrom].sum()/ resolution)
            end = ceil(self.chrSize[:(chrom+1)].sum()/resolution)
            self.hic[start:(end+1),:] = 0
            self.hic[:,start:(end+1)] = 0


    def sampleInter(self,chromosomes, resolution):

        self.maskIntraInteractions(resolution)

        if chromosomes is not None:
            self.maskOtherChromosomes(chromosomes, resolution)

        pos = np.nonzero(self.hic)

        small = np.percentile(self.hic[pos[0], pos[1]], 10)
        big = np.percentile(self.hic[pos[0], pos[1]], 90)

        pos = np.where(self.hic <= small)
        self.hic[pos[0], pos[1]] = 0
        pos = np.where(self.hic >= big)
        self.hic[pos[0], pos[1]] = 0

        #self.hic[pos[0], pos[1]] = (self.hic[pos[0],pos[1]] - self.hic[pos[0],pos[1]].min()) / ( self.hic[pos[0],pos[1]].max() - self.hic[pos[0],pos[1]].min())
        self.hic = self.hic/ self.hic.max()

        #pos = np.nonzero(self.hic)
        #md = np.median(self.hic[pos[0], pos[1]])
        #pos  = np.where(self.hic <md)
        #self.hic[ pos[0], pos[1]] = 0
        ## Get the non-zero elements
        interactPos = np.nonzero(self.hic)
        nbInteract = np.count_nonzero(self.hic)

        ## Sample 10% of the interactions if we have a relatively small number of interactions
        nbSample = ceil(nbInteract * 0.1) if nbInteract < 5000 else ceil(nbInteract * 0.01)
        if nbSample >= 1000:
            nbSample = 1000 # We restrict 1000 interaction

        nbSample = int(nbSample)

        ## Get the used chromosomes
        self.chrBins = np.array([ceil(self.chrSize[:x].sum()/resolution) for x in range(self.chrSize.shape[0]+1)])

        chromosoms=[]
        [chromosoms.extend([x+1] * (self.chrBins[x+1] - self.chrBins[x])) for x in range(self.chrBins.shape[0]-1)]

        ## convert them to int array to use them as index
        samplePos = random.sample(range(nbInteract), nbSample)

        xpos = np.array(interactPos[0][samplePos], dtype= np.int64)
        ypos = np.array(interactPos[1][samplePos], dtype= np.int64)

        ## convert it to np.array to index it
        chromosoms = np.array(chromosoms, dtype=np.int64)
        ##chromosoms = chromosoms[samplePos]
        # get the chromosomes associated with each position
        xchr = chromosoms[xpos]
        ychr = chromosoms[ypos]

        return {"x": xpos, "y": ypos, "chr1": xchr, "chr2": ychr}




    def getAnnotation_direct(self, fname, genome, resolution):


        domains = defaultdict(lambda: list())

        ## Read the annotation file per-line
        with open(fname) as f :
            content = f.read().splitlines();

        ## Get the coordinates
        cpt = 1
        minFreq = -1;
        maxFreq = 0;
        for line in content:
            name = "Location_%d" % cpt
            freq = 1
            fields  = line.strip().split()
            chr, start, end = int(fields[0]), float(fields[1]), float(fields[2])
            if(len(fields) >= 4) :
                freq = float(fields[3])
                minFreq = freq if (freq < minFreq or minFreq < 0) else minFreq
                maxFreq = freq if freq > maxFreq else maxFreq

            if(len(fields) >= 5): name = fields[4]

            pos = {'start': start, 'end': end, 'freq': freq, 'name': name}
            domains[chr].append(pos)

        coordinates = defaultdict(lambda: list());
        freqRange = 1 if maxFreq - minFreq ==0 else maxFreq - minFreq;

        for chr in domains.keys():
            for pos in domains[chr]:
                 binStart = ceil(pos['start']/resolution)
                 binStop = ceil(pos['end']/resolution)
                 info = {'binStart': binStart,
                         'binStop': binStop,
                         'freq': min((pos['freq'] - minFreq+1) / freqRange, 1),
                         'name': pos['name']}

                 coordinates[chr].append(info)


        return coordinates



    ## Get the bins that intersect with the provided regions
    def getChrs3Dposition(self, gName, resolution, usedChr):
        ranges = {}
        with open(gName) as f:
            content = f.read().splitlines();
        chrStart = 1
        for line in range(len(content) - 1):
            ## skip the header
            if (line > 0):
                fields = content[line].strip().split()
                nextfields = content[line + 1].strip().split()

                chrom, bin, x, y, z = int(fields[0]), int(fields[1]), float(fields[2]), float(fields[3]), float(
                    fields[4])
                chrom1, bin1, = int(nextfields[0]), int(nextfields[1])

                binLen = bin1 - bin if chrom1 == chrom else resolution - 2

                if chrom != chrom1: chrStart = line
                ## insert only chromosomes for which we have domains
                if chrom in usedChr:
                    if chrom not in ranges:
                        ranges[chrom] = IntervalTree()
                    ranges[chrom].insert(bin, bin + binLen, {'x': x, 'y': y, 'z': z, 'bin': line - chrStart})
                else:
                    ## we suppose the genome file is sorted
                    if chrom > max(usedChr):
                        break

        return ranges

    def GetInvolvedBins(self, domains, genome, maxFreq, minFreq, resolution):

        usedChr = domains.keys();
        gName = os.path.join(self.root, genome)

        ranges = self.getChrs3Dposition(gName, resolution, usedChr)## get the overlapping possitions

        coordinates = defaultdict(lambda: list())
        ## for each annotation get the overlapping regions
        resolution = float(resolution)
        cpt = 1
        for chr in domains.keys():

            freqRange = 1 if (maxFreq[chr] - minFreq[chr] == 0) else maxFreq[chr] - minFreq[chr]

            for pos in domains[chr]:
                overlap = ranges[chr].find(pos['start'], pos['end'])

                ## if there are overlapping regions add them
                if (len(overlap) > 0):
                    binStart = -1
                    binStop = 0

                    for x in overlap:
                        if (binStart == -1 or x['bin'] < binStart):
                            binStart = x['bin']
                        if (x['bin'] > binStop):
                            binStop = x['bin']

                    info = {'binStart': binStart,
                            'binStop': binStop,
                            'freq': min((pos['freq'] - minFreq[chr] + 1) / freqRange, 1),
                            'name': pos['name']}

                    if minFreq[chr] == -1:
                        info['region'] = pos['region']

                    coordinates[chr].append(info)
        return coordinates



    def getAnnotationFromFile(self, fname, genome, resolution):


        domains = defaultdict(lambda: list())

        with open(fname) as f :
            content = f.read().splitlines();

        cpt = 1
        minFreq = defaultdict(lambda : -1)
        maxFreq = defaultdict(lambda : 0);
        for line in content:
            name = "Location_%d" % cpt
            freq = -1
            fields = line.strip().split()
            if len(fields) == 0:
                continue
            chr, start, end = int(fields[0]), float(fields[1]), float(fields[2])
            if(len(fields) >= 4) :
                freq = float(fields[3])
                if freq != -1:
                    minFreq[chr] = freq if (freq < minFreq[chr] or minFreq[chr] < 0) else minFreq[chr]
                    maxFreq[chr] = freq if freq > maxFreq[chr] else maxFreq[chr]

            if(len(fields) >= 5): name = fields[4]

            pos = {'start': start, 'end': end, 'freq': freq, 'name': name}
            domains[chr].append(pos)
            cpt += 1

        binsPos = self.GetInvolvedBins(domains, genome, maxFreq, minFreq, resolution)
        res = {"bins": binsPos, "genomicRegions": domains}
        return res;

    def getAnnotationFromList(self, regions, genome, resolution):

        domains = defaultdict(lambda: list())
        minFreq = defaultdict(lambda: -1)
        maxFreq = defaultdict(lambda: 0)

        cpt = 1
        for line in regions:
            name = "Location_%d" % cpt
            freq = -1
            region = ''
            if len(line) == 0:
                continue
            chr = int(line[0])
            if(len(line) >= 4) :
                freq = float(line[3])
                if freq != -1:
                    minFreq[chr] = freq if (freq < minFreq[chr] or minFreq[chr] < 0) else minFreq[chr]
                    maxFreq[chr] = freq if freq > maxFreq[chr] else maxFreq[chr]

            if(len(line) >= 5): name = line[4]
            if(len(line) >= 6): region = line[5]

            pos = {'start': int(line[1]), 'end': int(line[2]), 'freq': freq, 'name': name, 'region': region}

            domains[chr].append(pos)
            cpt += 1

        return self.GetInvolvedBins(domains, genome, maxFreq, minFreq, resolution)
