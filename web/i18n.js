// French (Launch L18): every word of the game in French, for the countries that play Awalé. Settings → Language: Auto (the
// phone's own language: French when it is French, else English), English, Français. The English in the page and the code
// stays the source; this module turns it into French as it lands on the page (a MutationObserver over the document, so a
// word set by any part of the game is caught), and puts the English back when the language goes back. Exact phrases come
// from FR; the lines built from parts (an opponent's name, a count) from PATTERNS, which translate their parts again.
// Names stay as they are (Adaeze, Auntie Bisi, Nnamdi, Mama Ngozi, Papa Ike, Nchò, Ayo), and so does Gold, the upgrade's name.
// Slice 1: the frame, every word written in index.html (Home, the board's buttons, Settings, the cards, the rules), the fixed
// toasts, the status words and the lines on Home and Settings built from parts. Slice 2: the words the board builds as it
// plays (the hint line, where the seeds go and what it leaves open, their move explained, her take, last 8, circling, feed
// them, the count by touch, the mouse, undo, hurry, the lesson, the pits' labels for screen readers): each part of a line
// joined by " · " or " — " is its own phrase or pattern, so the line is French only when every part is. The cards, the
// opponents' lines, the store, rooms and calls follow in later slices.

export const LANGS = ['auto', 'en', 'fr'];

// What the page speaks: the setting, else the phone's first language.
export function pickLang(pref, langs = []) {
  if (pref === 'en' || pref === 'fr') return pref;
  const first = (langs && langs[0]) || '';
  return /^fr\b/i.test(first) ? 'fr' : 'en';
}

// Settings → Language's own line: what Auto chose.
export function langNote(pref, lang) {
  if (pref === 'auto' || !pref) return lang === 'fr' ? 'suit la langue du téléphone · français' : "follows the phone's language · English now";
  return lang === 'fr' ? 'français' : 'English';
}

const LEVELS = { Easy: 'Facile', Steady: 'Posé', Medium: 'Moyen', Hard: 'Difficile', Master: 'Maître' };

