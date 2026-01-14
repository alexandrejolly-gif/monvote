// Liste des 43 communes de Rennes Métropole (avec codes INSEE corrects et coordonnées GPS)
export const COMMUNES_RENNES_METROPOLE = [
  { code: '35238', nom: 'Rennes', population: 227830, lat: 48.1159, lng: -1.6884 },
  { code: '35024', nom: 'Betton', population: 12775, lat: 48.1797, lng: -1.6477 },
  { code: '35032', nom: 'Bourgbarré', population: 4692, lat: 47.9833, lng: -1.6236 },
  { code: '35039', nom: 'Brécé', population: 2185, lat: 48.1091, lng: -1.4934 },
  { code: '35047', nom: 'Bruz', population: 19667, lat: 48.024, lng: -1.7469 },
  { code: '35051', nom: 'Cesson-Sévigné', population: 18076, lat: 48.1235, lng: -1.5935 },
  { code: '35055', nom: 'Chantepie', population: 10378, lat: 48.0831, lng: -1.6064 },
  { code: '35058', nom: 'La Chapelle-Chaussée', population: 1299, lat: 48.2688, lng: -1.8653 },
  { code: '35059', nom: 'La Chapelle-des-Fougeretz', population: 4603, lat: 48.1774, lng: -1.7374 },
  { code: '35065', nom: 'La Chapelle-Thouarault', population: 2266, lat: 48.1268, lng: -1.8569 },
  { code: '35066', nom: 'Chartres-de-Bretagne', population: 8678, lat: 48.0451, lng: -1.7039 },
  { code: '35069', nom: 'Châteaugiron', population: 10688, lat: 48.0481, lng: -1.4751 },
  { code: '35076', nom: 'Chavagne', population: 4562, lat: 48.0563, lng: -1.7879 },
  { code: '35079', nom: 'Chevaigné', population: 2396, lat: 48.2251, lng: -1.6387 },
  { code: '35080', nom: 'Cintré', population: 2614, lat: 48.109, lng: -1.8837 },
  { code: '35088', nom: 'Corps-Nuds', population: 3555, lat: 47.981, lng: -1.5706 },
  { code: '35120', nom: 'Gévezé', population: 5987, lat: 48.2075, lng: -1.7918 },
  { code: '35131', nom: 'L\'Hermitage', population: 4683, lat: 48.1226, lng: -1.8153 },
  { code: '35139', nom: 'Laillé', population: 5154, lat: 47.9731, lng: -1.7101 },
  { code: '35196', nom: 'Mordelles', population: 7831, lat: 48.0853, lng: -1.8515 },
  { code: '35189', nom: 'Montgermont', population: 3777, lat: 48.1547, lng: -1.7167 },
  { code: '35206', nom: 'Noyal-Châtillon-sur-Seiche', population: 7995, lat: 48.053, lng: -1.661 },
  { code: '35204', nom: 'Nouvoitou', population: 3732, lat: 48.0292, lng: -1.5504 },
  { code: '35208', nom: 'Orgères', population: 5602, lat: 47.9861, lng: -1.6625 },
  { code: '35210', nom: 'Pacé', population: 11815, lat: 48.1535, lng: -1.7744 },
  { code: '35216', nom: 'Parthenay-de-Bretagne', population: 1802, lat: 48.1882, lng: -1.829 },
  { code: '35240', nom: 'Le Rheu', population: 9823, lat: 48.0971, lng: -1.7882 },
  { code: '35363', nom: 'Pont-Péan', population: 4289, lat: 48.0114, lng: -1.6975 },
  { code: '35351', nom: 'Le Verger', population: 1404, lat: 48.0667, lng: -1.9197 },
  { code: '35245', nom: 'Romillé', population: 4154, lat: 48.2272, lng: -1.874 },
  { code: '35250', nom: 'Saint-Armel', population: 2344, lat: 48.0138, lng: -1.5765 },
  { code: '35266', nom: 'Saint-Erblon', population: 3615, lat: 48.02, lng: -1.6465 },
  { code: '35275', nom: 'Saint-Gilles', population: 5489, lat: 48.1517, lng: -1.85 },
  { code: '35278', nom: 'Saint-Grégoire', population: 9992, lat: 48.1598, lng: -1.6815 },
  { code: '35281', nom: 'Saint-Jacques-de-la-Lande', population: 13593, lat: 48.0779, lng: -1.7252 },
  { code: '35315', nom: 'Saint-Sulpice-la-Forêt', population: 1557, lat: 48.2134, lng: -1.5771 },
  { code: '35334', nom: 'Thorigné-Fouillard', population: 8631, lat: 48.1524, lng: -1.5866 },
  { code: '35352', nom: 'Vern-sur-Seiche', population: 8272, lat: 48.0458, lng: -1.6082 },
  { code: '35353', nom: 'Vezin-le-Coquet', population: 6441, lat: 48.116, lng: -1.7528 },
  { code: '35001', nom: 'Acigné', population: 6911, lat: 48.1461, lng: -1.5189 },
  { code: '35081', nom: 'Clayes', population: 941, lat: 48.1782, lng: -1.8535 },
  { code: '35003', nom: 'Andouillé-Neuville', population: 1006, lat: 48.2993, lng: -1.5951 }
];

export function getCommuneByCode(code) {
  return COMMUNES_RENNES_METROPOLE.find(c => c.code === code);
}

export function getCommuneByName(nom) {
  return COMMUNES_RENNES_METROPOLE.find(c =>
    c.nom.toLowerCase() === nom.toLowerCase()
  );
}
