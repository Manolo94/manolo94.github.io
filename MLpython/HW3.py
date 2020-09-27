import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from heapq import heappush
from heapq import heappop
from sklearn.impute import KNNImputer
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_validate
from sklearn.model_selection import KFold
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import LabelEncoder
from sklearn.neighbors import KNeighborsClassifier

# for plotting the tree
import io
from IPython.display import Image  
from sklearn.tree import export_graphviz
import pydotplus

def print_performance_measures(predicted : pd.DataFrame, actuals : pd.DataFrame):
     join = pd.concat([predicted, actuals],axis=1)
     TP = len(join[(join['Predicted'] == 1) & (join['Label'] == 1)].index)
     TN = len(join[(join['Predicted'] == 0) & (join['Label'] == 0)].index)
     FP = len(join[(join['Predicted'] == 1) & (join['Label'] == 0)].index)
     FN = len(join[(join['Predicted'] == 0) & (join['Label'] == 1)].index)

     accuracy = (TP+TN)/(TP+FP+FN+TN)
     precision = (TP/(TP+FP))
     recall = TP/(TP+FN)
     f1 = 2*(recall*precision) / (recall + precision)

     print("Accuracy: " + str(accuracy))
     print("Precision: " + str(precision))
     print("Recall: " + str(recall))
     print("F1 score: " + str(f1))

# ----- Task 1 -----------
task1_train_df = pd.read_csv('../input/task1_train.csv')
task1_test_df = pd.read_csv('../input/task1_test.csv')

# Drop ID, Date and Media, since they are irrelevant
task1_train_df = task1_train_df.drop(['Date', 'Media'], axis=1)
task1_test_df = task1_test_df.drop(['Date', 'Media'], axis=1)

combine = pd.concat([task1_train_df, task1_test_df])

# encoding will convert (Home,Away) into (1,0), (Out, In) into (1,0), (Win, Lose) into (1,0)
#   and opponent names into integers
# encode the test and train combined, so that team encodings match between test and train datasets
combine_encoded = combine.apply(LabelEncoder().fit_transform)

task1_train_df_encoded = combine_encoded[combine_encoded['ID'] <= 23] # after encoding, IDs are 0-based
task1_test_df_encoded = combine_encoded[combine_encoded['ID'] >= 24] # after encoding, IDs are 0-based

task1_test_df_encoded = task1_test_df_encoded.drop(['ID'], axis=1)
task1_train_df_encoded = task1_train_df_encoded.drop(['ID'], axis=1)

# perform naive bayes
clf = MultinomialNB()
clf.fit(task1_train_df_encoded.drop(['Label'], axis=1), task1_train_df_encoded['Label'])

NBPredicted = pd.DataFrame(clf.predict(task1_test_df_encoded.drop(['Label'], axis=1)), columns=['Predicted'])

# perform knn
knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(task1_train_df_encoded.drop(['Label'], axis=1), task1_train_df_encoded['Label'])

KNNPredicted = pd.DataFrame(knn.predict(task1_test_df_encoded.drop(['Label'], axis=1)), columns=['Predicted'])

actuals = task1_test_df_encoded['Label']

# Q1
print("Naive Bayes performance: ")
print_performance_measures(NBPredicted, actuals)

print("KNN performance: ")
print_performance_measures(KNNPredicted, actuals)

# Q2
task1_test_df['NB Prediction'] = np.where(NBPredicted == 1, "Win", "Lose")
task1_test_df['KNN Prediction'] = np.where(KNNPredicted == 1, "Win", "Lose")
print(task1_test_df)

# ----- Task 2 Preprocessing -----
train_df = pd.read_csv('../input/train.csv')
test_df = pd.read_csv('../input/test.csv')
combine = pd.concat([train_df, test_df])

# Sex column
train_df['Sex'] = np.where(train_df['Sex'] == 'female', 1, 0)
test_df['Sex'] = np.where(test_df['Sex'] == 'female', 1, 0)

# Age column
# only use numeric columns
imputer = KNNImputer(n_neighbors=5)
numeric_columns=['Pclass', 'Age', 'SibSp', 'Parch', 'Fare', 'Sex']
test_df[numeric_columns] = imputer.fit_transform(test_df[numeric_columns], test_df['Age'])

