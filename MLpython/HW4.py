import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.model_selection import cross_val_score
from sklearn import svm

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
imputer = KNNImputer(n_neighbors=5)
train_df[numeric_columns] = imputer.fit_transform(train_df[numeric_columns], train_df['Age'])

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

# Linear kernel
linear_clf = svm.SVC(kernel='linear')
# Quadratic kernel
quadratic_clf = svm.SVC(kernel='poly', degree=2)
# RBF kernel
rbf_clf = svm.SVC(kernel='rbf')

# Task 7
# Perform SVM
print("Five-fold cross validation average accuracy for each classifier:")
print("SVM (linear) => ", 
                str(cross_val_score(linear_clf, train_df[feature_cols_banded], train_df['Survived'], cv=5).mean()))
print("SVM (quadratic) => ",
                str(cross_val_score(quadratic_clf, train_df[feature_cols_banded], train_df['Survived'], cv=5).mean()))
print("SVM (rbf) => ", 
                str(cross_val_score(rbf_clf, train_df[feature_cols_banded], train_df['Survived'], cv=5).mean()))