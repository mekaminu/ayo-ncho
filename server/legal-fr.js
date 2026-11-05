// The privacy, terms and support pages in French (Launch L18), for the Awalé countries and French phones: /privacy?lang=fr and the
// rest, or any page when the browser's first language is French. Word for word what server/legal.js says in English — when the
// English changes, this changes in the same commit (test/legal-fr.test.js checks both say the same facts: the times, the hosts,
// the law, the age). Players are « vous »; a friend is « un ami » and never given a gender beyond that.

const GAME = "Ayo &amp; Nchò";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "4 November 2026" → "4 novembre 2026"
export function dateFr(s) {
  const m = String(s).match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!m) return s;
  const i = EN_MONTHS.indexOf(m[2]);
  return i < 0 ? s : `${m[1] === "1" ? "1er" : m[1]} ${MONTHS[i]} ${m[3]}`;
}

// French puts a non-breaking space before : ; ? ! (as web/i18n.js does); only in the words, never inside a tag.
export function frSpaces(html) {
  return html.replace(/(<[^>]*>)|([^<]+)/g, (all, tag, words) => (tag ? tag : words.replace(/ ([:;?!])/g, "&nbsp;$1").replace(/« /g, "«&nbsp;").replace(/ »/g, "&nbsp;»")));
}

export const NAV_FR = { play: "← Jouer", privacy: "Confidentialité", terms: "Conditions", support: "Assistance", pages: `Pages d’${GAME}` };
export const TITLES_FR = { privacy: "Confidentialité", terms: "Conditions d’utilisation", support: "Assistance" };
export const PLACEHOLDER_FR = { seller: `le créateur d’${GAME}`, mail: "l’adresse e-mail d’assistance (bientôt)" };
export function footerFr(c) { return `${GAME} : mancala nigérian · géré par ${c.seller} · ${c.mail}`; }

