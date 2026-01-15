// Base de données d'images Wikimedia pour les communes de Rennes Métropole

const DEFAULT_IMAGE = {
  url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Rennes_-_H%C3%B4tel_de_ville.jpg/1280px-Rennes_-_H%C3%B4tel_de_ville.jpg",
  description: "Rennes Métropole",
  credit: "Wikimedia Commons"
};

const COMMUNE_IMAGES = {
  "Rennes": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Rennes_-_H%C3%B4tel_de_ville.jpg/1280px-Rennes_-_H%C3%B4tel_de_ville.jpg",
    description: "Hôtel de Ville de Rennes"
  },
  "Cesson-Sévigné": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Cesson-S%C3%A9vign%C3%A9_%2835%29_%C3%89glise_Saint-Martin_-_Ext%C3%A9rieur_-_01.jpg/1024px-Cesson-S%C3%A9vign%C3%A9_%2835%29_%C3%89glise_Saint-Martin_-_Ext%C3%A9rieur_-_01.jpg",
    description: "Église Saint-Martin"
  },
  "Bruz": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Bruz_-_Canal_de_Cic%C3%A9_vue_a%C3%A9rienne_20180504.jpg/1280px-Bruz_-_Canal_de_Cic%C3%A9_vue_a%C3%A9rienne_20180504.jpg",
    description: "Canal de Cicé"
  },
  "Saint-Jacques-de-la-Lande": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Gare_de_Saint-Jacques_-_Gaxit%C3%A8re_%28ligne_b_du_m%C3%A9tro_de_Rennes%29.jpg/1280px-Gare_de_Saint-Jacques_-_Gaxit%C3%A8re_%28ligne_b_du_m%C3%A9tro_de_Rennes%29.jpg",
    description: "Station métro Gaxitère"
  },
  "Chantepie": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Chantepie-FR-35-mairie-02.jpg/1280px-Chantepie-FR-35-mairie-02.jpg",
    description: "Mairie de Chantepie"
  },
  "Betton": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Betton_-_Eglise_Notre-Dame.jpg/1024px-Betton_-_Eglise_Notre-Dame.jpg",
    description: "Église Notre-Dame"
  },
  "Saint-Grégoire": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saint-Gr%C3%A9goire_%2835%29_Mairie.jpg/1280px-Saint-Gr%C3%A9goire_%2835%29_Mairie.jpg",
    description: "Mairie"
  },
  "Pacé": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Pac%C3%A9_-_%C3%89glise_Saint-Melaine_20090920.jpg/1024px-Pac%C3%A9_-_%C3%89glise_Saint-Melaine_20090920.jpg",
    description: "Église Saint-Melaine"
  },
  "Chartres-de-Bretagne": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Chartres-de-Bretagne_-_Eglise_Saint-Martin.jpg/1024px-Chartres-de-Bretagne_-_Eglise_Saint-Martin.jpg",
    description: "Église Saint-Martin"
  },
  "Vern-sur-Seiche": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Vern-sur-Seiche_%2835%29_%C3%89glise_Saint-Martin_-_Ext%C3%A9rieur_-_01.jpg/1024px-Vern-sur-Seiche_%2835%29_%C3%89glise_Saint-Martin_-_Ext%C3%A9rieur_-_01.jpg",
    description: "Église Saint-Martin"
  },
  "Le Rheu": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Le_Rheu_-_%C3%89glise_Saint-Pierre.jpg/1024px-Le_Rheu_-_%C3%89glise_Saint-Pierre.jpg",
    description: "Église Saint-Pierre"
  },
  "Mordelles": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Mordelles_-_%C3%89glise_Saint-Pierre_01.jpg/1024px-Mordelles_-_%C3%89glise_Saint-Pierre_01.jpg",
    description: "Église Saint-Pierre"
  },
  "Thorigné-Fouillard": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Thorign%C3%A9-Fouillard_-_Mairie.jpg/1024px-Thorign%C3%A9-Fouillard_-_Mairie.jpg",
    description: "Mairie"
  },
  "Noyal-Châtillon-sur-Seiche": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Noyal-Ch%C3%A2tillon-sur-Seiche_%2835%29_%C3%89glise.jpg/1024px-Noyal-Ch%C3%A2tillon-sur-Seiche_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Pont-Péan": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Pont-P%C3%A9an_%2835%29_Mairie.jpg/1024px-Pont-P%C3%A9an_%2835%29_Mairie.jpg",
    description: "Mairie"
  },
  "Orgères": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Org%C3%A8res_%2835%29_%C3%89glise_Notre-Dame.jpg/1024px-Org%C3%A8res_%2835%29_%C3%89glise_Notre-Dame.jpg",
    description: "Église Notre-Dame"
  },
  "Acigné": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Acign%C3%A9_-_%C3%89glise_Saint-Martin_01.jpg/1024px-Acign%C3%A9_-_%C3%89glise_Saint-Martin_01.jpg",
    description: "Église Saint-Martin"
  },
  "Vezin-le-Coquet": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Vezin-le-Coquet_-_Eglise.jpg/1024px-Vezin-le-Coquet_-_Eglise.jpg",
    description: "Église"
  },
  "L'Hermitage": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/L%27Hermitage_%2835%29_%C3%89glise.jpg/1024px-L%27Hermitage_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Montgermont": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Montgermont_%2835%29_Mairie.jpg/1024px-Montgermont_%2835%29_Mairie.jpg",
    description: "Mairie"
  },
  "Gévezé": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/G%C3%A9vez%C3%A9_%2835%29_%C3%89glise.jpg/1024px-G%C3%A9vez%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Chavagne": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Chavagne_35_-_%C3%89glise_01.jpg/1024px-Chavagne_35_-_%C3%89glise_01.jpg",
    description: "Église"
  },
  "Saint-Erblon": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Saint-Erblon_%2835%29_%C3%89glise.jpg/1024px-Saint-Erblon_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Bourgbarré": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Bourgbarr%C3%A9_%2835%29_%C3%89glise.jpg/1024px-Bourgbarr%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Corps-Nuds": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Corps-Nuds_%2835%29_%C3%89glise.jpg/1024px-Corps-Nuds_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Laillé": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Laill%C3%A9_%2835%29_%C3%89glise.jpg/1024px-Laill%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "La Chapelle-des-Fougeretz": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/La_Chapelle-des-Fougeretz_%2835%29_%C3%89glise.jpg/1024px-La_Chapelle-des-Fougeretz_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Saint-Sulpice-la-Forêt": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Saint-Sulpice-la-For%C3%AAt_%2835%29_Abbaye_02.jpg/1024px-Saint-Sulpice-la-For%C3%AAt_%2835%29_Abbaye_02.jpg",
    description: "Abbaye"
  },
  "Chevaigné": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Chevaign%C3%A9_%2835%29_%C3%89glise.jpg/1024px-Chevaign%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Cintré": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cintr%C3%A9_-_%C3%89glise_Saint-Melaine.jpg/1024px-Cintr%C3%A9_-_%C3%89glise_Saint-Melaine.jpg",
    description: "Église Saint-Melaine"
  },
  "Clayes": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Clayes_%2835%29_%C3%89glise.jpg/1024px-Clayes_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "La Chapelle-Chaussée": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/La_Chapelle-Chauss%C3%A9e_%2835%29_%C3%89glise.jpg/1024px-La_Chapelle-Chauss%C3%A9e_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "La Chapelle-Thouarault": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/La_Chapelle-Thouarault_%2835%29_%C3%89glise_Sainte-Anne.jpg/1024px-La_Chapelle-Thouarault_%2835%29_%C3%89glise_Sainte-Anne.jpg",
    description: "Église Sainte-Anne"
  },
  "Le Verger": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Le_Verger_%2835%29_%C3%89glise.jpg/1024px-Le_Verger_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Miniac-sous-Bécherel": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Miniac-sous-B%C3%A9cherel_%2835%29_%C3%89glise.jpg/1024px-Miniac-sous-B%C3%A9cherel_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Parthenay-de-Bretagne": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Parthenay-de-Bretagne_%2835%29_%C3%89glise.jpg/1024px-Parthenay-de-Bretagne_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Romillé": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Romill%C3%A9_%2835%29_%C3%89glise.jpg/1024px-Romill%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Saint-Gilles": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Saint-Gilles_%2835%29_%C3%89glise_01.jpg/1024px-Saint-Gilles_%2835%29_%C3%89glise_01.jpg",
    description: "Église"
  },
  "Saint-Armel": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Saint-Armel_%2835%29_%C3%89glise.jpg/1024px-Saint-Armel_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Brécé": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Br%C3%A9c%C3%A9_%2835%29_%C3%89glise.jpg/1024px-Br%C3%A9c%C3%A9_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Nouvoitou": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Nouvoitou_%2835%29_%C3%89glise.jpg/1024px-Nouvoitou_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Langan": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Langan_%2835%29_%C3%89glise.jpg/1024px-Langan_%2835%29_%C3%89glise.jpg",
    description: "Église"
  },
  "Vitré": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Ch%C3%A2teau_de_Vitr%C3%A9.jpg/1280px-Ch%C3%A2teau_de_Vitr%C3%A9.jpg",
    description: "Château de Vitré"
  },
  "Moutiers": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Moutiers_%2835%29_Eglise_04.JPG/1024px-Moutiers_%2835%29_Eglise_04.JPG",
    description: "Église Saint-Martin"
  }
};

function getCommuneImage(communeName) {
  const name = communeName?.trim();
  return COMMUNE_IMAGES[name] || DEFAULT_IMAGE;
}
