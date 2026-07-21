import type { MerchantCategory } from "@prisma/client";

export const MERCHANT_CATEGORY_LABELS: Record<MerchantCategory, string> = {
  ALIMENTATION: "Alimentation / épicerie",
  BOULANGERIE_PATISSERIE: "Boulangerie / pâtisserie",
  RESTAURANT_CAFE_BAR: "Restaurant / café / bar",
  PRODUCTEUR_MARCHE: "Producteur local / marché",
  ARTISANAT: "Artisanat",
  COMMERCE_BOUTIQUE: "Commerce / boutique",
  BATIMENT_HABITAT: "Bâtiment / habitat",
  SANTE_BIEN_ETRE: "Santé / bien-être",
  BEAUTE_COIFFURE: "Beauté / coiffure",
  CULTURE_LOISIRS: "Culture / loisirs",
  TOURISME_HEBERGEMENT: "Tourisme / hébergement",
  SPORT: "Sport",
  SERVICES_PERSONNE: "Services à la personne",
  SERVICES_PROFESSIONNELS: "Services professionnels",
  TRANSPORT_MOBILITE: "Transport / mobilité",
  EDUCATION_FORMATION: "Éducation / formation",
  AUTRE: "Autre",
};

export const MERCHANT_CATEGORY_OPTIONS: { value: MerchantCategory; label: string }[] = (
  Object.entries(MERCHANT_CATEGORY_LABELS) as [MerchantCategory, string][]
).map(([value, label]) => ({ value, label }));