export const FR = {
  // the board's toolbar and cards
  'Ayo board': 'Plateau d’Ayo',
  'The pits — keys 1 to 6 pick yours near to far, Enter sows, U undoes, H hints, Escape puts a pit back': 'Les trous — les touches 1 à 6 choisissent les vôtres du plus proche au plus loin, Entrée sème, U annule, H donne un indice, Échap repose le trou',
  'muted': 'son coupé',
  'waiting': 'attend',
  'captured': 'pris',
  "Mama Ngozi's review": 'La revue de Mama Ngozi',
  'The move before': 'Le coup d’avant',
  '‹ Back': '‹ Retour',
  'Play it again': 'Le rejouer',
  'Again': 'Encore',
  'The next move': 'Le coup suivant',
  'Next ›': 'Suivant ›',
  'Done': 'Terminé',
  'Watch their move again, slowly': 'Revoir son coup, lentement',
  'again': 'revoir',
  "Play Mama Ngozi's move through, slowly": 'Jouer le coup de Mama Ngozi, lentement',
  'show': 'voir',
  'Last 8': 'Les 8 derniers',
  'Circling': 'On tourne en rond',
  'Recording your best turn…': 'Enregistrement de votre meilleur tour…',
  'Shout': 'Crier',
  'Video and voice': 'Vidéo et voix',
  'your microphone is off': 'votre micro est coupé',
  'your move': 'à vous',
  'thinking…': 'réfléchit…',
  'watching': 'regarde',
  'connecting…': 'connexion…',
  'reconnecting…': 'reconnexion…',
  'catching up…': 'mise à jour…',
  'at the door': 'à la porte',
  'Home': 'Accueil',
  'Undo': 'Annuler',
  'Undo · U': 'Annuler · U',
  'Hint': 'Indice',
  'Hint · H': 'Indice · H',
  'Say something across the board': 'Dire quelque chose de l’autre côté du plateau',
  'Video or voice': 'Vidéo ou voix',
  'Video or voice with your friend': 'Vidéo ou voix avec votre ami',
  'Rules': 'Règles',
  'Sound': 'Son',
  'Settings': 'Réglages',
  // Home
  'Nigerian Mancala': 'Mancala nigérian',
  'Store': 'Boutique',
  'Store · boards, seed sets and Gold': 'Boutique · plateaux, graines et Gold',
  'Daily puzzle': 'Énigme du jour',
  'Capture 8 in one turn': 'Prenez 8 en un tour',
  'not yet played': 'pas encore jouée',
  'Which game': 'Quel jeu',
  'capture on 4': 'prise à 4',
  'capture on 2 or 3': 'prise à 2 ou 3',
  'Play': 'Jouer',
  'Continue': 'Continuer',
  'no game in progress': 'aucune partie en cours',
  'With friends': 'Entre amis',
  'a room code · invite on WhatsApp': 'un code de salle · invitation par WhatsApp',
  'Opponent': 'Adversaire',
  'Easy · Adaeze': 'Facile · Adaeze',
  'Steady · Auntie Bisi': 'Posé · Auntie Bisi',
  'Medium · Nnamdi': 'Moyen · Nnamdi',
  'Hard · Mama Ngozi': 'Difficile · Mama Ngozi',
  'Papa Ike, Master — part of Gold': 'Papa Ike, Maître — dans Gold',
  'Master · Papa Ike': 'Maître · Papa Ike',
  'part of Gold': 'dans Gold',
  'Two players on this phone — pass it after each move, or lay it flat between you': 'Deux joueurs sur ce téléphone — passez-le après chaque coup, ou posez-le à plat entre vous',
  'Two of us': 'À deux',
  'on this phone': 'sur ce téléphone',
  'Back': 'Retour',
  // Rooms
  'Nchò · same rules as the board': 'Nchò · mêmes règles que le plateau',
  'Your room': 'Votre salle',
  'opening a room…': 'ouverture d’une salle…',
  'Room code': 'Code de la salle',
  'Tell them the code, or send the link. The seat is theirs for 10 minutes.': 'Donnez-leur le code, ou envoyez le lien. La place leur est gardée 10 minutes.',
  'Invite on WhatsApp': 'Inviter par WhatsApp',
  'Copy link': 'Copier le lien',
  'Share…': 'Partager…',
  'Got a code? Join their room': 'Vous avez un code ? Rejoignez leur salle',
  'Their room code': 'Le code de leur salle',
  'Join': 'Rejoindre',
  'Lose signal mid-game and the room keeps your seat: come back and carry on.': 'Si le réseau coupe en pleine partie, la salle garde votre place : revenez et continuez.',
  'Family only for now: you let people in ·': 'En famille pour l’instant : c’est vous qui faites entrer ·',
  'Knocking…': 'On frappe…',
  'Joining the room…': 'Entrée dans la salle…',
  // the daily puzzle
  'Nchò rules': 'Règles du Nchò',
  'Ayo rules': 'Règles de l’Ayo',
  'One move. Your pits are on the right. Relay sowing counts.': 'Un seul coup. Vos trous sont à droite. Le semis en relais compte.',
  'You captured': 'Vous avez pris',
  'Solved': 'Résolue',
  'Shown': 'Montrée',
  'Your best today': 'Votre meilleur aujourd’hui',
  'Days solved': 'Jours résolus',
  'none yet': 'aucun pour l’instant',
  'Share': 'Partager',
  'Try again': 'Réessayer',
  'Now you': 'À vous maintenant',
  'Remind me each day at 19:00': 'Me le rappeler chaque jour à 19:00',
  'Show me the move': 'Montrez-moi le coup',
  'One seed in each pit.': 'Une graine dans chaque trou.',
  'Next': 'Suivant',
  'Back to home': 'Retour à l’accueil',
  'tap Home to go back': 'touchez Accueil pour revenir',
  'Sowing, a capture of 4 and a relay: that is most of the game.': 'Semer, prendre un 4 et relancer : c’est presque tout le jeu.',
  // the store
  'Looks only · never wins': 'Que l’apparence · jamais la victoire',
  'One upgrade, once · never a win bought': 'Une seule amélioration, une seule fois · jamais une victoire achetée',
  'Get the app': 'Prendre l’appli',
  'Your board now': 'Votre plateau',
  'Boards': 'Plateaux',
  'tap one to see it on the board': 'touchez-en un pour le voir sur le plateau',
  'Seed sets': 'Jeux de graines',
  'tap one to pour it in': 'touchez-en un pour le verser',
  'Bundle': 'Lot',
  'Restore purchases': 'Restaurer les achats',
  'Asking the store…': 'On demande à la boutique…',
  // Settings
  'Game': 'Jeu',
  'Nchò is how your family plays': 'Le Nchò, comme on joue dans votre famille',
  'Capture on': 'Prise à',
  '4 only, or 2 and 3 (Oware)': '4 seulement, ou 2 et 3 (Awalé)',
  '2 & 3': '2 et 3',
  'Sowing': 'Semis',
  'relay keeps going; single lap stops': 'le relais continue ; un seul tour s’arrête',
  'Relay': 'Relais',
  'Single lap': 'Un seul tour',
  'Last 8 seeds': 'Les 8 dernières graines',
  'next capture takes them all': 'la prise suivante les emporte toutes',
  'Last 8 seeds to the next capturer': 'Les 8 dernières graines à qui prend ensuite',
  'Learn to play': 'Apprendre à jouer',
  'a one-minute lesson on the board: sowing, a capture of 4, a relay': 'une leçon d’une minute sur le plateau : semer, prendre un 4, relancer',
  'Start': 'Commencer',
  'Who starts': 'Qui commence',
  'the loser of the last game, as at a real board; or always you, or always them (two of us: Player 1 or Player 2) · from the next game': 'le perdant de la dernière partie, comme autour d’un vrai plateau ; ou toujours vous, ou toujours l’autre (à deux : Joueur 1 ou Joueur 2) · dès la prochaine partie',
  'Loser': 'Perdant',
  'You': 'Vous',
  'Them': 'L’autre',
  'Changing rules starts a new game.': 'Changer les règles lance une nouvelle partie.',
  'Board': 'Plateau',
  'mahogany · iroko · ebony': 'acajou · iroko · ébène',
  'Mahogany': 'Acajou',
  'Iroko': 'Iroko',
  'Ebony': 'Ébène',
  'Benin bronze': 'Bronze du Bénin',
  "Grandpa's board": 'Le plateau de grand-père',
  'Seeds': 'Graines',
  "Job's tears · river stones unlock at 7 days played": 'Larmes de Job · les galets s’ouvrent après 7 jours de jeu',
  "Job's tears": 'Larmes de Job',
  'River stones': 'Galets',
  'Cowries': 'Cauris',
  'Palm kernels': 'Noix de palme',
  'more boards and seed sets, and Gold · looks only, never wins': 'd’autres plateaux et graines, et Gold · que l’apparence, jamais la victoire',
  'Open': 'Ouvrir',
  'Seed counts on pits': 'Nombre de graines sur les trous',
  'little numbers beside each pit': 'de petits chiffres à côté de chaque trou',
  'Feel': 'Ressenti',
  'wood knocks, rattle, scoop': 'coups sur le bois, cliquetis, ramassage',
  'Music': 'Musique',
  'a quiet ubo (thumb piano) and udu tune under the board, made on the phone': 'un air doux d’ubo (piano à pouces) et d’udu sous le plateau, joué par le téléphone',
  'Haptics': 'Vibrations',
  'a tap for every seed': 'une petite vibration pour chaque graine',
  'Pass the phone': 'Passer le téléphone',
  'two of us: the board turns round to face whoever is to move; off when the phone lies flat between you': 'à deux : le plateau tourne vers celui qui doit jouer ; désactivez-le quand le téléphone est posé à plat entre vous',
  'Show where seeds go': 'Montrer où vont les graines',
  'on the first tap, a mark on every pit the hand will reach and a light where it ends; after their move, its path and the words, tap to watch it again': 'au premier toucher, une marque sur chaque trou que la main atteindra et une lumière là où elle s’arrête ; après son coup, son chemin et des mots, touchez pour le revoir',
  'Warn what it leaves open': 'Prévenir de ce qu’il laisse ouvert',
  'with the marks: after your first tap, an ember ring round each pit their best answer could take, and how many seeds, before you sow': 'avec les marques : après votre premier toucher, un anneau braise autour de chaque trou que sa meilleure réponse pourrait prendre, et combien de graines, avant de semer',
  "Mama Ngozi's take": 'L’avis de Mama Ngozi',
  'after your move against the computer, if a clearly better pit was there she says which one under the board; tap it to see that move play through': 'après votre coup contre l’ordinateur, si un trou nettement meilleur existait, elle dit lequel sous le plateau ; touchez pour voir ce coup se jouer',
  'Keep the screen on': 'Garder l’écran allumé',
  'while a game is in play the phone never goes dark; it may sleep after 3 minutes with nobody touching it (10 while a friend thinks)': 'pendant une partie le téléphone ne s’éteint pas ; il peut se mettre en veille après 3 minutes sans qu’on le touche (10 quand un ami réfléchit)',
  'Daily puzzle reminder': 'Rappel de l’énigme du jour',
  'the phone tells you once a day when a new puzzle is waiting, and never on a day you have played it': 'le téléphone vous prévient une fois par jour qu’une nouvelle énigme attend, jamais un jour où vous l’avez jouée',
  'Remind me at': 'Me le rappeler à',
  "the phone's own clock": 'l’heure du téléphone',
  'Sowing speed': 'Vitesse du semis',
  'how fast the hand moves': 'à quelle vitesse la main avance',
  'Slow': 'Lente',
  'Normal': 'Normale',
  'Fast': 'Rapide',
  'Lighter board': 'Plateau allégé',
  'for slow phones and weak signal ·': 'pour les téléphones lents et le réseau faible ·',
  'auto': 'auto',
  'Auto': 'Auto',
  'On': 'Oui',
  'Off': 'Non',
  'Seed physics': 'Physique des graines',
  'seeds bounce and roll; off, they fly straight to their pit ·': 'les graines rebondissent et roulent ; sinon, elles volent droit dans leur trou ·',
  'Easy · nine years old and sure she is winning': 'Facile · neuf ans et sûre de gagner',
  'Choose': 'Choisir',
  'Chosen': 'Choisi',
  'Steady · the teacher, counts every pit twice': 'Posé · l’institutrice, compte chaque trou deux fois',
  'Medium · your quick cousin, talks more than he plans': 'Moyen · votre cousin vif, parle plus qu’il ne calcule',
  'Hard · thirty years at the market': 'Difficile · trente ans au marché',
  "Master · Mama Ngozi's old rival, sees furthest · part of Gold": 'Maître · le vieux rival de Mama Ngozi, voit le plus loin · dans Gold',
  'no computer · pass the phone after each move, or lay the Fold flat between you': 'sans ordinateur · passez le téléphone après chaque coup, ou posez le Fold à plat entre vous',
  'Privacy': 'Confidentialité',
  'Share game numbers and crash reports': 'Partager les chiffres de jeu et les rapports de plantage',
  'in the apps: how many games are started and finished, the lesson, the puzzle, invites, the store and purchases, and where the game broke if it does — never your name, your moves, a room code or anything you type': 'dans les applis : combien de parties sont commencées et finies, la leçon, l’énigme, les invitations, la boutique et les achats, et où le jeu a planté s’il plante — jamais votre nom, vos coups, un code de salle ni rien de ce que vous tapez',
  'Blocked on this phone': 'Bloqués sur ce téléphone',
  'block someone from the camera button in a game with a friend: their knocks at your rooms are turned away and they cannot call you; only on this phone': 'bloquez quelqu’un depuis le bouton caméra pendant une partie entre amis : on ne lui ouvre plus vos salles et il ne peut plus vous appeler ; sur ce téléphone seulement',
  'Language': 'Langue',
  'English': 'English',
  'Français': 'Français',
  'How to play · Credits': 'Comment jouer · Crédits',
  'Privacy, terms and support': 'Confidentialité, conditions et assistance',
  'Terms': 'Conditions',
  'Support': 'Assistance',
  // Game over
  'You win': 'Vous gagnez',
  'A draw': 'Match nul',
  'Biggest turn': 'Plus grand tour',
  'Captures': 'Prises',
  'Time': 'Durée',
  'How it went': 'Le fil de la partie',
  'you': 'vous',
  'going over the game…': 'elle revoit la partie…',
  'Your rating': 'Votre classement',
  'Play again': 'Rejouer',
  'Replay': 'Revoir',
  'Record your best turn as a 10-second clip to share': 'Enregistrer votre meilleur tour en un clip de 10 secondes à partager',
  'Clip': 'Clip',
  // the name, the door, take it back, the call
  'What do we call you?': 'Comment vous appelle-t-on ?',
  'Your friend sees this name when you knock on their board.': 'Votre ami voit ce nom quand vous frappez à son plateau.',
  'Your name': 'Votre nom',
  'Knock': 'Frapper',
  'At the door': 'À la porte',
  'Let them in and they take the far seat. Nobody else can join once they do.': 'Faites-le entrer et il prend la place d’en face. Personne d’autre ne peut entrer ensuite.',
  'Not now': 'Pas maintenant',
  'Let in': 'Faire entrer',
  'Take it back?': 'Reprendre le coup ?',
  'Their seeds go back where they were and it is their move again. Or play on and the move stands.': 'Ses graines reviennent à leur place et c’est de nouveau à lui. Ou bien continuez et le coup reste.',
  'Play on': 'On continue',
  'Let them': 'D’accord',
  'Nothing is on until you say yes. The picture and sound go straight between your two phones and are never recorded.': 'Rien ne s’allume avant votre oui. L’image et le son passent directement entre vos deux téléphones et ne sont jamais enregistrés.',
  'Voice only': 'Voix seule',
  'Video': 'Vidéo',
  'This browser cannot do video or voice': 'Ce navigateur ne fait ni vidéo ni voix',
  // How to play
  'How to play': 'Comment jouer',
  'Your six pits are the column on the right. Tap one with seeds to pick them all up.': 'Vos six trous sont la colonne de droite. Touchez-en un qui a des graines pour toutes les prendre.',
  'They are sown one per pit anticlockwise: up your side, then down the other side.': 'On les sème une par trou dans le sens inverse des aiguilles d’une montre : en montant de votre côté, puis en descendant de l’autre.',
  'If your last seed lands in a pit that has seeds, you pick that pit up and keep going. Your turn ends when the last seed lands in an empty pit.': 'Si votre dernière graine tombe dans un trou qui a des graines, vous prenez ce trou et continuez. Votre tour s’arrête quand la dernière graine tombe dans un trou vide.',
  'Any pit that reaches 4 seeds is taken by the owner of that side — whoever sowed it.': 'Tout trou qui arrive à 4 graines est pris par le maître de ce côté — peu importe qui a semé.',
  'Except: if your last seed makes a pit on their side 4, you take it.': 'Sauf : si votre dernière graine fait 4 dans un trou de son côté, c’est vous qui le prenez.',
  'With 8 seeds left, whoever makes the next capture takes them all. Most seeds wins.': 'Quand il reste 8 graines, la prise suivante les emporte toutes. Le plus de graines gagne.',
  "If your last seed makes an opponent's pit 2 or 3, you capture it, and every pit behind it that is also 2 or 3.": 'Si votre dernière graine fait 2 ou 3 dans un trou adverse, vous le prenez, ainsi que chaque trou derrière lui qui a aussi 2 ou 3.',
  'If the other side is empty, you must give them seeds when you can.': 'Si l’autre côté est vide, vous devez lui donner des graines quand vous le pouvez.',
  'First to 25 seeds wins.': 'Le premier à 25 graines gagne.',
  'Board, seeds and sounds are made on your device: no downloads, no ads. Fonts: Fraunces and Inter (Open Font Licence).': 'Plateau, graines et sons sont faits sur votre appareil : aucun téléchargement, aucune publicité. Polices : Fraunces et Inter (Open Font Licence).',
  'Got it': 'Compris',
  // toasts
  'Waiting for a friend': 'On attend un ami',
  'Result copied': 'Résultat copié',
  'Link copied': 'Lien copié',
  'Two of us on the next game': 'À deux à la prochaine partie',
  'This browser cannot record video — the words are copied': 'Ce navigateur ne peut pas enregistrer de vidéo — les mots sont copiés',
  'The reminder comes with the app — a web page cannot remind you once it is closed': 'Le rappel vient avec l’appli — une page web ne peut pas vous prévenir une fois fermée',
  'She is still going over it — a moment': 'Elle revoit encore la partie — un instant',
  'Rules changed: next game uses them': 'Règles changées : la prochaine partie les suit',
  'Redrawing the board…': 'On redessine le plateau…',
  'No camera here — voice only': 'Pas de caméra ici — voix seule',
  'Clip saved to your downloads': 'Clip enregistré dans vos téléchargements',
  'Caught up with the board': 'Le plateau est à jour',
  'Back at the board': 'De retour au plateau',
  'A purchase came through — thank you': 'Un achat est arrivé — merci',
  'A new room, with your new name': 'Une nouvelle salle, avec votre nouveau nom',
  'From the next game: the loser goes first': 'Dès la prochaine partie : le perdant commence',
  'From the next game: you always start': 'Dès la prochaine partie : vous commencez toujours',
  'From the next game: they always start': 'Dès la prochaine partie : l’autre commence toujours',
  'Seeds bounce and roll again': 'Les graines rebondissent et roulent de nouveau',
  'Seeds fly straight to their pit': 'Les graines volent droit dans leur trou',
  'Player 1': 'Joueur 1',
  'Player 2': 'Joueur 2',
  // parts of the lines Settings builds (each part of a "a · b · c" line is looked up on its own)
  'mahogany': 'acajou', 'iroko': 'iroko', 'ebony': 'ébène',
  'river stones (yours: 7 days played)': 'galets (à vous : 7 jours de jeu)',
  'solved ✓': 'résolue ✓',
  'shown the move': 'coup montré',
  'Play today and start your calm streak': 'Jouez aujourd\u2019hui pour commencer votre série tranquille',
  'today ✓': 'aujourd\u2019hui ✓',
  'every seed set unlocked': 'tous les jeux de graines ouverts',
  // the board as it plays (slice 2): the status words, the hint line and the chips under the board
  'game over': 'partie finie',
  'passing the phone…': 'on passe le téléphone…',
  'tap again to sow': 'touchez encore pour semer',
  'tap again to sow, or pick another': 'touchez encore pour semer, ou choisissez-en un autre',
  'tap a pit on your side': 'touchez un trou de votre côté',
  'tap a pit on your side to sow': 'touchez un trou de votre côté pour semer',
  'click a pit on your side, or press 1–6': 'cliquez sur un trou de votre côté, ou appuyez sur 1–6',
  'Enter to sow': 'Entrée pour semer',
  'Enter to sow, or pick another': 'Entrée pour semer, ou choisissez-en un autre',
  'picked': 'choisi',
  'must feed the other side': 'doit nourrir l’autre côté',
  'empty': 'vide',
  'picks up again once': 'reprend une fois',
  'nothing to sow': 'rien à semer',
  'ends the game level': 'finit la partie à égalité',
  'wins the game': 'gagne la partie',
  'ends the game': 'finit la partie',
  'picked up again once': 'a repris une fois',
  'picked up again twice': 'a repris deux fois',
  'sowed nothing': 'n’a rien semé',
  'the game ends level': 'la partie finit à égalité',
  'you win': 'vous gagnez',
  'they win': 'l’autre gagne',
  'then they can win': 'puis l’autre peut gagner',
  'keeps you in the game': 'vous gardait dans la partie',
  'Her take': 'Son avis',
  'the next capture takes them all': 'la prochaine prise les emporte toutes',
  'each keeps their side': 'chacun garde son côté',
  'move with no capture and it ends': 'coup sans prise et c’est fini',
  'moves with no capture and it ends': 'coups sans prise et c’est fini',
  'hurrying…': 'on accélère…',
  'tap the board to hurry': 'touchez le plateau pour accélérer',
  'click the board or press Space to hurry': 'cliquez sur le plateau ou appuyez sur Espace pour accélérer',
  'They have no seeds': 'L’autre côté n’a plus de graines',
  'they have no seeds': 'l’autre côté n’a plus de graines',
  'you must give the other side seeds': 'vous devez donner des graines à l’autre côté',
  'only move': 'seul coup possible',
  'the only pit that leaves them seeds': 'le seul trou qui laisse des graines à l’autre côté',
  'Taking back your move': 'On reprend votre coup',
  'reaches every other pit': 'atteint tous les autres trous',
  'goes right round the board, past its own pit': 'fait tout le tour du plateau, au-delà de son propre trou',
  'click to see where they go': 'cliquez pour voir où elles vont',
  'the loser goes first': 'le perdant joue en premier',
  'after a draw, the other side goes first': 'après un match nul, l’autre côté commence',
  'You start': 'Vous commencez',
  'pass the phone after each move': 'passez le téléphone après chaque coup',
  'A pale ring: those seeds go to their trough, not yours — a pit on their side that makes 4 before your last seed is theirs. Only your last seed takes a 4 over there.': 'Un anneau pâle : ces graines vont dans la réserve d’en face, pas dans la vôtre — un trou de son côté qui fait 4 avant votre dernière graine est à lui. Seule votre dernière graine prend un 4 là-bas.',
  'A pale ring: those seeds go to their trough, not yours.': 'Un anneau pâle : ces graines vont dans la réserve d’en face, pas dans la vôtre.',
  // the lesson
  'A capture of 4': 'Une prise de 4',
  'The lit pit is yours. Tap it: the hand picks up its seeds and drops one in each pit, anticlockwise — the brass marks show where.': 'Le trou éclairé est à vous. Touchez-le : la main prend ses graines et en dépose une dans chaque trou, dans le sens inverse des aiguilles d’une montre — les marques de laiton montrent où.',
  'One seed in each pit. The turn ends where the last seed lands in an empty pit.': 'Une graine dans chaque trou. Le tour s’arrête là où la dernière graine tombe dans un trou vide.',
  'Its last seed lands in their pit of 3 and makes it 4. Your last seed making a 4 on their side wins it. Tap the lit pit.': 'Sa dernière graine tombe dans un trou d’en face qui en a 3 et en fait 4. Votre dernière graine qui fait 4 de son côté le gagne. Touchez le trou éclairé.',
  '+4 in your trough. Any pit that reaches 4 goes to the owner of that side — unless your last seed makes it, over there.': '+4 dans votre réserve. Tout trou qui arrive à 4 va au maître de ce côté — sauf si c’est votre dernière graine qui le fait, là-bas.',
  'This time the last seed lands on seeds already there: the hand picks them all up and sows on. Tap the lit pit.': 'Cette fois la dernière graine tombe sur des graines déjà là : la main les prend toutes et continue de semer. Touchez le trou éclairé.',
  'Picked up again and on into their side, until a seed landed in an empty pit. First to 25 seeds wins. That is Nchò.': 'Reprises, et en avant de son côté, jusqu’à ce qu’une graine tombe dans un trou vide. Le premier à 25 graines gagne. C’est ça, le Nchò.',
  "You're ready": 'Vous êtes prêt',
  'Skip the lesson': 'Passer la leçon',
  'In the lesson, play the lit pit': 'Pendant la leçon, jouez le trou éclairé',
  'Finish': 'Terminer',
};
// French sets a thin space before : ; ? ! so they never start a line
for (const k in FR) FR[k] = FR[k].replace(/ ([:;?!])/g, '\u00a0$1');
// names and words that stay as they are when a line is put together from parts
const KEEP = new Set(['Adaeze', 'Auntie Bisi', 'Nnamdi', 'Mama Ngozi', 'Papa Ike', 'Nchò', 'Ayo', 'Gold', 'Tete', 'Player']);
const LOOK_FR = { 'river stones': 'les galets', 'benin bronze': 'le bronze du Bénin', "grandpa's board": 'le plateau de grand-père', cowries: 'les cauris', 'palm kernels': 'les noix de palme' };
const look = (s) => LOOK_FR[s.toLowerCase()] || s;

