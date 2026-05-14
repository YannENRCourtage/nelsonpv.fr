import React, { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Ruler } from 'lucide-react';
import { useConfiguratorStore, useConfiguratorValues } from '@/stores/useConfiguratorStore';

// ─── GREEN INVEST ────────────────────────────────────────────────────────────
const buildingsData = [
  { code: 'O1', length: 30, width: 16.4, surface: 492, power: 96, ratio: 0.6 },
  { code: 'O2', length: 37.5, width: 16.4, surface: 615, power: 126, ratio: 0.55 },
  { code: 'O3', length: 45, width: 16.4, surface: 738, power: 151, ratio: 0.53 },
  { code: 'O4', length: 52.5, width: 16.4, surface: 861, power: 175, ratio: 0.53 },
  { code: 'O5', length: 60, width: 16.4, surface: 984, power: 199, ratio: 0.52 },
  { code: 'O6', length: 67.5, width: 16.4, surface: 1107, power: 229, ratio: 0.52 },
  { code: 'O7', length: 75, width: 16.4, surface: 1230, power: 253, ratio: 0.51 },
  { code: 'O8', length: 82.5, width: 16.4, surface: 1353, power: 278, ratio: 0.5 },
  { code: 'O9', length: 90, width: 16.4, surface: 1476, power: 302, ratio: 0.5 },
  { code: 'O10', length: 97.5, width: 16.4, surface: 1599, power: 323, ratio: 0.5 },
  { code: 'O11', length: 105, width: 16.4, surface: 1722, power: 356, ratio: 0.5 },
  { code: 'O12', length: 112.5, width: 16.4, surface: 1845, power: 380, ratio: 0.5 },
  { code: 'O13', length: 120, width: 16.4, surface: 1968, power: 405, ratio: 0.49 },
  { code: 'O14', length: 30, width: 20, surface: 600, power: 120, ratio: 0.58 },
  { code: 'O15', length: 37.5, width: 20, surface: 750, power: 156, ratio: 0.54 },
  { code: 'O16', length: 45, width: 20, surface: 900, power: 186, ratio: 0.53 },
  { code: 'O17', length: 52.5, width: 20, surface: 1050, power: 215, ratio: 0.53 },
  { code: 'O18', length: 60, width: 20, surface: 1200, power: 245, ratio: 0.52 },
  { code: 'O19', length: 67.5, width: 20, surface: 1350, power: 282, ratio: 0.51 },
  { code: 'O20', length: 75, width: 20, surface: 1500, power: 312, ratio: 0.5 },
  { code: 'O21', length: 82.5, width: 20, surface: 1650, power: 342, ratio: 0.5 },
  { code: 'O22', length: 90, width: 20, surface: 1800, power: 372, ratio: 0.5 },
  { code: 'O23', length: 97.5, width: 20, surface: 1950, power: 409, ratio: 0.49 },
  { code: 'O24', length: 105, width: 20, surface: 2100, power: 438, ratio: 0.5 },
  { code: 'O25', length: 112.5, width: 20, surface: 2250, power: 468, ratio: 0.5 },
  { code: 'O26', length: 120, width: 20, surface: 2400, power: 498, ratio: 0.5 },
  { code: 'C1', length: 30, width: 25.5, surface: 765, power: 169, ratio: 0.48 },
  { code: 'C2', length: 37.5, width: 25.5, surface: 956, power: 214, ratio: 0.45 },
  { code: 'C3', length: 45, width: 25.5, surface: 1147, power: 255, ratio: 0.45 },
  { code: 'C4', length: 52.5, width: 25.5, surface: 1339, power: 296, ratio: 0.44 },
  { code: 'C5', length: 60, width: 25.5, surface: 1530, power: 338, ratio: 0.44 },
  { code: 'C6', length: 67.5, width: 25.5, surface: 1721, power: 388, ratio: 0.43 },
  { code: 'C7', length: 75, width: 25.5, surface: 1912, power: 429, ratio: 0.42 },
  { code: 'C8', length: 82.5, width: 25.5, surface: 2104, power: 470, ratio: 0.42 },
  { code: 'C9', length: 90, width: 25.5, surface: 2295, power: 511, ratio: 0.42 },
  { code: 'C10', length: 30, width: 29, surface: 870, power: 193, ratio: 0.48 },
  { code: 'C11', length: 37.5, width: 29, surface: 1087, power: 244, ratio: 0.46 },
  { code: 'C12', length: 45, width: 29, surface: 1305, power: 290, ratio: 0.46 },
  { code: 'C13', length: 52.5, width: 29, surface: 1522, power: 337, ratio: 0.45 },
  { code: 'C14', length: 60, width: 29, surface: 1740, power: 386, ratio: 0.44 },
  { code: 'C15', length: 67.5, width: 29, surface: 1957, power: 441, ratio: 0.43 },
  { code: 'C16', length: 75, width: 29, surface: 2175, power: 488, ratio: 0.43 },
  { code: 'K1', length: 30, width: 24.3, surface: 729, power: 157, ratio: 0.51 },
  { code: 'K2', length: 37.5, width: 24.3, surface: 911, power: 195, ratio: 0.49 },
  { code: 'K3', length: 45, width: 24.3, surface: 1094, power: 235, ratio: 0.48 },
  { code: 'K4', length: 52.5, width: 24.3, surface: 1276, power: 272, ratio: 0.48 },
  { code: 'K5', length: 60, width: 24.3, surface: 1458, power: 314, ratio: 0.47 },
  { code: 'K6', length: 67.5, width: 24.3, surface: 1640, power: 356, ratio: 0.46 },
  { code: 'K7', length: 75, width: 24.3, surface: 1823, power: 392, ratio: 0.46 },
  { code: 'K8', length: 82.5, width: 24.3, surface: 2005, power: 435, ratio: 0.45 },
  { code: 'K9', length: 90, width: 24.3, surface: 2187, power: 471, ratio: 0.45 },
  { code: 'K10', length: 30, width: 28, surface: 840, power: 181, ratio: 0.49 },
  { code: 'K11', length: 37.5, width: 28, surface: 1050, power: 224, ratio: 0.48 },
  { code: 'K12', length: 45, width: 28, surface: 1260, power: 272, ratio: 0.47 },
  { code: 'K13', length: 52.5, width: 28, surface: 1470, power: 313, ratio: 0.47 },
  { code: 'K14', length: 60, width: 28, surface: 1680, power: 362, ratio: 0.46 },
  { code: 'K15', length: 67.5, width: 28, surface: 1890, power: 411, ratio: 0.45 },
  { code: 'K16', length: 75, width: 28, surface: 2100, power: 453, ratio: 0.45 },
  { code: 'K17', length: 82.5, width: 28, surface: 2310, power: 502, ratio: 0.45 },
  { code: 'K18', length: 30, width: 32, surface: 960, power: 205, ratio: 0.48 },
  { code: 'K19', length: 37.5, width: 32, surface: 1200, power: 253, ratio: 0.47 },
  { code: 'K20', length: 45, width: 32, surface: 1440, power: 308, ratio: 0.46 },
  { code: 'K21', length: 52.5, width: 32, surface: 1680, power: 355, ratio: 0.46 },
  { code: 'K22', length: 60, width: 32, surface: 1920, power: 411, ratio: 0.44 },
  { code: 'K23', length: 67.5, width: 32, surface: 2160, power: 466, ratio: 0.44 },
  { code: 'K24', length: 75, width: 32, surface: 2400, power: 513, ratio: 0.44 },
  { code: 'K25', length: 30, width: 35, surface: 1050, power: 229, ratio: 0.49 },
  { code: 'K26', length: 37.5, width: 35, surface: 1312, power: 292, ratio: 0.47 },
  { code: 'K27', length: 45, width: 35, surface: 1575, power: 348, ratio: 0.46 },
  { code: 'K28', length: 52.5, width: 35, surface: 1837, power: 404, ratio: 0.46 },
  { code: 'K29', length: 60, width: 35, surface: 2100, power: 460, ratio: 0.45 },
  { code: 'K30', length: 30, width: 39, surface: 1170, power: 253, ratio: 0.51 },
  { code: 'K31', length: 37.5, width: 39, surface: 1462, power: 322, ratio: 0.49 },
  { code: 'K32', length: 45, width: 39, surface: 1755, power: 383, ratio: 0.48 },
  { code: 'K33', length: 52.5, width: 39, surface: 2047, power: 445, ratio: 0.47 },
  { code: 'K34', length: 60, width: 39, surface: 2340, power: 507, ratio: 0.47 },
  { code: 'K35', length: 30, width: 43, surface: 1290, power: 278, ratio: 0.53 },
  { code: 'K36', length: 37.5, width: 43, surface: 1612, power: 351, ratio: 0.51 },
  { code: 'K37', length: 45, width: 43, surface: 1935, power: 418, ratio: 0.5 },
  { code: 'K38', length: 52.5, width: 43, surface: 2257, power: 485, ratio: 0.5 },
  { code: 'A1N', length: 30, width: '12,7 + 4', surface: 501, power: 96, ratio: 0.6 },
  { code: 'A1SN', length: 30, width: '12,7 + 8', surface: 621, power: 120, ratio: 0.53 },
  { code: 'A2N', length: 37.5, width: '12,7 + 4', surface: 626, power: 126, ratio: 0.55 },
  { code: 'A2SN', length: 37.5, width: '12,7 + 8', surface: 776, power: 156, ratio: 0.49 },
  { code: 'A3N', length: 45, width: '12,7 + 4', surface: 751, power: 151, ratio: 0.54 },
  { code: 'A3SN', length: 45, width: '12,7 + 8', surface: 931, power: 186, ratio: 0.49 },
  { code: 'A4N', length: 52.5, width: '12,7 + 4', surface: 877, power: 175, ratio: 0.53 },
  { code: 'A4SN', length: 52.5, width: '12,7 + 8', surface: 1087, power: 215, ratio: 0.48 },
  { code: 'A5N', length: 60, width: '12,7 + 4', surface: 1002, power: 199, ratio: 0.53 },
  { code: 'A5SN', length: 60, width: '12,7 + 8', surface: 1242, power: 245, ratio: 0.48 },
  { code: 'A6N', length: 67.5, width: '12,7 + 4', surface: 1127, power: 229, ratio: 0.51 },
  { code: 'A6SN', length: 67.5, width: '12,7 + 8', surface: 1397, power: 282, ratio: 0.47 },
  { code: 'A10N', length: 30, width: '16,4 + 4', surface: 612, power: 96, ratio: 0.6 },
  { code: 'A10SN', length: 30, width: '16,4 + 8', surface: 732, power: 117, ratio: 0.59 },
  { code: 'A11N', length: 37.5, width: '16,4 + 4', surface: 765, power: 151, ratio: 0.56 },
  { code: 'A11SN', length: 37.5, width: '16,4 + 8', surface: 915, power: 179, ratio: 0.51 },
  { code: 'A12N', length: 45, width: '16,4 + 4', surface: 918, power: 180, ratio: 0.55 },
  { code: 'A12SN', length: 45, width: '16,4 + 8', surface: 1098, power: 213, ratio: 0.51 },
  { code: 'A13N', length: 52.5, width: '16,4 + 4', surface: 1071, power: 208, ratio: 0.55 },
  { code: 'A13SN', length: 52.5, width: '16,4 + 8', surface: 1281, power: 247, ratio: 0.51 },
  { code: 'A14N', length: 60, width: '16,4 + 4', surface: 1224, power: 237, ratio: 0.54 },
  { code: 'A14SN', length: 60, width: '16,4 + 8', surface: 1464, power: 282, ratio: 0.5 },
  { code: 'H1', length: 30, width: 15, surface: 450, power: 96, ratio: 0.57 },
  { code: 'H2', length: 37.5, width: 15, surface: 562, power: 119, ratio: 0.55 },
  { code: 'H3', length: 45, width: 15, surface: 675, power: 145, ratio: 0.53 },
  { code: 'H4', length: 52.5, width: 15, surface: 787, power: 167, ratio: 0.53 },
  { code: 'H5', length: 60, width: 15, surface: 900, power: 193, ratio: 0.51 },
  { code: 'H6', length: 67.5, width: 15, surface: 1012, power: 219, ratio: 0.5 },
  { code: 'H7', length: 75, width: 15, surface: 1125, power: 241, ratio: 0.5 },
  { code: 'H8', length: 82.5, width: 15, surface: 1237, power: 267, ratio: 0.49 },
  { code: 'H9', length: 90, width: 15, surface: 1350, power: 290, ratio: 0.5 },
  { code: 'H10', length: 97.5, width: 15, surface: 1462, power: 316, ratio: 0.49 },
  { code: 'H11', length: 105, width: 15, surface: 1575, power: 338, ratio: 0.5 },
  { code: 'H12', length: 112.5, width: 15, surface: 1687, power: 364, ratio: 0.49 },
  { code: 'H13', length: 120, width: 15, surface: 1800, power: 386, ratio: 0.49 },
  { code: 'H14', length: 30, width: 18.6, surface: 558, power: 120, ratio: 0.54 },
  { code: 'H15', length: 37.5, width: 18.6, surface: 697, power: 148, ratio: 0.53 },
  { code: 'H16', length: 45, width: 18.6, surface: 837, power: 181, ratio: 0.51 },
  { code: 'H17', length: 52.5, width: 18.6, surface: 976, power: 209, ratio: 0.51 },
  { code: 'H18', length: 60, width: 18.6, surface: 1116, power: 241, ratio: 0.5 },
  { code: 'H19', length: 67.5, width: 18.6, surface: 1255, power: 274, ratio: 0.49 },
  { code: 'H20', length: 75, width: 18.6, surface: 1395, power: 302, ratio: 0.49 },
  { code: 'H21', length: 82.5, width: 18.6, surface: 1534, power: 334, ratio: 0.48 },
  { code: 'H22', length: 90, width: 18.6, surface: 1674, power: 362, ratio: 0.49 },
  { code: 'H23', length: 97.5, width: 18.6, surface: 1813, power: 395, ratio: 0.48 },
  { code: 'H24', length: 105, width: 18.6, surface: 1953, power: 423, ratio: 0.49 },
  { code: 'H25', length: 112.5, width: 18.6, surface: 2092, power: 455, ratio: 0.48 },
  { code: 'H26', length: 120, width: 18.6, surface: 2232, power: 483, ratio: 0.49 },
  { code: 'H27', length: 30, width: 22.35, surface: 670, power: 145, ratio: 0.51 },
  { code: 'H28', length: 37.5, width: 22.35, surface: 838, power: 178, ratio: 0.5 },
  { code: 'H29', length: 45, width: 22.35, surface: 1006, power: 217, ratio: 0.48 },
  { code: 'H30', length: 52.5, width: 22.35, surface: 1173, power: 251, ratio: 0.48 },
  { code: 'H31', length: 60, width: 22.35, surface: 1341, power: 290, ratio: 0.47 },
  { code: 'H32', length: 67.5, width: 22.35, surface: 1509, power: 329, ratio: 0.46 },
  { code: 'H33', length: 75, width: 22.35, surface: 1667, power: 362, ratio: 0.46 },
  { code: 'H34', length: 82.5, width: 22.35, surface: 1844, power: 401, ratio: 0.45 },
  { code: 'H35', length: 90, width: 22.35, surface: 2011, power: 435, ratio: 0.45 },
  { code: 'H36', length: 97.5, width: 22.35, surface: 2179, power: 474, ratio: 0.45 },
  { code: 'H37', length: 105, width: 22.35, surface: 2346, power: 507, ratio: 0.46 },
  { code: 'H38', length: 30, width: 26.05, surface: 781, power: 169, ratio: 0.51 },
  { code: 'H39', length: 37.5, width: 26.05, surface: 977, power: 214, ratio: 0.49 },
  { code: 'H40', length: 45, width: 26.05, surface: 1172, power: 255, ratio: 0.49 },
  { code: 'H41', length: 52.5, width: 26.05, surface: 1368, power: 296, ratio: 0.48 },
  { code: 'H42', length: 60, width: 26.05, surface: 1563, power: 338, ratio: 0.47 },
  { code: 'H43', length: 67.5, width: 26.05, surface: 1758, power: 388, ratio: 0.46 },
  { code: 'H44', length: 75, width: 26.05, surface: 1954, power: 429, ratio: 0.46 },
  { code: 'H45', length: 82.5, width: 26.05, surface: 2149, power: 470, ratio: 0.46 },
  { code: 'H46', length: 90, width: 26.05, surface: 2345, power: 511, ratio: 0.46 },
  { code: 'H47', length: 30, width: 29.75, surface: 892, power: 193, ratio: 0.53 },
  { code: 'H48', length: 37.5, width: 29.75, surface: 1116, power: 238, ratio: 0.52 },
  { code: 'H49', length: 45, width: 29.75, surface: 1339, power: 290, ratio: 0.5 },
  { code: 'H50', length: 52.5, width: 29.75, surface: 1562, power: 334, ratio: 0.5 },
  { code: 'H51', length: 60, width: 29.75, surface: 1785, power: 386, ratio: 0.49 },
  { code: 'H52', length: 67.5, width: 29.75, surface: 2008, power: 438, ratio: 0.48 },
  { code: 'H53', length: 75, width: 29.75, surface: 2231, power: 483, ratio: 0.48 },
  { code: 'H54', length: 82.5, width: 29.75, surface: 2454, power: 535, ratio: 0.48 },
  { code: 'H55', length: 30, width: 33.46, surface: 1004, power: 217, ratio: 0.55 },
  { code: 'H56', length: 37.5, width: 33.46, surface: 1255, power: 273, ratio: 0.53 },
  { code: 'H57', length: 45, width: 33.46, surface: 1506, power: 326, ratio: 0.52 },
  { code: 'H58', length: 52.5, width: 33.46, surface: 1757, power: 377, ratio: 0.52 },
  { code: 'H59', length: 60, width: 33.46, surface: 2008, power: 435, ratio: 0.52 },
  { code: 'H60', length: 67.5, width: 33.46, surface: 2259, power: 494, ratio: 0.51 },
  { code: 'H61', length: 75, width: 33.46, surface: 2510, power: 546, ratio: 0.51 },
  { code: 'Y1', length: 30, width: 33.6, surface: 1008, power: 217, ratio: 0.48 },
  { code: 'Y2', length: 37.5, width: 33.6, surface: 1260, power: 273, ratio: 0.46 },
  { code: 'Y3', length: 45, width: 33.6, surface: 1512, power: 326, ratio: 0.46 },
  { code: 'Y4', length: 52.5, width: 33.6, surface: 1764, power: 377, ratio: 0.45 },
  { code: 'Y5', length: 60, width: 33.6, surface: 2016, power: 435, ratio: 0.44 },
  { code: 'Y6', length: 67.5, width: 33.6, surface: 2268, power: 494, ratio: 0.44 },
  { code: 'Y7', length: 30, width: 37.2, surface: 1116, power: 241, ratio: 0.48 },
  { code: 'Y8', length: 37.5, width: 37.2, surface: 1395, power: 312, ratio: 0.45 },
  { code: 'Y9', length: 45, width: 37.2, surface: 1674, power: 372, ratio: 0.44 },
  { code: 'Y10', length: 52.5, width: 37.2, surface: 1953, power: 431, ratio: 0.44 },
  { code: 'Y11', length: 60, width: 37.2, surface: 2232, power: 491, ratio: 0.44 },
  { code: 'Y12', length: 30, width: 41, surface: 1230, power: 265, ratio: 0.49 },
  { code: 'Y13', length: 37.5, width: 41, surface: 1537, power: 332, ratio: 0.45 },
  { code: 'Y14', length: 45, width: 41, surface: 1845, power: 398, ratio: 0.45 },
  { code: 'Y15', length: 52.5, width: 41, surface: 2152, power: 460, ratio: 0.44 },
  { code: 'Y16', length: 30, width: 45, surface: 1350, power: 290, ratio: 0.48 },
  { code: 'Y17', length: 37.5, width: 45, surface: 1687, power: 371, ratio: 0.45 },
  { code: 'Y18', length: 45, width: 45, surface: 2025, power: 441, ratio: 0.45 },
  { code: 'Y19', length: 30, width: 48, surface: 1440, power: 314, ratio: 0.5 },
  { code: 'Y20', length: 37.5, width: 48, surface: 1800, power: 410, ratio: 0.46 },
  { code: 'Y21', length: 45, width: 48, surface: 2160, power: 488, ratio: 0.45 },
  { code: 'S1', length: 30, width: 23, surface: 690, power: 145, ratio: 0.46 },
  { code: 'S2', length: 37.5, width: 23, surface: 862, power: 178, ratio: 0.46 },
  { code: 'S3', length: 45, width: 23, surface: 1035, power: 217, ratio: 0.44 },
  { code: 'S4', length: 52.5, width: 23, surface: 1207, power: 251, ratio: 0.44 },
  { code: 'S5', length: 60, width: 23, surface: 1380, power: 290, ratio: 0.43 },
  { code: 'S6', length: 67.5, width: 23, surface: 1552, power: 329, ratio: 0.42 },
  { code: 'S7', length: 75, width: 23, surface: 1725, power: 362, ratio: 0.42 },
  { code: 'S8', length: 82.5, width: 23, surface: 1897, power: 401, ratio: 0.42 },
  { code: 'S9', length: 90, width: 23, surface: 2070, power: 435, ratio: 0.41 },
  { code: 'S10', length: 97.5, width: 23, surface: 2242, power: 474, ratio: 0.41 },
  { code: 'S11', length: 30, width: 26.6, surface: 798, power: 169, ratio: 0.45 },
  { code: 'S12', length: 37.5, width: 26.6, surface: 997, power: 214, ratio: 0.44 },
  { code: 'S13', length: 45, width: 26.6, surface: 1197, power: 255, ratio: 0.43 },
  { code: 'S14', length: 52.5, width: 26.6, surface: 1396, power: 296, ratio: 0.43 },
  { code: 'S15', length: 60, width: 26.6, surface: 1596, power: 338, ratio: 0.43 },
  { code: 'S16', length: 67.5, width: 26.6, surface: 1795, power: 388, ratio: 0.42 },
  { code: 'S17', length: 75, width: 26.6, surface: 1995, power: 429, ratio: 0.42 },
  { code: 'S18', length: 82.5, width: 26.6, surface: 2194, power: 470, ratio: 0.42 },
  { code: 'S19', length: 30, width: 30.3, surface: 909, power: 193, ratio: 0.45 },
  { code: 'S20', length: 37.5, width: 30.3, surface: 1136, power: 238, ratio: 0.44 },
  { code: 'S21', length: 45, width: 30.3, surface: 1363, power: 290, ratio: 0.43 },
  { code: 'S22', length: 52.5, width: 30.3, surface: 1590, power: 334, ratio: 0.43 },
  { code: 'S23', length: 60, width: 30.3, surface: 1818, power: 386, ratio: 0.42 },
  { code: 'S24', length: 67.5, width: 30.3, surface: 2045, power: 438, ratio: 0.41 },
  { code: 'S25', length: 75, width: 30.3, surface: 2272, power: 483, ratio: 0.41 },
  { code: 'S26', length: 30, width: 34, surface: 1020, power: 217, ratio: 0.46 },
  { code: 'S27', length: 37.5, width: 34, surface: 1275, power: 273, ratio: 0.44 },
  { code: 'S28', length: 45, width: 34, surface: 1530, power: 326, ratio: 0.44 },
  { code: 'S29', length: 52.5, width: 34, surface: 1785, power: 377, ratio: 0.43 },
  { code: 'S30', length: 60, width: 34, surface: 2040, power: 435, ratio: 0.43 },
  { code: 'S31', length: 67.5, width: 34, surface: 2295, power: 494, ratio: 0.42 },
  { code: 'S32', length: 30, width: 37.8, surface: 1134, power: 241, ratio: 0.48 },
  { code: 'S33', length: 37.5, width: 37.8, surface: 1417, power: 312, ratio: 0.45 },
  { code: 'S34', length: 45, width: 37.8, surface: 1687, power: 372, ratio: 0.44 },
  { code: 'S35', length: 52.5, width: 37.8, surface: 1984, power: 431, ratio: 0.44 },
  { code: 'S36', length: 60, width: 37.8, surface: 2268, power: 491, ratio: 0.44 },
  { code: 'S37', length: 30, width: 41.5, surface: 1245, power: 265, ratio: 0.5 },
  { code: 'S38', length: 37.5, width: 41.5, surface: 1556, power: 332, ratio: 0.48 },
  { code: 'S39', length: 45, width: 41.5, surface: 1867, power: 398, ratio: 0.48 },
  { code: 'S40', length: 52.5, width: 41.5, surface: 2178, power: 460, ratio: 0.48 },
];

