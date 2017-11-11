###############################################################################
#
# some minor changes to the pastis.algorithms module to generate an output compatible with
# Hic3D-Viewer
#
###############################################################################

import os

import numpy as np
from pastis import fastio
from pastis.config import parse
from pastis.externals import iced
from pastis.io import _get_index
from pastis.optimization import MDS, PM1, PM2, NMDS
from scipy import sparse

max_iter = 5

scaling_factor = 1

###############################################################################

def centerInteractions(spatialModel, filename):

    center = spatialModel[:, 2:5].sum(axis=0) / spatialModel.shape[0]
    spatialModel[:, 2:5] = spatialModel[:, 2:5] - center

    spatialModel = spatialModel * scaling_factor

    rows = np.array(['chrom', 'locus', '3D_x', '3D_y', '3D_z'], dtype='|S20')[:, np.newaxis]

    with open(filename, 'a') as outfile:
        outfile.write("chrom\tlocus\t3D_x3D_y\t3D_z\n")
        np.savetxt(outfile,spatialModel, delimiter='\t', fmt='%s')




def writePredictedModel(X, filename,
                           lengths,
                           resolution):

    ncols = X.shape[1] + 2
    nrows = X.shape[0]

    outModel = np.zeros((nrows, ncols))
    outModel[:,2:] = X

    X = None

    # add the chromosome and locus number of each bead
    for i in range(len(outModel)):
        chri, loci =_get_index(i* resolution, lengths)
        outModel[i, 0] = chri
        outModel[i, 1] = loci

    centerInteractions(spatialModel= outModel, filename=filename)

    # write output
    #with open(filename, "w") as outfile :
    #    outfile.write("chrom", "locus",	"3D_x", "3D_y",	"3D_z\n")
    #    np.savetxt(outfile, outModel)



def run_mds(directory):
    if os.path.exists(os.path.join(directory,
                                   "config.ini")):
        config_file = os.path.join(directory, "config.ini")
    else:
        config_file = None

    options = parse(config_file)

    random_state = np.random.RandomState(seed=options["seed"])

    # First, compute MDS
    if options["lengths"] != "" and options["lengths"] != None:
        lengths = np.loadtxt(os.path.join(directory,
                                          options["lengths"]))
    else:
        lengths = None



    # if options["lengths"].endswith(".bed"):
    #     lengths = fastio.load_lengths(
    #         os.path.join(directory,
    #                      options["lengths"]))
    # else:
    #     lengths = None

    if options["counts"].endswith("npy"):
        counts = np.load(os.path.join(directory, options["counts"]))
    elif options["counts"].endswith(".matrix"):
        counts = fastio.load_counts(
            os.path.join(directory,
                         options["counts"]),
            lengths=lengths)

    if options["normalize"]:
        counts = iced.filter.filter_low_counts(counts, sparsity=False,
                                               percentage=0.04)
        counts = iced.normalization.ICE_normalization(
            counts,
            max_iter=300)

    if not sparse.issparse(counts):
        counts = sparse.coo_matrix(counts)
    else:
        counts = counts.tocsr()
        counts.eliminate_zeros()
        counts = counts.tocoo()

    mds = MDS(alpha=options["alpha"],
              beta=options["beta"],
              random_state=random_state,
              max_iter=options["max_iter"],
              verbose=options["verbose"])
    X = mds.fit(counts)
    #torm = np.array((counts.sum(axis=0) < 0)).flatten()
    #X[torm] = np.nan

    #X =interpolateMissingData(X,torm, options["resolution"], lengths)

    outfile = os.path.join(directory,
                           options["output_name"] )
    writePredictedModel(X,
                        filename= outfile,
                        lengths= lengths,
                        resolution= float(options['resolution']))


    #np.savetxt(
    #    os.path.join(
    #        directory,
    #        "MDS." + options["output_name"] + ".bed"),
    #    X)

    # PDB file
    #pdbfilename = os.path.join(
    #    directory,
    #    "MDS." + options["output_name"] + ".pdb")
    # pdbfilename = "test.pdb"
    #writePDB(X, pdbfilename)

    return True