numeric_columns=['Survived', 'Pclass', 'Age', 'SibSp', 'Parch', 'Fare', 'Sex']
# Create the knn model.
# Look at the five closest neighbors.
print("Null values in the 'Age' feature before filling with knn: " + str(len(train_df[train_df['Age'].isnull()])) )
imputer = KNNImputer(n_neighbors=5)
train_df[numeric_columns] = imputer.fit_transform(train_df[numeric_columns], train_df['Age'])
print("Null values in the 'Age' feature after filling with knn: " + str(len(train_df[train_df['Age'].isnull()])) )

# Embarked column
train_df['Embarked'] = train_df['Embarked'].fillna(value=train_df['Embarked'].mode()[0])

# Fare column
test_df['Fare'] = test_df['Fare'].fillna(value=combine['Fare'].mode()[0])

# there are some values with fares at 14.4542 and 512.3292 that skew the Survived mean values given by the HW text,
# the correct ranges should be (-0.001, 7.91], (7.91, 14.4542], (14.4542, 31.0], (31.0, 512.3292] to match the Survived mean values
train_df['FareBand'] = pd.cut(train_df['Fare'], bins=[-0.001,7.91,14.4542,31.0,512.3292], labels=[0,1,2,3], right=True, precision=6)

# band Age column using 0-4, 4-15, 15-30, 30-75, 75-80
train_df['AgeBand'] = pd.cut(train_df['Age'], bins=[0,4,15,30,75,80], labels=[0,1,2,3,4], right=True, precision=6)

# Convert Embarked to numeric
train_df['Embarked'], meta_data = pd.factorize(train_df['Embarked'])
test_df['Embarked'], meta_data = pd.factorize(test_df['Embarked'])

# Drop ticket feature, no correlation between ticket and survival
# Drop cabin feature, high percentage of missing values
# Drop the name, irrelevant
# Drop the passengerid, irrelevant
train_df = train_df.drop(columns=['Ticket', 'Cabin', 'Name', 'PassengerId'])

feature_cols_banded = ['Pclass', 'Sex', 'FareBand', 'AgeBand']

# Task 2 Q1 
# Perform naive bayes with five-fold cross validation
result = cross_validate(clf, train_df[feature_cols_banded], train_df['Survived'], cv=5, scoring=['accuracy', 'precision', 'recall', 'f1'])

print("Five-fold cross validation of Naive Bayes:")
print("Average Accuracy: ", result['test_accuracy'].mean())
print("Average Precision: ", result['test_precision'].mean())
print("Average Recall: ", result['test_recall'].mean())
print("Average F1: ", result['test_f1'].mean())

# Task 2 Q2
# Implement knn from scratch and plot accuracies using five-fold cross validation
kf = KFold(n_splits=5)

def euclidean_dist(vec1 : np.array, vec2 : np.array) -> float:
     diff = vec1 - vec2
     return np.sqrt(diff.dot(vec1 - vec2))

def MyKNN(training_set : np.array, training_survived : np.array, test_set : np.array, test_survived : np.array, k : int):
     total = 0
     TPTN = 0 # count true positives, and true negatives

     # Calculate the prediction for each entry
     for entry_idx, entry in enumerate(test_set):
          h = [] # use a heap to order by euclidean distance
          for training_idx, training_point in enumerate(training_set):
               heappush(h, (euclidean_dist(training_point, entry), training_survived[training_idx]))

          # since survived can be either 0 or 1, average all the neighbors and return 1.0 if > 0.5 else 0.0
          #   this is equivalent to predicting using voting
          extracted_neighbors = [0.0]*k
          for n in range(k):
               dist, surv = heappop(h)
               extracted_neighbors[n] = surv
          neighbors_mean = np.mean(extracted_neighbors)
          result = 0.0
          if (neighbors_mean >= 0.5):
               result = 1.0

          if test_survived[entry_idx] == result:
               TPTN = TPTN + 1
          total = total + 1
     
     return TPTN / total

k_values = []
accuracy_values = []

for k in range(1,100):
     # Do a five-fold validation
     fivefold = []
     for train_index, test_index in kf.split(train_df):
          X_train, X_test = train_df.loc[train_index], train_df.loc[test_index]

          accuracy = MyKNN(np.array(X_train[feature_cols_banded]), np.array(X_train['Survived']), 
          np.array(X_test[feature_cols_banded]), np.array(X_test['Survived']), k)

          fivefold.append(accuracy)
     average_accuracy = np.mean(fivefold)

     k_values.append(k)
     accuracy_values.append(average_accuracy)

     print("Testing for k=" + str(k), "=> Accuracy:", average_accuracy)

plt.plot(k_values, accuracy_values)
plt.ylabel("Accuracy")
plt.xlabel("K value")
plt.show()