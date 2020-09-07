import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from sklearn.impute import KNNImputer

train_df = pd.read_csv('../input/train.csv')
test_df = pd.read_csv('../input/test.csv')
combine = pd.concat([train_df, test_df])

# Q5
for i in range(len(train_df.columns)):
     print (train_df.columns[i], train_df[train_df.columns[i]].isnull().any())
for i in range(len(test_df.columns)):
     print (test_df.columns[i], test_df[test_df.columns[i]].isnull().any())
# Q9
print("Average of survived from Pclass = 1: " + str(train_df[train_df['Pclass'] == 1].mean()['Survived']))
# Q10
print("Average of survived from Sex = female: " + str(train_df[train_df['Sex'] == 'female'].mean()['Survived']))
# Q11
axes11 = train_df.hist(by='Survived', column='Age', bins=20, layout=(1,2), 
sharex=True, sharey=True, rot=0)
for i in range(len(axes11)):
    axes11[i].set_xlabel('Age')
    axes11[i].set_title('Survived = ' + str(i))
    axes11[i].set_ylim((0,60))
plt.show()

# Q12 
axes12 = train_df.hist(by=['Pclass', 'Survived'], column='Age', bins=20, layout=(3,2), sharex=True, sharey=True, rot=0)
Pclasses = sorted(pd.unique(train_df['Pclass']))
Surviveds = sorted(pd.unique(train_df['Survived']))
for i in range(len(Pclasses)):
     for j in range(len(Surviveds)):
          axes12[i,j].set_title("Pclass = " + str(Pclasses[i]) + " | Survived = " + str(Surviveds[j]))
          axes12[i,j].set_xlabel("Age")
          axes12[i,j].set_ylim((0,50))
plt.show()

# Q13
fig,axes = plt.subplots(nrows=3, ncols=2)

i,j=0,0

for gid,group in train_df.groupby(['Embarked', 'Survived']):
     group.groupby('Sex')['Fare'].mean().plot(kind='bar', title='Embarked = ' + str(gid[0]) + 
     ' | Survived = ' + str(gid[1]), ax=axes[j,i], sharex=True, sharey=True, rot=0)
     i=i+1
     if(i>=2):
          i,j = 0,j+1

plt.show()

# Q14
dups = train_df['Ticket'].duplicated()
print("Rate of duplicated for ticket feature: " + str(len([x for x in dups if x])/len(train_df['Ticket'])))

# Q15
missing = combine['Cabin'].isnull()
print("Null values in the Cabin feature: " + str(len([x for x in missing if x])) )

# Q16
train_df['Gender'] = np.where(train_df['Sex'] == 'female', 1, 0)

# Q17
# only use numeric columns
numeric_columns=['PassengerId', 'Survived', 'Pclass', 'Age', 'SibSp', 'Parch', 'Fare', 'Gender']
# Create the knn model.
# Look at the five closest neighbors.
print("Null values in the 'Age' feature before filling with knn: " + str(len(train_df[train_df['Age'].isnull()])) )
imputer = KNNImputer(n_neighbors=5)
train_df[numeric_columns] = imputer.fit_transform(train_df[numeric_columns], train_df['Age'])
print("Null values in the 'Age' feature after filling with knn: " + str(len(train_df[train_df['Age'].isnull()])) )

# Q18 .mode() returns an array, because there can be many modes
train_df['Embarked'] = train_df['Embarked'].fillna(value=train_df['Embarked'].mode()[0])

# Q19
test_df['Fare'] = test_df['Fare'].fillna(value=combine['Fare'].mode()[0])

#Q20
# there are some values with fares at 14.4542 and 512.3292 that skew the Survived mean values given by the HW text,
# the correct ranges should be (-0.001, 7.91], (7.91, 14.4542], (14.4542, 31.0], (31.0, 512.3292] to match the Survived mean values
train_df['Fare'] = pd.cut(train_df['Fare'], bins=[-0.001,7.91,14.4542,31.0,512.3292], labels=[0,1,2,3], right=True, precision=6)
#print(str(train_df.groupby(['Fare'])['Survived'].mean()))