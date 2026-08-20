/**
 * Catalogue et Grille Tarifaire Officielle Barconnière
 * Contient les 134 modèles officiels avec :
 * - Gamme (Col A)
 * - # Modèle (Col B)
 * - Équivalence Barconnière (Col C)
 * - Dimensions, Surfaces, Hauteurs, Travées, Puissance (kWc)
 * - Tarif structure sans PV (€ HT)
 * - Ratio Tarif/Puissance (€/Wc)
 * - Ratio Tarif/Surface (€/m²)
 */

export const BARCONNIERE_CATALOG = [
  // ─── ORION 16 (Asymétrique 16.40m) ───
  { gamme: 'ORION 16', id: 'O1', code: 'AS 7.2 0 0.0', longueur: 30.00, largeur: 16.40, surface: 492, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '4 x 7.5m', kwc: 96, tarif: 57288, ratioKwc: 0.60, ratioM2: 116 },
  { gamme: 'ORION 16', id: 'O2', code: 'AS 7.2 0 0.0', longueur: 37.50, largeur: 16.40, surface: 615, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '5 x 7.5m', kwc: 126, tarif: 68777, ratioKwc: 0.55, ratioM2: 112 },
  { gamme: 'ORION 16', id: 'O3', code: 'AS 7.2 0 0.0', longueur: 45.00, largeur: 16.40, surface: 738, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '6 x 7.5m', kwc: 151, tarif: 80452, ratioKwc: 0.53, ratioM2: 109 },
  { gamme: 'ORION 16', id: 'O4', code: 'AS 7.2 0 0.0', longueur: 52.50, largeur: 16.40, surface: 861, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '7 x 7.5m', kwc: 175, tarif: 92127, ratioKwc: 0.53, ratioM2: 107 },
  { gamme: 'ORION 16', id: 'O5', code: 'AS 7.2 0 0.0', longueur: 60.00, largeur: 16.40, surface: 984, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '8 x 7.5m', kwc: 199, tarif: 103630, ratioKwc: 0.52, ratioM2: 105 },
  { gamme: 'ORION 16', id: 'O6', code: 'AS 7.2 0 0.0', longueur: 67.50, largeur: 16.40, surface: 1107, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '9 x 7.5m', kwc: 229, tarif: 115305, ratioKwc: 0.50, ratioM2: 104 },
  { gamme: 'ORION 16', id: 'O7', code: 'AS 7.2 0 0.0', longueur: 75.00, largeur: 16.40, surface: 1230, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '10 x 7.5m', kwc: 253, tarif: 127820, ratioKwc: 0.51, ratioM2: 104 },
  { gamme: 'ORION 16', id: 'O8', code: 'AS 7.2 0 0.0', longueur: 82.50, largeur: 16.40, surface: 1353, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '11 x 7.5m', kwc: 278, tarif: 139495, ratioKwc: 0.50, ratioM2: 103 },
  { gamme: 'ORION 16', id: 'O9', code: 'AS 7.2 0 0.0', longueur: 90.00, largeur: 16.40, surface: 1476, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '12 x 7.5m', kwc: 302, tarif: 150985, ratioKwc: 0.50, ratioM2: 102 },
  { gamme: 'ORION 16', id: 'O10', code: 'AS 7.2 0 0.0', longueur: 97.50, largeur: 16.40, surface: 1599, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '13 x 7.5m', kwc: 323, tarif: 162488, ratioKwc: 0.50, ratioM2: 102 },
  { gamme: 'ORION 16', id: 'O11', code: 'AS 7.2 0 0.0', longueur: 105.00, largeur: 16.40, surface: 1722, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '14 x 7.5m', kwc: 356, tarif: 176705, ratioKwc: 0.50, ratioM2: 103 },
  { gamme: 'ORION 16', id: 'O12', code: 'AS 7.2 0 0.0', longueur: 112.50, largeur: 16.40, surface: 1845, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '15 x 7.5m', kwc: 380, tarif: 188380, ratioKwc: 0.50, ratioM2: 102 },
  { gamme: 'ORION 16', id: 'O13', code: 'AS 7.2 0 0.0', longueur: 120.00, largeur: 16.40, surface: 1968, poteau: '', sabliere: '4m', faitage: '7.42m', travees: '16 x 7.5m', kwc: 405, tarif: 200055, ratioKwc: 0.49, ratioM2: 102 },

  // ─── ORION 20 (Asymétrique 20.00m) ───
  { gamme: 'ORION 20', id: 'O14', code: 'AS 9.2 0 0.0', longueur: 30.00, largeur: 20.00, surface: 600, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '4 x 7.5m', kwc: 120, tarif: 69598, ratioKwc: 0.58, ratioM2: 116 },
  { gamme: 'ORION 20', id: 'O15', code: 'AS 9.2 0 0.0', longueur: 37.50, largeur: 20.00, surface: 750, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '5 x 7.5m', kwc: 156, tarif: 83948, ratioKwc: 0.54, ratioM2: 112 },
  { gamme: 'ORION 20', id: 'O16', code: 'AS 9.2 0 0.0', longueur: 45.00, largeur: 20.00, surface: 900, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '6 x 7.5m', kwc: 186, tarif: 98469, ratioKwc: 0.53, ratioM2: 109 },
  { gamme: 'ORION 20', id: 'O17', code: 'AS 9.2 0 0.0', longueur: 52.50, largeur: 20.00, surface: 1050, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '7 x 7.5m', kwc: 215, tarif: 113659, ratioKwc: 0.53, ratioM2: 108 },
  { gamme: 'ORION 20', id: 'O18', code: 'AS 9.2 0 0.0', longueur: 60.00, largeur: 20.00, surface: 1200, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '8 x 7.5m', kwc: 245, tarif: 128366, ratioKwc: 0.52, ratioM2: 107 },
  { gamme: 'ORION 20', id: 'O19', code: 'AS 9.2 0 0.0', longueur: 67.50, largeur: 20.00, surface: 1350, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '9 x 7.5m', kwc: 282, tarif: 142888, ratioKwc: 0.51, ratioM2: 106 },
  { gamme: 'ORION 20', id: 'O20', code: 'AS 9.2 0 0.0', longueur: 75.00, largeur: 20.00, surface: 1500, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '10 x 7.5m', kwc: 312, tarif: 157238, ratioKwc: 0.50, ratioM2: 105 },
  { gamme: 'ORION 20', id: 'O21', code: 'AS 9.2 0 0.0', longueur: 82.50, largeur: 20.00, surface: 1650, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '11 x 7.5m', kwc: 342, tarif: 171759, ratioKwc: 0.50, ratioM2: 104 },
  { gamme: 'ORION 20', id: 'O22', code: 'AS 9.2 0 0.0', longueur: 90.00, largeur: 20.00, surface: 1800, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '12 x 7.5m', kwc: 372, tarif: 186109, ratioKwc: 0.50, ratioM2: 103 },
  { gamme: 'ORION 20', id: 'O23', code: 'AS 9.2 0 0.0', longueur: 97.50, largeur: 20.00, surface: 1950, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '13 x 7.5m', kwc: 409, tarif: 200816, ratioKwc: 0.49, ratioM2: 103 },
  { gamme: 'ORION 20', id: 'O24', code: 'AS 9.2 0 0.0', longueur: 105.00, largeur: 20.00, surface: 2100, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '14 x 7.5m', kwc: 438, tarif: 217969, ratioKwc: 0.50, ratioM2: 104 },
  { gamme: 'ORION 20', id: 'O25', code: 'AS 9.2 0 0.0', longueur: 112.50, largeur: 20.00, surface: 2250, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '15 x 7.5m', kwc: 468, tarif: 233159, ratioKwc: 0.50, ratioM2: 104 },
  { gamme: 'ORION 20', id: 'O26', code: 'AS 9.2 0 0.0', longueur: 120.00, largeur: 20.00, surface: 2400, poteau: '', sabliere: '4m', faitage: '8.4m', travees: '16 x 7.5m', kwc: 498, tarif: 247680, ratioKwc: 0.50, ratioM2: 103 },

  // ─── CYRUS 25 (Asymétrique 2 zones 25.50m) ───
  { gamme: 'CYRUS 25', id: 'C1', code: 'ASP 10.4 0 0.0', longueur: 30.00, largeur: 25.50, surface: 765, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '4 x 7.5m', kwc: 169, tarif: 80756, ratioKwc: 0.48, ratioM2: 106 },
  { gamme: 'CYRUS 25', id: 'C2', code: 'ASP 10.4 0 0.0', longueur: 37.50, largeur: 25.50, surface: 956, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '5 x 7.5m', kwc: 214, tarif: 97152, ratioKwc: 0.45, ratioM2: 102 },
  { gamme: 'CYRUS 25', id: 'C3', code: 'ASP 10.4 0 0.0', longueur: 45.00, largeur: 25.50, surface: 1147, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '6 x 7.5m', kwc: 255, tarif: 113905, ratioKwc: 0.45, ratioM2: 99 },
  { gamme: 'CYRUS 25', id: 'C4', code: 'ASP 10.4 0 0.0', longueur: 52.50, largeur: 25.50, surface: 1339, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '7 x 7.5m', kwc: 296, tarif: 130657, ratioKwc: 0.44, ratioM2: 98 },
  { gamme: 'CYRUS 25', id: 'C5', code: 'ASP 10.4 0 0.0', longueur: 60.00, largeur: 25.50, surface: 1530, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '8 x 7.5m', kwc: 338, tarif: 148250, ratioKwc: 0.44, ratioM2: 97 },
  { gamme: 'CYRUS 25', id: 'C6', code: 'ASP 10.4 0 0.0', longueur: 67.50, largeur: 25.50, surface: 1721, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '9 x 7.5m', kwc: 388, tarif: 165002, ratioKwc: 0.43, ratioM2: 96 },
  { gamme: 'CYRUS 25', id: 'C7', code: 'ASP 10.4 0 0.0', longueur: 75.00, largeur: 25.50, surface: 1912, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '10 x 7.5m', kwc: 429, tarif: 181583, ratioKwc: 0.42, ratioM2: 95 },
  { gamme: 'CYRUS 25', id: 'C8', code: 'ASP 10.4 0 0.0', longueur: 82.50, largeur: 25.50, surface: 2104, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '11 x 7.5m', kwc: 470, tarif: 198336, ratioKwc: 0.42, ratioM2: 94 },
  { gamme: 'CYRUS 25', id: 'C9', code: 'ASP 10.4 0 0.0', longueur: 90.00, largeur: 25.50, surface: 2295, poteau: '13/12m', sabliere: '4m', faitage: '8.9m', travees: '12 x 7.5m', kwc: 511, tarif: 215088, ratioKwc: 0.42, ratioM2: 94 },

  // ─── CYRUS 29 (Asymétrique 2 zones 29.00m) ───
  { gamme: 'CYRUS 29', id: 'C10', code: 'ASP 12.4 0 0.0', longueur: 30.00, largeur: 29.00, surface: 870, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '4 x 7.5m', kwc: 193, tarif: 92159, ratioKwc: 0.48, ratioM2: 106 },
  { gamme: 'CYRUS 29', id: 'C11', code: 'ASP 12.4 0 0.0', longueur: 37.50, largeur: 29.00, surface: 1087, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '5 x 7.5m', kwc: 244, tarif: 111617, ratioKwc: 0.46, ratioM2: 103 },
  { gamme: 'CYRUS 29', id: 'C12', code: 'ASP 12.4 0 0.0', longueur: 45.00, largeur: 29.00, surface: 1305, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '6 x 7.5m', kwc: 290, tarif: 132086, ratioKwc: 0.46, ratioM2: 101 },
  { gamme: 'CYRUS 29', id: 'C13', code: 'ASP 12.4 0 0.0', longueur: 52.50, largeur: 29.00, surface: 1522, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '7 x 7.5m', kwc: 337, tarif: 151901, ratioKwc: 0.45, ratioM2: 100 },
  { gamme: 'CYRUS 29', id: 'C14', code: 'ASP 12.4 0 0.0', longueur: 60.00, largeur: 29.00, surface: 1740, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '8 x 7.5m', kwc: 386, tarif: 171359, ratioKwc: 0.44, ratioM2: 98 },
  { gamme: 'CYRUS 29', id: 'C15', code: 'ASP 12.4 0 0.0', longueur: 67.50, largeur: 29.00, surface: 1957, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '9 x 7.5m', kwc: 441, tarif: 190988, ratioKwc: 0.43, ratioM2: 98 },
  { gamme: 'CYRUS 29', id: 'C16', code: 'ASP 12.4 0 0.0', longueur: 75.00, largeur: 29.00, surface: 2175, poteau: '13/16m', sabliere: '4m', faitage: '9.8m', travees: '10 x 7.5m', kwc: 488, tarif: 210803, ratioKwc: 0.43, ratioM2: 97 },

  // ─── KEREN 24 (Symétrique + Appentis 9.3m = 24.30m) ───
  { gamme: 'KEREN 24', id: 'K1', code: 'S 4.4 5.0 0.0', longueur: 30.00, largeur: 24.30, surface: 729, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '4 x 7.5m', kwc: 157, tarif: 79955, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'KEREN 24', id: 'K2', code: 'S 4.4 5.0 0.0', longueur: 37.50, largeur: 24.30, surface: 911, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '5 x 7.5m', kwc: 195, tarif: 96398, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'KEREN 24', id: 'K3', code: 'S 4.4 5.0 0.0', longueur: 45.00, largeur: 24.30, surface: 1094, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '6 x 7.5m', kwc: 235, tarif: 112826, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'KEREN 24', id: 'K4', code: 'S 4.4 5.0 0.0', longueur: 52.50, largeur: 24.30, surface: 1276, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '7 x 7.5m', kwc: 272, tarif: 129269, ratioKwc: 0.48, ratioM2: 101 },
  { gamme: 'KEREN 24', id: 'K5', code: 'S 4.4 5.0 0.0', longueur: 60.00, largeur: 24.30, surface: 1458, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '8 x 7.5m', kwc: 314, tarif: 146366, ratioKwc: 0.47, ratioM2: 100 },
  { gamme: 'KEREN 24', id: 'K6', code: 'S 4.4 5.0 0.0', longueur: 67.50, largeur: 24.30, surface: 1640, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '9 x 7.5m', kwc: 356, tarif: 162980, ratioKwc: 0.46, ratioM2: 99 },
  { gamme: 'KEREN 24', id: 'K7', code: 'S 4.4 5.0 0.0', longueur: 75.00, largeur: 24.30, surface: 1823, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '10 x 7.5m', kwc: 392, tarif: 179237, ratioKwc: 0.46, ratioM2: 98 },
  { gamme: 'KEREN 24', id: 'K8', code: 'S 4.4 5.0 0.0', longueur: 82.50, largeur: 24.30, surface: 2005, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '11 x 7.5m', kwc: 435, tarif: 195851, ratioKwc: 0.45, ratioM2: 98 },
  { gamme: 'KEREN 24', id: 'K9', code: 'S 4.4 5.0 0.0', longueur: 90.00, largeur: 24.30, surface: 2187, poteau: '9.3/15m', sabliere: '3.9m', faitage: '6.8m', travees: '12 x 7.5m', kwc: 471, tarif: 212108, ratioKwc: 0.45, ratioM2: 97 },

  // ─── KEREN 28 (Symétrique + Appentis 9.3m = 28.00m) ───
  { gamme: 'KEREN 28', id: 'K10', code: 'S 5.5 5.0 0.0', longueur: 30.00, largeur: 28.00, surface: 840, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '4 x 7.5m', kwc: 181, tarif: 89261, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'KEREN 28', id: 'K11', code: 'S 5.5 5.0 0.0', longueur: 37.50, largeur: 28.00, surface: 1050, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '5 x 7.5m', kwc: 224, tarif: 108539, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'KEREN 28', id: 'K12', code: 'S 5.5 5.0 0.0', longueur: 45.00, largeur: 28.00, surface: 1260, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '6 x 7.5m', kwc: 272, tarif: 128657, ratioKwc: 0.47, ratioM2: 102 },
  { gamme: 'KEREN 28', id: 'K13', code: 'S 5.5 5.0 0.0', longueur: 52.50, largeur: 28.00, surface: 1470, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '7 x 7.5m', kwc: 313, tarif: 148107, ratioKwc: 0.47, ratioM2: 101 },
  { gamme: 'KEREN 28', id: 'K14', code: 'S 5.5 5.0 0.0', longueur: 60.00, largeur: 28.00, surface: 1680, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '8 x 7.5m', kwc: 362, tarif: 167385, ratioKwc: 0.46, ratioM2: 100 },
  { gamme: 'KEREN 28', id: 'K15', code: 'S 5.5 5.0 0.0', longueur: 67.50, largeur: 28.00, surface: 1890, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '9 x 7.5m', kwc: 411, tarif: 186633, ratioKwc: 0.45, ratioM2: 99 },
  { gamme: 'KEREN 28', id: 'K16', code: 'S 5.5 5.0 0.0', longueur: 75.00, largeur: 28.00, surface: 2100, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '10 x 7.5m', kwc: 453, tarif: 205942, ratioKwc: 0.45, ratioM2: 98 },
  { gamme: 'KEREN 28', id: 'K17', code: 'S 5.5 5.0 0.0', longueur: 82.50, largeur: 28.00, surface: 2310, poteau: '9.3/18.6m', sabliere: '3.9m', faitage: '7.1m', travees: '11 x 7.5m', kwc: 502, tarif: 225391, ratioKwc: 0.45, ratioM2: 98 },

  // ─── KEREN 32, 35, 39, 43 ───
  { gamme: 'KEREN 32', id: 'K18', code: 'S 6.6 5.0 0.0', longueur: 30.00, largeur: 32.00, surface: 960, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '4 x 7.5m', kwc: 205, tarif: 98816, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'KEREN 32', id: 'K19', code: 'S 6.6 5.0 0.0', longueur: 37.50, largeur: 32.00, surface: 1200, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '5 x 7.5m', kwc: 253, tarif: 119521, ratioKwc: 0.47, ratioM2: 100 },
  { gamme: 'KEREN 32', id: 'K20', code: 'S 6.6 5.0 0.0', longueur: 45.00, largeur: 32.00, surface: 1440, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '6 x 7.5m', kwc: 308, tarif: 141201, ratioKwc: 0.46, ratioM2: 98 },
  { gamme: 'KEREN 32', id: 'K21', code: 'S 6.6 5.0 0.0', longueur: 52.50, largeur: 32.00, surface: 1680, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '7 x 7.5m', kwc: 355, tarif: 161856, ratioKwc: 0.46, ratioM2: 96 },
  { gamme: 'KEREN 32', id: 'K22', code: 'S 6.6 5.0 0.0', longueur: 60.00, largeur: 32.00, surface: 1920, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '8 x 7.5m', kwc: 411, tarif: 182696, ratioKwc: 0.44, ratioM2: 95 },
  { gamme: 'KEREN 32', id: 'K23', code: 'S 6.6 5.0 0.0', longueur: 67.50, largeur: 32.00, surface: 2160, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '9 x 7.5m', kwc: 466, tarif: 203708, ratioKwc: 0.44, ratioM2: 94 },
  { gamme: 'KEREN 32', id: 'K24', code: 'S 6.6 5.0 0.0', longueur: 75.00, largeur: 32.00, surface: 2400, poteau: '9.3/22.3m', sabliere: '3.9m', faitage: '7.5m', travees: '10 x 7.5m', kwc: 513, tarif: 224363, ratioKwc: 0.44, ratioM2: 93 },

  { gamme: 'KEREN 35', id: 'K25', code: 'S 7.7 5.0 0.0', longueur: 30.00, largeur: 35.00, surface: 1050, poteau: '9.3/26m', sabliere: '3.9m', faitage: '7.8m', travees: '4 x 7.5m', kwc: 229, tarif: 112591, ratioKwc: 0.49, ratioM2: 107 },
  { gamme: 'KEREN 35', id: 'K26', code: 'S 7.7 5.0 0.0', longueur: 37.50, largeur: 35.00, surface: 1312, poteau: '9.3/26m', sabliere: '3.9m', faitage: '7.8m', travees: '5 x 7.5m', kwc: 292, tarif: 137009, ratioKwc: 0.47, ratioM2: 104 },
  { gamme: 'KEREN 35', id: 'K27', code: 'S 7.7 5.0 0.0', longueur: 45.00, largeur: 35.00, surface: 1575, poteau: '9.3/26m', sabliere: '3.9m', faitage: '7.8m', travees: '6 x 7.5m', kwc: 348, tarif: 160944, ratioKwc: 0.46, ratioM2: 102 },
  { gamme: 'KEREN 35', id: 'K28', code: 'S 7.7 5.0 0.0', longueur: 52.50, largeur: 35.00, surface: 1837, poteau: '9.3/26m', sabliere: '3.9m', faitage: '7.8m', travees: '7 x 7.5m', kwc: 404, tarif: 184879, ratioKwc: 0.46, ratioM2: 101 },
  { gamme: 'KEREN 35', id: 'K29', code: 'S 7.7 5.0 0.0', longueur: 60.00, largeur: 35.00, surface: 2100, poteau: '9.3/26m', sabliere: '3.9m', faitage: '7.8m', travees: '8 x 7.5m', kwc: 460, tarif: 208814, ratioKwc: 0.45, ratioM2: 99 },

  { gamme: 'KEREN 39', id: 'K30', code: 'S 8.8 5.0 0.0', longueur: 30.00, largeur: 39.00, surface: 1170, poteau: '9.3/29.8m', sabliere: '3.9m', faitage: '8.1m', travees: '4 x 7.5m', kwc: 253, tarif: 128832, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'KEREN 39', id: 'K31', code: 'S 8.8 5.0 0.0', longueur: 37.50, largeur: 39.00, surface: 1462, poteau: '9.3/29.8m', sabliere: '3.9m', faitage: '8.1m', travees: '5 x 7.5m', kwc: 322, tarif: 156388, ratioKwc: 0.49, ratioM2: 107 },
  { gamme: 'KEREN 39', id: 'K32', code: 'S 8.8 5.0 0.0', longueur: 45.00, largeur: 39.00, surface: 1755, poteau: '9.3/29.8m', sabliere: '3.9m', faitage: '8.1m', travees: '6 x 7.5m', kwc: 383, tarif: 183586, ratioKwc: 0.48, ratioM2: 105 },
  { gamme: 'KEREN 39', id: 'K33', code: 'S 8.8 5.0 0.0', longueur: 52.50, largeur: 39.00, surface: 2047, poteau: '9.3/29.8m', sabliere: '3.9m', faitage: '8.1m', travees: '7 x 7.5m', kwc: 445, tarif: 210956, ratioKwc: 0.47, ratioM2: 103 },
  { gamme: 'KEREN 39', id: 'K34', code: 'S 8.8 5.0 0.0', longueur: 60.00, largeur: 39.00, surface: 2340, poteau: '9.3/29.8m', sabliere: '3.9m', faitage: '8.1m', travees: '8 x 7.5m', kwc: 507, tarif: 239351, ratioKwc: 0.47, ratioM2: 102 },

  { gamme: 'KEREN 43', id: 'K35', code: 'S 9.9 5.0 0.0', longueur: 30.00, largeur: 43.00, surface: 1290, poteau: '9.3/33.5m', sabliere: '3.9m', faitage: '8.5m', travees: '4 x 7.5m', kwc: 278, tarif: 145992, ratioKwc: 0.53, ratioM2: 113 },
  { gamme: 'KEREN 43', id: 'K36', code: 'S 9.9 5.0 0.0', longueur: 37.50, largeur: 43.00, surface: 1612, poteau: '9.3/33.5m', sabliere: '3.9m', faitage: '8.5m', travees: '5 x 7.5m', kwc: 351, tarif: 178101, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'KEREN 43', id: 'K37', code: 'S 9.9 5.0 0.0', longueur: 45.00, largeur: 43.00, surface: 1935, poteau: '9.3/33.5m', sabliere: '3.9m', faitage: '8.5m', travees: '6 x 7.5m', kwc: 418, tarif: 210040, ratioKwc: 0.50, ratioM2: 109 },
  { gamme: 'KEREN 43', id: 'K38', code: 'S 9.9 5.0 0.0', longueur: 52.50, largeur: 43.00, surface: 2257, poteau: '9.3/33.5m', sabliere: '3.9m', faitage: '8.5m', travees: '7 x 7.5m', kwc: 485, tarif: 243175, ratioKwc: 0.50, ratioM2: 108 },

  // ─── ATLAS 12 (Monopente 12.7 + 4m / 8m) ───
  { gamme: 'ATLAS 12', id: 'A1N', code: 'M7 0 0.2', longueur: 30.00, largeur: 16.70, surface: 501, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '4 x 7.5m', kwc: 96, tarif: 57482, ratioKwc: 0.60, ratioM2: 115 },
  { gamme: 'ATLAS 12', id: 'A1SN', code: 'M7 0 2.2', longueur: 30.00, largeur: 20.70, surface: 621, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '4 x 7.5m', kwc: 120, tarif: 63651, ratioKwc: 0.53, ratioM2: 102 },
  { gamme: 'ATLAS 12', id: 'A2N', code: 'M7 0 0.2', longueur: 37.50, largeur: 16.70, surface: 626, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '5 x 7.5m', kwc: 126, tarif: 69282, ratioKwc: 0.55, ratioM2: 111 },
  { gamme: 'ATLAS 12', id: 'A2SN', code: 'M7 0 2.2', longueur: 37.50, largeur: 20.70, surface: 776, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '5 x 7.5m', kwc: 156, tarif: 77068, ratioKwc: 0.49, ratioM2: 99 },
  { gamme: 'ATLAS 12', id: 'A3N', code: 'M7 0 0.2', longueur: 45.00, largeur: 16.70, surface: 751, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '6 x 7.5m', kwc: 151, tarif: 81253, ratioKwc: 0.54, ratioM2: 108 },
  { gamme: 'ATLAS 12', id: 'A3SN', code: 'M7 0 2.2', longueur: 45.00, largeur: 20.70, surface: 931, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '6 x 7.5m', kwc: 186, tarif: 90657, ratioKwc: 0.49, ratioM2: 97 },
  { gamme: 'ATLAS 12', id: 'A4N', code: 'M7 0 0.2', longueur: 52.50, largeur: 16.70, surface: 877, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '7 x 7.5m', kwc: 175, tarif: 93225, ratioKwc: 0.53, ratioM2: 106 },
  { gamme: 'ATLAS 12', id: 'A4SN', code: 'M7 0 2.2', longueur: 52.50, largeur: 20.70, surface: 1087, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '7 x 7.5m', kwc: 215, tarif: 104061, ratioKwc: 0.48, ratioM2: 96 },
  { gamme: 'ATLAS 12', id: 'A5N', code: 'M7 0 0.2', longueur: 60.00, largeur: 16.70, surface: 1002, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '8 x 7.5m', kwc: 199, tarif: 105196, ratioKwc: 0.53, ratioM2: 105 },
  { gamme: 'ATLAS 12', id: 'A5SN', code: 'M7 0 2.2', longueur: 60.00, largeur: 20.70, surface: 1242, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '8 x 7.5m', kwc: 245, tarif: 117478, ratioKwc: 0.48, ratioM2: 95 },
  { gamme: 'ATLAS 12', id: 'A6N', code: 'M7 0 0.2', longueur: 67.50, largeur: 16.70, surface: 1127, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '9 x 7.5m', kwc: 229, tarif: 116996, ratioKwc: 0.51, ratioM2: 104 },
  { gamme: 'ATLAS 12', id: 'A6SN', code: 'M7 0 2.2', longueur: 67.50, largeur: 20.70, surface: 1397, poteau: '', sabliere: '4m', faitage: '7.41m', travees: '9 x 7.5m', kwc: 282, tarif: 131907, ratioKwc: 0.47, ratioM2: 94 },

  // ─── ATLAS 16 (Monopente 16.4 + 4m / 8m) ───
  { gamme: 'ATLAS 16', id: 'A10N', code: 'M9 0 0.2', longueur: 30.00, largeur: 20.40, surface: 612, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '4 x 7.5m', kwc: 96, tarif: 57482, ratioKwc: 0.60, ratioM2: 94 },
  { gamme: 'ATLAS 16', id: 'A10SN', code: 'M9 0 2.2', longueur: 30.00, largeur: 24.40, surface: 732, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '4 x 7.5m', kwc: 117, tarif: 69597, ratioKwc: 0.59, ratioM2: 95 },
  { gamme: 'ATLAS 16', id: 'A11N', code: 'M9 0 0.2', longueur: 37.50, largeur: 20.40, surface: 765, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '5 x 7.5m', kwc: 151, tarif: 84246, ratioKwc: 0.56, ratioM2: 110 },
  { gamme: 'ATLAS 16', id: 'A11SN', code: 'M9 0 2.2', longueur: 37.50, largeur: 24.40, surface: 915, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '5 x 7.5m', kwc: 179, tarif: 92032, ratioKwc: 0.51, ratioM2: 101 },
  { gamme: 'ATLAS 16', id: 'A12N', code: 'M9 0 0.2', longueur: 45.00, largeur: 20.40, surface: 918, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '6 x 7.5m', kwc: 180, tarif: 98724, ratioKwc: 0.55, ratioM2: 108 },
  { gamme: 'ATLAS 16', id: 'A12SN', code: 'M9 0 2.2', longueur: 45.00, largeur: 24.40, surface: 1098, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '6 x 7.5m', kwc: 213, tarif: 108128, ratioKwc: 0.51, ratioM2: 98 },
  { gamme: 'ATLAS 16', id: 'A13N', code: 'M9 0 0.2', longueur: 52.50, largeur: 20.40, surface: 1071, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '7 x 7.5m', kwc: 208, tarif: 113374, ratioKwc: 0.55, ratioM2: 106 },
  { gamme: 'ATLAS 16', id: 'A13SN', code: 'M9 0 2.2', longueur: 52.50, largeur: 24.40, surface: 1281, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '7 x 7.5m', kwc: 247, tarif: 127064, ratioKwc: 0.51, ratioM2: 99 },
  { gamme: 'ATLAS 16', id: 'A14N', code: 'M9 0 0.2', longueur: 60.00, largeur: 20.40, surface: 1224, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '8 x 7.5m', kwc: 237, tarif: 128692, ratioKwc: 0.54, ratioM2: 105 },
  { gamme: 'ATLAS 16', id: 'A14SN', code: 'M9 0 2.2', longueur: 60.00, largeur: 24.40, surface: 1464, poteau: '', sabliere: '4m', faitage: '8.39m', travees: '8 x 7.5m', kwc: 282, tarif: 141331, ratioKwc: 0.50, ratioM2: 97 },

  // ─── HELIOS 15 (Symétrique 15.00m) ───
  { gamme: 'HELIOS 15', id: 'H1', code: 'S4.4 0.0 0.0', longueur: 30.00, largeur: 15.00, surface: 450, poteau: '', sabliere: '5.5m', faitage: '6.82m', travees: '4 x 7.5m', kwc: 96, tarif: 55086, ratioKwc: 0.57, ratioM2: 122 },
  { gamme: 'HELIOS 15', id: 'H2', code: 'S4.4 0.0 0.0', longueur: 37.50, largeur: 15.00, surface: 562, poteau: '', sabliere: '5.5m', faitage: '6.82m', travees: '5 x 7.5m', kwc: 119, tarif: 65962, ratioKwc: 0.55, ratioM2: 117 },
  { gamme: 'HELIOS 15', id: 'H3', code: 'S4.4 0.0 0.0', longueur: 45.00, largeur: 15.00, surface: 675, poteau: '', sabliere: '5.5m', faitage: '6.82m', travees: '6 x 7.5m', kwc: 145, tarif: 76838, ratioKwc: 0.53, ratioM2: 114 },
  { gamme: 'HELIOS 15', id: 'H4', code: 'S4.4 0.0 0.0', longueur: 52.50, largeur: 15.00, surface: 788, poteau: '', sabliere: '5.5m', faitage: '6.82m', travees: '7 x 7.5m', kwc: 167, tarif: 87885, ratioKwc: 0.53, ratioM2: 112 },
  { gamme: 'HELIOS 15', id: 'H5', code: 'S4.4 0.0 0.0', longueur: 60.00, largeur: 15.00, surface: 900, poteau: '', sabliere: '5.5m', faitage: '6.82m', travees: '8 x 7.5m', kwc: 193, tarif: 98761, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'HELIOS 15', id: 'H6', code: 'S4.4 0.0 0.0', longueur: 67.50, largeur: 15.00, surface: 1012, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '9 x 7.5m', kwc: 219, tarif: 109994, ratioKwc: 0.50, ratioM2: 109 },
  { gamme: 'HELIOS 15', id: 'H7', code: 'S4.4 0.0 0.0', longueur: 75.00, largeur: 15.00, surface: 1125, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '10 x 7.5m', kwc: 241, tarif: 120870, ratioKwc: 0.50, ratioM2: 107 },
  { gamme: 'HELIOS 15', id: 'H8', code: 'S4.4 0.0 0.0', longueur: 82.50, largeur: 15.00, surface: 1237, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '11 x 7.5m', kwc: 267, tarif: 131747, ratioKwc: 0.49, ratioM2: 107 },
  { gamme: 'HELIOS 15', id: 'H9', code: 'S4.4 0.0 0.0', longueur: 90.00, largeur: 15.00, surface: 1350, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '12 x 7.5m', kwc: 290, tarif: 143634, ratioKwc: 0.50, ratioM2: 106 },
  { gamme: 'HELIOS 15', id: 'H10', code: 'S4.4 0.0 0.0', longueur: 97.50, largeur: 15.00, surface: 1462, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '13 x 7.5m', kwc: 316, tarif: 154510, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'HELIOS 15', id: 'H11', code: 'S4.4 0.0 0.0', longueur: 105.00, largeur: 15.00, surface: 1575, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '14 x 7.5m', kwc: 338, tarif: 167731, ratioKwc: 0.50, ratioM2: 106 },
  { gamme: 'HELIOS 15', id: 'H12', code: 'S4.4 0.0 0.0', longueur: 112.50, largeur: 15.00, surface: 1687, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '15 x 7.5m', kwc: 364, tarif: 178608, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'HELIOS 15', id: 'H13', code: 'S4.4 0.0 0.0', longueur: 120.00, largeur: 15.00, surface: 1800, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '16 x 7.5m', kwc: 386, tarif: 189655, ratioKwc: 0.49, ratioM2: 105 },

  // ─── HELIOS 18 (Symétrique 18.60m) ───
  { gamme: 'HELIOS 18', id: 'H14', code: 'S5.5 0.0 0.0', longueur: 30.00, largeur: 18.60, surface: 558, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '4 x 7.5m', kwc: 120, tarif: 64229, ratioKwc: 0.54, ratioM2: 115 },
  { gamme: 'HELIOS 18', id: 'H15', code: 'S5.5 0.0 0.0', longueur: 37.50, largeur: 18.60, surface: 697, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '5 x 7.5m', kwc: 148, tarif: 78093, ratioKwc: 0.53, ratioM2: 112 },
  { gamme: 'HELIOS 18', id: 'H16', code: 'S5.5 0.0 0.0', longueur: 45.00, largeur: 18.60, surface: 837, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '6 x 7.5m', kwc: 181, tarif: 91771, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'HELIOS 18', id: 'H17', code: 'S5.5 0.0 0.0', longueur: 52.50, largeur: 18.60, surface: 976, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '7 x 7.5m', kwc: 209, tarif: 105806, ratioKwc: 0.51, ratioM2: 108 },
  { gamme: 'HELIOS 18', id: 'H18', code: 'S5.5 0.0 0.0', longueur: 60.00, largeur: 18.60, surface: 1116, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '8 x 7.5m', kwc: 241, tarif: 120325, ratioKwc: 0.50, ratioM2: 108 },
  { gamme: 'HELIOS 18', id: 'H19', code: 'S5.5 0.0 0.0', longueur: 67.50, largeur: 18.60, surface: 1255, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '9 x 7.5m', kwc: 274, tarif: 134188, ratioKwc: 0.49, ratioM2: 107 },
  { gamme: 'HELIOS 18', id: 'H20', code: 'S5.5 0.0 0.0', longueur: 75.00, largeur: 18.60, surface: 1395, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '10 x 7.5m', kwc: 302, tarif: 147867, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'HELIOS 18', id: 'H21', code: 'S5.5 0.0 0.0', longueur: 82.50, largeur: 18.60, surface: 1534, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '11 x 7.5m', kwc: 334, tarif: 161730, ratioKwc: 0.48, ratioM2: 105 },
  { gamme: 'HELIOS 18', id: 'H22', code: 'S5.5 0.0 0.0', longueur: 90.00, largeur: 18.60, surface: 1674, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '12 x 7.5m', kwc: 362, tarif: 175765, ratioKwc: 0.49, ratioM2: 105 },
  { gamme: 'HELIOS 18', id: 'H23', code: 'S5.5 0.0 0.0', longueur: 97.50, largeur: 18.60, surface: 1813, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '13 x 7.5m', kwc: 395, tarif: 189444, ratioKwc: 0.48, ratioM2: 104 },
  { gamme: 'HELIOS 18', id: 'H24', code: 'S5.5 0.0 0.0', longueur: 105.00, largeur: 18.60, surface: 1953, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '14 x 7.5m', kwc: 423, tarif: 205799, ratioKwc: 0.49, ratioM2: 105 },
  { gamme: 'HELIOS 18', id: 'H25', code: 'S5.5 0.0 0.0', longueur: 112.50, largeur: 18.60, surface: 2092, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '15 x 7.5m', kwc: 455, tarif: 219478, ratioKwc: 0.48, ratioM2: 105 },
  { gamme: 'HELIOS 18', id: 'H26', code: 'S5.5 0.0 0.0', longueur: 120.00, largeur: 18.60, surface: 2232, poteau: '', sabliere: '5.5m', faitage: '7.14m', travees: '16 x 7.5m', kwc: 483, tarif: 234353, ratioKwc: 0.49, ratioM2: 105 },

  // ─── HELIOS 22 (Symétrique 22.35m) ───
  { gamme: 'HELIOS 22', id: 'H27', code: 'S6.6 0.0 0.0', longueur: 30.00, largeur: 22.35, surface: 670, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '4 x 7.5m', kwc: 145, tarif: 73649, ratioKwc: 0.51, ratioM2: 110 },
  { gamme: 'HELIOS 22', id: 'H28', code: 'S6.6 0.0 0.0', longueur: 37.50, largeur: 22.35, surface: 838, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '5 x 7.5m', kwc: 178, tarif: 88889, ratioKwc: 0.50, ratioM2: 106 },
  { gamme: 'HELIOS 22', id: 'H29', code: 'S6.6 0.0 0.0', longueur: 45.00, largeur: 22.35, surface: 1006, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '6 x 7.5m', kwc: 217, tarif: 104130, ratioKwc: 0.48, ratioM2: 104 },
  { gamme: 'HELIOS 22', id: 'H30', code: 'S6.6 0.0 0.0', longueur: 52.50, largeur: 22.35, surface: 1173, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '7 x 7.5m', kwc: 251, tarif: 120395, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'HELIOS 22', id: 'H31', code: 'S6.6 0.0 0.0', longueur: 60.00, largeur: 22.35, surface: 1341, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '8 x 7.5m', kwc: 290, tarif: 135636, ratioKwc: 0.47, ratioM2: 101 },
  { gamme: 'HELIOS 22', id: 'H32', code: 'S6.6 0.0 0.0', longueur: 67.50, largeur: 22.35, surface: 1509, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '9 x 7.5m', kwc: 329, tarif: 150876, ratioKwc: 0.46, ratioM2: 100 },
  { gamme: 'HELIOS 22', id: 'H33', code: 'S6.6 0.0 0.0', longueur: 75.00, largeur: 22.35, surface: 1667, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '10 x 7.5m', kwc: 362, tarif: 166302, ratioKwc: 0.46, ratioM2: 100 },
  { gamme: 'HELIOS 22', id: 'H34', code: 'S6.6 0.0 0.0', longueur: 82.50, largeur: 22.35, surface: 1844, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '11 x 7.5m', kwc: 401, tarif: 181542, ratioKwc: 0.45, ratioM2: 98 },
  { gamme: 'HELIOS 22', id: 'H35', code: 'S6.6 0.0 0.0', longueur: 90.00, largeur: 22.35, surface: 2011, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '12 x 7.5m', kwc: 435, tarif: 196782, ratioKwc: 0.45, ratioM2: 98 },
  { gamme: 'HELIOS 22', id: 'H36', code: 'S6.6 0.0 0.0', longueur: 97.50, largeur: 22.35, surface: 2179, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '13 x 7.5m', kwc: 474, tarif: 212208, ratioKwc: 0.45, ratioM2: 97 },
  { gamme: 'HELIOS 22', id: 'H37', code: 'S6.6 0.0 0.0', longueur: 105.00, largeur: 22.35, surface: 2346, poteau: '', sabliere: '5.5m', faitage: '7.47m', travees: '14 x 7.5m', kwc: 507, tarif: 231049, ratioKwc: 0.46, ratioM2: 98 },

  // ─── HELIOS 26 (Symétrique 26.05m) ───
  { gamme: 'HELIOS 26', id: 'H38', code: 'S7.7 0.0 0.0', longueur: 30.00, largeur: 26.05, surface: 781, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '4 x 7.5m', kwc: 169, tarif: 86673, ratioKwc: 0.51, ratioM2: 111 },
  { gamme: 'HELIOS 26', id: 'H39', code: 'S7.7 0.0 0.0', longueur: 37.50, largeur: 26.05, surface: 977, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '5 x 7.5m', kwc: 214, tarif: 104883, ratioKwc: 0.49, ratioM2: 107 },
  { gamme: 'HELIOS 26', id: 'H40', code: 'S7.7 0.0 0.0', longueur: 45.00, largeur: 26.05, surface: 1172, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '6 x 7.5m', kwc: 255, tarif: 123918, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'HELIOS 26', id: 'H41', code: 'S7.7 0.0 0.0', longueur: 52.50, largeur: 26.05, surface: 1368, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '7 x 7.5m', kwc: 296, tarif: 142113, ratioKwc: 0.48, ratioM2: 104 },
  { gamme: 'HELIOS 26', id: 'H42', code: 'S7.7 0.0 0.0', longueur: 60.00, largeur: 26.05, surface: 1563, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '8 x 7.5m', kwc: 338, tarif: 160494, ratioKwc: 0.47, ratioM2: 103 },
  { gamme: 'HELIOS 26', id: 'H43', code: 'S7.7 0.0 0.0', longueur: 67.50, largeur: 26.05, surface: 1758, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '9 x 7.5m', kwc: 388, tarif: 178689, ratioKwc: 0.46, ratioM2: 102 },
  { gamme: 'HELIOS 26', id: 'H44', code: 'S7.7 0.0 0.0', longueur: 75.00, largeur: 26.05, surface: 1954, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '10 x 7.5m', kwc: 429, tarif: 197069, ratioKwc: 0.46, ratioM2: 101 },
  { gamme: 'HELIOS 26', id: 'H45', code: 'S7.7 0.0 0.0', longueur: 82.50, largeur: 26.05, surface: 2149, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '11 x 7.5m', kwc: 470, tarif: 215093, ratioKwc: 0.46, ratioM2: 100 },
  { gamme: 'HELIOS 26', id: 'H46', code: 'S7.7 0.0 0.0', longueur: 90.00, largeur: 26.05, surface: 2345, poteau: '', sabliere: '5.5m', faitage: '7.80m', travees: '12 x 7.5m', kwc: 511, tarif: 234314, ratioKwc: 0.46, ratioM2: 100 },

  // ─── HELIOS 29 (Symétrique 29.75m) ───
  { gamme: 'HELIOS 29', id: 'H47', code: 'S8.8 0.0 0.0', longueur: 30.00, largeur: 29.75, surface: 892, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '4 x 7.5m', kwc: 193, tarif: 101561, ratioKwc: 0.53, ratioM2: 114 },
  { gamme: 'HELIOS 29', id: 'H48', code: 'S8.8 0.0 0.0', longueur: 37.50, largeur: 29.75, surface: 1116, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '5 x 7.5m', kwc: 238, tarif: 124076, ratioKwc: 0.52, ratioM2: 111 },
  { gamme: 'HELIOS 29', id: 'H49', code: 'S8.8 0.0 0.0', longueur: 45.00, largeur: 29.75, surface: 1339, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '6 x 7.5m', kwc: 290, tarif: 145580, ratioKwc: 0.50, ratioM2: 109 },
  { gamme: 'HELIOS 29', id: 'H50', code: 'S8.8 0.0 0.0', longueur: 52.50, largeur: 29.75, surface: 1562, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '7 x 7.5m', kwc: 334, tarif: 167255, ratioKwc: 0.50, ratioM2: 107 },
  { gamme: 'HELIOS 29', id: 'H51', code: 'S8.8 0.0 0.0', longueur: 60.00, largeur: 29.75, surface: 1785, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '8 x 7.5m', kwc: 386, tarif: 188759, ratioKwc: 0.49, ratioM2: 106 },
  { gamme: 'HELIOS 29', id: 'H52', code: 'S8.8 0.0 0.0', longueur: 67.50, largeur: 29.75, surface: 2008, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '9 x 7.5m', kwc: 438, tarif: 211275, ratioKwc: 0.48, ratioM2: 105 },
  { gamme: 'HELIOS 29', id: 'H53', code: 'S8.8 0.0 0.0', longueur: 75.00, largeur: 29.75, surface: 2231, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '10 x 7.5m', kwc: 483, tarif: 232950, ratioKwc: 0.48, ratioM2: 104 },
  { gamme: 'HELIOS 29', id: 'H54', code: 'S9.9 0.0 0.0', longueur: 82.50, largeur: 29.75, surface: 2454, poteau: '', sabliere: '5.5m', faitage: '8.12m', travees: '11 x 7.5m', kwc: 535, tarif: 254454, ratioKwc: 0.48, ratioM2: 104 },

  // ─── HELIOS 33 (Symétrique 33.46m) ───
  { gamme: 'HELIOS 33', id: 'H55', code: 'S9.9 0.0 0.0', longueur: 30.00, largeur: 33.46, surface: 1004, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '4 x 7.5m', kwc: 217, tarif: 118675, ratioKwc: 0.55, ratioM2: 118 },
  { gamme: 'HELIOS 33', id: 'H56', code: 'S9.9 0.0 0.0', longueur: 37.50, largeur: 33.46, surface: 1255, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '5 x 7.5m', kwc: 273, tarif: 144950, ratioKwc: 0.53, ratioM2: 115 },
  { gamme: 'HELIOS 33', id: 'H57', code: 'S9.9 0.0 0.0', longueur: 45.00, largeur: 33.46, surface: 1506, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '6 x 7.5m', kwc: 326, tarif: 171053, ratioKwc: 0.52, ratioM2: 114 },
  { gamme: 'HELIOS 33', id: 'H58', code: 'S9.9 0.0 0.0', longueur: 52.50, largeur: 33.46, surface: 1757, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '7 x 7.5m', kwc: 377, tarif: 197329, ratioKwc: 0.52, ratioM2: 112 },
  { gamme: 'HELIOS 33', id: 'H59', code: 'S9.9 0.0 0.0', longueur: 60.00, largeur: 33.46, surface: 2008, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '8 x 7.5m', kwc: 435, tarif: 224273, ratioKwc: 0.52, ratioM2: 112 },
  { gamme: 'HELIOS 33', id: 'H60', code: 'S9.9 0.0 0.0', longueur: 67.50, largeur: 33.46, surface: 2259, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '9 x 7.5m', kwc: 494, tarif: 250376, ratioKwc: 0.51, ratioM2: 111 },
  { gamme: 'HELIOS 33', id: 'H61', code: 'S9.9 0.0 0.0', longueur: 75.00, largeur: 33.46, surface: 2510, poteau: '', sabliere: '5.5m', faitage: '8.45m', travees: '10 x 7.5m', kwc: 546, tarif: 276651, ratioKwc: 0.51, ratioM2: 110 },

  // ─── YOKO 33 (Symétrique + 2 Appentis 9.3m = 33.60m) ───
  { gamme: 'YOKO 33', id: 'Y1', code: 'S4.4 5.5 0.0', longueur: 30.00, largeur: 33.60, surface: 1008, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '4 x 7.5m', kwc: 217, tarif: 105010, ratioKwc: 0.48, ratioM2: 104 },
  { gamme: 'YOKO 33', id: 'Y2', code: 'S4.4 5.5 0.0', longueur: 37.50, largeur: 33.60, surface: 1260, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '5 x 7.5m', kwc: 273, tarif: 126833, ratioKwc: 0.46, ratioM2: 101 },
  { gamme: 'YOKO 33', id: 'Y3', code: 'S4.4 5.5 0.0', longueur: 45.00, largeur: 33.60, surface: 1512, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '6 x 7.5m', kwc: 326, tarif: 149483, ratioKwc: 0.46, ratioM2: 99 },
  { gamme: 'YOKO 33', id: 'Y4', code: 'S4.4 5.5 0.0', longueur: 52.50, largeur: 33.60, surface: 1764, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '7 x 7.5m', kwc: 377, tarif: 171307, ratioKwc: 0.45, ratioM2: 97 },
  { gamme: 'YOKO 33', id: 'Y5', code: 'S4.4 5.5 0.0', longueur: 60.00, largeur: 33.60, surface: 2016, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '8 x 7.5m', kwc: 435, tarif: 193130, ratioKwc: 0.44, ratioM2: 96 },
  { gamme: 'YOKO 33', id: 'Y6', code: 'S4.4 5.5 0.0', longueur: 67.50, largeur: 33.60, surface: 2268, poteau: '9.3/15/9.3m', sabliere: '3.9m', faitage: '6.82m', travees: '9 x 7.5m', kwc: 494, tarif: 215125, ratioKwc: 0.44, ratioM2: 95 },

  // ─── YOKO 37, 41, 45, 48 ───
  { gamme: 'YOKO 37', id: 'Y7', code: 'S5.5 5.5 0.0', longueur: 30.00, largeur: 37.20, surface: 1116, poteau: '9.3/18.6/9.3m', sabliere: '3.9m', faitage: '7.1m', travees: '4 x 7.5m', kwc: 241, tarif: 114478, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'YOKO 37', id: 'Y8', code: 'S5.5 5.5 0.0', longueur: 37.50, largeur: 37.20, surface: 1395, poteau: '9.3/18.6/9.3m', sabliere: '3.9m', faitage: '7.1m', travees: '5 x 7.5m', kwc: 312, tarif: 140011, ratioKwc: 0.45, ratioM2: 100 },
  { gamme: 'YOKO 37', id: 'Y9', code: 'S5.5 5.5 0.0', longueur: 45.00, largeur: 37.20, surface: 1674, poteau: '9.3/18.6/9.3m', sabliere: '3.9m', faitage: '7.1m', travees: '6 x 7.5m', kwc: 372, tarif: 165060, ratioKwc: 0.44, ratioM2: 99 },
  { gamme: 'YOKO 37', id: 'Y10', code: 'S5.5 5.5 0.0', longueur: 52.50, largeur: 37.20, surface: 1953, poteau: '9.3/18.6/9.3m', sabliere: '3.9m', faitage: '7.1m', travees: '7 x 7.5m', kwc: 431, tarif: 189753, ratioKwc: 0.44, ratioM2: 97 },
  { gamme: 'YOKO 37', id: 'Y11', code: 'S5.5 5.5 0.0', longueur: 60.00, largeur: 37.20, surface: 2232, poteau: '9.3/18.6/9.3m', sabliere: '3.9m', faitage: '7.1m', travees: '8 x 7.5m', kwc: 491, tarif: 214446, ratioKwc: 0.44, ratioM2: 96 },

  { gamme: 'YOKO 41', id: 'Y12', code: 'S6.6 5.5 0.0', longueur: 30.00, largeur: 41.00, surface: 1230, poteau: '9.3/22.3/9.3m', sabliere: '3.9m', faitage: '7.5m', travees: '4 x 7.5m', kwc: 265, tarif: 128898, ratioKwc: 0.49, ratioM2: 105 },
  { gamme: 'YOKO 41', id: 'Y13', code: 'S6.6 5.5 0.0', longueur: 37.50, largeur: 41.00, surface: 1537, poteau: '9.3/22.3/9.3m', sabliere: '3.9m', faitage: '7.5m', travees: '5 x 7.5m', kwc: 332, tarif: 150993, ratioKwc: 0.45, ratioM2: 98 },
  { gamme: 'YOKO 41', id: 'Y14', code: 'S6.6 5.5 0.0', longueur: 45.00, largeur: 41.00, surface: 1845, poteau: '9.3/22.3/9.3m', sabliere: '3.9m', faitage: '7.5m', travees: '6 x 7.5m', kwc: 398, tarif: 177248, ratioKwc: 0.45, ratioM2: 96 },
  { gamme: 'YOKO 41', id: 'Y15', code: 'S6.6 5.5 0.0', longueur: 52.50, largeur: 41.00, surface: 2152, poteau: '9.3/22.3/9.3m', sabliere: '3.9m', faitage: '7.5m', travees: '7 x 7.5m', kwc: 460, tarif: 203673, ratioKwc: 0.44, ratioM2: 95 },

  { gamme: 'YOKO 45', id: 'Y16', code: 'S7.7 5.5 0.0', longueur: 30.00, largeur: 45.00, surface: 1350, poteau: '9.3/26.9/9.3m', sabliere: '3.9m', faitage: '7.8m', travees: '4 x 7.5m', kwc: 290, tarif: 139163, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'YOKO 45', id: 'Y17', code: 'S7.7 5.5 0.0', longueur: 37.50, largeur: 45.00, surface: 1687, poteau: '9.3/26.9/9.3m', sabliere: '3.9m', faitage: '7.8m', travees: '5 x 7.5m', kwc: 371, tarif: 168652, ratioKwc: 0.45, ratioM2: 100 },
  { gamme: 'YOKO 45', id: 'Y18', code: 'S7.7 5.5 0.0', longueur: 45.00, largeur: 45.00, surface: 2025, poteau: '9.3/26.9/9.3m', sabliere: '3.9m', faitage: '7.8m', travees: '6 x 7.5m', kwc: 441, tarif: 197270, ratioKwc: 0.45, ratioM2: 97 },

  { gamme: 'YOKO 48', id: 'Y19', code: 'S8.8 5.5 0.0', longueur: 30.00, largeur: 48.00, surface: 1440, poteau: '9.3/29.8/9.3m', sabliere: '3.9m', faitage: '8.1m', travees: '4 x 7.5m', kwc: 314, tarif: 155449, ratioKwc: 0.50, ratioM2: 108 },
  { gamme: 'YOKO 48', id: 'Y20', code: 'S8.8 5.5 0.0', longueur: 37.50, largeur: 48.00, surface: 1800, poteau: '9.3/29.8/9.3m', sabliere: '3.9m', faitage: '8.1m', travees: '5 x 7.5m', kwc: 410, tarif: 188698, ratioKwc: 0.46, ratioM2: 105 },
  { gamme: 'YOKO 48', id: 'Y21', code: 'S8.8 5.5 0.0', longueur: 45.00, largeur: 48.00, surface: 2160, poteau: '9.3/29.8/9.3m', sabliere: '3.9m', faitage: '8.1m', travees: '6 x 7.5m', kwc: 488, tarif: 221592, ratioKwc: 0.45, ratioM2: 103 },

  // ─── SOLEA 21 (Symétrique + 2 Auvents 4m = 23.00m) ───
  { gamme: 'SOLEA 21', id: 'S1', code: 'S4.4 0.0 2.2', longueur: 30.00, largeur: 23.00, surface: 690, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '4 x 7.5m', kwc: 145, tarif: 67327, ratioKwc: 0.46, ratioM2: 98 },
  { gamme: 'SOLEA 21', id: 'S2', code: 'S4.4 0.0 2.2', longueur: 37.50, largeur: 23.00, surface: 862, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '5 x 7.5m', kwc: 178, tarif: 81415, ratioKwc: 0.46, ratioM2: 94 },
  { gamme: 'SOLEA 21', id: 'S3', code: 'S4.4 0.0 2.2', longueur: 45.00, largeur: 23.00, surface: 1035, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '6 x 7.5m', kwc: 217, tarif: 95503, ratioKwc: 0.44, ratioM2: 92 },
  { gamme: 'SOLEA 21', id: 'S4', code: 'S4.4 0.0 2.2', longueur: 52.50, largeur: 23.00, surface: 1207, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '7 x 7.5m', kwc: 251, tarif: 109591, ratioKwc: 0.44, ratioM2: 91 },
  { gamme: 'SOLEA 21', id: 'S5', code: 'S4.4 0.0 2.2', longueur: 60.00, largeur: 23.00, surface: 1380, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '8 x 7.5m', kwc: 290, tarif: 123494, ratioKwc: 0.43, ratioM2: 89 },
  { gamme: 'SOLEA 21', id: 'S6', code: 'S4.4 0.0 2.2', longueur: 67.50, largeur: 23.00, surface: 1552, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '9 x 7.5m', kwc: 329, tarif: 138422, ratioKwc: 0.42, ratioM2: 89 },
  { gamme: 'SOLEA 21', id: 'S7', code: 'S4.4 0.0 2.2', longueur: 75.00, largeur: 23.00, surface: 1725, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '10 x 7.5m', kwc: 362, tarif: 152510, ratioKwc: 0.42, ratioM2: 88 },
  { gamme: 'SOLEA 21', id: 'S8', code: 'S4.4 0.0 2.2', longueur: 82.50, largeur: 23.00, surface: 1897, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '11 x 7.5m', kwc: 401, tarif: 166598, ratioKwc: 0.42, ratioM2: 88 },
  { gamme: 'SOLEA 21', id: 'S9', code: 'S4.4 0.0 2.2', longueur: 90.00, largeur: 23.00, surface: 2070, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '12 x 7.5m', kwc: 435, tarif: 180500, ratioKwc: 0.41, ratioM2: 87 },
  { gamme: 'SOLEA 21', id: 'S10', code: 'S4.4 0.0 2.2', longueur: 97.50, largeur: 23.00, surface: 2242, poteau: '4/15/4m', sabliere: '4.6m', faitage: '6.82m', travees: '13 x 7.5m', kwc: 474, tarif: 194588, ratioKwc: 0.41, ratioM2: 87 },

  // ─── SOLEA 26, 30, 34, 37, 41 ───
  { gamme: 'SOLEA 26', id: 'S11', code: 'S5.5 0.0 2.2', longueur: 30.00, largeur: 26.60, surface: 798, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '4 x 7.5m', kwc: 169, tarif: 76752, ratioKwc: 0.45, ratioM2: 96 },
  { gamme: 'SOLEA 26', id: 'S12', code: 'S5.5 0.0 2.2', longueur: 37.50, largeur: 26.60, surface: 997, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '5 x 7.5m', kwc: 214, tarif: 93665, ratioKwc: 0.44, ratioM2: 94 },
  { gamme: 'SOLEA 26', id: 'S13', code: 'S5.5 0.0 2.2', longueur: 45.00, largeur: 26.60, surface: 1197, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '6 x 7.5m', kwc: 255, tarif: 110579, ratioKwc: 0.43, ratioM2: 92 },
  { gamme: 'SOLEA 26', id: 'S14', code: 'S5.5 0.0 2.2', longueur: 52.50, largeur: 26.60, surface: 1396, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '7 x 7.5m', kwc: 296, tarif: 128332, ratioKwc: 0.43, ratioM2: 92 },
  { gamme: 'SOLEA 26', id: 'S15', code: 'S5.5 0.0 2.2', longueur: 60.00, largeur: 26.60, surface: 1596, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '8 x 7.5m', kwc: 338, tarif: 145246, ratioKwc: 0.43, ratioM2: 91 },
  { gamme: 'SOLEA 26', id: 'S16', code: 'S5.5 0.0 2.2', longueur: 67.50, largeur: 26.60, surface: 1795, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '9 x 7.5m', kwc: 388, tarif: 162345, ratioKwc: 0.42, ratioM2: 90 },
  { gamme: 'SOLEA 26', id: 'S17', code: 'S5.5 0.0 2.2', longueur: 75.00, largeur: 26.60, surface: 1995, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '10 x 7.5m', kwc: 429, tarif: 179087, ratioKwc: 0.42, ratioM2: 90 },
  { gamme: 'SOLEA 26', id: 'S18', code: 'S5.5 0.0 2.2', longueur: 82.50, largeur: 26.60, surface: 2194, poteau: '4/18.6/4m', sabliere: '4.6m', faitage: '7.1m', travees: '11 x 7.5m', kwc: 470, tarif: 196001, ratioKwc: 0.42, ratioM2: 89 },

  { gamme: 'SOLEA 30', id: 'S19', code: 'S6.6 0.0 2.2', longueur: 30.00, largeur: 30.30, surface: 909, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '4 x 7.5m', kwc: 193, tarif: 86158, ratioKwc: 0.45, ratioM2: 95 },
  { gamme: 'SOLEA 30', id: 'S20', code: 'S6.6 0.0 2.2', longueur: 37.50, largeur: 30.30, surface: 1136, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '5 x 7.5m', kwc: 238, tarif: 104462, ratioKwc: 0.44, ratioM2: 92 },
  { gamme: 'SOLEA 30', id: 'S21', code: 'S6.6 0.0 2.2', longueur: 45.00, largeur: 30.30, surface: 1363, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '6 x 7.5m', kwc: 290, tarif: 123777, ratioKwc: 0.43, ratioM2: 91 },
  { gamme: 'SOLEA 30', id: 'S22', code: 'S6.6 0.0 2.2', longueur: 52.50, largeur: 30.30, surface: 1590, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '7 x 7.5m', kwc: 334, tarif: 142253, ratioKwc: 0.43, ratioM2: 89 },
  { gamme: 'SOLEA 30', id: 'S23', code: 'S6.6 0.0 2.2', longueur: 60.00, largeur: 30.30, surface: 1818, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '8 x 7.5m', kwc: 386, tarif: 160557, ratioKwc: 0.42, ratioM2: 88 },
  { gamme: 'SOLEA 30', id: 'S24', code: 'S6.6 0.0 2.2', longueur: 67.50, largeur: 30.30, surface: 2045, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '9 x 7.5m', kwc: 438, tarif: 179032, ratioKwc: 0.41, ratioM2: 88 },
  { gamme: 'SOLEA 30', id: 'S25', code: 'S6.6 0.0 2.2', longueur: 75.00, largeur: 30.30, surface: 2272, poteau: '4/22.3/4m', sabliere: '4.6m', faitage: '7.5m', travees: '10 x 7.5m', kwc: 483, tarif: 197508, ratioKwc: 0.41, ratioM2: 87 },

  { gamme: 'SOLEA 34', id: 'S26', code: 'S7.7 0.0 2.2', longueur: 30.00, largeur: 34.00, surface: 1020, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '4 x 7.5m', kwc: 217, tarif: 99196, ratioKwc: 0.46, ratioM2: 97 },
  { gamme: 'SOLEA 34', id: 'S27', code: 'S7.7 0.0 2.2', longueur: 37.50, largeur: 34.00, surface: 1275, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '5 x 7.5m', kwc: 273, tarif: 121295, ratioKwc: 0.44, ratioM2: 95 },
  { gamme: 'SOLEA 34', id: 'S28', code: 'S7.7 0.0 2.2', longueur: 45.00, largeur: 34.00, surface: 1530, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '6 x 7.5m', kwc: 326, tarif: 142726, ratioKwc: 0.44, ratioM2: 93 },
  { gamme: 'SOLEA 34', id: 'S29', code: 'S7.7 0.0 2.2', longueur: 52.50, largeur: 34.00, surface: 1785, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '7 x 7.5m', kwc: 377, tarif: 163985, ratioKwc: 0.43, ratioM2: 92 },
  { gamme: 'SOLEA 34', id: 'S30', code: 'S7.7 0.0 2.2', longueur: 60.00, largeur: 34.00, surface: 2040, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '8 x 7.5m', kwc: 435, tarif: 185415, ratioKwc: 0.43, ratioM2: 91 },
  { gamme: 'SOLEA 34', id: 'S31', code: 'S7.7 0.0 2.2', longueur: 67.50, largeur: 34.00, surface: 2295, poteau: '4/26/4m', sabliere: '4.6m', faitage: '7.8m', travees: '9 x 7.5m', kwc: 494, tarif: 206674, ratioKwc: 0.42, ratioM2: 90 },

  { gamme: 'SOLEA 37', id: 'S32', code: 'S8.8 0.0 2.2', longueur: 30.00, largeur: 37.80, surface: 1134, poteau: '4/29.8/4m', sabliere: '4.6m', faitage: '8.1m', travees: '4 x 7.5m', kwc: 241, tarif: 114738, ratioKwc: 0.48, ratioM2: 101 },
  { gamme: 'SOLEA 37', id: 'S33', code: 'S8.8 0.0 2.2', longueur: 37.50, largeur: 37.80, surface: 1417, poteau: '4/29.8/4m', sabliere: '4.6m', faitage: '8.1m', travees: '5 x 7.5m', kwc: 312, tarif: 139648, ratioKwc: 0.45, ratioM2: 99 },
  { gamme: 'SOLEA 37', id: 'S34', code: 'S8.8 0.0 2.2', longueur: 45.00, largeur: 37.80, surface: 1687, poteau: '4/29.8/4m', sabliere: '4.6m', faitage: '8.1m', travees: '6 x 7.5m', kwc: 372, tarif: 164388, ratioKwc: 0.44, ratioM2: 97 },
  { gamme: 'SOLEA 37', id: 'S35', code: 'S8.8 0.0 2.2', longueur: 52.50, largeur: 37.80, surface: 1984, poteau: '4/29.8/4m', sabliere: '4.6m', faitage: '8.1m', travees: '7 x 7.5m', kwc: 431, tarif: 188941, ratioKwc: 0.44, ratioM2: 95 },
  { gamme: 'SOLEA 37', id: 'S36', code: 'S8.8 0.0 2.2', longueur: 60.00, largeur: 37.80, surface: 2268, poteau: '4/29.8/4m', sabliere: '4.6m', faitage: '8.1m', travees: '8 x 7.5m', kwc: 491, tarif: 214521, ratioKwc: 0.44, ratioM2: 95 },

  { gamme: 'SOLEA 41', id: 'S37', code: 'S9.9 0.0 2.2', longueur: 30.00, largeur: 41.50, surface: 1245, poteau: '4/33.5/4m', sabliere: '4.6m', faitage: '8.5m', travees: '4 x 7.5m', kwc: 265, tarif: 131368, ratioKwc: 0.50, ratioM2: 106 },
  { gamme: 'SOLEA 41', id: 'S38', code: 'S9.9 0.0 2.2', longueur: 37.50, largeur: 41.50, surface: 1556, poteau: '4/33.5/4m', sabliere: '4.6m', faitage: '8.5m', travees: '5 x 7.5m', kwc: 332, tarif: 160522, ratioKwc: 0.48, ratioM2: 103 },
  { gamme: 'SOLEA 41', id: 'S39', code: 'S9.9 0.0 2.2', longueur: 45.00, largeur: 41.50, surface: 1867, poteau: '4/33.5/4m', sabliere: '4.6m', faitage: '8.5m', travees: '6 x 7.5m', kwc: 398, tarif: 189861, ratioKwc: 0.48, ratioM2: 102 },
  { gamme: 'SOLEA 41', id: 'S40', code: 'S9.9 0.0 2.2', longueur: 52.50, largeur: 41.50, surface: 2178, poteau: '4/33.5/4m', sabliere: '4.6m', faitage: '8.5m', travees: '7 x 7.5m', kwc: 460, tarif: 220040, ratioKwc: 0.48, ratioM2: 101 },

  // ─── OMBRIERES VL & PL ───
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 30.00, largeur: 6.92, surface: 207.6, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '4 x 7.5m', kwc: 52, tarif: 29348, ratioKwc: 0.56, ratioM2: 141 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 37.50, largeur: 6.92, surface: 259.5, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '5 x 7.5m', kwc: 65, tarif: 34598, ratioKwc: 0.53, ratioM2: 133 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 45.00, largeur: 6.92, surface: 311.4, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '6 x 7.5m', kwc: 76, tarif: 39848, ratioKwc: 0.52, ratioM2: 128 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 52.50, largeur: 6.92, surface: 363.3, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '7 x 7.5m', kwc: 89, tarif: 44913, ratioKwc: 0.50, ratioM2: 124 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 60.00, largeur: 6.92, surface: 415.2, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '8 x 7.5m', kwc: 102, tarif: 50164, ratioKwc: 0.49, ratioM2: 121 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 67.50, largeur: 6.92, surface: 467.1, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '9 x 7.5m', kwc: 113, tarif: 55414, ratioKwc: 0.49, ratioM2: 119 },
  { gamme: 'OMBRIERE VL SIMPLE GAUCHE', id: 'O3M', code: 'OM3', longueur: 75.00, largeur: 6.92, surface: 519.0, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '10 x 7.5m', kwc: 126, tarif: 60479, ratioKwc: 0.48, ratioM2: 117 },

  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 30.00, largeur: 6.92, surface: 207.6, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '4 x 7.5m', kwc: 52, tarif: 27248, ratioKwc: 0.52, ratioM2: 131 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 37.50, largeur: 6.92, surface: 259.5, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '5 x 7.5m', kwc: 65, tarif: 32078, ratioKwc: 0.49, ratioM2: 124 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 45.00, largeur: 6.92, surface: 311.4, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '6 x 7.5m', kwc: 76, tarif: 36908, ratioKwc: 0.49, ratioM2: 119 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 52.50, largeur: 6.92, surface: 363.3, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '7 x 7.5m', kwc: 89, tarif: 41553, ratioKwc: 0.47, ratioM2: 114 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 60.00, largeur: 6.92, surface: 415.2, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '8 x 7.5m', kwc: 102, tarif: 46384, ratioKwc: 0.45, ratioM2: 112 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 67.50, largeur: 6.92, surface: 467.1, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '9 x 7.5m', kwc: 113, tarif: 51232, ratioKwc: 0.45, ratioM2: 110 },
  { gamme: 'OMBRIERE VL SIMPLE DROITE', id: 'O3D', code: 'OD3', longueur: 75.00, largeur: 6.92, surface: 519.0, poteau: '', sabliere: '2.93m', faitage: '4.96m', travees: '10 x 7.5m', kwc: 126, tarif: 55859, ratioKwc: 0.44, ratioM2: 108 },

  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 30.00, largeur: 9.14, surface: 274.2, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '4 x 7.5m', kwc: 66, tarif: 29049, ratioKwc: 0.44, ratioM2: 106 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 37.50, largeur: 9.14, surface: 342.75, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '5 x 7.5m', kwc: 81, tarif: 34147, ratioKwc: 0.42, ratioM2: 100 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 45.00, largeur: 9.14, surface: 411.3, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '6 x 7.5m', kwc: 100, tarif: 39244, ratioKwc: 0.39, ratioM2: 95 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 52.50, largeur: 9.14, surface: 479.85, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '7 x 7.5m', kwc: 115, tarif: 44341, ratioKwc: 0.39, ratioM2: 92 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 60.00, largeur: 9.14, surface: 548.4, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '8 x 7.5m', kwc: 130, tarif: 49438, ratioKwc: 0.38, ratioM2: 90 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 67.50, largeur: 9.14, surface: 616.95, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '9 x 7.5m', kwc: 145, tarif: 54535, ratioKwc: 0.38, ratioM2: 88 },
  { gamme: 'OMBRIERE VL DOUBLE', id: 'O4', code: 'O4', longueur: 75.00, largeur: 9.14, surface: 685.5, poteau: '', sabliere: '3m', faitage: '4.61m', travees: '10 x 7.5m', kwc: 163, tarif: 59633, ratioKwc: 0.37, ratioM2: 87 },

  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 30.00, largeur: 11.35, surface: 340.5, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '4 x 7.5m', kwc: 91, tarif: 32115, ratioKwc: 0.35, ratioM2: 94 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 37.50, largeur: 11.35, surface: 425.63, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '5 x 7.5m', kwc: 113, tarif: 38043, ratioKwc: 0.34, ratioM2: 89 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 45.00, largeur: 11.35, surface: 510.75, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '6 x 7.5m', kwc: 133, tarif: 43786, ratioKwc: 0.33, ratioM2: 86 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 52.50, largeur: 11.35, surface: 595.88, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '7 x 7.5m', kwc: 156, tarif: 49528, ratioKwc: 0.32, ratioM2: 83 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 60.00, largeur: 11.35, surface: 681.0, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '8 x 7.5m', kwc: 179, tarif: 55271, ratioKwc: 0.31, ratioM2: 81 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 67.50, largeur: 11.35, surface: 766.13, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '9 x 7.5m', kwc: 198, tarif: 61199, ratioKwc: 0.31, ratioM2: 80 },
  { gamme: 'OMBRIERE VL DOUBLE+', id: 'O5', code: 'O5', longueur: 75.00, largeur: 11.35, surface: 851.25, poteau: '', sabliere: '2.8m', faitage: '4.74m', travees: '10 x 7.5m', kwc: 221, tarif: 66941, ratioKwc: 0.30, ratioM2: 79 },

  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 30.00, largeur: 15.80, surface: 474.0, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '4 x 7.5m', kwc: 117, tarif: 44199, ratioKwc: 0.38, ratioM2: 93 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 37.50, largeur: 15.80, surface: 592.5, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '5 x 7.5m', kwc: 146, tarif: 52658, ratioKwc: 0.36, ratioM2: 89 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 45.00, largeur: 15.80, surface: 711.0, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '6 x 7.5m', kwc: 175, tarif: 61303, ratioKwc: 0.35, ratioM2: 86 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 52.50, largeur: 15.80, surface: 829.5, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '7 x 7.5m', kwc: 201, tarif: 69762, ratioKwc: 0.35, ratioM2: 84 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 60.00, largeur: 15.80, surface: 948.0, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '8 x 7.5m', kwc: 230, tarif: 78406, ratioKwc: 0.34, ratioM2: 83 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 67.50, largeur: 15.80, surface: 1066.5, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '9 x 7.5m', kwc: 255, tarif: 87706, ratioKwc: 0.34, ratioM2: 82 },
  { gamme: 'OMBRIERE PL 16m', id: 'O7', code: 'O7', longueur: 75.00, largeur: 15.80, surface: 1185.0, poteau: '', sabliere: '5.1m', faitage: '7.86m', travees: '10 x 7.5m', kwc: 286, tarif: 96350, ratioKwc: 0.34, ratioM2: 81 },

  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 30.00, largeur: 20.22, surface: 606.6, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '4 x 7.5m', kwc: 156, tarif: 61600, ratioKwc: 0.39, ratioM2: 102 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 37.50, largeur: 20.22, surface: 758.25, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '5 x 7.5m', kwc: 195, tarif: 73732, ratioKwc: 0.38, ratioM2: 97 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 45.00, largeur: 20.22, surface: 909.9, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '6 x 7.5m', kwc: 228, tarif: 85863, ratioKwc: 0.38, ratioM2: 94 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 52.50, largeur: 20.22, surface: 1061.55, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '7 x 7.5m', kwc: 267, tarif: 98834, ratioKwc: 0.37, ratioM2: 93 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 60.00, largeur: 20.22, surface: 1213.2, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '8 x 7.5m', kwc: 306, tarif: 110966, ratioKwc: 0.36, ratioM2: 91 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 67.50, largeur: 20.22, surface: 1364.85, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '9 x 7.5m', kwc: 340, tarif: 123097, ratioKwc: 0.36, ratioM2: 90 },
  { gamme: 'OMBRIERE PL 20m', id: 'O9', code: 'O9', longueur: 75.00, largeur: 20.22, surface: 1516.5, poteau: '', sabliere: '5.73m', faitage: '9.29m', travees: '10 x 7.5m', kwc: 379, tarif: 135414, ratioKwc: 0.36, ratioM2: 89 },

  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 30.00, largeur: 24.65, surface: 739.5, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '4 x 7.5m', kwc: 184, tarif: 68966, ratioKwc: 0.37, ratioM2: 93 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 37.50, largeur: 24.65, surface: 924.38, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '5 x 7.5m', kwc: 227, tarif: 83423, ratioKwc: 0.37, ratioM2: 90 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 45.00, largeur: 24.65, surface: 1109.25, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '6 x 7.5m', kwc: 276, tarif: 98534, ratioKwc: 0.36, ratioM2: 89 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 52.50, largeur: 24.65, surface: 1294.13, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '7 x 7.5m', kwc: 317, tarif: 112991, ratioKwc: 0.36, ratioM2: 87 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 60.00, largeur: 24.65, surface: 1479.0, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '8 x 7.5m', kwc: 358, tarif: 127448, ratioKwc: 0.36, ratioM2: 86 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 67.50, largeur: 24.65, surface: 1663.88, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '9 x 7.5m', kwc: 398, tarif: 141719, ratioKwc: 0.36, ratioM2: 85 },
  { gamme: 'OMBRIERE PL 25m', id: 'O11', code: 'O11', longueur: 75.00, largeur: 24.65, surface: 1848.75, poteau: '', sabliere: '5m', faitage: '9.35m', travees: '10 x 7.5m', kwc: 450, tarif: 156176, ratioKwc: 0.35, ratioM2: 84 },
];

