import React, { useState, useEffect } from 'react';

const quizData = {
  meta: {
    title: "Welche Sprache spricht dein Herz?",
    subtitle: "Entdecke deinen Liebenden-Archetyp",
  },
  questions: [
    {
      id: "q1",
      context: "Es ist spÃƒÂ¤t. Dein Mensch hatte einen schweren Tag.",
      text: "Was tust du instinktiv?",
      options: [
        { id: "a", text: "Ich sage die Worte, die niemand sonst findet", scores: { intensity: 0, expression: 0, connection: 1 } },
        { id: "b", text: "Ich halte einfach still Ã¢â‚¬â€œ meine Arme sagen alles", scores: { intensity: 1, expression: 1, connection: 2 } },
        { id: "c", text: "Ich handle: Tee, Decke, das Handy auf lautlos", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "d", text: "Ich bleibe einfach da Ã¢â‚¬â€œ meine PrÃƒÂ¤senz ist das Geschenk", scores: { intensity: 1, expression: 1, connection: 1 } }
      ]
    },
    {
      id: "q2",
      context: "Du denkst an einen perfekten Moment mit jemandem, den du liebst.",
      text: "Was siehst du?",
      options: [
        { id: "a", text: "Ein GesprÃƒÂ¤ch, das die Zeit vergessen lÃƒÂ¤sst", scores: { intensity: 0, expression: 0, connection: 1 } },
        { id: "b", text: "HÃƒÂ¤nde, die sich finden, ohne hinzusehen", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "Ein Ort, den wir gemeinsam gebaut haben", scores: { intensity: 1, expression: 2, connection: 1 } },
        { id: "d", text: "Stille, die sich wie Zuhause anfÃƒÂ¼hlt", scores: { intensity: 0, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q3",
      context: "Du erhÃƒÂ¤ltst ein Geschenk von jemandem, der dich liebt.",
      text: "Was berÃƒÂ¼hrt dich am meisten?",
      options: [
        { id: "a", text: "Die Karte Ã¢â‚¬â€œ was jemand schreibt, vergesse ich nie", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "Die MÃƒÂ¼he Ã¢â‚¬â€œ dass jemand Zeit investiert hat", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "c", text: "Das Objekt selbst Ã¢â‚¬â€œ ein greifbarer Beweis der Liebe", scores: { intensity: 1, expression: 1, connection: 0 } },
        { id: "d", text: "Der Moment des Gebens Ã¢â‚¬â€œ die NÃƒÂ¤he dabei", scores: { intensity: 2, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q4",
      context: "Du spÃƒÂ¼rst, dass etwas zwischen euch nicht stimmt.",
      text: "Wie reagierst du?",
      options: [
        { id: "a", text: "Ich brauche das GesprÃƒÂ¤ch Ã¢â‚¬â€œ Ungesagtes brennt", scores: { intensity: 2, expression: 0, connection: 1 } },
        { id: "b", text: "Ich brauche NÃƒÂ¤he Ã¢â‚¬â€œ Worte kÃƒÂ¶nnen lÃƒÂ¼gen, KÃƒÂ¶rper nicht", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "Ich tue etwas Ã¢â‚¬â€œ Handeln ist meine Sprache der VersÃƒÂ¶hnung", scores: { intensity: 1, expression: 2, connection: 1 } },
        { id: "d", text: "Ich brauche Raum Ã¢â‚¬â€œ um zu verstehen, was ich fÃƒÂ¼hle", scores: { intensity: 0, expression: 1, connection: 0 } }
      ]
    },
    {
      id: "q5",
      context: "Jemand fragt dich: 'Woran erkenne ich, dass du mich liebst?'",
      text: "Deine ehrlichste Antwort:",
      options: [
        { id: "a", text: "An dem, was ich dir sage, wenn niemand zuhÃƒÂ¶rt", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "Daran, dass ich da bin Ã¢â‚¬â€œ auch wenn es unbequem ist", scores: { intensity: 0, expression: 2, connection: 2 } },
        { id: "c", text: "An meinen HÃƒÂ¤nden auf deiner Haut", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "d", text: "Daran, dass ich dich sehe Ã¢â‚¬â€œ wirklich sehe", scores: { intensity: 1, expression: 0, connection: 1 } }
      ]
    },
    {
      id: "q6",
      context: "Du hast drei Stunden ungestÃƒÂ¶rte Zeit mit deinem Menschen.",
      text: "Was wÃƒÂ¤hlst du?",
      options: [
        { id: "a", text: "Reden, bis wir vergessen haben, wo wir angefangen haben", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "Nebeneinander existieren Ã¢â‚¬â€œ lesen, atmen, sein", scores: { intensity: 0, expression: 1, connection: 1 } },
        { id: "c", text: "Etwas zusammen erschaffen oder erleben", scores: { intensity: 1, expression: 2, connection: 1 } },
        { id: "d", text: "BerÃƒÂ¼hrung ohne Ziel Ã¢â‚¬â€œ einfach nah sein", scores: { intensity: 2, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q7",
      context: "Ein alter Freund fragt, was deine grÃƒÂ¶ÃƒÅ¸te StÃƒÂ¤rke in Beziehungen ist.",
      text: "Welche Wahrheit wÃƒÂ¼rdest du zugeben?",
      options: [
        { id: "a", text: "Ich kann Dinge in Worte fassen, die andere nur fÃƒÂ¼hlen", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "Ich zeige Liebe durch das, was ich tue, nicht was ich sage", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "c", text: "Ich bin physisch prÃƒÂ¤sent in einer Welt voller Ablenkung", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "d", text: "Ich gebe Raum Ã¢â‚¬â€œ echte Liebe erstickt nicht", scores: { intensity: 0, expression: 1, connection: 0 } }
      ]
    },
    {
      id: "q8",
      context: "Du erinnerst dich an den Moment, als du wusstest: Das ist Liebe.",
      text: "Was hat es verraten?",
      options: [
        { id: "a", text: "Ein Satz, der alles verÃƒÂ¤ndert hat", scores: { intensity: 2, expression: 0, connection: 1 } },
        { id: "b", text: "Eine Geste, so klein, dass nur ich sie bemerkt habe", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "c", text: "Die Art, wie sich mein KÃƒÂ¶rper in ihrer NÃƒÂ¤he entspannt hat", scores: { intensity: 1, expression: 1, connection: 2 } },
        { id: "d", text: "Die Stille, die plÃƒÂ¶tzlich nicht mehr leer war", scores: { intensity: 0, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q9",
      context: "Du musst eine Liebesszene aus einem Film wÃƒÂ¤hlen, die dich am meisten trifft.",
      text: "Welche?",
      options: [
        { id: "a", text: "Das GestÃƒÂ¤ndnis Ã¢â‚¬â€œ endlich ausgesprochene Wahrheit", scores: { intensity: 2, expression: 0, connection: 1 } },
        { id: "b", text: "Der Kuss im Regen Ã¢â‚¬â€œ KÃƒÂ¶rper sprechen lauter", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "Das Opfer Ã¢â‚¬â€œ jemand tut das UnmÃƒÂ¶gliche fÃƒÂ¼r den anderen", scores: { intensity: 1, expression: 2, connection: 1 } },
        { id: "d", text: "Der letzte Tanz Ã¢â‚¬â€œ Zeit anhalten, nur wir zwei", scores: { intensity: 1, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q10",
      context: "Dein Herz wurde einmal gebrochen.",
      text: "Was hat am meisten gefehlt?",
      options: [
        { id: "a", text: "Die Worte Ã¢â‚¬â€œ 'Ich liebe dich' wurde eine Floskel", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "Die BerÃƒÂ¼hrung Ã¢â‚¬â€œ wir waren Mitbewohner, nicht Liebende", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "Die Taten Ã¢â‚¬â€œ Versprechen ohne Handlung sind LÃƒÂ¼gen", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "d", text: "Die Zeit Ã¢â‚¬â€œ wir hatten keine Stunden mehr fÃƒÂ¼reinander", scores: { intensity: 1, expression: 1, connection: 2 } }
      ]
    },
    {
      id: "q11",
      context: "Liebe ist fÃƒÂ¼r dich...",
      text: "WÃƒÂ¤hle das Bild, das am stÃƒÂ¤rksten resoniert:",
      options: [
        { id: "a", text: "Eine Flamme Ã¢â‚¬â€œ sie muss genÃƒÂ¤hrt werden, oder sie erlischt", scores: { intensity: 2, expression: 0, connection: 1 } },
        { id: "b", text: "Ein Ozean Ã¢â‚¬â€œ tief, manchmal stÃƒÂ¼rmisch, immer grÃƒÂ¶ÃƒÅ¸er als ich", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "Ein Baum Ã¢â‚¬â€œ Wurzeln brauchen Zeit, aber dann halten sie", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "d", text: "Der Wind Ã¢â‚¬â€œ man sieht ihn nicht, aber man spÃƒÂ¼rt, wenn er fehlt", scores: { intensity: 1, expression: 1, connection: 0 } }
      ]
    },
    {
      id: "q12",
      context: "Letzte Frage. VervollstÃƒÂ¤ndige den Satz:",
      text: "Ich weiÃƒÅ¸, dass ich geliebt werde, wenn...",
      options: [
        { id: "a", text: "...jemand die Worte findet, die ich selbst nicht aussprechen kann", scores: { intensity: 1, expression: 0, connection: 1 } },
        { id: "b", text: "...jemand mich berÃƒÂ¼hrt, als wÃƒÂ¤re ich kostbar", scores: { intensity: 2, expression: 1, connection: 2 } },
        { id: "c", text: "...jemand handelt, bevor ich fragen muss", scores: { intensity: 0, expression: 2, connection: 1 } },
        { id: "d", text: "...jemand seine Zeit wÃƒÂ¤hlt, mich zu wÃƒÂ¤hlen", scores: { intensity: 1, expression: 1, connection: 2 } }
      ]
    }
  ],
  profiles: [
    {
      id: "the_poet",
      title: "Der Dichter",
      emoji: "Ã°Å¸â€“Â¤",
      tagline: "Du liebst in SÃƒÂ¤tzen, die andere nie vergessen werden.",
      loveLanguage: "Worte der Anerkennung",
      description: "Es gibt Menschen, die Liebe aussprechen wie ein GestÃƒÂ¤ndnis Ã¢â‚¬â€œ und dann gibt es dich. Du hast verstanden, dass Worte keine leeren HÃƒÂ¼llen sind. Sie sind BrÃƒÂ¼cken. SchlÃƒÂ¼ssel. Manchmal sogar Waffen.\n\nIn bestimmten Momenten findest du Formulierungen, die andere ihr Leben lang suchen. Das ist keine FÃƒÂ¤higkeit, die man lernt Ã¢â‚¬â€œ es ist die Art, wie dein Herz verdrahtet ist.\n\nDu bist einer der wenigen, die das Unsagbare sagbar machen. In einer Welt voller Small Talk bist du das tiefe GesprÃƒÂ¤ch um 3 Uhr nachts.",
      stats: [
        { label: "Ungesendete Nachrichten", value: "94%" },
        { label: "Emotionale PrÃƒÂ¤zision", value: "97%" },
        { label: "Komplimente annehmen", value: "12%" }
      ],
      allies: ["Das Refugium", "Der HÃƒÂ¼ter"],
      nemesis: "Der Architekt",
      color: "#1a1a2e",
      accent: "#e94560",
      match: (s) => s.expression <= 8 && s.connection >= 8
    },
    {
      id: "the_flame",
      title: "Die Flamme",
      emoji: "Ã°Å¸â€Â¥",
      tagline: "Du liebst mit dem ganzen KÃƒÂ¶rper Ã¢â‚¬â€œ Haut spricht lauter als Worte.",
      loveLanguage: "KÃƒÂ¶rperliche NÃƒÂ¤he",
      description: "FÃƒÂ¼r dich ist Liebe kein Konzept. Sie ist physisch. SpÃƒÂ¼rbar. Eine Hand auf dem RÃƒÂ¼cken im richtigen Moment sagt mehr als tausend Textnachrichten.\n\nDu verstehst etwas, das viele vergessen haben: Wir sind KÃƒÂ¶rper. Und KÃƒÂ¶rper brauchen BerÃƒÂ¼hrung wie Pflanzen Licht. Wenn du umarmst, dann richtig. Wenn du die Hand hÃƒÂ¤ltst, ist es ein Statement.\n\nDu bist die Erinnerung daran, dass wir nicht nur Geist sind. In einer Welt der Distanz bist du radikale NÃƒÂ¤he.",
      stats: [
        { label: "Umarmungs-IntensitÃƒÂ¤t", value: "200%" },
        { label: "HÃƒÂ¤ndchenhalten-Reflex", value: "Auto" },
        { label: "Kuscheln", value: "Olympisch" }
      ],
      allies: ["Das Refugium", "Die Flamme"],
      nemesis: "Der Leuchtturm",
      color: "#2d132c",
      accent: "#ff6b6b",
      match: (s) => s.intensity >= 14 && s.connection >= 16
    },
    {
      id: "the_architect",
      title: "Der Architekt",
      emoji: "Ã°Å¸â€Â§",
      tagline: "Du baust Liebe Ã¢â‚¬â€œ Stein fÃƒÂ¼r Stein, Tat fÃƒÂ¼r Tat.",
      loveLanguage: "Hilfsbereitschaft",
      description: "WÃƒÂ¤hrend andere von Liebe reden, baust du sie. Jeden Tag. In kleinen Handlungen, die niemand sieht. Der Kaffee, der fertig ist, bevor sie aufwacht. Das Auto, das getankt am StraÃƒÅ¸enrand steht.\n\nFÃƒÂ¼r dich ist Liebe ein Verb, kein Substantiv. Sie existiert nur in der Handlung. Das macht dich unglaublich verlÃƒÂ¤sslich Ã¢â‚¬â€œ und manchmal unsichtbar.\n\nDu bist der Beweis, dass Liebe kein GefÃƒÂ¼hl ist, sondern eine Entscheidung. Jeden Tag neu.",
      stats: [
        { label: "Probleme vorab gelÃƒÂ¶st", value: "87%" },
        { label: "Zeigen statt Sagen", value: "99%" },
        { label: "To-Do-Listen fÃƒÂ¼r andere", value: "Viele" }
      ],
      allies: ["Der HÃƒÂ¼ter", "Der Architekt"],
      nemesis: "Der Dichter",
      color: "#1b262c",
      accent: "#3282b8",
      match: (s) => s.expression >= 14 && s.intensity <= 10
    },
    {
      id: "the_sanctuary",
      title: "Das Refugium",
      emoji: "Ã°Å¸Å’â„¢",
      tagline: "Du liebst, indem du bleibst Ã¢â‚¬â€œ deine PrÃƒÂ¤senz ist das Geschenk.",
      loveLanguage: "Zweisamkeit",
      description: "In einer Welt, die immer lauter wird, bist du der ruhige Raum. Deine Art zu lieben ist die vielleicht unterschÃƒÂ¤tzteste von allen: Du bist einfach da. Mit deiner ungeteilten Aufmerksamkeit.\n\nFÃƒÂ¼r dich ist der grÃƒÂ¶ÃƒÅ¸te Liebesbeweis, wenn jemand seine Zeit wÃƒÂ¤hlt, bei dir zu sein. Zeit ist endlich. Aufmerksamkeit ist kostbar.\n\nDu bist der Beweis, dass Anwesenheit die radikalste Form der Zuwendung ist.",
      stats: [
        { label: "Handy ignorieren", value: "100%" },
        { label: "'Kurze' GesprÃƒÂ¤che", value: "4h+" },
        { label: "PrÃƒÂ¤senz-SensibilitÃƒÂ¤t", value: "Seismograph" }
      ],
      allies: ["Der Dichter", "Die Flamme"],
      nemesis: "Der HÃƒÂ¼ter",
      color: "#16213e",
      accent: "#7f5af0",
      match: (s) => s.connection >= 14 && s.intensity <= 12 && s.expression >= 6 && s.expression <= 14
    },
    {
      id: "the_keeper",
      title: "Der HÃƒÂ¼ter",
      emoji: "Ã°Å¸Å½Â",
      tagline: "Du liebst in Symbolen Ã¢â‚¬â€œ jedes Geschenk ist ein StÃƒÂ¼ck deiner Seele.",
      loveLanguage: "Geschenke",
      description: "FÃƒÂ¼r dich ist ein Geschenk niemals 'nur' ein Gegenstand. Es ist verdichtete Aufmerksamkeit. Der Beweis, dass jemand zugehÃƒÂ¶rt hat. Dass jemand dich gesehen hat.\n\nDu gibst genauso, wie du empfÃƒÂ¤ngst: durchdacht. Jedes Geschenk ist eine kleine Forschungsarbeit. Was braucht dieser Mensch? Was sagt 'Ich kenne dich'?\n\nDu bist der Beweis, dass Aufmerksamkeit die wertvollste WÃƒÂ¤hrung ist.",
      stats: [
        { label: "Erinnerung an Details", value: "Elefant" },
        { label: "Geschenk-Recherche", value: "FBI-Level" },
        { label: "Gespeicherte Ideen", value: "Archiv" }
      ],
      allies: ["Der Architekt", "Der Dichter"],
      nemesis: "Das Refugium",
      color: "#2b2e4a",
      accent: "#e84545",
      match: (s) => s.connection <= 10 && s.expression >= 6 && s.expression <= 14
    },
    {
      id: "the_lighthouse",
      title: "Der Leuchtturm",
      emoji: "Ã°Å¸Å’Å ",
      tagline: "Du liebst aus der Distanz Ã¢â‚¬â€œ dein Licht reicht weiter, als du weiÃƒÅ¸t.",
      loveLanguage: "Freiheit & Konstanz",
      description: "Du verstehst etwas, das viele als Widerspruch sehen: Liebe braucht Raum. Nicht weil du weniger fÃƒÂ¼hlst, sondern weil du weiÃƒÅ¸t, dass NÃƒÂ¤he ohne Freiheit zur Fessel wird.\n\nDu liebst, indem du leuchtest Ã¢â‚¬â€œ konstant, verlÃƒÂ¤sslich Ã¢â‚¬â€œ aber du verschlingst nicht. Du fÃƒÂ¼hlst intensiv Ã¢â‚¬â€œ du brauchst nur nicht die konstante BestÃƒÂ¤tigung durch NÃƒÂ¤he.\n\nDu bist der Beweis, dass Liebe nicht klammern muss, um echt zu sein.",
      stats: [
        { label: "Alleinsein-BedÃƒÂ¼rfnis", value: "Vital" },
        { label: "Liebe ohne Besitz", value: "Selten" },
        { label: "Konstanz ÃƒÂ¼ber Jahre", value: "Fels" }
      ],
      allies: ["Der Architekt", "Der Leuchtturm"],
      nemesis: "Die Flamme",
      color: "#0f0e17",
      accent: "#2cb67d",
      match: (s) => s.connection <= 8 && s.intensity <= 10
    }
  ]
};

function getProfile(scores) {
  for (const profile of quizData.profiles) {
    if (profile.match(scores)) {
      return profile;
    }
  }
  const intensityHigh = scores.intensity > 12;
  const expressionHigh = scores.expression > 12;
  const connectionHigh = scores.connection > 12;
  
  if (intensityHigh && connectionHigh) return quizData.profiles.find(p => p.id === "the_flame");
  if (expressionHigh) return quizData.profiles.find(p => p.id === "the_architect");
  if (connectionHigh) return quizData.profiles.find(p => p.id === "the_sanctuary");
  if (!connectionHigh && !intensityHigh) return quizData.profiles.find(p => p.id === "the_lighthouse");
  return quizData.profiles.find(p => p.id === "the_poet");
}

export default function LoveLanguagesQuiz() {
  const [stage, setStage] = useState('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState({ intensity: 0, expression: 0, connection: 0 });
  const [selectedOption, setSelectedOption] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStart = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStage('quiz');
      setIsAnimating(false);
    }, 300);
  };

  const handleAnswer = (option) => {
    setSelectedOption(option.id);
    const newScores = {
      intensity: scores.intensity + option.scores.intensity,
      expression: scores.expression + option.scores.expression,
      connection: scores.connection + option.scores.connection
    };
    setScores(newScores);

    setTimeout(() => {
      if (currentQ < quizData.questions.length - 1) {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentQ(currentQ + 1);
          setSelectedOption(null);
          setIsAnimating(false);
        }, 300);
      } else {
        setIsAnimating(true);
        setTimeout(() => {
          setResult(getProfile(newScores));
          setStage('result');
          setIsAnimating(false);
        }, 500);
      }
    }, 400);
  };

  const handleRestart = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStage('intro');
      setCurrentQ(0);
      setScores({ intensity: 0, expression: 0, connection: 0 });
      setSelectedOption(null);
      setResult(null);
      setIsAnimating(false);
    }, 300);
  };

  const progress = ((currentQ + 1) / quizData.questions.length) * 100;

  if (stage === 'intro') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">Ã°Å¸â€™Å“</div>
          <h1 className="text-3xl font-light text-white mb-3 tracking-wide">
            {quizData.meta.title}
          </h1>
          <p className="text-purple-200/70 mb-8 text-lg">
            {quizData.meta.subtitle}
          </p>
          <div className="space-y-4 text-purple-200/50 text-sm mb-10">
            <p>12 Fragen Ã‚Â· 2-3 Minuten</p>
            <p className="text-xs leading-relaxed max-w-xs mx-auto">
              Entdecke, welche Sprache dein Herz spricht Ã¢â‚¬â€œ und warum manche Menschen dich sofort verstehen, wÃƒÂ¤hrend andere nie ankommen.
            </p>
          </div>
          <button
            onClick={handleStart}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/30"
          >
            Starten
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'quiz') {
    const question = quizData.questions[currentQ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col">
        <div className="w-full h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4 text-purple-300/50 text-sm flex justify-between">
          <span>{currentQ + 1} / {quizData.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        
        <div className={`flex-1 flex flex-col justify-center p-6 max-w-lg mx-auto w-full transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          {question.context && (
            <p className="text-purple-300/60 text-sm mb-3 italic">
              {question.context}
            </p>
          )}
          <h2 className="text-xl text-white mb-8 font-light leading-relaxed">
            {question.text}
          </h2>
          
          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                disabled={selectedOption !== null}
                className={`w-full p-4 text-left rounded-xl border transition-all duration-300 ${
                  selectedOption === option.id
                    ? 'border-purple-400 bg-purple-500/20 text-white scale-98'
                    : selectedOption !== null
                    ? 'border-slate-700/50 bg-slate-800/30 text-slate-500'
                    : 'border-slate-700 bg-slate-800/50 text-purple-100 hover:border-purple-500/50 hover:bg-slate-800 active:scale-98'
                }`}
              >
                <span className="text-sm leading-relaxed">{option.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'result' && result) {
    return (
      <div 
        className={`min-h-screen flex flex-col transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: `linear-gradient(135deg, ${result.color} 0%, #0f0e17 100%)` }}
      >
        <div className="flex-1 p-6 max-w-lg mx-auto w-full overflow-y-auto">
          <div className="text-center mb-6 pt-4">
            <div className="text-5xl mb-4">{result.emoji}</div>
            <h1 className="text-3xl font-light text-white mb-2">{result.title}</h1>
            <p className="text-sm px-4 py-2 rounded-full inline-block mb-4" style={{ backgroundColor: `${result.accent}30`, color: result.accent }}>
              {result.loveLanguage}
            </p>
            <p className="text-white/70 italic text-sm">
              "{result.tagline}"
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur rounded-2xl p-5 mb-5">
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
              {result.description}
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur rounded-2xl p-5 mb-5">
            <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">Deine Stats</h3>
            <div className="space-y-3">
              {result.stats.map((stat, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">{stat.label}</span>
                  <span className="font-mono text-sm" style={{ color: result.accent }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur rounded-2xl p-5 mb-6">
            <h3 className="text-white/50 text-xs uppercase tracking-wider mb-4">KompatibilitÃƒÂ¤t</h3>
            <div className="mb-4">
              <span className="text-green-400/70 text-xs">Allies:</span>
              <p className="text-white/80 text-sm">{result.allies.join(", ")}</p>
            </div>
            <div>
              <span className="text-red-400/70 text-xs">Nemesis:</span>
              <p className="text-white/80 text-sm">{result.nemesis}</p>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={handleRestart}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all text-sm"
            >
              Nochmal
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Ich bin ${result.title}`,
                    text: result.tagline,
                    url: window.location.href
                  });
                }
              }}
              className="flex-1 py-3 rounded-xl text-white font-medium transition-all text-sm"
              style={{ backgroundColor: result.accent }}
            >
              Teilen
            </button>
          </div>

          <p className="text-white/30 text-xs text-center leading-relaxed pb-4">
            Dieser Test dient der spielerischen Selbstreflexion und stellt keine psychologische Bewertung dar.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