// ─── ACAMA ──────────────────────────────────────────────────────────────────
// Données issues du tableau fourni par l'utilisateur (Gamme / # / Longueur / Largeur / Surface / Puissance / Ratio)
const acamaBuildingsData = [
  // TALIAN 1 - Pondération: 50%, Inclinaison: 14°
  { code: 'T1 MINI', gamme: 'TALIAN 1', length: 52.7, width: 24.4, surface: 1288, power: 266.8, ratio: 0.53, roofWeighting: 50, angle: 14 },
  { code: 'T1 MID', gamme: 'TALIAN 1', length: 60.2, width: 24.4, surface: 1471, power: 303.6, ratio: 0.54, roofWeighting: 50, angle: 14 },
  { code: 'T1 MAXI', gamme: 'TALIAN 1', length: 67.5, width: 24.4, surface: 1650, power: 340.4, ratio: 0.54, roofWeighting: 50, angle: 14 },
  // TALIAN 2 - Pondération: 100%, Inclinaison: 13°
  { code: 'T2 MINI', gamme: 'TALIAN 2', length: 37.3, width: 24.0, surface: 896, power: 184.0, ratio: 0.69, roofWeighting: 100, angle: 13 },
  { code: 'T2 MID', gamme: 'TALIAN 2', length: 62.0, width: 24.0, surface: 1488, power: 312.8, ratio: 0.68, roofWeighting: 100, angle: 13 },
  { code: 'T2 MAXI', gamme: 'TALIAN 2', length: 68.2, width: 24.0, surface: 1637, power: 349.6, ratio: 0.67, roofWeighting: 100, angle: 13 },
  // TALIAN 3 - Pondération: 50%, Inclinaison: 12°
  { code: 'T3 MINI', gamme: 'TALIAN 3', length: 52.7, width: 21.5, surface: 1133, power: 240.1, ratio: 0.46, roofWeighting: 50, angle: 12 },
  { code: 'T3 MID', gamme: 'TALIAN 3', length: 68.0, width: 21.5, surface: 1462, power: 314.6, ratio: 0.48, roofWeighting: 50, angle: 12 },
  { code: 'T3 MAXI', gamme: 'TALIAN 3', length: 90.2, width: 21.5, surface: 1939, power: 414.0, ratio: 0.45, roofWeighting: 50, angle: 12 },
  // TALIAN 4 - Pondération: 50%, Inclinaison: 6°
  { code: 'T4 MINI', gamme: 'TALIAN 4', length: 37.5, width: 37.7, surface: 1415, power: 309.1, ratio: 0.52, roofWeighting: 50, angle: 6 },
  { code: 'T4 MID', gamme: 'TALIAN 4', length: 45.0, width: 37.7, surface: 1697, power: 368.0, ratio: 0.51, roofWeighting: 50, angle: 6 },
  { code: 'T4 MAXI', gamme: 'TALIAN 4', length: 63.2, width: 37.7, surface: 2384, power: 500.0, ratio: 0.50, roofWeighting: 50, angle: 6 },
  // TALIAN 5 - Pondération: 85%, Inclinaison: 10°
  { code: 'T5 MINI', gamme: 'TALIAN 5', length: 31.0, width: 27.6, surface: 866, power: 179.9, ratio: 0.60, roofWeighting: 85, angle: 10 },
  { code: 'T5 MID', gamme: 'TALIAN 5', length: 50.0, width: 27.6, surface: 1414, power: 296.2, ratio: 0.58, roofWeighting: 85, angle: 10 },
  { code: 'T5 MAXI', gamme: 'TALIAN 5', length: 62.5, width: 27.6, surface: 1677, power: 349.1, ratio: 0.59, roofWeighting: 85, angle: 10 },
  // TALIAN 6 - Pondération: 80%, Inclinaison: 12°
  { code: 'T6 MINI', gamme: 'TALIAN 6', length: 39.4, width: 17.4, surface: 687, power: 161.9, ratio: 0.58, roofWeighting: 80, angle: 12 },
  { code: 'T6 MID', gamme: 'TALIAN 6', length: 64.5, width: 17.4, surface: 1125, power: 265.0, ratio: 0.58, roofWeighting: 80, angle: 12 },
  { code: 'T6 MAXI', gamme: 'TALIAN 6', length: 83.2, width: 17.4, surface: 1451, power: 338.6, ratio: 0.57, roofWeighting: 80, angle: 12 },
  // TALIAN 7 - Pondération: 100%, Inclinaison: 9°
  { code: 'T7 MINI', gamme: 'TALIAN 7', length: 36.0, width: 19.8, surface: 714, power: 156.4, ratio: 0.61, roofWeighting: 100, angle: 9 },
  { code: 'T7 MID', gamme: 'TALIAN 7', length: 60.0, width: 19.8, surface: 1190, power: 258.1, ratio: 0.61, roofWeighting: 100, angle: 9 },
  { code: 'T7 MAXI', gamme: 'TALIAN 7', length: 78.0, width: 19.8, surface: 1548, power: 336.3, ratio: 0.58, roofWeighting: 100, angle: 9 },
  // TALIAN 8 - Pondération: 70%, Inclinaison: 10°
  { code: 'T8 MINI', gamme: 'TALIAN 8', length: 43.2, width: 27.3, surface: 1180, power: 242.9, ratio: 0.54, roofWeighting: 70, angle: 10 },
  { code: 'T8 MID', gamme: 'TALIAN 8', length: 57.6, width: 27.3, surface: 1574, power: 323.8, ratio: 0.53, roofWeighting: 70, angle: 10 },
  { code: 'T8 MAXI', gamme: 'TALIAN 8', length: 86.6, width: 27.3, surface: 2366, power: 485.8, ratio: 0.50, roofWeighting: 70, angle: 10 },
  // TALIAN 9 - Pondération: 70%, Inclinaison: 15°
  { code: 'T9 MINI', gamme: 'TALIAN 9', length: 37.5, width: 31.6, surface: 1185, power: 251.2, ratio: 0.55, roofWeighting: 70, angle: 15 },
  { code: 'T9 MID', gamme: 'TALIAN 9', length: 52.5, width: 31.6, surface: 1659, power: 346.8, ratio: 0.50, roofWeighting: 70, angle: 15 },
  { code: 'T9 MAXI', gamme: 'TALIAN 9', length: 75.0, width: 31.6, surface: 2370, power: 500.0, ratio: 0.52, roofWeighting: 70, angle: 15 },
  // EPONA - Pondération: 55%, Inclinaison: 17°
  { code: 'EQUESTRE 64m', gamme: 'EPONA 65', length: 65.0, width: 29.5, surface: 1918, power: 500.0, ratio: 0.52, roofWeighting: 55, angle: 17 },
  { code: 'EQUESTRE 44m', gamme: 'EPONA 45', length: 45.0, width: 29.5, surface: 1328, power: 356.5, ratio: 0.57, roofWeighting: 55, angle: 17 },
];

