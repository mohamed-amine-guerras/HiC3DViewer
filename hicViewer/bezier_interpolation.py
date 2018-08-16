import bezier
import math
import numpy as np


def getMissingCoords(X, missing, resolution):

    bins = np.array(range(len(X)), dtype= float) * resolution
    bins = bins / max(bins)
    coords = np.zeros((len(X), 4))
    coords[:, 0] = bins
    coords[:, 1:] = X
    coords = coords[missing == False]
    coords = np.asfortranarray(coords)

    # Do bezier interpolation
    curve = bezier.Curve.from_nodes(coords)

    # Because the module bezier uses the min and max values as the limits of [0,1]
    # need to convert the corrdinates to that interval
    min_coord = min(coords[:, 0])
    max_coord = max(coords[:, 0])

    missing_bins = bins[missing]
    missing_bins = (missing_bins - min_coord) / (max_coord - min_coord)

    missing_coords = curve.evaluate_multi(missing_bins)

    X[missing] = missing_coords[:,1:]

    return X

def interpolateMissingData(X,missing, resolution, lengths):
    """
    Use the bezier module to interpolate the missing regions
    :param X:
    :param missing:
    :param resolution:
    :param lengths:
    :return:
    """

    lengths = np.array([math.ceil(x/resolution) for x in lengths],dtype=int)
    cumsum_lengths = lengths.cumsum()
    cumsum_lengths = np.append([0],cumsum_lengths)

    for i in range(len(lengths)):
        ## get all the interactions in a given chromosome
        inchrom = X[cumsum_lengths[i]:cumsum_lengths[i+1]]
        missingInChrom = missing[cumsum_lengths[i]:cumsum_lengths[i + 1]]
        ## if there are some missing values in that chromosome
        if(missingInChrom.sum() > 0):
            X[cumsum_lengths[i]:cumsum_lengths[i + 1]] = getMissingCoords(inchrom, missingInChrom,resolution)

    return(X)