###############################################################################

def run_nmds(directory):
    if os.path.exists(os.path.join(directory,
                                   "config.ini")):
        config_file = os.path.join(directory, "config.ini")
    else:
        config_file = None

    options = parse(config_file)

    random_state = np.random.RandomState(seed=options["seed"])

    if options["lengths"] != "" and options["lengths"] != None:
        lengths = np.loadtxt(os.path.join(directory,
                                          options["lengths"]))
    else:
        lengths = None

    # First, compute MDS
    # if options["lengths"].endswith(".bed"):
    #     lengths = fastio.load_lengths(
    #         os.path.join(directory,
    #                      options["lengths"]))
    # else:
    #     lengths = None

    if options["counts"].endswith("npy"):
        counts = np.load(os.path.join(directory, options["counts"]))
    elif options["counts"].endswith(".matrix"):
        counts = fastio.load_counts(
            os.path.join(directory,
                         options["counts"]),
            lengths=lengths)

    if options["normalize"]:
        counts = iced.filter.filter_low_counts(counts, sparsity=False,
                                               percentage=0.04)
        counts = iced.normalization.ICE_normalization(
            counts,
            max_iter=300)

    if not sparse.issparse(counts):
        counts = sparse.coo_matrix(counts)
    else:
        counts = counts.tocsr()
        counts.eliminate_zeros()
        counts = counts.tocoo()

    #torm = np.array((counts.sum(axis=0) == 0)).flatten()
    nmds = NMDS(alpha=options["alpha"],
                beta=options["beta"],
                random_state=random_state,
                max_iter=options["max_iter"],
                verbose=options["verbose"])
    X = nmds.fit(counts)

    #X = interpolateMissingData(X, torm, options["resolution"], lengths)
    #X[torm] = np.nan

    #basename = os.path.splitext(os.path.basename(options["output_name"]))[0]

    outfile = os.path.join(directory,
                           options["output_name"])
    writePredictedModel(X,
                        filename=outfile,
                        lengths=lengths,
                        resolution=float(options['resolution']))

    #np.savetxt(
    #    os.path.join(
    #        directory,
    #        "NMDS." + options["output_name"]),
    #    X)

    # PDB file
    #pdbfilename = os.path.join(
    #    directory,
    #    "NMDS." + options["output_name"] + ".pdb")
    # pdbfilename = "test.pdb"
    #writePDB(X, pdbfilename)

    return True


###############################################################################

