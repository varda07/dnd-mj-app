// Banques de noms de PNJ par culture D&D 5e (roadmap 2.1).
// Chaque culture fournit des prénoms masculins / féminins / neutres et des
// noms de famille. `genererNomPnj` tire un prénom (selon le genre) + un nom.

export type GenrePnj = 'f' | 'h' | 'n'

export type CultureNoms = {
  cle: string
  label: string
  prenomsH: string[]
  prenomsF: string[]
  prenomsN: string[]
  nomsFamille: string[]
}

export const CULTURES_NOMS: CultureNoms[] = [
  {
    cle: 'humain',
    label: 'Humain',
    prenomsH: ['Aldric', 'Bram', 'Cedric', 'Doran', 'Edric', 'Gareth', 'Halden', 'Joran', 'Marek', 'Renald', 'Tomas', 'Willem'],
    prenomsF: ['Aria', 'Brina', 'Cora', 'Elenya', 'Fiona', 'Helsa', 'Ilse', 'Maela', 'Nessa', 'Rowan', 'Sera', 'Yvane'],
    prenomsN: ['Ash', 'Corin', 'Wren', 'Sage', 'Robin', 'Quill'],
    nomsFamille: ['Aubépine', 'Brisefer', 'Corbeau', 'Delorme', 'Ferrand', 'Gardevent', 'Hautmont', 'Loncourt', 'Pierregris', 'Tisserand', 'Valombre', 'Vannier']
  },
  {
    cle: 'elfe',
    label: 'Elfe',
    prenomsH: ['Aelar', 'Caelynn', 'Erevan', 'Fivin', 'Hadarai', 'Immeral', 'Laucian', 'Quarion', 'Soveliss', 'Thamior', 'Varis'],
    prenomsF: ['Adrie', 'Birel', 'Caelia', 'Drusilia', 'Felosial', 'Ielenia', 'Lia', 'Meriele', 'Naivara', 'Shava', 'Thia'],
    prenomsN: ['Ara', 'Faen', 'Sariel', 'Theren', 'Vall'],
    nomsFamille: ['Amakir', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Naïlo', 'Siannodel', 'Xiloscient', 'Aujourd’hui', 'Étoilematin']
  },
  {
    cle: 'demi_elfe',
    label: 'Demi-elfe',
    prenomsH: ['Aldric', 'Caelen', 'Erevan', 'Joran', 'Laucian', 'Marek', 'Soveliss', 'Varis'],
    prenomsF: ['Aria', 'Caelia', 'Elenya', 'Ielenia', 'Maela', 'Naivara', 'Sera', 'Thia'],
    prenomsN: ['Ara', 'Corin', 'Faen', 'Wren', 'Sariel'],
    nomsFamille: ['Aubépine', 'Galanodel', 'Hautmont', 'Liadon', 'Pierregris', 'Siannodel', 'Valombre', 'Étoilematin']
  },
  {
    cle: 'nain',
    label: 'Nain',
    prenomsH: ['Adrik', 'Baern', 'Darrak', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Morgran', 'Orsik', 'Rangrim', 'Thoradin', 'Vondal'],
    prenomsF: ['Amber', 'Bardryn', 'Diesa', 'Eldeth', 'Gunnloda', 'Hlin', 'Kathra', 'Mardred', 'Riswynn', 'Sannl', 'Torbera', 'Vistra'],
    prenomsN: ['Brottor', 'Dain', 'Kildrak', 'Nal'],
    nomsFamille: ['Barbacier', 'Brisepierre', 'Forgefonte', 'Gemmétaille', 'Hautmarteau', 'Loricuivre', 'Roctonnerre', 'Tailleroc', 'Ventenclume']
  },
  {
    cle: 'halfelin',
    label: 'Halfelin',
    prenomsH: ['Alton', 'Cade', 'Eldon', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe', 'Wellby'],
    prenomsF: ['Andry', 'Bree', 'Callie', 'Cora', 'Lavinia', 'Nedda', 'Portia', 'Seraphina', 'Verna'],
    prenomsN: ['Lidda', 'Merla', 'Paela', 'Trym'],
    nomsFamille: ['Boncœur', 'Brûlemarmite', 'Côtegrasse', 'Grospouce', 'Hautcollines', 'Tournesol', 'Ventregai']
  },
  {
    cle: 'gnome',
    label: 'Gnome',
    prenomsH: ['Boddynock', 'Dimble', 'Fonkin', 'Gimble', 'Glim', 'Namfoodle', 'Roondar', 'Seebo', 'Zook'],
    prenomsF: ['Bimpnottin', 'Breena', 'Donella', 'Ella', 'Lilli', 'Nissa', 'Oda', 'Roywyn', 'Tana'],
    prenomsN: ['Pock', 'Wrenn', 'Gimble', 'Nix'],
    nomsFamille: ['Bouclette', 'Engrenagefou', 'Fignole', 'Ressortvif', 'Tournevire', 'Vifargent']
  },
  {
    cle: 'demi_orc',
    label: 'Demi-orc',
    prenomsH: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Krusk', 'Mhurren', 'Ront', 'Thokk'],
    prenomsF: ['Baggi', 'Emen', 'Engong', 'Myev', 'Neega', 'Ovak', 'Shautha', 'Sutha', 'Yevelda'],
    prenomsN: ['Gorr', 'Krytha', 'Vola'],
    nomsFamille: ['Brisecrâne', 'Dentdesang', 'Mâchefer', 'Poingbrut', 'Tueloup']
  },
  {
    cle: 'tieffelin',
    label: 'Tieffelin',
    prenomsH: ['Akmenos', 'Barakas', 'Damakos', 'Iados', 'Kairon', 'Mordai', 'Skamos', 'Therai'],
    prenomsF: ['Bryseis', 'Damaia', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna', 'Phelaia'],
    prenomsN: ['Carrion', 'Creed', 'Hope', 'Nowhere', 'Quiétude', 'Sorrow'],
    nomsFamille: ['(vertu : Espoir)', '(vertu : Désir)', '(vertu : Crainte)', 'l’Errant', 'des Ombres', 'du Pacte']
  },
  {
    cle: 'drow',
    label: 'Drow',
    prenomsH: ['Drizzt', 'Berg’inyon', 'Dinin', 'Malagdorl', 'Nalfein', 'Pharaun', 'Rizzen', 'Tariic'],
    prenomsF: ['Akordia', 'Briza', 'Drisinil', 'Greyanna', 'Quenthel', 'Sintree', 'Vierna', 'Zarra'],
    prenomsN: ['Jeggred', 'Krenaste', 'Veldrin'],
    nomsFamille: ['Baenre', 'Do’Urden', 'Faen Tlabbar', 'Mizzrym', 'Oblodra', 'Vandree', 'Xorlarrin']
  },
  {
    cle: 'aasimar',
    label: 'Aasimar',
    prenomsH: ['Aurelin', 'Castiel', 'Eron', 'Lucan', 'Raziel', 'Seraph', 'Uriel'],
    prenomsF: ['Aurore', 'Celestia', 'Lumière', 'Nephele', 'Séraphine', 'Solenne'],
    prenomsN: ['Dawn', 'Halo', 'Lumen', 'Sol'],
    nomsFamille: ['Aile-d’Or', 'Clairaube', 'des Cieux', 'Lumebrume', 'Saintchant']
  },
  {
    cle: 'goliath',
    label: 'Goliath',
    prenomsH: ['Aukan', 'Eglath', 'Gae-Al', 'Keothi', 'Lo-Kag', 'Maveith', 'Thalai', 'Vaunea'],
    prenomsF: ['Gae-Al', 'Manneo', 'Nalla', 'Orilo', 'Paavu', 'Uthal', 'Vaunea'],
    prenomsN: ['Ilikan', 'Kuori', 'Pethani'],
    nomsFamille: ['Brisecime', 'Cœurdepierre', 'Hautrocher', 'Marche-nuages', 'Souffleglace']
  },
  {
    cle: 'tabaxi',
    label: 'Tabaxi',
    prenomsH: ['Cri-de-la-Lune', 'Griffe-Vive', 'Saut-de-l’Ombre', 'Vent-du-Sud'],
    prenomsF: ['Brume-du-Matin', 'Chant-de-Pluie', 'Danse-au-Crépuscule', 'Étoile-Filante'],
    prenomsN: ['Cinq-Temps', 'Murmure-des-Cimes', 'Pas-Léger', 'Sept-Étés'],
    nomsFamille: ['du Clan de la Falaise', 'du Clan du Fleuve', 'du Clan des Sables', 'du Clan de la Jungle']
  }
]

export const CULTURES_NOMS_MAP: Record<string, CultureNoms> = CULTURES_NOMS.reduce(
  (acc, c) => {
    acc[c.cle] = c
    return acc
  },
  {} as Record<string, CultureNoms>
)

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Génère « Prénom Nom » pour une culture + un genre donnés.
export function genererNomPnj(culture: string, genre: GenrePnj = 'n'): string {
  const c = CULTURES_NOMS_MAP[culture] ?? CULTURES_NOMS_MAP.humain
  const banque =
    genre === 'h' ? c.prenomsH : genre === 'f' ? c.prenomsF : c.prenomsN
  // Repli sur l'ensemble des prénoms si la banque du genre est vide.
  const prenoms = banque.length > 0 ? banque : [...c.prenomsH, ...c.prenomsF, ...c.prenomsN]
  const prenom = pick(prenoms)
  const nom = pick(c.nomsFamille)
  // Pour les tieffelins, le « nom de famille » est souvent une vertu / un titre.
  return `${prenom} ${nom}`.trim()
}