export function privacyFr(c, updated) {
  return `<h1>Confidentialité</h1>
<p class="date">Mis à jour le ${dateFr(updated)}</p>
<p class="lead">${GAME} garde votre partie sur votre propre téléphone ou ordinateur. Pas de compte, pas de publicité, pas de statistiques et pas de cookies. Les seules choses qui arrivent jusqu’à notre serveur sont le nom que vous tapez pour une partie avec un ami, les coups et les cris de cette partie, une étiquette au hasard pour votre téléphone et, si vous choisissez tous les deux de parler, les quelques messages qui relient vos deux téléphones. Un appel vidéo ou vocal passe directement d’un téléphone à l’autre, jamais par nous.</p>
<p>Cette page vaut pour le jeu sur le web (ayo-ncho.onrender.com) et pour les applis ${GAME} pour Android, iPhone et iPad. Le jeu est géré par ${c.seller}, responsable de vos informations au sens du droit de la protection des données du Royaume-Uni et de l’UE. Vous pouvez nous écrire à ${c.mail}.</p>

<h2>Ce qui reste sur votre téléphone</h2>
<p>Pour se souvenir où vous en étiez, le jeu garde ceci sur votre appareil seulement, dans le stockage du navigateur ou de l’appli :</p>
<ul>
<li>vos réglages (règles, bois, graines, son, vitesse, etc.) et la partie en cours ;</li>
<li>votre bilan contre chaque adversaire de l’ordinateur, vos résultats à l’énigme du jour et les jours où vous avez joué ;</li>
<li>le nom que vous avez tapé pour les parties entre amis et, pendant une partie, votre place et les coups pour pouvoir y revenir ;</li>
<li>l’étiquette de votre téléphone (voir plus bas) et la liste des personnes que vous avez bloquées, avec les noms qu’elles utilisaient.</li>
</ul>
<p>Rien de tout cela ne nous est envoyé, sauf votre nom et vos coups quand vous jouez avec un ami en ligne (voir plus bas). Effacer les données du site dans votre navigateur, ou supprimer l’appli, efface tout.</p>

<h2>Jouer avec un ami en ligne</h2>
<p>Quand vous ouvrez une salle ou frappez à celle d’un ami, notre serveur reçoit le nom que vous avez tapé, vos coups, les cris de la liste fixe que vous envoyez (« Oya, à toi ! » et les autres), un code au hasard pour votre place, et l’étiquette de votre téléphone : une suite de caractères au hasard créée sur votre téléphone la première fois que vous jouez avec un ami, liée à rien d’autre (ni compte, ni nom, ni identifiant de l’appareil). Le téléphone de votre ami voit votre nom et votre étiquette, pour que, s’il vous bloque, son téléphone puisse refuser vos visites plus tard. C’est nécessaire pour faire tourner la partie entre vous, et cela ne sert à rien d’autre.</p>
<ul>
<li>Tout cela est gardé uniquement dans la mémoire vive du serveur, jamais écrit dans une base de données ni sur disque.</li>
<li>Une salle que personne ne rejoint est supprimée après 10 minutes ; une partie où personne n’a joué depuis 6 heures est supprimée. Un redémarrage du serveur l’efface aussi (votre téléphone garde une copie scellée de votre propre partie pour que vous puissiez continuer).</li>
<li>Prenez un surnom si vous voulez : le nom n’a pas besoin d’être le vrai.</li>
</ul>
<p>Jouer contre l’ordinateur, l’énigme du jour ou à deux sur un téléphone ne nous envoie rien du tout.</p>

<h2>Vidéo et voix avec un ami</h2>
<p>Pendant une partie avec un ami, chacun de vous peut proposer de parler avec le bouton caméra. Rien ne s’allume tant que vous n’avez pas dit oui tous les deux, et c’est seulement alors que votre téléphone demande sa caméra et son micro (dans les applis, votre téléphone vous demande la permission la première fois).</p>
<ul>
<li>L’image et le son vont directement de votre téléphone à celui de votre ami (WebRTC, chiffré de bout en bout entre les deux téléphones). Ils ne passent jamais par notre serveur, et rien n’est enregistré, ni par nous ni par le jeu.</li>
<li>Pour relier les deux téléphones, notre serveur transmet quelques petits messages entre eux : la demande et la réponse, et les détails techniques dont chaque téléphone a besoin pour trouver l’autre, dont l’adresse internet de chaque téléphone. Ils sont transmis aussitôt et ne sont pas gardés.</li>
<li>Pour se trouver, les téléphones interrogent un service d’adresses public (STUN, géré par Google), qui voit l’adresse internet de chaque téléphone, comme le ferait n’importe quel site web.</li>
<li>Vous pouvez couper le micro, éteindre votre caméra, masquer l’image de votre ami sur votre téléphone ou raccrocher à tout moment ; quitter le plateau met fin à l’appel.</li>
</ul>

<h2>Bloquer et signaler</h2>
<p>Pendant une partie avec un ami, le menu du bouton caméra propose Bloquer et Signaler un problème. Bloquer quelqu’un met fin à l’appel, vous fait sortir de la salle, et à partir de là votre téléphone refuse ses visites tout seul ; la liste reste sur votre téléphone (Réglages → Confidentialité), où vous pouvez le débloquer. Signaler un problème ouvre la <a href="/support?lang=fr#report">page d’assistance</a>, qui dit quoi nous envoyer ; nous lisons chaque signalement.</p>

<h2>Ce que voient notre hébergeur et d’autres</h2>
<ul>
<li>Le serveur tourne chez Render (render.com). Comme tout hébergeur web, Render traite l’adresse internet de votre appareil et l’heure de chaque requête pour livrer la page et protéger le service. Nous ne nous en servons pas pour vous identifier ni vous suivre.</li>
<li>Sur le web, le jeu charge sa bibliothèque 3D (three.js) depuis cdnjs, géré par Cloudflare (ou, sur un téléphone qui ne peut pas joindre cdnjs, depuis le serveur du jeu), et ses polices depuis Google Fonts : ces services voient donc votre adresse internet quand la page se charge. Les applis embarquent les deux et ne le font pas.</li>
<li>Quand vous partagez un résultat ou une invitation, c’est le menu de partage de votre téléphone ou WhatsApp qui l’envoie ; nous ne voyons ni ce que vous partagez ni avec qui.</li>
</ul>

<h2>Ce que nous ne faisons pas</h2>
<ul>
<li>Pas de compte et pas de connexion.</li>
<li>Pas de publicité, et aucun suivi publicitaire.</li>
<li>Pas de statistiques ni de rapports de plantage aujourd’hui. Leur interrupteur est déjà dans Réglages → Confidentialité (Partager les chiffres de jeu et les rapports de plantage), mais rien n’est enregistré ni envoyé. Si les applis se mettent à les envoyer, cette page le dira d’abord, avec ce qui est envoyé ; cela ne comprendra jamais votre nom, vos coups, un code de salle ni rien de ce que vous tapez, et l’interrupteur les coupe. Le lien web ne les enverra pas.</li>
<li>Le rappel de l’énigme du jour (Réglages → Ressenti, dans les applis, éteint tant que vous ne l’allumez pas) est réglé sur votre téléphone et déclenché par votre téléphone à l’heure choisie, au plus une fois par jour. Rien n’en est envoyé nulle part, et l’éteindre supprime tous les rappels encore en attente.</li>
<li>Nous ne vendons ni ne louons les informations de personne.</li>
</ul>

<h2>Achats</h2>
<p>Le jeu est gratuit. Si les applis proposent plus tard des améliorations ou de nouveaux plateaux en option, ils s’achèteront uniquement par l’App Store d’Apple ou Google Play, selon leurs conditions. Ce sont eux qui gèrent le paiement ; nous saurions seulement quel article a été acheté, jamais les détails de votre carte ou de votre banque.</p>

<h2>Enfants</h2>
<p>${GAME} s’adresse à tous à partir de 13 ans, et les familles y jouent ensemble. Nous ne collectons pas sciemment d’informations personnelles sur des enfants. La seule chose qu’un joueur peut nous envoyer est un nom pour une partie avec un ami ; nous conseillons aux enfants de prendre un prénom ou un surnom, et les cris sont une liste fixe, donc rien ne peut leur être écrit. La vidéo et la voix ne relient jamais que deux personnes qui jouent déjà l’une contre l’autre, après que les deux ont dit oui ; un jeune enfant ne devrait parler au plateau qu’avec la famille et des amis que ses parents connaissent.</p>

<h2>Vos droits</h2>
<p>Selon le droit de la protection des données du Royaume-Uni et de l’UE, vous pouvez demander ce que nous gardons sur vous, et nous demander de le corriger ou de l’effacer. Comme le jeu garde vos informations sur votre propre appareil, vous pouvez les effacer vous-même à tout moment (voir plus haut). Tout ce qui concerne une partie en ligne disparaît de notre serveur en quelques heures ; si vous voulez que ce soit plus tôt, écrivez à ${c.mail} avec le code de quatre lettres de la salle. Nous nous fondons sur notre intérêt légitime à faire tourner le jeu auquel vous avez demandé à jouer. Vous pouvez aussi vous plaindre auprès de l’Information Commissioner’s Office (ico.org.uk) ou de l’autorité de protection des données de votre pays (la CNIL en France).</p>

<h2>Changements</h2>
<p>Quand le jeu se met à faire quoi que ce soit de nouveau avec des informations, cette page change d’abord et la date en haut avance.</p>
<p class="date">En cas de différence entre cette page et la version anglaise, c’est l’anglais qui fait foi : <a href="/privacy?lang=en">Privacy, in English</a>.</p>`;
}

