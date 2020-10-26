import pandas as pd
import numpy as np
import sys
import random
import copy

# Task 1
task1_data = {'Wins_2016': [3, 3, 2, 2, 6, 6, 7, 7, 8, 7], 'Wins_2017': [5, 4, 8, 3, 2, 4, 3, 4, 5, 6]}
task1_pd = pd.DataFrame(data=task1_data)

iris_df = pd.read_csv('./iris_input/iris.data', names=['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'class'])
iris_test_df = iris_df['class']
iris_data_df = iris_df.drop(columns=['class'])

def Calculate_SSE(centroids : np.array, datapoints_per_centroid : np.array, dist_func):
    sse = 0

    k = np.size(centroids, axis=0)
    
    # For each cluster
    for i in range(k):
        datapoints = datapoints_per_centroid[i]
        centroid = centroids[i]
        if np.size(datapoints, axis=0) == 0:
            continue
        
        A = np.full(np.shape(datapoints), centroid)
        B = datapoints

        def squared_dist(x : np.array, y : np.array):
            return dist_func(x, y)**2

        differences = np.array(list(map(squared_dist, A, B)))

        sse = sse + np.sum(differences)
    
    return sse

def euclidean_dist(a,b):
    return np.linalg.norm(a-b)

def manhattan_dist(a,b):
    return np.sum(np.abs(a-b))

def gen_jaccard_dist(a,b):
    return np.sum(np.min(np.array([a,b]), axis=0)) / np.sum(np.max(np.array([a,b]), axis=0))

def cosine_sim_dist(a,b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def KMeans(dist_func, data_dataframe, k, max_iterations=0, stop_with_sse=False, initial_centroids=[], epsilon=1e-9):
    data_df = pd.DataFrame.to_numpy(data_dataframe)

    centroids = []

    if len(initial_centroids) == 0:
        # Choose the initial centroids randomly using the min and max of each dimension
        mins = np.min(data_df, axis=0)
        maxs = np.max(data_df, axis=0)
        for i in range(k):
            new_c = []
            for j in range(np.size(data_df, axis=1)):
                new_c.append(random.uniform(mins[j], maxs[j]))
            centroids.append(new_c)
    else:
        centroids = initial_centroids
    
    centroids = np.array(centroids)

    iteration = 1
    new_centroids = copy.deepcopy(centroids)
    previous_sse = sys.maxsize
    stop_flag = False
    # For i iterations
    while stop_flag == False:
        if iteration == max_iterations:
            break

        # A list of datapoints for every centroid
        datapoints_per_centroid = []
        for i in range(k):
            datapoints_per_centroid.append([])

        #print(datapoints_per_centroid)

        #print("Before for all:", centroids)

        # For all points
        for data_entry in data_df:
            min_dist = sys.maxsize
            closest = -1
            for i in range(k):
                dist = dist_func(data_entry, centroids[i])
                if dist < min_dist:
                    min_dist, closest = dist, i

            # Assign to the closest centroid
            datapoints_per_centroid[closest].append(data_entry)

        # Recompute the centroid of each cluster
        for i in range(k):
            if np.size(datapoints_per_centroid[i], axis=0) > 0:
                new_centroids[i] = np.average(datapoints_per_centroid[i], axis = 0)

        # Check SSE for all points for all centroids
        if stop_with_sse:
            sse = Calculate_SSE(centroids, datapoints_per_centroid, dist_func)
            
            if(sse >= previous_sse):
                stop_flag = True
            else:
                previous_sse = sse
        
        all_equal = True
        # For each centroid
        for i in range(k):
            # Check if the centroid moved, using euclidean distance for this
            dist_to_new_centroid = dist_func(centroids[i], new_centroids[i])
            #print("D", dist_to_new_centroid, centroids[i], new_centroids[i], "S", np.size(datapoints_per_centroid[i], axis=0))
            if(dist_to_new_centroid > epsilon):
                all_equal = False
            # Update each centroid
            centroids[i] = copy.deepcopy(new_centroids[i])
        #centroids = np.array(centroids)
        
        if all_equal and not stop_with_sse:
            stop_flag = True

        iteration = iteration + 1

        #print("-------------")

    #print("Ended at iteration: ", iteration)

    return ( centroids, datapoints_per_centroid )

def MeasureAccuracy(centroids, data_df, test_df, dist_func):
    labels = pd.unique(test_df)
    k = np.size(centroids, axis=0)

    # an array of dictionaries, each dictionary maps labels to votes for a particular centroid
    centroid_votes = []
    for c in range(k):
        centroid_votes.append({})
        for l in labels:
            centroid_votes[c][l] = 0

    for index, row in data_df.iterrows():
        # For all points
        min_dist = sys.maxsize
        closest = -1
        for i in range(k):
            dist = dist_func(row, centroids[i])
            if dist < min_dist:
                min_dist, closest = dist, i

        # Assign to the closest centroid
        centroid_votes[closest][test_df.loc[index]] = centroid_votes[closest][test_df.loc[index]] + 1

    # For each cluster, for each label, add everything to get a total,
    #  keep the max_votes and count that as the rights
    rights, total = 0, 0
    for c in range(k):
        max_votes = -1
        for k in centroid_votes[c].keys():
            if centroid_votes[c][k] > max_votes:
                max_votes = centroid_votes[c][k]
            total = total + centroid_votes[c][k]
        rights = rights + max_votes
        
    return rights / total

(euclidean_centroids, euclidean_dps_per_centroid) = KMeans(euclidean_dist, iris_data_df, 3)
(cosine_centroids, cosine_dps_per_centroid) = KMeans(cosine_sim_dist, iris_data_df, 3, 0, True)
(gen_jaccard_centroids, gen_jaccard_dps_per_centroid) = KMeans(gen_jaccard_dist, iris_data_df, 3, 0, True)

print("Task 1:")
(centroids_1, dpts_per_centroid_1) = KMeans(manhattan_dist, task1_pd, 2, 0, False, [[4,6], [5,4]])
print("(1): ", centroids_1)
(centroids_2, dpts_per_centroid_2) = KMeans(euclidean_dist, task1_pd, 2, 0, False, [[4,6], [5,4]])
print("(2): ", centroids_2)
(centroids_3, dpts_per_centroid_3) = KMeans(manhattan_dist, task1_pd, 2, 0, False, [[3,3], [8,3]])
print("(3): ", centroids_3)
(centroids_4, dpts_per_centroid_4) = KMeans(euclidean_dist, task1_pd, 2, 0, False, [[3,2], [4,8]])
print("(4): ", centroids_4)

print("Task 2:")
print("Euclidean => SSE:", Calculate_SSE(euclidean_centroids, euclidean_dps_per_centroid, euclidean_dist),
MeasureAccuracy(euclidean_centroids, iris_data_df, iris_test_df, euclidean_dist))
print("Cosine Similarity => SSE:", Calculate_SSE(cosine_centroids, cosine_dps_per_centroid, cosine_sim_dist),
MeasureAccuracy(cosine_centroids, iris_data_df, iris_test_df, cosine_sim_dist))
print("Generalized Jaccard similarity => SSE:", Calculate_SSE(gen_jaccard_centroids, gen_jaccard_dps_per_centroid, gen_jaccard_dist),
MeasureAccuracy(gen_jaccard_centroids, iris_data_df, iris_test_df, gen_jaccard_dist))

a = np.array([0,2,7])
b = np.array([-1,5,0])