def run_pm1(directory):
    if os.path.exists(os.path.join(directory,
                                   "config.ini")):
        config_file = os.path.join(directory, "config.ini")
    else:
        config_file = None

    options = parse(config_file)

    random_state = np.random.RandomState(seed=options["seed"])

    options = parse(config_file)

    if options["lengths"] != "" and options["lengths"] != None:
        lengths = np.loadtxt(os.path.join(directory,
                                          options["lengths"]))
    else:
        lengths = None

    # if options["lengths"].endswith(".bed"):
    #     lengths = fastio.load_lengths(
    #         os.path.join(directory,
    #                      options["lengths"]))
    # else:
    #     lengths = None

    if options["counts"].endswith("npy"):
        counts = np.load(os.path.join(directory, options["counts"]))
        counts[np.isnan(counts)] = 0
    elif options["counts"].endswith(".matrix"):
        counts = fastio.load_counts(
            os.path.join(directory,
                         options["counts"]),
            lengths=lengths)

    if options["normalize"]:
        counts = iced.filter.filter_low_counts(counts, sparsity=False,
                                               percentage=0.04)

        _, bias = iced.normalization.ICE_normalization(
            counts,
            max_iter=300,
            output_bias=True)
    else:
        bias = None

    if not sparse.issparse(counts):
        counts[np.isnan(counts)] = 0
        counts = sparse.coo_matrix(counts)
    else:
        counts = counts.tocsr()
        counts.eliminate_zeros()
        counts = counts.tocoo()

    pm1 = PM1(alpha=options["alpha"],
              beta=options["beta"],
              random_state=random_state,
              max_iter=options["max_iter"],
              bias=bias,
              verbose=options["verbose"])
    X = pm1.fit(counts)
    torm = np.array((counts.sum(axis=0) == 0)).flatten()

    #X = interpolateMissingData(X, torm, options["resolution"], lengths)
    #X[torm] = np.nan

    #basename = os.path.splitext(os.path.basename(options["output_name"]))[0]
    outfile = os.path.join(directory,
                           options["output_name"])
    writePredictedModel(X,
                        filename=outfile,
                        lengths=lengths,
                        resolution=float(options['resolution']))

    #np.savetxt(
    #    os.path.join(
    #        directory,
    #        "PM1." + options["output_name"]),
    #    X)

    # PDB file
    #pdbfilename = os.path.join(
    #    directory,
    #    "PM1." + options["output_name"] + ".pdb")
    # pdbfilename = "test.pdb"
    #writePDB(X, pdbfilename)

    return True


###############################################################################

def run_pm2(directory):
    if os.path.exists(os.path.join(directory,
                                   "config.ini")):
        config_file = os.path.join(directory, "config.ini")
    else:
        config_file = None

    options = parse(config_file)

    random_state = np.random.RandomState(seed=options["seed"])

    options = parse(config_file)

    if options["lengths"] != "" and options["lengths"] != None:
        lengths = np.loadtxt(os.path.join(directory,
                                          options["lengths"]))
    else:
        lengths = None

    # if options["lengths"].endswith(".bed"):
    #     lengths = fastio.load_lengths(
    #         os.path.join(directory,
    #                      options["lengths"]))
    # else:
    #     lengths = None

    if options["counts"].endswith("npy"):
        counts = np.load(os.path.join(directory, options["counts"]))
        counts[np.arange(len(counts)), np.arange(len(counts))] = 0
    elif options["counts"].endswith(".matrix"):
        counts = fastio.load_counts(
            os.path.join(directory, options["counts"]),
            lengths=lengths)

    if options["normalize"]:
        counts = iced.filter.filter_low_counts(counts, sparsity=False,
                                               percentage=0.04)

        _, bias = iced.normalization.ICE_normalization(
            counts,
            max_iter=300,
            output_bias=True)
    else:
        bias = None

    if not sparse.issparse(counts):
        counts[np.isnan(counts)] = 0
        counts = sparse.coo_matrix(counts)
    else:
        counts = counts.tocsr()
        counts.eliminate_zeros()
        counts = counts.tocoo()

    pm2 = PM2(alpha=options["alpha"],
              beta=options["beta"],
              random_state=random_state,
              max_iter=options["max_iter"],
              bias=bias,
              verbose=options["verbose"])
    X = pm2.fit(counts)

    #torm = np.array((counts.sum(axis=0) == 0)).flatten()

    #X = interpolateMissingData(X, torm, options["resolution"], lengths)
    #X[torm] = np.nan

    basename = os.path.splitext(os.path.basename(options["output_name"]))[0]
    outfile = os.path.join(directory,
                           options["output_name"])
    writePredictedModel(X,
                        filename=outfile,
                        lengths=lengths,
                        resolution=float(options['resolution']))

    # np.savetxt(
    #     os.path.join(
    #         directory,
    #         "PM2." + options["output_name"]),
    #     X)
    # # PDB file
    # pdbfilename = os.path.join(
    #     directory,
    #     "PM2." + options["output_name"] + ".pdb")
    # # pdbfilename = "test.pdb"
    # writePDB(X, pdbfilename)

    return True