// ─── Shared helpers ──────────────────────────────────────────────────────────
const getRatioColor = (ratio) => {
  if (ratio <= 0.45) return 'text-green-600';
  if (ratio > 0.45 && ratio <= 0.55) return 'text-orange-500';
  return 'text-red-600';
};

// Helper to determine configuration based on building code (GREEN INVEST only)
const getBuildingConfig = (code) => {
  if (!code) return { allowAuvent: false, allowAppentis: false, baseWeight: 50, getWeight: () => 50 };
  const firstLetter = code.charAt(0).toUpperCase();

  const config = {
    allowAuvent: false,
    allowAppentis: false,
    baseWeight: 50,
    getWeight: () => 50
  };

  switch (firstLetter) {
    case 'O':
      config.allowAuvent = true;
      config.baseWeight = 90;
      config.getWeight = (auv) => {
        const a = Number(auv) || 0;
        return a === 2 ? 70 : 90;
      };
      break;
    case 'C':
      config.allowAuvent = true;
      config.baseWeight = 70;
      config.getWeight = (auv) => {
        const a = parseInt(auv) || 0;
        if (a === 1) return 75;
        if (a === 2) return 65;
        return 70;
      };
      break;
    case 'A':
      config.baseWeight = 100;
      config.getWeight = () => 100;
      break;
    case 'H':
      config.allowAuvent = true;
      config.allowAppentis = true;
      config.baseWeight = 50;
      config.getWeight = (auv, app) => {
        const a = parseInt(auv) || 0;
        const ap = parseInt(app) || 0;
        if (a === 0 && ap === 0) return 50;
        if (a === 0 && ap === 1) return 65;
        if (a === 0 && ap === 2) return 50;
        if (a === 1 && ap === 1) return 60;
        if (a === 1 && ap === 0) return 55;
        if (a === 2 && ap === 0) return 50;
        return 50;
      };
      break;
    case 'K':
      config.baseWeight = 65;
      config.getWeight = () => 65;
      break;
    case 'Y':
    case 'S':
      config.baseWeight = 50;
      config.getWeight = () => 50;
      break;
    default:
      config.baseWeight = 50;
  }
  return config;
};

