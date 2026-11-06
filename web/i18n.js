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
// joined by " · " or " — " is its own phrase or pattern, so the line is French only when every part is. Slice 3: the cards —
// Game over (its top line, the title, how the game went, the record, the rating, the next opponent offered), Mama Ngozi's
// review (the card line and each step, her lines in it), the puzzle's result, the lesson's end, Home's record and rating
// lines, and the words that are shared (the result, the puzzle, the clip's caption), which game.js passes through t().
// Slice 4: the opponents' own words (SAYS, SAYS_N) — every line in web/characters.js, their runs, their bios and Mama
// Ngozi's take. Slice 5 (web/i18n-rooms.js): playing a friend — the Rooms screen, the door, the shouts, taking back, giving
// up, the call, block and report, the server's answers, the away titles and the invite (game.js and away.js pass the words that
// leave the page through t()) — and the store's rows, the purchases' toasts, the reminder (its notification too) and the
// first game's tips.

import { FR_ROOMS, roomPatterns } from './i18n-rooms.js';

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
  // Play keeps your game (web/keepgame.js): Play asks once while a game is under way
  'New game?': 'Nouvelle partie\u00a0?',
  'Start a new game? Your game in progress ends — tap again to start one, or Continue to keep it': 'Commencer une nouvelle partie\u00a0? La partie en cours s’arrête — touchez encore pour en commencer une, ou Continuer pour la garder',
  'Start a new game? Your game in progress ends — press again to start one, or Continue to keep it': 'Commencer une nouvelle partie\u00a0? La partie en cours s’arrête — appuyez encore pour en commencer une, ou Continuer pour la garder',
  // Back goes back (web/backnav.js): a back gesture in a room stays in it
  'Back keeps you in the room — Home leaves it': 'Retour vous garde dans la salle — Accueil la quitte',
  'Watch the whole game:': 'Regarder toute la partie\u00a0:',
  'That game link could not be read': 'Impossible de lire le lien de cette partie',
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
  'where it turned': 'là où la partie a basculé',
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
  "from today's puzzle": 'depuis l’énigme du jour',
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
  'coming': 'bientôt', // a Gold line not built yet (the store's Gold card)
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
  'Sow on the first tap': 'Semer au premier toucher',
  'for players who know the board: one tap or click on your pit sows it at once, with no marks first; Hint still picks its pit and shows where it goes': 'pour qui connaît le plateau : un toucher ou un clic sur votre trou le sème tout de suite, sans marques d’abord ; l’Indice choisit toujours son trou et montre où il va',
  'with the marks: after your first tap, an ember ring round each pit their best answer could take, and how many seeds, before you sow': 'avec les marques : après votre premier toucher, un anneau braise autour de chaque trou que sa meilleure réponse pourrait prendre, et combien de graines, avant de semer',
  "Mama Ngozi's take": 'L’avis de Mama Ngozi',
  'after your move against the computer, if a clearly better pit was there she says which one under the board; tap it to see that move play through': 'après votre coup contre l’ordinateur, si un trou nettement meilleur existait, elle dit lequel sous le plateau ; touchez pour voir ce coup se jouer',
  'Keep the screen on': 'Garder l’écran allumé',
  'A newer version is ready · tap to update': 'Une nouvelle version est prête · touchez pour mettre à jour',
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
  'Battery saver': 'Économie de batterie',
  'when the battery is low the board draws less and seeds fly straight, back to full on the charger ·': 'quand la batterie est faible, le plateau dessine moins et les graines volent droit ; tout revient sur le chargeur ·',
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
  'Word size': 'Taille des mots',
  'Double-tap the wood to set the board straight': 'Touchez deux fois le bois pour remettre le plateau droit',
  'Double-click the wood, or press 0, to set the board straight': 'Double-cliquez sur le bois (ou la touche 0) pour remettre le plateau droit',
  'Large': 'Grande',
  'Larger': 'Plus grande',
  'the hints, the lines under the board, the cards and Settings': 'les indices, les lignes sous le plateau, les cartes et les Réglages',
  'as drawn': 'telle quelle',
  'a little bigger': 'un peu plus grande',
  'bigger still': 'plus grande encore',
  'Words as drawn': 'Mots à leur taille',
  'Bigger words': 'Mots plus grands',
  'Bigger words still': 'Mots plus grands encore',
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
  'Not now': 'Pas maintenant',
  'Let in': 'Faire entrer',
  'Take it back?': 'Reprendre le coup ?',
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
  'Battery low — the board is going easy on it': 'Batterie faible — le plateau la ménage',
  'The board is coming back…': 'Le plateau revient…',
  'The phone took the board away for a moment': 'Le téléphone a retiré le plateau un instant',
  "The board didn't come back by itself": 'Le plateau n’est pas revenu tout seul',
  'Your game is kept — this opens it again where you left it': 'Votre partie est gardée — elle reprend là où vous l’avez laissée',
  'Bring the board back': 'Faire revenir le plateau',
  'The board is back': 'Le plateau est revenu',
  'Charging — the board is back to full': 'En charge — le plateau revient au complet',
  'Battery back up — the board is back to full': 'La batterie remonte — le plateau revient au complet',
  'Seeds fly straight to their pit': 'Les graines volent droit dans leur trou',
  'Player 1': 'Joueur 1',
  'Our names': 'Nos noms',
  "Player 1's name": 'Nom du joueur 1',
  "Player 2's name": 'Nom du joueur 2',
  'two of us: the names on the cards, the turn and the Game over card · kept on this phone': 'à deux : les noms sur les cartes, au tour de jeu et en fin de partie · gardés sur ce téléphone',
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
  'played last': 'joué en dernier',
  "Tomorrow's puzzle is here · tap to play it": 'La nouvelle énigme est là · touchez pour y jouer',
  "Under a minute left to solve today's": 'Moins d’une minute pour résoudre celle du jour',
  'empty': 'vide',
  'picks up again once': 'reprend une fois',
  'a grand slam takes nothing': 'un grand chelem ne prend rien',
  'Grand slam: that was every seed they have, so nothing is taken': 'Grand chelem : c’était toutes les graines de l’autre côté, alors rien n’est pris',
  'Grand slam: that was every seed you have, so nothing is taken': 'Grand chelem : c’était toutes vos graines, alors rien n’est pris',
  'In Ayo a move that would take every seed on the other side takes nothing. Leave them a seed, or take less.': 'À l’Ayo, un coup qui prendrait toutes les graines de l’autre côté ne prend rien. Laissez-leur une graine, ou prenez moins.',
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
  'Setting up the board — four seeds to each pit': 'On met le plateau en place — quatre graines par trou',  // setting up the board (web/deal.js)
  'setting up…': 'met en place…',
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
  'click to sow it': 'cliquez pour le semer',
  'the loser goes first': 'le perdant joue en premier',
  'after a draw, the other side goes first': 'après un match nul, l’autre côté commence',
  'You start': 'Vous commencez',
  'pass the phone after each move': 'passez le téléphone après chaque coup',
  'Player 1 this end · Player 2 across the table': 'Joueur 1 de ce côté · Joueur 2 en face',
  'Player 1 this end': 'Joueur 1 de ce côté',
  'Player 2 across the table': 'Joueur 2 en face',
  'A pale ring: those seeds go to their trough, not yours — a pit on their side that makes 4 before your last seed is theirs. Only your last seed takes a 4 over there.': 'Un anneau pâle : ces graines vont dans la réserve d’en face, pas dans la vôtre — un trou de son côté qui fait 4 avant votre dernière graine est à lui. Seule votre dernière graine prend un 4 là-bas.',
  'A pale ring: those seeds go to their trough, not yours.': 'Un anneau pâle : ces graines vont dans la réserve d’en face, pas dans la vôtre.',
  // the lesson
  // Ayo's own lesson (idea 6 Nov)
  'A capture of 2 or 3': 'Une prise de 2 ou 3',
  'The sweep back': 'Le balayage en arrière',
  'The lit pit is yours. Tap it: the hand drops one seed in each pit, anticlockwise — the brass marks show where.': 'Le trou éclairé est à vous. Touchez-le : la main dépose une graine dans chaque trou, dans le sens inverse des aiguilles d’une montre — les marques de laiton montrent où.',
  'One seed in each pit, and the turn ends where the last seed falls — even on seeds. In Ayo the hand never picks up again.': 'Une graine dans chaque trou, et le tour s’arrête là où tombe la dernière graine — même sur des graines. À l’Ayo, la main ne reprend jamais.',
  'Its last seed lands in their pit of 1 and makes it 2. Your last seed making a 2 or a 3 on their side wins it. Tap the lit pit.': 'Sa dernière graine tombe dans un trou d’en face qui en a 1 et en fait 2. Votre dernière graine qui fait 2 ou 3 de son côté le gagne. Touchez le trou éclairé.',
  '+2 in your trough. Only your last seed takes, only on their side, and only when it makes 2 or 3.': '+2 dans votre réserve. Seule votre dernière graine prend, seulement de son côté, et seulement quand elle fait 2 ou 3.',
  'Its last seed makes their pit a 3, and the pit behind it is a 2 now too: the hand sweeps back and takes both. Tap the lit pit.': 'Sa dernière graine fait 3 dans un trou d’en face, et le trou d’avant fait 2 maintenant aussi : la main balaie en arrière et prend les deux. Touchez le trou éclairé.',
  '+5: both pits are yours. But a move that would take every seed they have takes nothing. First to 25 seeds wins. That is Ayo.': '+5 : les deux trous sont à vous. Mais un coup qui prendrait toutes les graines d’en face ne prend rien. Le premier à 25 graines gagne. C’est ça, l’Ayo.',
  'Sowing, a capture of 2 or 3 and the sweep back: that is most of the game.': 'Semer, prendre un 2 ou un 3 et balayer en arrière : c’est presque tout le jeu.',
  'a one-minute lesson on the board: sowing, a capture of 2 or 3, the sweep back': 'une leçon d’une minute sur le plateau : semer, prendre un 2 ou un 3, balayer en arrière',
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
  // the cards (slice 3): Game over, how the game went, the record, the rating, the review, the puzzle's result, the lesson's end
  'You gave up': 'Vous avez abandonné',
  'you gave up': 'vous avez abandonné',
  'Level the whole way': 'À égalité tout du long',
  'Level at the end': 'À égalité à la fin',
  'every move as she would have played it': 'chaque coup comme elle l’aurait joué',
  'one move she would have played differently': 'un coup qu’elle aurait joué autrement',
  'in Gold': 'dans Gold',
  'Nothing captured': 'Rien de pris',
  '1 day': '1 jour',
  'Reminder on': 'Rappel activé',
  'about a minute': 'environ une minute',
  'Learn Nchò · done': 'Apprendre le Nchò · terminé',
  'Learn Ayo · done': 'Apprendre l’Ayo · terminé',
  'One move. Your pits are on the right. 2s and 3s behind your last seed count too.': 'Un seul coup. Vos trous sont à droite. Les 2 et les 3 derrière votre dernière graine comptent aussi.',
  'Ayo & Nchò daily': 'Ayo & Nchò, l’énigme du jour',
  'Sit. We go over it together.': 'Asseyez-vous. On la revoit ensemble.',
  'Let us count it again, slowly.': 'Recomptons-la, lentement.',
  'Every seed has a reason. Look.': 'Chaque graine a sa raison. Regardez.',
  'Nothing to change. I would have played it the same.': 'Rien à changer. Je l’aurais jouée pareil.',
  'That is all. Next game, count twice.': 'C’est tout. À la prochaine partie, comptez deux fois.',
};
export const OVERLAP = Object.keys(FR_ROOMS).filter((k) => Object.prototype.hasOwnProperty.call(FR, k)); // test/i18n-rooms.test.js: none
Object.assign(FR, FR_ROOMS); // slice 5
// The opponents' own words (slice 4): every line in web/characters.js and Mama Ngozi's take (web/coach.js), each in the voice
// it has in English. Adaeze (a child) and Nnamdi (your cousin) say tu; the three elders — Auntie Bisi the teacher, Mama Ngozi
// and Papa Ike — say vous, as Mama Ngozi already does in her review. Speakers keep their own gender (Adaeze and Mama Ngozi
// "battue", Papa Ike "battu"); the player's is never assumed. Nnamdi's "chop" is "manger", the word awalé players use.
const SAYS = {
  // Adaeze
  'Nine years old and already sure she is winning.': 'Neuf ans, et déjà sûre de gagner.',
  'Me first? No, you first. Go!': 'Moi d’abord ? Non, toi d’abord. Vas-y !',
  'I will be gentle. Maybe.': 'Je vais être gentille. Peut-être.',
  'Mine! All mine!': 'À moi ! Tout à moi !',
  'Did you see that? Four!': 'Tu as vu ça ? Quatre !',
  'Hehe. Thank you.': 'Hihi. Merci.',
  'Ah ah, that one was mine!': 'Ah ah, celui-là était à moi !',
  'Not fair. OK, fair.': 'Pas juste. Bon, d’accord, juste.',
  'I was keeping those!': 'Je les gardais, celles-là !',
  'Heh, no take-backs… fine.': 'Hé, on ne reprend pas… bon, d’accord.',
  'I saw that.': 'J’ai vu, hein.',
  'I won! Can we play again?': 'J’ai gagné ! On rejoue ?',
  'Told you I was winning.': 'Je t’avais dit que je gagnais.',
  'Again! One more!': 'Encore ! Une autre !',
  'You only won because I let you.': 'Tu as gagné seulement parce que je t’ai laissé faire.',
  'You beat me?! OK. Again, again!': 'Tu m’as battue ?! OK. Encore, encore !',
  'Last eight! Whoever catches next gets them ALL.': 'Les huit dernières ! Celui qui prend ensuite les a TOUTES.',
  'Ooh, the last ones. Mine, mine, mine.': 'Oh, les dernières. À moi, à moi, à moi.',
  'Round and round! Somebody catch something!': 'On tourne, on tourne ! Quelqu’un, prenez quelque chose !',
  'Are we just going in circles?': 'On tourne juste en rond ?',
  "Three in a row? I'm telling Mama.": 'Trois d’affilée ? Je vais le dire à Maman.',
  'Five! Are you magic?': 'Cinq ! Tu es magique ?',
  'Three for me! Hehe.': 'Trois pour moi ! Hihi.',
  "Five! I'm the champion of everything.": 'Cinq ! Je suis la championne de tout.',
  // Auntie Bisi
  'Teaches at the primary school. Counts every pit twice, and makes you count it too.': 'Institutrice à l’école primaire. Elle compte chaque trou deux fois, et vous le fait compter aussi.',
  'Sit up straight. We count before we sow.': 'Redressez-vous. On compte avant de semer.',
  'Pencils down. Your move, and no rushing.': 'Crayons posés. À vous, et sans vous presser.',
  'Four. Now you see why we count.': 'Quatre. Vous voyez pourquoi on compte.',
  'Mm. Write that one down.': 'Mm. Notez celle-là.',
  'Thank you. Next.': 'Merci. Suivant.',
  'Very good. That was well counted.': 'Très bien. C’était bien compté.',
  'Ah. A star for you.': 'Ah. Une étoile pour vous.',
  'I saw that coming. Too late.': 'Je l’ai vu venir. Trop tard.',
  'Correction is allowed. Once.': 'On a droit à une correction. Une seule.',
  'Rub it out, then. Neatly.': 'Effacez, alors. Proprement.',
  'Homework: count to four, carefully.': 'Devoir : compter jusqu’à quatre, soigneusement.',
  'Well tried. Again tomorrow.': 'Bien essayé. On recommence demain.',
  'Excellent. Top of the class.': 'Excellent. En tête de la classe.',
  'You were listening after all.': 'Vous écoutiez, finalement.',
  'Well done! I knew you could. Now Nnamdi.': 'Bravo ! Je savais que vous y arriveriez. Maintenant, Nnamdi.',
  'Eight left. Count them, every one.': 'Il en reste huit. Comptez-les, toutes.',
  'The last eight. Concentrate, please.': 'Les huit dernières. Concentrez-vous, s’il vous plaît.',
  'We are going round in circles. Somebody take something.': 'Nous tournons en rond. Que quelqu’un prenne quelque chose.',
  'Round and round. Think, class.': 'On tourne, on tourne. Réfléchissez, la classe.',
  'Three in a row. You have been practising.': 'Trois d’affilée. Vous avez travaillé, ça se voit.',
  'Five! I am telling your mother — good news, this time.': 'Cinq ! Je le dirai à votre mère — une bonne nouvelle, cette fois.',
  'Three for me. Count slower.': 'Trois pour moi. Comptez plus lentement.',
  'Five. We will go over it again.': 'Cinq. Nous allons revoir la leçon.',
  // Nnamdi
  'Your quick cousin. Talks more than he plans, plans more than you think.': 'Votre cousin vif. Il parle plus qu’il ne calcule, et calcule plus que vous ne croyez.',
  "Relax, I'll go easy. Small small.": 'Détends-toi, j’y vais doucement. Petit à petit.',
  'Loser carries the board.': 'Le perdant porte le plateau.',
  "Chop. That's how we do it.": 'Je mange. C’est comme ça qu’on fait.',
  'Four seeds, no stress.': 'Quatre graines, pas de stress.',
  'You left that one open, o.': 'Tu as laissé celui-là ouvert, oh.',
  'Ehn? Who taught you that?': 'Hein ? Qui t’a appris ça ?',
  'OK… OK. I see you.': 'OK… OK. Je te vois venir.',
  'That was my pit!': 'C’était mon trou !',
  'Undo? In Lagos we call that a loan.': 'Annuler ? À Lagos, on appelle ça un prêt.',
  "I'll allow it. Once.": 'Je te l’accorde. Une fois.',
  'Cousin, I warned you.': 'Cousin, je t’avais prévenu.',
  'GG. Buy me suya.': 'GG. Tu me payes le suya.',
  'Best of three. Obviously.': 'En deux manches gagnantes. Évidemment.',
  'My phone was lagging.': 'Mon téléphone ramait.',
  'Fine. That one counts. Barely.': 'Bon. Celle-là compte. De justesse.',
  'Last eight, cousin. Next chop takes everything.': 'Les huit dernières, cousin. Le prochain qui mange prend tout.',
  'Small seeds left. Big stakes.': 'Peu de graines. Gros enjeu.',
  'We are just going round, cousin. Somebody chop.': 'On ne fait que tourner, cousin. Que quelqu’un mange.',
  'This one is a merry-go-round.': 'C’est un manège, cette partie.',
  'Three straight? Who have you been practising with?': 'Trois de suite ? Avec qui tu t’entraînes ?',
  "Five in a row. OK, I'm actually trying now.": 'Cinq d’affilée. OK, là je joue pour de vrai.',
  'Three–zero. Suya is on you.': 'Trois–zéro. Le suya, c’est pour toi.',
  "Five. I'm not even looking at the board.": 'Cinq. Je ne regarde même pas le plateau.',
  // Mama Ngozi
  'Thirty years at the market, ten thousand games on the same board.': 'Trente ans au marché, dix mille parties sur le même plateau.',
  'Sit well. This will take a while.': 'Asseyez-vous bien. Ça va prendre un moment.',
  'I have seen that opening before.': 'J’ai déjà vu cette ouverture.',
  'Patience is a seed too.': 'La patience aussi est une graine.',
  'You counted. You just counted wrong.': 'Vous avez compté. Vous avez juste mal compté.',
  'Mm-hm.': 'Mm-hm.',
  'Good. Now do it twice.': 'Bien. Maintenant, refaites-le.',
  'I gave you that one.': 'Celui-là, je vous l’ai donné.',
  'Noted.': 'Noté.',
  'Undo all you like, child.': 'Annulez tant que vous voulez, mon enfant.',
  'The board remembers.': 'Le plateau se souvient.',
  'Come back when you have practised.': 'Revenez quand vous aurez appris.',
  'The board does not lie.': 'Le plateau ne ment pas.',
  'Well played. I mean it.': 'Bien joué. Je le pense.',
  'Hm. I taught you too well.': 'Hm. Je vous ai trop bien appris.',
  'So. You finally beat me. Once.': 'Alors. Vous m’avez enfin battue. Une fois.',
  'Eight left. Now we see who counts.': 'Il en reste huit. On va voir qui sait compter.',
  'The last seeds. Sit up.': 'Les dernières graines. Redressez-vous.',
  'Round and round. Someone must count.': 'On tourne, on tourne. Il faut que quelqu’un compte.',
  'The seeds are walking in circles. So are you.': 'Les graines tournent en rond. Vous aussi.',
  'Three in a row? Mama Ngozi is watching.': 'Trois d’affilée ? Mama Ngozi vous a à l’œil.',
  'Five. Now the market will talk.': 'Cinq. Maintenant, le marché va en parler.',
  'Three. Come back when the seeds listen to you.': 'Trois. Revenez quand les graines vous écouteront.',
  'Five. Sit well; we are not finished.': 'Cinq. Asseyez-vous bien ; nous n’avons pas fini.',
  // her take, once a game across the board from her (web/coach.js)
  'It was sitting right there.': 'C’était juste là, sous vos yeux.',
  'Count again. Slowly.': 'Recomptez. Lentement.',
  'The seeds were telling you.': 'Les graines vous le disaient.',
  'That one ended it. You walked past it.': 'Celui-là finissait la partie. Vous l’avez laissé passer.',
  'The game was yours. Was.': 'La partie était à vous. Était.',
  'That pit was the way out.': 'Ce trou-là, c’était la sortie.',
  'Still breathing — only just.': 'Encore en vie — de justesse.',
  // Papa Ike
  "Mama Ngozi's old rival. They have not spoken since the final of 1987.": 'Le vieux rival de Mama Ngozi. Ils ne se parlent plus depuis la finale de 1987.',
  'Sit. Count. Then count again.': 'Asseyez-vous. Comptez. Puis recomptez.',
  'Your move. Take your time; I have mine.': 'À vous. Prenez votre temps ; j’ai le mien.',
  'Mama Ngozi sent you? Hm.': 'C’est Mama Ngozi qui vous envoie ? Hm.',
  'Seen from far away.': 'Vu de loin.',
  'That was decided six moves ago.': 'Ça s’est décidé il y a six coups.',
  'Mm.': 'Mm.',
  'A fair price.': 'Un prix honnête.',
  'Good. You are seeing further.': 'Bien. Vous voyez plus loin.',
  'I lent you that. I will collect.': 'Je vous l’ai prêté. Je viendrai le reprendre.',
  'Take it back. The board will wait.': 'Reprenez-le. Le plateau attendra.',
  'Once more, then. Slowly.': 'Encore une fois, alors. Lentement.',
  'The seeds go where they are sent.': 'Les graines vont où on les envoie.',
  'Come back next week. Bring Mama Ngozi.': 'Revenez la semaine prochaine. Amenez Mama Ngozi.',
  'So. The young ones count now.': 'Alors. Les jeunes savent compter, maintenant.',
  'Well played. Tell nobody at the market.': 'Bien joué. N’en dites rien au marché.',
  'Ah. You beat me. Mama Ngozi must never hear of it.': 'Ah. Vous m’avez battu. Mama Ngozi ne doit jamais l’apprendre.',
  'Eight seeds. Everything was for this.': 'Huit graines. Tout était pour ça.',
  'The last eight. I have been waiting.': 'Les huit dernières. Je les attendais.',
  'We walk in circles. One of us will tire first.': 'Nous tournons en rond. L’un de nous se lassera le premier.',
  'Round we go. I am not tired.': 'On tourne. Je ne suis pas fatigué.',
  'Three. I will have to think now.': 'Trois. Il va falloir que je réfléchisse.',
  'Five. They will write songs. Short ones.': 'Cinq. On écrira des chansons. Des courtes.',
  'Three. Patience, my child.': 'Trois. Patience, mon enfant.',
  'Five. Sit with the board a while.': 'Cinq. Restez un moment avec le plateau.',  // waiting on you (web/waiting.js): what each of them says when you have been thinking a while
  'Hurry up! My turn is getting cold.': 'Dépêche-toi ! Mon tour refroidit.',
  'Are you asleep? Wake up!': 'Tu dors ? Réveille-toi !',
  "I can wait. I can't wait. Play!": 'Je peux attendre. Non, je ne peux pas. Joue !',
  'Take your time. Count it twice.': 'Prenez votre temps. Comptez deux fois.',
  'I can see you counting. Good.': 'Je vous vois compter. C’est bien.',
  'No rush. Wrong answers are quick.': 'Rien ne presse. Les mauvaises réponses viennent vite.',
  'Cousin, today abeg.': 'Cousin, aujourd’hui, s’il te plaît.',
  'Are you counting or praying?': 'Tu comptes ou tu pries ?',
  'My suya is getting cold, o.': 'Mon suya refroidit, o.',
  'I have sold yams faster than this.': 'J’ai vendu des ignames plus vite que ça.',
  'Count. I will wait.': 'Comptez. J’attendrai.',
  'The seeds are not going anywhere.': 'Les graines ne vont nulle part.',
  'Think. The board will wait for you.': 'Réfléchissez. Le plateau vous attendra.',
  'Good. The slow ones count further.': 'Bien. Les lents comptent plus loin.',
  "I waited eleven years for Mama Ngozi's move. Go on.": 'J’ai attendu onze ans un coup de Mama Ngozi. Allez-y.',
  // the time of day and coming back (web/greet.js)
  "Good morning! I had my breakfast already. Go!": "Bonjour ! J’ai déjà pris mon petit-déjeuner. Vas-y !",
  "After school is the best time for seeds. Go!": "Après l’école, c’est l’heure des graines. Vas-y !",
  "One game before my bath. Quick!": "Une partie avant mon bain. Vite !",
  "Mummy says I should be asleep. Shh. Play!": "Maman dit que je devrais dormir. Chut. Joue !",
  "Finally! I practised the whole time you were gone.": "Enfin ! Je me suis entraînée tout le temps de ton absence.",
  "Ẹ káàárọ̀. Good morning, class. We count before we sow.": "Ẹ káàárọ̀. Bonjour, la classe. On compte avant de semer.",
  "Ẹ káàsán. Sit up; the afternoon makes us lazy.": "Ẹ káàsán. Redressez-vous ; l’après-midi rend paresseux.",
  "Ẹ káalẹ́. One game, then homework.": "Ẹ káalẹ́. Une partie, puis les devoirs.",
  "At this hour? Very well. Quietly.": "À cette heure-ci ? Très bien. Doucement.",
  "Ah, there you are. We will revise what we learnt.": "Ah, vous voilà. Nous allons réviser ce que nous avons appris.",
  "Ụtụtụ ọma, cousin. Early chop is the best chop.": "Ụtụtụ ọma, cousin. La prise du matin est la meilleure.",
  "Afternoon game? I'm supposed to be working, o.": "Une partie l’après-midi ? Je suis censé travailler, o.",
  "Mgbede ọma. Evening seeds, after the traffic.": "Mgbede ọma. Les graines du soir, après les embouteillages.",
  "This hour? You can't sleep either, abi?": "À cette heure-ci ? Toi non plus, tu ne dors pas, abi ?",
  "Ehen! Where have you been? The board missed you.": "Ehen ! Tu étais où ? Le plateau s’ennuyait de toi.",
  "Ụtụtụ ọma. The market can wait one game.": "Ụtụtụ ọma. Le marché peut attendre une partie.",
  "Ehihie ọma. Sit in the shade and count.": "Ehihie ọma. Asseyez-vous à l’ombre et comptez.",
  "Mgbede ọma. The market is closed; the board is open.": "Mgbede ọma. Le marché est fermé ; le plateau est ouvert.",
  "Still awake? The seeds do not sleep either.": "Encore debout ? Les graines ne dorment pas non plus.",
  "So, you remembered the board. Sit well.": "Alors, vous vous souvenez du plateau. Asseyez-vous bien.",
  "Good morning. A clear head counts further.": "Bonjour. Une tête claire compte plus loin.",
  "The heat of the day. Count slowly.": "La chaleur du jour. Comptez lentement.",
  "Good evening. The best games are played after dark.": "Bonsoir. Les meilleures parties se jouent à la nuit tombée.",
  "Late games. Mama Ngozi and I once played till dawn.": "Les parties tardives. Mama Ngozi et moi avons joué une fois jusqu’à l’aube.",
  "The board waited. So did I.": "Le plateau a attendu. Moi aussi.",
};
// the runs of 10, 15, 20… (each opponent's `more(n)`): {n} is the run
const SAYS_N = [
  ["{n} in a row. I give up. No I don't.", '{n} d’affilée. J’abandonne. Non, en fait non.'],
  ['{n}! Are you letting me win?', '{n} ! Tu me laisses gagner ?'],
  ['{n} in a row. Time I moved you up a class.', '{n} d’affilée. Il est temps de vous faire passer dans la classe supérieure.'],
  ['{n}. Patience. Counting is a habit.', '{n}. Patience. Compter, c’est une habitude.'],
  ['{n} in a row. Cousin, leave something for me.', '{n} d’affilée. Cousin, laisse-moi quelque chose.'],
  ['{n} and counting. Buy a bigger board.', '{n} et ça continue. Achète un plus grand plateau.'],
  ['{n} in a row. The board is yours. For now.', '{n} d’affilée. Le plateau est à vous. Pour l’instant.'],
  ['{n}. I am not counting. You are.', '{n}. Moi, je ne compte pas. Vous, si.'],
  ['{n} in a row. I am taking notes.', '{n} d’affilée. Je prends des notes.'],
  ['{n}. The board is a slow teacher.', '{n}. Le plateau est un maître patient.'],
];
Object.assign(FR, SAYS);
// French sets a thin space before : ; ? ! so they never start a line
for (const k in FR) FR[k] = FR[k].replace(/ ([:;?!])/g, '\u00a0$1');
// names and words that stay as they are when a line is put together from parts
// the names two players typed for two of us (web/local.js, Settings → Opponent → Our names): kept as they are, like the opponents'
const TYPED = new Set();
export function keepTyped(names = []) { TYPED.clear(); for (const n of names) if (n && !Object.prototype.hasOwnProperty.call(FR, n)) TYPED.add(n); }
const kept = (p) => KEEP.has(p) || TYPED.has(p);
const KEEP = new Set(['Adaeze', 'Auntie Bisi', 'Nnamdi', 'Mama Ngozi', 'Papa Ike', 'Nchò', 'Ayo', 'Gold', 'Tete', 'Player', 'Iroko']);
const LOOK_FR = { 'river stones': 'les galets', 'benin bronze': 'le bronze du Bénin', "grandpa's board": 'le plateau de grand-père', cowries: 'les cauris', 'palm kernels': 'les noix de palme' };
const look = (s) => LOOK_FR[s.toLowerCase()] || s;
// a look named in a sentence: "Les cauris sont à vous", "pour le bronze du Bénin"; a wood, Gold and the bundle by their own name
const item = (s, inside = false) => { const l = LOOK_FR[s.toLowerCase()]; const r = l || FR[s] || s; return inside || !l ? r : cap(r); };

