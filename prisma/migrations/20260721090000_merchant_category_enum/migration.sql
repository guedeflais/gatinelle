CREATE TYPE "MerchantCategory" AS ENUM (
    'ALIMENTATION',
    'BOULANGERIE_PATISSERIE',
    'RESTAURANT_CAFE_BAR',
    'PRODUCTEUR_MARCHE',
    'ARTISANAT',
    'COMMERCE_BOUTIQUE',
    'BATIMENT_HABITAT',
    'SANTE_BIEN_ETRE',
    'BEAUTE_COIFFURE',
    'CULTURE_LOISIRS',
    'TOURISME_HEBERGEMENT',
    'SPORT',
    'SERVICES_PERSONNE',
    'SERVICES_PROFESSIONNELS',
    'TRANSPORT_MOBILITE',
    'EDUCATION_FORMATION',
    'AUTRE'
);

ALTER TABLE "MerchantProfile" ADD COLUMN "categoryNew" "MerchantCategory";

-- Reprend au mieux les valeurs déjà en texte libre ; tout ce qui ne
-- correspond à rien de connu retombe sur AUTRE plutôt que de bloquer la
-- migration (voir 7.9 clause de secours équivalente sur la Gâtine Box).
UPDATE "MerchantProfile" SET "categoryNew" = 'ALIMENTATION' WHERE LOWER(TRIM(category)) IN ('alimentation', 'épicerie', 'epicerie', 'supérette', 'superette');
UPDATE "MerchantProfile" SET "categoryNew" = 'BOULANGERIE_PATISSERIE' WHERE LOWER(TRIM(category)) IN ('boulangerie', 'pâtisserie', 'patisserie', 'boulangerie-patisserie', 'boulangerie/pâtisserie');
UPDATE "MerchantProfile" SET "categoryNew" = 'RESTAURANT_CAFE_BAR' WHERE LOWER(TRIM(category)) IN ('café', 'cafe', 'restaurant', 'bar', 'brasserie');
UPDATE "MerchantProfile" SET "categoryNew" = 'PRODUCTEUR_MARCHE' WHERE LOWER(TRIM(category)) IN ('producteur', 'marché', 'marche', 'producteur local');
UPDATE "MerchantProfile" SET "categoryNew" = 'ARTISANAT' WHERE LOWER(TRIM(category)) IN ('artisanat', 'artisan');
UPDATE "MerchantProfile" SET "categoryNew" = 'COMMERCE_BOUTIQUE' WHERE LOWER(TRIM(category)) IN ('commerce', 'boutique', 'librairie');
UPDATE "MerchantProfile" SET "categoryNew" = 'BATIMENT_HABITAT' WHERE LOWER(TRIM(category)) IN ('bâtiment', 'batiment', 'habitat');
UPDATE "MerchantProfile" SET "categoryNew" = 'SANTE_BIEN_ETRE' WHERE LOWER(TRIM(category)) IN ('santé', 'sante', 'bien-être', 'bien-etre');
UPDATE "MerchantProfile" SET "categoryNew" = 'BEAUTE_COIFFURE' WHERE LOWER(TRIM(category)) IN ('beauté', 'beaute', 'coiffure', 'coiffeur');
UPDATE "MerchantProfile" SET "categoryNew" = 'CULTURE_LOISIRS' WHERE LOWER(TRIM(category)) IN ('culture', 'loisirs', 'parc botanique');
UPDATE "MerchantProfile" SET "categoryNew" = 'TOURISME_HEBERGEMENT' WHERE LOWER(TRIM(category)) IN ('tourisme', 'hébergement', 'hebergement', 'hôtel', 'hotel');
UPDATE "MerchantProfile" SET "categoryNew" = 'SPORT' WHERE LOWER(TRIM(category)) IN ('sport');
UPDATE "MerchantProfile" SET "categoryNew" = 'SERVICES_PERSONNE' WHERE LOWER(TRIM(category)) IN ('services à la personne', 'services a la personne');
UPDATE "MerchantProfile" SET "categoryNew" = 'SERVICES_PROFESSIONNELS' WHERE LOWER(TRIM(category)) IN ('services professionnels', 'services');
UPDATE "MerchantProfile" SET "categoryNew" = 'TRANSPORT_MOBILITE' WHERE LOWER(TRIM(category)) IN ('transport', 'mobilité', 'mobilite');
UPDATE "MerchantProfile" SET "categoryNew" = 'EDUCATION_FORMATION' WHERE LOWER(TRIM(category)) IN ('éducation', 'education', 'formation');
UPDATE "MerchantProfile" SET "categoryNew" = 'AUTRE' WHERE "categoryNew" IS NULL;

ALTER TABLE "MerchantProfile" DROP COLUMN "category";
ALTER TABLE "MerchantProfile" RENAME COLUMN "categoryNew" TO "category";
ALTER TABLE "MerchantProfile" ALTER COLUMN "category" SET NOT NULL;