const DAYS = { Mon: 'lun.', Tue: 'mar.', Wed: 'mer.', Thu: 'jeu.', Fri: 'ven.', Sat: 'sam.', Sun: 'dim.' };
const MONTHS = { Jan: 'janv.', Feb: 'févr.', Mar: 'mars', Apr: 'avr.', May: 'mai', Jun: 'juin', Jul: 'juil.', Aug: 'août', Sep: 'sept.', Oct: 'oct.', Nov: 'nov.', Dec: 'déc.' };
const lv = (s) => LEVELS[s] || s;
const who = (s) => FR[s] || s; // a name stays a name; "Player 2" becomes "Joueur 2"
// Lines built from parts: [the English shape, its French]. Each part goes through translate again.
export const PATTERNS = [
  [/^vs (.+?) · (Easy|Steady|Medium|Hard|Master)(?: · (.+) starts)?$/, (m) => `contre ${m[1]} · ${lv(m[2])}` + (m[3] ? ` · ${who(m[3])} commence` : '')],
  [/^(.+?) · (Easy|Steady|Medium|Hard|Master)$/, (m) => `${m[1]} · ${lv(m[2])}`],
  [/^(Player [12]) starts · on this phone$/, (m) => `${who(m[1])} commence · sur ce téléphone`],
  [/^(.+) starts — the loser goes first$/, (m) => `${who(m[1])} commence — le perdant joue en premier`],
  [/^(.+) wins$/, (m) => `${who(m[1])} gagne`],
  [/^Play again — (.+) is ready$/, (m) => `Rejouer — ${m[1]} est prêt`],
  [/^(Nchò|Ayo) · (\d+) moves?$/, (m) => `${m[1]} · ${m[2]} coup${m[2] === '1' ? '' : 's'}`],
  [/^(\d+) seeds?$/, (m) => `${m[1]} graine${m[1] === '1' ? '' : 's'}`],
  [/^now (lighter|full) \((.+?)\)(?: · (.+))?$/, (m) => `${m[1] === 'lighter' ? 'allégé' : 'complet'} en ce moment (${m[2]})` + (m[3] ? ' · ' + m[3] : '')],
  [/^now (on|off) \((.+?)\)$/, (m) => `${m[1] === 'on' ? 'activée' : 'désactivée'} en ce moment (${m[2]})`],
  [/^River stones — at (\d+) days played$/, (m) => `Galets — après ${m[1]} jours de jeu`],
  [/^River stones come with (\d+) days played — (\d+) so far$/, (m) => `Les galets viennent après ${m[1]} jours de jeu — ${m[2]} pour l’instant`],
  [/^(.+) — in the store$/, (m) => `${who(m[1])} — dans la boutique`],
  [/^([^·]+?)(?: and ([^·]+))? in the store$/, (m) => (m[2] ? `${look(m[1])} et ${look(m[2])}` : look(m[1])) + ' dans la boutique'],
  [/^river stones at (\d+) days played \((\d+) so far\)$/, (m) => `galets après ${m[1]} jours de jeu (${m[2]} pour l\u2019instant)`],
  [/^Daily puzzle · (Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d+) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, (m) => `Énigme du jour · ${DAYS[m[1]]} ${m[2] === '1' ? '1er' : m[2]} ${MONTHS[m[3]]}`],
  [/^Capture (\d+) in one turn$/, (m) => `Prenez ${m[1]} en un tour`],
  [/^best (\d+) of (\d+)$/, (m) => `meilleur : ${m[1]} sur ${m[2]}`],
  [/^7 days unlocks (.+)$/, (m) => `7 jours ouvrent ${look(m[1])}`],
  [/^(\d+) days? played$/, (m) => `${m[1]} jour${m[1] === '1' ? '' : 's'} de jeu`],
  [/^(\d+) more days? for (.+)$/, (m) => `encore ${m[1]} jour${m[1] === '1' ? '' : 's'} pour ${look(m[2])}`],
  [/^New game — (.+)$/, (m) => `Nouvelle partie — ${translate(m[1], 'fr')}`],
  // the board as it plays (slice 2); `need` translates a part and gives up on the whole line if that part has no French
  [/^(your|their|Your|Their) pit (\d)(?: \(key (\d)\))?$/, (m) => pitFr(m)],
  [/^pit (\d)$/, (m) => `trou ${m[1]}`],
  [/^pits ([\d, ]+) (or|and) (\d)$/, (m) => `trous ${m[1]} ${m[2] === 'or' ? 'ou' : 'et'} ${m[3]}`],
  [/^picks up again ×(\d+)$/, (m) => `reprend ×${m[1]}`],
  [/^picked up again ×(\d+)$/, (m) => `a repris ×${m[1]}`],
  [/^ends in (.+)$/, (m) => `finit dans ${need(m[1])}`],
  [/^ended in (.+)$/, (m) => `a fini dans ${need(m[1])}`],
  [/^takes (\d+)$/, (m) => `prend ${m[1]}`],
  [/^gives (\d+)$/, (m) => `donne ${m[1]}`],
  [/^took (\d+)$/, (m) => `a pris ${m[1]}`],
  [/^gave (\d+)$/, (m) => `a donné ${m[1]}`],
  [/^the last (\d+) go to (you|them)$/, (m) => (m[2] === 'you' ? `les ${m[1]} dernières vous reviennent` : `les ${m[1]} dernières reviennent à l’autre`)],
  [/^the last (\d+) went to (you|them)$/, (m) => (m[2] === 'you' ? `les ${m[1]} dernières vous sont revenues` : `les ${m[1]} dernières sont revenues à l’autre`)],
  [/^then they can take (\d+)$/, (m) => `puis l’autre peut prendre ${m[1]}`],
  [/^([^·—:]+?) would play this one$/, (m) => `${m[1]} jouerait celui-ci`],
  [/^([^·—:]+?) would play pit (\d)$/, (m) => `${m[1]} jouerait le trou ${m[2]}`],
  [/^(.+) was the move$/, (m) => `le bon coup, c’était ${need(m[1])}`],
  [/^(\d+) seeds? better$/, (m) => `${m[1]} graine${m[1] === '1' ? '' : 's'} de mieux`],
  [/^(\d+) seeds? left$/, (m) => (m[1] === '1' ? 'il reste 1 graine' : `il reste ${m[1]} graines`)],
  [/^no capture in (\d+) moves$/, (m) => `aucune prise en ${m[1]} coups`],
  [/^each keeps their side: (.+)$/, (m) => `chacun garde son côté : ${need(m[1])}`],
  [/^you'd (win|lose) (\d+)–(\d+)$/, (m) => `vous ${m[1] === 'win' ? 'gagneriez' : 'perdriez'} ${m[2]}–${m[3]}`],
  [/^level (\d+)–(\d+)$/, (m) => `égalité ${m[1]}–${m[2]}`],
  [/^([^·—:]+?) would (win|lose) (\d+)–(\d+)$/, (m) => `${who(m[1])} ${m[2] === 'win' ? 'gagnerait' : 'perdrait'} ${m[3]}–${m[4]}`],
  [/^The seeds are circling — (\d+) moves with no capture and the game ends; each keeps the seeds on their side$/, (m) => `Les graines tournent en rond — ${m[1]} coups sans prise et la partie s’arrête ; chacun garde les graines de son côté`],
  [/^only (pits? .+) (has seeds|reaches them)$/, (m) => `${m[1].startsWith('pits') ? 'seuls les' : 'seul le'} ${need(m[1])} ${m[1].startsWith('pits') ? (m[2] === 'has seeds' ? 'ont des graines' : 'atteignent l’autre côté') : (m[2] === 'has seeds' ? 'a des graines' : 'atteint l’autre côté')}`],
  [/^you must feed them: (pits? .+)$/, (m) => `vous devez nourrir l’autre côté : ${need(m[1])}`],
  [/^(pits? .+) would leave them nothing$/, (m) => `${cap(the(m[1]))} ne laisserai${m[1].startsWith('pits') ? 'en' : ''}t rien à l’autre côté`],
  [/^play (pits? .+)$/, (m) => `jouez ${the(m[1])}`],
  [/^(pit \d) doesn't reach them$/, (m) => `${cap(the(m[1]))} n’atteint pas l’autre côté`],
  [/^they have no seeds: play (pits? .+)$/, (m) => `l’autre côté n’a plus de graines : jouez ${the(m[1])}`],
  [/^((?:your |their )?pit \d) is empty$/, (m) => `${cap(the(m[1]))} est vide`],
  [/^Taking back your move and ([^·—:]+?)'s reply$/, (m) => `On reprend votre coup et la réponse de ${who(m[1])}`],
  [/^Taking back ([^·—:]+?)'s move$/, (m) => `On reprend le coup de ${who(m[1])}`],
  [/^([^·—:]+?)'s move again, slowly$/, (m) => `Le coup de ${who(m[1])}, encore une fois, lentement`],
  [/^([^·—:]+?)'s move, slowly$/, (m) => `Le coup de ${who(m[1])}, lentement`],
  [/^([^·—:]+?)'s move: (.+)\. Watch it again, slowly$/, (m) => `Le coup de ${who(m[1])} : ${need(m[2])}. Le revoir, lentement`],
  [/^([^·—:]+?)'s take: (.+)\. Play it through, slowly$/, (m) => `L’avis de ${who(m[1])} : ${need(m[2])}. Le jouer, lentement`],
  [/^([^·—:]+?) starts$/, (m) => `${who(m[1])} commence`],
  [/^Learn Nchò · (\d+) of (\d+)$/, (m) => `Apprendre le Nchò · ${m[1]} sur ${m[2]}`],
  [/^([^·—:]+?) sows one of hers…$/, (m) => `${m[1]} sème un des siens…`],
  [/^([^·—:]+?) plays you for real now\. Tap a pit once to see where its seeds go, twice to sow\.$/, (m) => `${m[1]} joue contre vous pour de vrai maintenant. Touchez un trou une fois pour voir où vont ses graines, deux fois pour semer.`],
];
// a pit named from the seat looking at it: "your pit 3" → "votre trou 3", "their pit 3" → "le trou 3 d'en face"; the screen
// readers' "Your pit 3 (key 3)" → "Votre trou 3 (touche 3)"
function pitFr(m) {
  const mine = m[1].toLowerCase() === 'your'; const s = mine ? `votre trou ${m[2]}` : `le trou ${m[2]} d’en face`;
  return (m[1][0] === 'Y' || m[1][0] === 'T' ? cap(s) : s) + (m[3] ? ` (touche ${m[3]})` : '');
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const NO = Symbol('no French');
// "pit 3" as the subject or object of a sentence: "le trou 3", "les trous 2 ou 5" ("your pit 3" is already "votre trou 3")
const the = (s) => (/^pits? /.test(s) ? (s.startsWith('pits') ? 'les ' : 'le ') : '') + need(s);
function need(s) { const r = sub(s); if (r === null) throw NO; return r; }

// One string into the page's language. Whitespace around it is kept; inside, runs of it count as one space.
export function translate(s, lang) {
  if (lang !== 'fr' || typeof s !== 'string') return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); const core = m[2].replace(/\s+/g, ' ');
  if (!core) return s;
  if (Object.prototype.hasOwnProperty.call(FR, core)) return m[1] + FR[core] + m[3];
  const one = whole(core); if (one !== null) return m[1] + one + m[3];
  const out = sub(core);
  return out === null || out === core ? s : m[1] + out + m[3];
}
// A line put together from parts: the whole line first, then its parts split on " — ", then each of those on " · ". French
// only if every part is (a name or a number stays as it is), so nothing is ever half French.
function sub(core) {
  const one = whole(core); if (one !== null) return one;
  if (core.includes(' — ')) {
    const out = core.split(' — ').map(sub);
    if (!out.includes(null)) return out.join(' — ');
  }
  if (core.includes(' · ')) {
    const out = core.split(' · ').map((p) => whole(p) ?? (KEEP.has(p) || !/\p{L}/u.test(p) ? p : null));
    if (!out.includes(null)) return out.join(' · ');
  }
  return KEEP.has(core) || !/\p{L}/u.test(core) ? core : null;
}
function whole(core) {
  if (Object.prototype.hasOwnProperty.call(FR, core)) return FR[core];
  for (const [re, fn] of PATTERNS) {
    const r = re.exec(core); if (!r) continue;
    let out; try { out = fn(r); } catch (e) { if (e === NO) continue; throw e; }
    return out.replace(/ ([:;?!])/g, '\u00a0$1');
  }
  return null;
}

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'svg', 'CANVAS', 'TEXTAREA']);

// The page in a language. Each text node and attribute it changes remembers its English (`en`) and what it showed (`out`), so
// a node the game writes again is read as new English, and switching back puts the English back. src(el) gives an
// element's English, for code that compares what a line says with what it set.
export function makeI18n({ doc, lang = 'en', Observer = globalThis.MutationObserver } = {}) {
  const texts = new WeakMap(); const attrs = new WeakMap(); let busy = false; let obs = null;
  const skipped = (n) => { for (let p = n.parentNode; p && p !== doc; p = p.parentNode) if (SKIP.has(p.nodeName) || (p.dataset && 'i18nSkip' in p.dataset)) return true; return false; };
  function doText(node) {
    const rec = texts.get(node); const now = node.data;
    const en = rec && now === rec.out ? rec.en : now;
    const out = translate(en, lang);
    if (out === en) { texts.delete(node); if (rec && now === rec.out) node.data = en; return; }
    texts.set(node, { en, out }); if (now !== out) node.data = out;
  }
  function doAttr(el, name) {
    const v = el.getAttribute(name); if (v == null) return;
    let map = attrs.get(el); const rec = map && map[name];
    const en = rec && v === rec.out ? rec.en : v; const out = translate(en, lang);
    if (out === en) { if (rec) { delete map[name]; if (v === rec.out) el.setAttribute(name, en); } return; }
    if (!map) attrs.set(el, map = {}); map[name] = { en, out }; if (v !== out) el.setAttribute(name, out);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root)) doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP.has(root.nodeName) || skipped(root)) return; for (const a of ATTRS) doAttr(root, a); }
    for (let c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  function run(fn) { busy = true; try { fn(); } finally { busy = false; if (obs) obs.takeRecords(); } }
  function onMutations(list) {
    if (busy) return;
    run(() => {
      for (const m of list) {
        if (m.type === 'characterData') { if (!skipped(m.target)) doText(m.target); }
        else if (m.type === 'attributes') { if (!skipped(m.target)) doAttr(m.target, m.attributeName); }
        else for (const n of m.addedNodes) walk(n);
      }
    });
  }
  const api = {
    get lang() { return lang; },
    t: (s) => translate(s, lang),
    set(next) {
      lang = next === 'fr' ? 'fr' : 'en';
      if (doc.documentElement) doc.documentElement.lang = lang;
      run(() => walk(doc.body || doc));
    },
    start() {
      api.set(lang);
      if (Observer && !obs) { obs = new Observer(onMutations); obs.observe(doc.body || doc, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); }
      return api;
    },
    src(el) { // the element's text in English
      if (!el) return '';
      let s = ''; const go = (n) => { if (n.nodeType === 3) { const r = texts.get(n); s += r && n.data === r.out ? r.en : n.data; } else for (let c = n.firstChild; c; c = c.nextSibling) go(c); };
      go(el); return s;
    },
    flush() { if (obs) onMutations(obs.takeRecords()); },
  };
  return api;
}
