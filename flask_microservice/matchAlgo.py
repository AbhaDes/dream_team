import numpy as np


def cosine_similarity(a, b):
    dot_product = np.dot(a, b)
    length_a = np.linalg.norm(a)
    length_b = np.linalg.norm(b)
    product = length_a * length_b
    similarity = dot_product / product
    return similarity