export function termsFr(c, updated) {
  return `<h1>Conditions d’utilisation</h1>
<p class="date">Mis à jour le ${dateFr(updated)}</p>
<p class="lead">${GAME} est un jeu gratuit. En y jouant, vous acceptez ces conditions. Elles sont courtes parce que le jeu est simple.</p>

<h2>Qui nous sommes</h2>
<p>Le jeu est créé et géré par ${c.seller} (« nous »). Contact : ${c.mail}.</p>

<h2>Jouer</h2>
<ul>
<li>Vous pouvez jouer au jeu, sur le web ou dans les applis, pour votre plaisir et avec votre famille et vos amis.</li>
<li>Merci de ne pas copier, revendre ou démonter le code ou les dessins du jeu, ni chercher à perturber le serveur ou les parties des autres joueurs.</li>
<li>Les jeux eux-mêmes, l’Ayo et le Nchò, appartiennent à tout le monde. Notre plateau en 3D, nos personnages, nos sons et notre code sont à nous.</li>
</ul>

<h2>Jouer avec des amis</h2>
<ul>
<li>Pour les parties en ligne, choisissez un nom qu’un enfant pourrait lire sans problème. Nous pouvons fermer une salle, ou empêcher l’usage d’un nom, s’il est injurieux.</li>
<li>C’est vous qui faites entrer les gens dans votre salle. Ne partagez votre lien d’invitation qu’avec des personnes que vous connaissez.</li>
<li>La vidéo et la voix au plateau servent à parler avec l’ami contre qui vous jouez. Ne lui montrez ni ne lui dites rien d’injurieux, de menaçant, de sexuel ou d’illégal, et ne l’enregistrez pas sans sa permission. Si quelqu’un le fait, raccrochez, bloquez cette personne depuis le menu du bouton caméra, et signalez-le (voir la <a href="/support?lang=fr#report">page d’assistance</a>).</li>
</ul>

<h2>Achats</h2>
<p>Tout ce qu’il faut pour jouer est gratuit, et rien de ce que nous vendons ne gagnera jamais une partie à votre place. Si les applis proposent des améliorations ou des styles en option, ils s’achètent par l’App Store ou Google Play, et les conditions de ces boutiques s’appliquent, remboursements compris. Si vous utilisez l’appli pour iPhone ou iPad, le contrat de licence standard d’Apple (Licensed Application End User License Agreement) s’applique aussi, et Apple n’est responsable ni du jeu ni de son assistance.</p>

<h2>Le jeu tel qu’il est</h2>
<p>Nous travaillons dur pour que le jeu marche et reste juste, mais il est fourni tel quel, sans promesse qu’il sera toujours disponible ou sans erreur. Le serveur en ligne gratuit peut mettre jusqu’à une minute à se réveiller, et des parties en ligne peuvent parfois se perdre. Rien dans ces conditions ne limite les droits que la loi vous donne en tant que consommateur, et nous ne sommes responsables d’aucune perte au-delà de ce que la loi nous impose.</p>

<h2>Changements</h2>
<p>Nous pouvons mettre ces conditions à jour à mesure que le jeu grandit. La date en haut changera et, si le changement compte, le jeu le dira.</p>

<h2>Le droit applicable</h2>
<p>Ces conditions sont régies par le droit de l’Angleterre et du pays de Galles. Si vous vivez ailleurs au Royaume-Uni ou dans l’UE, vous gardez aussi la protection du droit de la consommation de votre pays et pouvez saisir les tribunaux de chez vous.</p>
<p class="date">En cas de différence entre cette page et la version anglaise, c’est l’anglais qui fait foi : <a href="/terms?lang=en">Terms, in English</a>.</p>`;
}