/**
 * Recherche intelligente du modèle Barconnière correspondant à la configuration
 */
export function findBarconniereBuilding({
  length = 30.0,
  width = 15.0,
  buildingType = 'symetrique',
  leftSide = 'none',
  rightSide = 'none',
  leftWidth = 0,
  rightWidth = 0,
  isAcama = false,
}) {
  const totalWidth = width + (leftSide !== 'none' ? Number(leftWidth) : 0) + (rightSide !== 'none' ? Number(rightWidth) : 0);
  const floorArea = Math.round(length * totalWidth);

  // 1. Filtrer par typologie
  let candidateGammes = [];
  const bType = String(buildingType).toLowerCase();

  if (bType.includes('ombriere') || bType.includes('parking')) {
    candidateGammes = ['OMBRIERE VL SIMPLE GAUCHE', 'OMBRIERE VL SIMPLE DROITE', 'OMBRIERE VL DOUBLE', 'OMBRIERE VL DOUBLE+', 'OMBRIERE PL 16m', 'OMBRIERE PL 20m', 'OMBRIERE PL 25m'];
  } else if (bType.startsWith('mono')) {
    candidateGammes = ['ATLAS 12', 'ATLAS 16'];
  } else if (bType.startsWith('asym')) {
    if (totalWidth > 23.5) {
      candidateGammes = ['CYRUS 25', 'CYRUS 29', 'ORION 20'];
    } else {
      candidateGammes = ['ORION 16', 'ORION 20'];
    }
  } else if (leftSide === 'appentis' && rightSide === 'appentis') {
    candidateGammes = ['YOKO 33', 'YOKO 37', 'YOKO 41', 'YOKO 45', 'YOKO 48'];
  } else if (leftSide === 'appentis' || rightSide === 'appentis') {
    candidateGammes = ['KEREN 24', 'KEREN 28', 'KEREN 32', 'KEREN 35', 'KEREN 39', 'KEREN 43'];
  } else if ((leftSide === 'auvent' && rightSide === 'auvent') || (totalWidth > width + 4.5)) {
    candidateGammes = ['SOLEA 21', 'SOLEA 26', 'SOLEA 30', 'SOLEA 34', 'SOLEA 37', 'SOLEA 41'];
  } else {
    // Symétrique standard
    candidateGammes = ['HELIOS 15', 'HELIOS 18', 'HELIOS 22', 'HELIOS 26', 'HELIOS 29', 'HELIOS 33'];
  }

  // Chercher match exact
  let matches = BARCONNIERE_CATALOG.filter(item => {
    const matchGamme = candidateGammes.length === 0 || candidateGammes.includes(item.gamme);
    const matchWidth = Math.abs(item.largeur - totalWidth) < 0.6 || Math.abs(item.largeur - width) < 0.6;
    const matchLength = Math.abs(item.longueur - length) < 1.0;
    return matchGamme && matchWidth && matchLength;
  });

  if (matches.length > 0) {
    return {
      ...matches[0],
      exactMatch: true,
    };
  }

  // Chercher match le plus proche en surface & largeur
  let closest = BARCONNIERE_CATALOG.reduce((best, cur) => {
    const isPreferredGamme = candidateGammes.includes(cur.gamme);
    const widthDiff = Math.abs(cur.largeur - totalWidth);
    const lengthDiff = Math.abs(cur.longueur - length);
    const score = (widthDiff * 3) + lengthDiff + (isPreferredGamme ? 0 : 25);

    if (!best || score < best.score) {
      return { item: cur, score };
    }
    return best;
  }, null);

  if (closest && closest.item) {
    const item = closest.item;
    // Ajuster le tarif proportionnellement à la surface réelle si écart
    const surfaceRatio = floorArea / item.surface;
    const estimatedTarif = Math.round(item.tarif * surfaceRatio);
    return {
      ...item,
      tarif: estimatedTarif,
      surface: floorArea,
      exactMatch: false,
    };
  }

  // Fallback par défaut
  return {
    gamme: 'HELIOS 15',
    id: 'H1',
    code: 'S4.4 0.0 0.0',
    longueur: length,
    largeur: totalWidth,
    surface: floorArea,
    kwc: Math.round(floorArea * 0.20),
    tarif: Math.round(floorArea * 122),
    ratioKwc: 0.57,
    ratioM2: 122,
    exactMatch: false,
  };
}