const DAYS = { Mon: 'lun.', Tue: 'mar.', Wed: 'mer.', Thu: 'jeu.', Fri: 'ven.', Sat: 'sam.', Sun: 'dim.' };
const MONTHS = { Jan: 'janv.', Feb: 'févr.', Mar: 'mars', Apr: 'avr.', May: 'mai', Jun: 'juin', Jul: 'juil.', Aug: 'août', Sep: 'sept.', Oct: 'oct.', Nov: 'nov.', Dec: 'déc.' };
const lv = (s) => LEVELS[s] || s;
const pl = (n, one, many) => `${n} ${n === '1' ? one : many}`;
const OPPS = 'Adaeze|Auntie Bisi|Nnamdi|Mama Ngozi|Papa Ike';
const at = (g) => (g === 'Ayo' ? 'à l’Ayo' : 'au Nchò');
// the battery saver's reasons (web/battery.js)
const batteryReasonFr = (r) => { const m = /^battery at (\d+)%$/.exec(r); if (m) return `batterie à ${m[1]} %`; return { charging: 'en charge', 'chosen in Settings': 'choisi dans les Réglages', 'asked for in the address': 'demandé dans l’adresse', 'this browser cannot tell': 'ce navigateur ne le dit pas' }[r] || r; };
const who = (s) => FR[s] || s; // a name stays a name; "Player 2" becomes "Joueur 2"
const ROOMS = roomPatterns({ who, item, need: (s) => need(s) });
// Lines built from parts: [the English shape, its French]. Each part goes through translate again.
const spanFr = (w) => w === 'under a minute' ? 'moins d’une minute' : w; // "5 h 12 min" reads the same in French
export const PATTERNS = [
  // the next puzzle (web/nextday.js): "5 h 12 min", "42 min", "under a minute" keep their numbers
  [/^Next puzzle in (\d+ h(?: \d+ min)?|\d+ min|under a minute)$/, (m) => `Prochaine énigme dans ${spanFr(m[1])}`],
  [/^(\d+ h(?: \d+ min)?|\d+ min) left to solve today's$/, (m) => `Encore ${spanFr(m[1])} pour résoudre celle du jour`],
  [/^Play it out vs (.+)$/, (m) => `Jouer la suite contre ${who(m[1])}`], // play it out from the daily puzzle (web/playout.js)
  [/^Playing it out from today's puzzle — (.+)'s move$/, (m) => `La partie continue depuis l’énigme du jour — à ${who(m[1])} de jouer`],
  [/^Ayo & Nchò — played out from today's puzzle, I (beat|drew with|lost to) (.+?) (\d+)–(\d+)\.$/, (m) => `Ayo & Nchò — en jouant la suite de l’énigme du jour, ${{ beat: 'j’ai battu', 'drew with': 'j’ai fait match nul avec', 'lost to': 'j’ai perdu contre' }[m[1]]} ${who(m[2])} ${m[3]}–${m[4]}.`],
  // try again from where it turned (web/retry.js)
  [/^Try again from move (\d+)$/, (m) => `Rejouer depuis le coup ${m[1]}`],
  [/^Back to move (\d+), where it turned$/, (m) => `Retour au coup ${m[1]}, là où la partie a basculé`],
  [/^from move (\d+) of your last game$/, (m) => `depuis le coup ${m[1]} de votre dernière partie`],
  [/^(last|this) time (\d+)–(\d+)$/, (m) => `${m[1] === 'last' ? 'la dernière fois' : 'cette fois'} ${m[2]}–${m[3]}`],
  [/^Ayo & Nchò — I went back to move (\d+) of a game I lost (\d+)–(\d+) to (.+?): (this time I won|this time a draw,|I lost again,) (\d+)–(\d+)\.$/, (m) => `Ayo & Nchò — je suis revenu au coup ${m[1]} d’une partie perdue ${m[2]}–${m[3]} contre ${who(m[4])} : ${{ 'this time I won': 'cette fois j’ai gagné', 'this time a draw,': 'cette fois match nul,', 'I lost again,': 'perdu encore,' }[m[5]]} ${m[6]}–${m[7]}.`],
  ...ROOMS.slice(0, -1), // slice 5: playing a friend, the store, the reminder (before the store lines below, which would catch "… in the store")
  [/^vs (.+?) · (Easy|Steady|Medium|Hard|Master)(?: · (.+) starts)?$/, (m) => `contre ${m[1]} · ${lv(m[2])}` + (m[3] ? ` · ${who(m[3])} commence` : '')],
  [/^(.+?) · (Easy|Steady|Medium|Hard|Master)$/, (m) => `${need(m[1])} · ${lv(m[2])}`],
  [/^([^·—:]+?) starts · on this phone$/, (m) => `${who(m[1])} commence · sur ce téléphone`],
  [/^(.+) starts — the loser goes first$/, (m) => `${who(m[1])} commence — le perdant joue en premier`],
  [/^([^·—:]+?) wins$/, (m) => `${who(m[1])} gagne`],
  [/^Play again — (.+) is ready$/, (m) => `Rejouer — ${m[1]} est prêt`],
  [/^(Nchò|Ayo) · (\d+) moves?$/, (m) => `${m[1]} · ${m[2]} coup${m[2] === '1' ? '' : 's'}`],
  [/^(\d+) to win$/, (m) => `${m[1]} pour gagner`], // the race to 25 under a score (web/race.js)
  [/^(\d+) seeds?$/, (m) => `${m[1]} graine${m[1] === '1' ? '' : 's'}`],
  [/^now (lighter|full) \((.+?)\)(?: · (.+))?$/, (m) => `${m[1] === 'lighter' ? 'allégé' : 'complet'} en ce moment (${m[2]})` + (m[3] ? ' · ' + m[3] : '')],
  [/^now (saving|full) \((.+?)\)$/, (m) => `${m[1] === 'saving' ? 'en économie' : 'au complet'} en ce moment (${batteryReasonFr(m[2])})`],
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
  [/^would take all (\d+) (they|you) have$/, (m) => (m[2] === 'they' ? `prendrait les ${m[1]} graines de l’autre côté` : `prendrait vos ${m[1]} graines`)],
  [/^would have taken all (\d+) (they|you) had$/, (m) => (m[2] === 'they' ? `aurait pris les ${m[1]} graines de l’autre côté` : `aurait pris vos ${m[1]} graines`)],
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
  [/^Learn Ayo · (\d+) of (\d+)$/, (m) => `Apprendre l’Ayo · ${m[1]} sur ${m[2]}`],
  [/^([^·—:]+?) sows one of hers…$/, (m) => `${m[1]} sème un des siens…`],
  // the cards (slice 3)
  [/^(\d+) moves?$/, (m) => pl(m[1], 'coup', 'coups')],
  [/^(Easy|Steady|Medium|Hard|Master)$/, (m) => lv(m[1])],
  [/^([^·—:]+?) gave up$/, (m) => `${who(m[1])} a abandonné`],
  [/^([^·—:]+?) gave up after move (\d+)$/, (m) => (m[1] === 'you' ? 'vous avez abandonné' : `${who(m[1])} a abandonné`) + ` après le coup ${m[2]}`],
  [/^([^·—:]+?) led from the start$/, (m) => (m[1] === 'You' ? 'Vous avez mené' : `${who(m[1])} a mené`) + ' dès le début'],
  [/^([^·—:]+?) led for good from move (\d+)$/, (m) => (m[1] === 'You' ? 'Vous avez mené' : `${who(m[1])} a mené`) + ` pour de bon dès le coup ${m[2]}`],
  [/^biggest swing: move (\d+), (\d+) seeds? (your|.+?'s) way$/, (m) => `plus grand basculement : coup ${m[1]}, ${pl(m[2], 'graine', 'graines')} ${m[3] === 'your' ? 'pour vous' : 'pour ' + who(m[3].slice(0, -2))}`],
  [/^(Tap|Click) again — your game ends \((.+)\)$/, (m) => { const k = m[2].match(/^(.+?) leads (\d+)–(\d+)$/); return `${m[1] === 'Tap' ? 'Touchez' : 'Cliquez'} encore — votre partie s’arrête (${k ? `${who(k[1])} mène ${k[2]}–${k[3]}` : need(m[2])})`; }], // Play keeps your game
  [/^you (lead|trail) (\d+)–(\d+)$/, (m) => `vous ${m[1] === 'lead' ? 'menez' : 'êtes mené'} ${m[2]}–${m[3]}`],
  [/^(new )?best win (\d+)–(\d+)$/, (m) => `${m[1] ? 'nouvelle ' : ''}meilleure victoire ${m[2]}–${m[3]}`],
  [/^(\d+) draws?$/, (m) => pl(m[1], 'nul', 'nuls')],
  [/^Ready for (.+?)\? Play (him|her) next$/, (m) => `Prêt pour ${m[1]} ? Jouez contre ${m[2] === 'him' ? 'lui' : 'elle'} ensuite`],
  [/^([+−±]\d+) for (beating|losing to|a draw with) (.+?) \((\d+)\)$/, (m) => `${m[1]} pour ${{ beating: 'votre victoire sur', 'losing to': 'votre défaite contre', 'a draw with': 'un nul avec' }[m[2]]} ${m[3]} (${m[4]})`],
  [/^(\d+) of 10 games, it is still finding you$/, (m) => `${m[1]} parties sur 10, le classement se cale encore`],
  [/^Your rating (\d+)$/, (m) => `Votre classement ${m[1]}`],
  [/^([+−±]\d+) last game$/, (m) => `${m[1]} à la dernière partie`],
  [/^(\d+) more games? to settle$/, (m) => `encore ${pl(m[1], 'partie', 'parties')} pour se caler`],
  [/^([^·—:]+?) this end$/, (m) => `${who(m[1])} de ce côté`],
  [/^([^·—:]+?) across the table$/, (m) => `${who(m[1])} en face`],
  [/^([^·—:]+?) leads (\d+) – (\d+)$/, (m) => `${who(m[1])} mène ${m[2]} – ${m[3]}`],
  [/^level (\d+) – (\d+)$/, (m) => `égalité ${m[1]} – ${m[2]}`],
  [/^(\d+) moves? in$/, (m) => `${pl(m[1], 'coup joué', 'coups joués')}`],
  [/^going over the game… (\d+) of (\d+)$/, (m) => `elle revoit la partie… ${m[1]} sur ${m[2]}`],
  [/^(\d+) moves she would have played differently$/, (m) => `${m[1]} coups qu’elle aurait joués autrement`],
  [/^(.+?)'s review: (.+?)(\. Step through them on the board)?$/, (m) => `La revue de ${m[1]} : ${need(m[2])}${m[3] ? '. Les parcourir sur le plateau' : ''}`],
  [/^(\d+) of (\d+)$/, (m) => `${m[1]} sur ${m[2]}`],
  [/^move (\d+)$/, (m) => `coup ${m[1]}`],
  [/^you played ((?:your|their) pit \d)(?: \(took (\d+)\))?$/, (m) => `vous avez joué ${need(m[1])}` + (m[2] ? ` (pris ${m[2]})` : '')],
  [/^([^·—:]+?)'s move, played through$/, (m) => `Le coup de ${who(m[1])}, joué jusqu’au bout`],
  [/^“(.+)”$/, (m) => `« ${need(m[1])} »`],
  [/^([^·—:“]+?): “(.+)”$/, (m) => `${who(m[1])} : « ${need(m[2])} »`],
  [/^(\d+) short$/, (m) => `il en manque ${m[1]}`],
  [/^(\d+) in a row$/, (m) => `${m[1]} d’affilée`],
  [/^the move captures (\d+)$/, (m) => `le coup prend ${m[1]}`],
  [/^(\d+) of (\d+) seeds$/, (m) => `${m[1]} graines sur ${m[2]}`],
  [/^([^·—:]+?)'s move captures$/, (m) => `Le coup de ${who(m[1])} prend`],
  [/^(\d\d:00) each day$/, (m) => `${m[1]} chaque jour`],
  [/^Remind me each day at (\d\d:00)$/, (m) => `Me le rappeler chaque jour à ${m[1]}`],
  [new RegExp(`^Play (${OPPS})$`), (m) => `Jouer contre ${m[1]}`],
  // the words that are shared (the share sheet, the clipboard): game.js puts them through t() line by line
  [/^captured (\d+)\/(\d+)$/, (m) => `pris ${m[1]}/${m[2]}`],
  [/^Ayo & Nchò — I (beat|drew with|lost to) (.+?) (\d+)–(\d+) in (\d+) moves\.$/, (m) => `Ayo & Nchò — ${{ beat: 'J’ai battu', 'drew with': 'J’ai fait match nul avec', 'lost to': 'J’ai perdu contre' }[m[1]]} ${m[2]} ${m[3]}–${m[4]} en ${pl(m[5], 'coup', 'coups')}.`],
  [/^Ayo & Nchò — (.+?) beat (.+?) (\d+)–(\d+) in (\d+) moves, both on one phone\.$/, (m) => `Ayo & Nchò — ${who(m[1])} a battu ${who(m[2])} ${m[3]}–${m[4]} en ${pl(m[5], 'coup', 'coups')}, tous deux sur un seul téléphone.`],
  [/^Ayo & Nchò — (.+?) and (.+?) drew (\d+)–(\d+) in (\d+) moves, both on one phone\.$/, (m) => `Ayo & Nchò — ${who(m[1])} et ${who(m[2])} ont fait match nul ${m[3]}–${m[4]} en ${pl(m[5], 'coup', 'coups')}, tous deux sur un seul téléphone.`],
  [/^My best turn against (.+?) at (Nchò|Ayo): (.+)\. Ayo & Nchò — Nigerian Mancala in 3D\.$/, (m) => `Mon meilleur tour contre ${who(m[1])} ${at(m[2])} : ${m[3].split(', ').map(clipBit).join(', ')}. Ayo & Nchò — le mancala nigérian en 3D.`],
  [/^([^·—:]+?) plays you for real now\. Tap a pit once to see where its seeds go, twice to sow\.$/, (m) => `${m[1]} joue contre vous pour de vrai maintenant. Touchez un trou une fois pour voir où vont ses graines, deux fois pour semer.`],
  // the opponents' runs of 10, 15, 20… (slice 4)
  ...SAYS_N.map(([en, fr]) => [new RegExp('^' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{n\\}', '(\\d+)') + '$'), (m) => fr.replace('{n}', m[1])]),
  // watch the whole game (web/watch.js): a game sent as a link, played back on the friend's board
  [/^(.+?) vs (.+?) · (Nchò|Ayo) · (\d+) moves$/, (m) => `${who(m[1])} contre ${who(m[2])} · ${m[3]} · ${pl(m[4], 'coup', 'coups')}`],
  [/^Move (\d+) of (\d+) · (.+) plays$/, (m) => `Coup ${m[1]} sur ${m[2]} · ${who(m[3])} joue`],
  [/^Move (\d+) of (\d+)$/, (m) => `Coup ${m[1]} sur ${m[2]}`], // …and its parts, when the hurry words join on with a ·
  [/^([^·—:]{1,20}) plays$/, (m) => `${who(m[1])} joue`],
  [/^(.+?) and (.+?) stopped at (\d+)–(\d+) after (\d+) moves$/, (m) => `${who(m[1])} et ${who(m[2])} se sont arrêtés à ${m[3]}–${m[4]} après ${pl(m[5], 'coup', 'coups')}`],
  [/^(.+?) and (.+?) drew (\d+)–(\d+)$/, (m) => `${who(m[1])} et ${who(m[2])} ont fait match nul ${m[3]}–${m[4]}`],
  [/^(.+?) beat (.+?) (\d+)–(\d+)$/, (m) => `${who(m[1])} a battu ${who(m[2])} ${m[3]}–${m[4]}`],
  ROOMS[ROOMS.length - 1], // a shout in the away title, "Tete: Oya, your move!": last, so it never catches a line that has its own
];
// a pit named from the seat looking at it: "your pit 3" → "votre trou 3", "their pit 3" → "le trou 3 d'en face"; the screen
// readers' "Your pit 3 (key 3)" → "Votre trou 3 (touche 3)"
function pitFr(m) {
  const mine = m[1].toLowerCase() === 'your'; const s = mine ? `votre trou ${m[2]}` : `le trou ${m[2]} d’en face`;
  return (m[1][0] === 'Y' || m[1][0] === 'T' ? cap(s) : s) + (m[3] ? ` (touche ${m[3]})` : '');
}
// a part of the clip's caption: "3 relays", "8 seeds captured", "12 seeds sown"
function clipBit(b) {
  const m = /^(\d+) (relays?|seeds? captured|seeds? sown)$/.exec(b); if (!m) throw NO;
  const one = m[1] === '1';
  return m[2].startsWith('relay') ? `${m[1]} relais` : `${m[1]} graine${one ? '' : 's'} ${m[2].endsWith('captured') ? 'prise' : 'semée'}${one ? '' : 's'}`;
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
  const pe = /^(·\s)?(.+?)(\s·)?$/.exec(core);
  const out = (pe[1] || pe[3]) ? ((r) => r === null ? null : (pe[1] || '') + r + (pe[3] || ''))(sub(pe[2])) : sub(core);
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
    const out = core.split(' · ').map((p) => whole(p) ?? (kept(p) || !/\p{L}/u.test(p) ? p : null));
    if (!out.includes(null)) return out.join(' · ');
  }
  return kept(core) || !/\p{L}/u.test(core) ? core : null;
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