// ─── Component ───────────────────────────────────────────────────────────────
const PredefinedBuildingsPanel = ({ onBuildingSelect, onConfigChange, tenantId }) => {
  const isAcama = tenantId === 'acama';
  const activeData = isAcama ? acamaBuildingsData : buildingsData;

  const [selectedCode, setSelectedCode] = useState(null);
  const [auventCount, setAuventCount] = useState(0);
  const [appentisCount, setAppentisCount] = useState(0);

  // --- CONFIGURATOR DATA ---
  const configuratorValues = useConfiguratorValues();
  const configuratorState = useConfiguratorStore();

  const customBuilding = useMemo(() => {
    // ALWAYS use customParams for the "SUR-MESURE" option
    const params = configuratorState.customParams;
    
    const length = params.bayCount * params.baySpacing;
    let totalWidth = params.width;
    
    if (params.leftExtension !== 'none') totalWidth += params.leftExtWidth;
    if (params.rightExtension !== 'none') totalWidth += params.rightExtWidth;

    const surface = length * totalWidth;
    
    // Get power from configuratorValues ONLY if we are in custom mode,
    // otherwise it might represent a predefined building's power.
    const isCustomModeActive = configuratorState.configMode === 'custom';
    const power = isCustomModeActive ? configuratorValues.solarStats.power : 0;
    const ratio = isAcama ? 0.55 : 0.5;

    return {
      code: 'SUR-MESURE',
      gamme: 'Configurateur',
      length: parseFloat(length.toFixed(2)),
      width: parseFloat(totalWidth.toFixed(2)),
      surface: parseFloat(surface.toFixed(2)),
      power: parseFloat(power.toFixed(2)),
      ratio: ratio,
      isCustom: true,
      angle: params.leftPitch,
      roofWeighting: 100,
      isPredefinedAcama: false
    };
  }, [configuratorState.customParams, configuratorState.configMode, configuratorValues.solarStats.power, isAcama]);

  // Reset counters and selection when tenant changes
  useEffect(() => {
    setSelectedCode(null);
    setAuventCount(0);
    setAppentisCount(0);
  }, [tenantId]);

  // Reset counters when selecting a new building
  useEffect(() => {
    setAuventCount(0);
    setAppentisCount(0);
  }, [selectedCode]);

  const selectedBuildingData = useMemo(() => {
    if (!selectedCode) return null;
    if (selectedCode === 'SUR-MESURE') return customBuilding;
    const building = activeData.find(b => b.code === selectedCode);
    if (!building) return null;

    // ACAMA: no extensions, return as-is with roofWeighting from table
    if (isAcama) {
      return { ...building, roofWeighting: building.roofWeighting ?? 50 };
    }

    // GREEN INVEST: extension logic
    let baseWidth = building.width;
    if (typeof baseWidth === 'string') {
      const parts = baseWidth.replace(',', '.').split('+').map(p => parseFloat(p.trim()));
      baseWidth = parts.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    }

    let currentWidth = baseWidth;
    let extraWidth = 0;
    if (auventCount > 0) extraWidth += auventCount * 4;
    if (appentisCount > 0) extraWidth += appentisCount * 9.3;
    currentWidth += extraWidth;

    const calculatedSurface = building.surface
      ? building.surface + extraWidth * building.length
      : building.length * currentWidth;

    const config = getBuildingConfig(selectedCode);
    const roofWeighting = config.getWeight(auventCount, appentisCount);

    return {
      ...building,
      width: currentWidth,
      surface: calculatedSurface,
      isSpecialWidth: false,
      roofWeighting
    };
  }, [selectedCode, auventCount, appentisCount, isAcama, activeData]);

  // Sync weighting with parent whenever it changes
  React.useEffect(() => {
    if (selectedBuildingData && onConfigChange && selectedBuildingData.roofWeighting !== undefined) {
      onConfigChange(selectedBuildingData);
    }
  }, [selectedBuildingData, onConfigChange]);

  const handleInsert = () => {
    if (selectedBuildingData && onBuildingSelect) {
      onBuildingSelect(selectedBuildingData);
    }
  };

  // Group ACAMA buildings by gamme for display
  const acamaGroups = useMemo(() => {
    if (!isAcama) return null;
    const groups = {};
    acamaBuildingsData.forEach(b => {
      if (!groups[b.gamme]) groups[b.gamme] = [];
      groups[b.gamme].push(b);
    });
    return groups;
  }, [isAcama]);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Bâtiments prédéfinis</CardTitle>
        <div className="flex gap-2">
          {/* Auvent & Appentis buttons: hidden for ACAMA and Custom */}
          {!isAcama && selectedCode !== 'SUR-MESURE' && (
            <>
              <Button
                variant={auventCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const next = (auventCount + 1) % 3;
                  if (next + appentisCount <= 2) setAuventCount(next);
                  else setAuventCount(0);
                }}
                disabled={!selectedCode || (selectedCode && !getBuildingConfig(selectedCode).allowAuvent)}
                className={auventCount > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                Auvent {auventCount > 0 && `(x${auventCount})`}
              </Button>
              <Button
                variant={appentisCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const next = (appentisCount + 1) % 3;
                  if (next + auventCount <= 2) setAppentisCount(next);
                  else setAppentisCount(0);
                }}
                disabled={!selectedCode || (selectedCode && !getBuildingConfig(selectedCode).allowAppentis)}
                className={appentisCount > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                Appentis {appentisCount > 0 && `(x${appentisCount})`}
              </Button>
            </>
          )}
          <Button onClick={handleInsert} disabled={!selectedBuildingData} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Building2 size={16} className="mr-2" />
            Insérer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-1/2">
            <Select onValueChange={setSelectedCode} value={selectedCode || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Code..." />
              </SelectTrigger>
              <SelectContent>
                {isAcama ? (
                  // ACAMA: grouped by gamme
                  Object.entries(acamaGroups).map(([gamme, buildings]) => (
                    <React.Fragment key={gamme}>
                      <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b">
                        {gamme}
                      </div>
                      {gamme === Object.keys(acamaGroups)[0] && (
                        <SelectItem value="SUR-MESURE" className="font-bold text-blue-600">
                          ✨ Sur-mesure (Configurateur)
                        </SelectItem>
                      )}
                      {buildings.map(b => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  // GREEN INVEST: flat list
                  <>
                    <SelectItem value="SUR-MESURE" className="font-bold text-blue-600">
                      ✨ Sur-mesure (Configurateur)
                    </SelectItem>
                    {buildingsData.map((building) => (
                      <SelectItem key={building.code} value={building.code}>
                        {building.code}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-1/2 text-sm flex justify-end items-center gap-2">
            <span className="text-gray-500">Ratio:</span>
            {selectedBuildingData ? (
              <span className={`font-bold ${getRatioColor(selectedBuildingData.ratio)}`}>
                {selectedBuildingData.ratio.toFixed(2)} €
              </span>
            ) : (
              <span className="font-semibold text-muted-foreground">-</span>
            )}
          </div>
        </div>

        {selectedBuildingData && (
          <div className="space-y-3">
            {isAcama && selectedBuildingData.gamme && (
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {selectedBuildingData.gamme}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between"><span>Longueur:</span> <span className="font-semibold">{selectedBuildingData.length} m</span></div>
              <div className="flex justify-between"><span>Puissance:</span> <span className="font-semibold">{selectedBuildingData.power} kWc</span></div>
              <div className="flex justify-between">
                <span>Largeur:</span>
                <span className="font-semibold">
                  {typeof selectedBuildingData.width === 'number'
                    ? selectedBuildingData.width.toFixed(2).replace(/[.,]00$/, "")
                    : selectedBuildingData.width}
                  m
                </span>
              </div>
              <div className="flex justify-between"><span>Surface:</span> <span className="font-semibold">{selectedBuildingData.surface.toFixed(0)} m²</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredefinedBuildingsPanel;