import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from sklearn.impute import KNNImputer
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

# for plotting the tree
import io
from IPython.display import Image  
from sklearn.tree import export_graphviz
import pydotplus

train_df = pd.read_csv('../input/train.csv')
test_df = pd.read_csv('../input/test.csv')
combine = pd.concat([train_df, test_df])

# ----- Preprocessing -----
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

print(train_df.columns)

# Create Decision Tree classifer object
#clf = DecisionTreeClassifier()

print(train_df.corr())

# Train Decision Tree Classifer, Pclass, Sex, Age and Fare have the highest correlation with survived
# Even though Embarked has a slightly higher correlation factor, adding Age instead of Embarked it's slightly
#   more accurate (by about 1% more)
feature_cols = ['Pclass', 'Sex', 'Fare', 'Age']
feature_cols_banded = ['Pclass', 'Sex', 'FareBand', 'AgeBand']

# Learn a decision tree model using gini index and plot the decision tree
clf = DecisionTreeClassifier(criterion="gini")
clf.fit(train_df[feature_cols_banded], train_df['Survived'])

dot_data = io.StringIO()
export_graphviz(clf, out_file=dot_data, filled=True, rounded=True,
                special_characters=True, feature_names = feature_cols_banded,class_names=['Survived','Not survived'])

graph = pydotplus.graph_from_dot_data(dot_data.getvalue())
graph.write_png('titanic.png')
Image(graph.create_png())

clf = DecisionTreeClassifier()
rfc = RandomForestClassifier(n_estimators=100)

print("Five-fold cross validation average accuracy for each classifier:")
print("Decision Tree (banded features) => ", 
                str(cross_val_score(clf, train_df[feature_cols_banded], train_df['Survived'], cv=5).mean()))
print("Random Forest (banded features) => ",
                str(cross_val_score(rfc, train_df[feature_cols_banded], train_df['Survived'], cv=5).mean()))
print("Decision Tree (not-banded features) => ", 
                str(cross_val_score(clf, train_df[feature_cols], train_df['Survived'], cv=5).mean()))
print("Random Forest (not-banded features) => ",
                str(cross_val_score(rfc, train_df[feature_cols], train_df['Survived'], cv=5).mean()))

# Double checking manual calculations of Task 3
d = {'A': [True, True, True, True, True, False, False, False, True, True],
     'B': [False, True, True, False, True, False, False, False, True, False],
     'label' : ['+', '+', '+', '-', '+', '-', '-', '-', '-', '-']}
df = pd.DataFrame(d)

clf = DecisionTreeClassifier(criterion="entropy")
clf.fit(df[['A', 'B']], df['label'])

dot_data = io.StringIO()
export_graphviz(clf, out_file=dot_data, filled=True, rounded=True,
                special_characters=True, feature_names = ['A', 'B'],class_names=['+','-'])

graph = pydotplus.graph_from_dot_data(dot_data.getvalue())
graph.write_png('task3.png')
Image(graph.create_png())