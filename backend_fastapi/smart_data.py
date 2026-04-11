import pandas as pd
import numpy as np

np.random.seed(42)
n = 500

# Génération des variables
budget_publicite = np.random.uniform(1000, 50000, n)
concurrence = np.random.poisson(lam=5, size=n)
age_produit = np.random.uniform(1, 24, n)
satisfaction = np.random.normal(7, 1.2, n).clip(0, 10)
promotion = np.random.choice([0, 1], n, p=[0.7, 0.3])
region = np.random.choice(['Nord', 'Sud', 'Est', 'Ouest'], n, p=[0.25, 0.35, 0.2, 0.2])

# Construction des relations
nb_clics = (budget_publicite / 100) * np.random.uniform(0.8, 1.2, n)
nb_clics = nb_clics + (promotion * 150) - (concurrence * 30) + np.random.normal(0, 300, n)
nb_clics = np.maximum(50, nb_clics).astype(int)

# Prix cible (float pour accepter NaN plus tard)
prix = (nb_clics * 0.9) - (concurrence * 45) + (satisfaction * 120) - (age_produit * 8)
prix = prix + (promotion * 200) + np.random.normal(0, 300, n)
prix = np.maximum(100, prix)   # ne pas convertir en int ici

# Ajout de NaN sur la colonne prix (5%)
missing_idx = np.random.choice(n, size=int(0.05*n), replace=False)
prix[missing_idx] = np.nan

# NaN sur budget_publicite (3%)
missing_budget = np.random.choice(n, size=int(0.03*n), replace=False)
budget_publicite[missing_budget] = np.nan

# Création du DataFrame (les NaN seront float)
df = pd.DataFrame({
    'prix': prix,
    'budget_publicite': budget_publicite,
    'nb_clics': nb_clics,
    'satisfaction': satisfaction,
    'concurrence': concurrence,
    'age_produit': age_produit,
    'promotion': promotion,
    'region': region
})

# Sauvegarde
df.to_csv('smart_data.csv', index=False)
print("Fichier smart_data.csv généré avec succès !")
print(f"Dimensions : {df.shape}")
print("\nTypes de colonnes :")
print(df.dtypes)
print("\nValeurs manquantes par colonne :")
print(df.isna().sum())