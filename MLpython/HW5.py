import pandas as pd
import numpy as np
import sys
import random

# Task 1
task1_data = {'Wins_2016': [3, 3, 2, 2, 6, 6, 7, 7, 8, 7], 'Wins_2017': [5, 4, 8, 3, 2, 4, 3, 4, 5, 6]}
task1_pd = pd.DataFrame(data=task1_data)

iris_df = pd.read_csv('./iris_input/iris.data', names=['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'class'])
iris_test_df = iris_df['class']
iris_data_df = iris_df.drop(columns=['class'])

def calculate_SSE(centroid : np.array, datapoints : np.array, dist_func):
    A = np.full(np.shape(datapoints), centroid)
    B = datapoints

    def squared_dist(x : np.array, y : np.array):
        return dist_func(x, y)**2

    differences = np.array(list(map(squared_dist, A, B)))

    return np.sum(differences)

def euclidean_dist(a,b):
    return np.linalg.norm(a-b)

def manhattan_dist(a,b):
    return np.sum(np.abs(a-b))

def KMeans(dist_func, data_df, k, max_iterations=0, stop_with_sse=False, initial_centroids=[], epsilon=1e-5):
    data_df = pd.DataFrame.to_numpy(data_df)

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

    iteration = 1
    new_centroids = centroids
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

        print(datapoints_per_centroid)

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
        
        new_centroids[i]

        # Recompute the centroid of each cluster
        for i in range(k):
            new_centroids[i] = np.average(datapoints_per_centroid[i], axis = 0)

        # Check SSE for all points for all centroids
        if stop_with_sse:
            see = 0
            # For each cluster
            for i in range(k):
                sse = see + calculate_SSE(new_centroids[i], datapoints_per_centroid[i], dist_func)
            
            if(sse > previous_sse):
                stop_flag = True
            else:
                previous_sse = sse
        
        all_equal = True
        # For each centroid
        for i in range(k):
            # Check if the centroid moved, using euclidean distance for this
            dist_to_new_centroid = euclidean_dist(centroids[i], new_centroids[i])
            print("D", dist_to_new_centroid, centroids[i], new_centroids[i])
            if(dist_to_new_centroid > epsilon):
                all_equal = False
                # Update each centroid
                centroids[i] = new_centroids[i]
        
        if all_equal:
            stop_flag = True

        iteration = iteration + 1

        print(iteration)

KMeans(euclidean_dist, iris_data_df, 3)