export function supportFr(c, updated) {
  return `<h1>Assistance</h1>
<p class="date">Mis à jour le ${dateFr(updated)}</p>
<p class="lead">Quelque chose ne va pas, ou une question sur le jeu ? Écrivez à ${c.mail}. Dites-nous votre téléphone ou ordinateur, le navigateur ou l’appli, et ce qui s’est passé ; une capture d’écran aide. Nous lisons tout et répondons dès que possible. Vous pouvez nous écrire en français.</p>

<h2>Comment jouer ?</h2>
<p>Dans le jeu, ouvrez Réglages → Règles → Apprendre à jouer pour une leçon d’une minute sur le plateau, ou touchez le bouton des règles pour les règles en mots. En bref, pour le Nchò : prenez toutes les graines d’un de vos trous et semez-les une par trou dans le sens inverse des aiguilles d’une montre. Si votre dernière graine tombe sur des graines, prenez-les et continuez. Un trou qui arrive à 4 va au propriétaire de ce côté, sauf si c’est votre dernière graine qui fait 4 dans un trou de son côté : il est alors à vous. Quand il reste 8 graines, la prise suivante les emporte toutes. Le plus de graines gagne.</p>

<h2>Une partie avec un ami ne démarre pas</h2>
<ul>
<li>Le serveur en ligne s’endort quand personne n’a joué depuis un moment. La première visite peut prendre jusqu’à une minute le temps qu’il se réveille ; ensuite, c’est rapide.</li>
<li>Un code de salle marche 10 minutes en attendant que votre ami entre : ouvrez une nouvelle salle si cela fait plus longtemps.</li>
<li>Votre ami frappe avec son nom et vous touchez Faire entrer : gardez le jeu ouvert à l’écran jusqu’à ce qu’il frappe.</li>
<li>Si votre connexion coupe, le jeu se reconnecte tout seul et vous remet à votre place.</li>
</ul>

<h2 id="report">Signaler un joueur</h2>
<p>Si quelqu’un contre qui vous avez joué a été injurieux, par ce qu’il a montré ou dit pendant un appel, par son nom ou autrement, raccrochez d’abord et bloquez cette personne : ouvrez le bouton caméra dans le jeu et touchez deux fois Bloquer. Votre téléphone refuse alors ses visites et elle ne peut plus vous appeler. Puis écrivez à ${c.mail} avec :</p>
<ul>
<li>le nom qu’elle utilisait et le code de quatre lettres de la salle (il est dans l’adresse du jeu, après ?room=) ;</li>
<li>la date et l’heure à peu près ;</li>
<li>ce qui s’est passé.</li>
</ul>
<p>Les appels ne sont jamais enregistrés, donc nous ne pouvons ni les voir ni les entendre : nous agissons sur ce que vous nous dites. Nous lisons chaque signalement et agissons dès que possible : nous pouvons fermer une salle et empêcher l’usage d’un nom. Si quelqu’un est en danger, appelez d’abord la police.</p>

<h2>La vidéo ou la voix ne se connecte pas</h2>
<ul>
<li>Vous devez dire oui tous les deux, et chaque téléphone doit autoriser la caméra et le micro pour le jeu (dans un navigateur, pour ce site ; dans les applis, dans les réglages du téléphone pour ${GAME}).</li>
<li>Certains réseaux mobiles bloquent la ligne directe entre deux téléphones ; le jeu propose alors d’essayer en Wi-Fi.</li>
<li>Avec le plateau allégé, le jeu n’envoie que la voix.</li>
</ul>

<h2>Puis-je jouer sans réseau ?</h2>
<p>Oui. Les applis jouent contre l’ordinateur, l’énigme du jour et à deux sur un téléphone sans aucun réseau. Sur le web, ouvrez le jeu une fois avec du réseau et il s’ouvrira ensuite hors ligne aussi. Jouer avec un ami en ligne demande une connexion.</p>

<h2>Le plateau est lent ou mon téléphone chauffe</h2>
<p>Ouvrez Réglages → Ressenti → Plateau allégé et choisissez Oui, puis mettez la Physique des graines sur Non. Le jeu garde tout ce qui compte et tourne bien plus légèrement.</p>

<h2>Comment recommencer ou effacer mes données ?</h2>
<p>Tout est gardé sur votre propre appareil. Dans un navigateur, effacez les données de ce site dans les réglages du navigateur ; dans les applis, supprimez l’appli. Cela efface votre bilan, vos réglages et toute partie en cours. Voir la <a href="/privacy?lang=fr">page de confidentialité</a> pour ce qu’envoie une partie en ligne.</p>

<h2>Achats</h2>
<p>Le jeu est gratuit, et rien n’est vendu aujourd’hui. Quand les applis proposeront des améliorations en option, un bouton Restaurer les achats les rendra sur un nouveau téléphone, et les remboursements passent par Apple ou Google.</p>

<h2>Merci</h2>
<p>Le plateau en 3D utilise three.js (licence MIT). Les polices sont Fraunces et Inter (SIL Open Font Licence). Les applis sont construites avec Capacitor (licence MIT). Chaque son et chaque graine est fait par le jeu lui-même.</p>
<p class="date">En cas de différence entre cette page et la version anglaise, c’est l’anglais qui fait foi : <a href="/support?lang=en">Support, in English</a>.</p>`;
}
