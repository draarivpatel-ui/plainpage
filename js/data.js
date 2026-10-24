/*
 * PlainPage fixtures. Compact, documented, all offline.
 * Loaded before engine.js. Sets root.PlainPage.data and exports for Node tests.
 */
(function (root) {
  'use strict';

  /*
   * Dale-Chall familiar word fixture.
   * The published formula counts "difficult" words as any word not on the
   * Dale list of 769 familiar words (Dale and Chall, 1948). This fixture is a
   * compact curated subset of that spirit, roughly 850 high frequency English
   * words a reader meets before high school. Matching also accepts plain
   * inflections (plurals, ed, ing, ly) of listed words. It is not the verbatim
   * 769 word list; NOTES.md says so plainly.
   */
  const daleChallList = [
    'a about above across after again against all almost alone along already also although always altogether',
    'am among an and angry animal another answer any anyone anything are arm around arrive as ask at ate',
    'away aunt baby back bad bag ball banana basket be bean bear beat bed bee before begin behind believe',
    'bell below beside best better between big bird bite black block blood blue board boat body bone book',
    'born both bottle bottom box boy bread break breakfast bridge bright bring brother brown brush build',
    'burn bus but buy by cake call came camp can car card care carry case cat catch chair chalk chance',
    'change cheap check chicken child children choose church circle city class clean clear clever climb',
    'clock close cloth clothes cloud coast coat coffee cold color come cook cool copy corn correct cost',
    'cough could count country course cover cow crop cross cry cup cut dad dance dark daughter day dead',
    'dear decide deep deer desk dinner dirty do doctor dog doll dollar door down draw dream dress drink',
    'drive drop dry during each ear early earth east easy eat egg eight else end enough enter even ever',
    'every example eye face fall family far farm fast father fat feed feel feet fell fence few field',
    'fight find fine finger finish fire first fish five floor flower fly follow food foot for forest',
    'forget found four free fresh friend from front fruit full fun funny game garden gave get girl give',
    'go goes going gold good got grade grass gray great green grew grow guard guess had hair half hand',
    'happy hard has hat have he head hear heard heart heavy held help her here hers herself hide high',
    'hill him himself his hit hold hole home honest hope horse hospital hot hour house how hundred hungry',
    'hunt hurry hurt ice idea if ill important in inch inside into is it its itself job join jump just',
    'keep key kick kill kind king kiss kitchen kite knee knew knife know lady lake land large last late',
    'laugh law lay lead leaf learn leave left leg less lesson let letter library lie life lift light',
    'like line lion list listen little live long look lost lot loud love low lunch made mail make man',
    'many map mark market match may maybe me meal mean meat meet men mend milk mind mine minute miss',
    'money monkey month moon more morning most mother mountain mouse mouth move much music must my myself',
    'name near neck need neighbor never new news next nice night nine no noise none noon nor north nose',
    'not nothing now number nurse ocean off often oh old on once one only open or orange other our out',
    'outside over own page paint pair paper park part party pass past pay pen pencil people pick picture',
    'piece place plan plant play please point police poor potato pound present pretty pull push put',
    'question quick quiet rabbit radio rain ran read ready red remember rest ride right ring river road',
    'rock room round run sad said sail salt same sand sat save saw say school sea season seat second see',
    'seed seem sell send sentence seven several shall she sheep shelf shine ship shoe shop short should',
    'shout show shut sick side sign silver sing sister sit six size sky sleep slow small smell smile snow',
    'so soap some son song soon sorry sound soup south speak special spell spend spring square stand star',
    'start stay step stick still stone stop store storm story street strong study such summer sun supper',
    'sure sweet swim table tail take talk tall teach teacher tell ten than thank that the their them',
    'then there these thick thin thing think third this those though thought three through throw tie',
    'time to today together told tomorrow tonight too took top touch town toy train tree trip try turn',
    'two under understand until up upon us use very visit voice wait wake walk wall want warm was wash',
    'watch water way we wear week well went were west wet what wheel when where which while white who',
    'whole why wide wife will win wind window winter wish with within without woman women wood word work',
    'world write wrong yard year yellow yes yesterday yet you young your',
    'monday tuesday wednesday thursday friday saturday sunday',
    'january february march april june july august september october november december',
    'eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety thousand',
    "don't can't won't didn't doesn't isn't aren't wasn't weren't hasn't haven't hadn't couldn't",
    "wouldn't shouldn't it's that's there's here's what's who's he's she's i'm you're we're they're",
    "you'll we'll they'll he'll she'll i've you've we've they've i'd you'd he'd she'd we'd they'd let's"
  ].join('\n');

  /*
   * Jargon Radar starter list. One entry per line in the editor as
   * term = plain wording. A line without an equals sign is still detected,
   * it just has no suggested swap. Everything here is a starting point the
   * user can rewrite for their own community.
   */
  const jargonStarter = [
    'in order to = to',
    'due to the fact that = because',
    'at this point in time = now',
    'at the present time = now',
    'in the event that = if',
    'prior to = before',
    'subsequent to = after',
    'with regard to = about',
    'in regard to = about',
    'with respect to = about',
    'in relation to = about',
    'in conjunction with = with',
    'on a regular basis = regularly',
    'on a daily basis = daily',
    'a number of = some',
    'the majority of = most',
    'a variety of = many',
    'in close proximity to = near',
    'for the purpose of = to',
    'in the near future = soon',
    'it is important to note that = delete this phrase',
    'please be advised that = delete this phrase',
    'pursuant to = under',
    'aforementioned = already mentioned',
    'hereby = delete this word',
    'heretofore = until now',
    'henceforth = from now on',
    'utilize = use',
    'utilization = use',
    'facilitate = help',
    'endeavor = try',
    'commence = start',
    'terminate = end',
    'ascertain = find out',
    'disseminate = share',
    'distribute = hand out',
    'implement = put in place',
    'implementation = putting it in place',
    'methodology = method',
    'pedagogy = teaching',
    'pedagogical = about teaching',
    'curriculum = course of study',
    'assessment = progress check',
    'intervention = extra help',
    'scaffold = support step by step',
    'rigor = a real challenge',
    'stakeholder = everyone involved',
    'professional development = training',
    'social emotional learning = skills for feelings and friendships',
    'approximately = about',
    'additional = more',
    'adjacent to = next to',
    'allocate = set aside',
    'assistance = help',
    'attempt = try',
    'collaborate = work together',
    'component = part',
    'comprehend = understand',
    'concerning = about',
    'demonstrate = show',
    'designate = name',
    'determine = find out',
    'eligible = qualified',
    'ensure = make sure',
    'establish = set up',
    'exceed = go beyond',
    'finalize = finish',
    'indicate = show',
    'initiate = start',
    'liaise = meet with',
    'modify = change',
    'necessitate = call for',
    'notify = tell',
    'obtain = get',
    'participate = take part',
    'permit = let',
    'preclude = prevent',
    'purchase = buy',
    'regarding = about',
    'relocate = move',
    'sufficient = enough',
    'transmit = send',
    'verification = check',
    'notification = notice',
    'modification = change',
    'obligation = what you must do',
    'robust = strong',
    'streamline = simplify',
    'optimize = improve',
    'holistic = whole',
    'paradigm = model',
    'iep = individualized education program',
    'ell = english learner',
    'esl = english learner',
    'mtss = school wide system of support',
    'pbis = school behavior expectations'
  ].join('\n');

  /*
   * Rewrite Bench dictionary. Deliberately conservative, high confidence
   * swaps only, because a machine edit should never need an apology.
   * Longest phrases are applied first, then single words. Empty plain text
   * means the phrase is dropped from the sentence.
   */
  const rewriteDictionary = [
    'it is important to note that =',
    'please be advised that =',
    'in order to = to',
    'due to the fact that = because',
    'at this time = now',
    'in the event that = if',
    'prior to = before',
    'subsequent to = after',
    'utilize = use',
    'approximately = about',
    'additionally = also',
    'furthermore = also',
    'however = but',
    'purchase = buy',
    'obtain = get',
    'assist = help',
    'sufficient = enough',
    'numerous = many',
    'attempt = try',
    'initiate = start',
    'finalize = finish',
    'notify = tell',
    'demonstrate = show',
    'comprehend = understand',
    'determine = find out',
    'ascertain = find out',
    'terminate = end',
    'commence = start',
    'facilitate = help',
    'distribute = hand out',
    'require = need',
    'additional = more',
    'regarding = about',
    'concerning = about',
    'participate = take part',
    'endeavor = try',
    'utilization = use',
    'modification = change',
    'notification = notice',
    'verification = check',
    'ensure = make sure',
    'establish = set up',
    'modify = change',
    'collaborate = work together'
  ];

  /*
   * Two built in samples, a bureaucratic notice and its plainer sibling,
   * so the studio opens with real material instead of lorem ipsum.
   */
  const samples = {
    notice: [
      'A Note From the District Office',
      '',
      'Dear families, please be advised that the district has finalized its implementation plan for the revised attendance protocol. Pursuant to the new policy, guardians must utilize the online portal to subsequently verify each absence. Notification of unexcused absences will be disseminated via automated telephone calls on a weekly basis.',
      '',
      'It is important to note that failure to comply with the aforementioned protocol may necessitate a conference with the appropriate administrative personnel. Additionally, transportation eligibility determinations will be conducted prior to the commencement of the academic year. Approximately forty percent of households were impacted by the previous modification.',
      '',
      'We appreciate your cooperation in this endeavor. Questions may be directed to the office of student services.'
    ].join('\n'),

    letter: [
      'A Note That Anyone Can Read',
      '',
      'Dear families, school starts on Tuesday, September eighth. The first bell rings at eight fifteen and school ends at three ten. If your child will be absent, call the office at 555-0142 before eight thirty, or send a note with your child. We will call you if we do not hear from you.',
      '',
      'The bus routes changed this year. Check the bus tag on your child\'s backpack to find the new stop and the new time. Lunch costs two dollars and eighty cents this year. You can fill out the meal form online, or ask us for a paper copy.',
      '',
      'Meet the teacher night is Thursday at six. We hope to see you there.'
    ].join('\n')
  };

  /*
   * Flesch Reading Ease band labels, the standard table from the literature.
   */
  const fleschBands = [
    { min: 90, label: 'Very easy' },
    { min: 80, label: 'Easy' },
    { min: 70, label: 'Fairly easy' },
    { min: 60, label: 'Plain English' },
    { min: 50, label: 'Fairly difficult' },
    { min: 30, label: 'Difficult' },
    { min: 0, label: 'Very confusing' }
  ];

  /*
   * Reading Ease band to school grade, the usual conversion used when a
   * grade number is wanted from a Reading Ease score.
   */
  const fleschGradeTable = [
    { min: 90, grade: 5 },
    { min: 80, grade: 6 },
    { min: 70, grade: 7 },
    { min: 60, grade: 8 },
    { min: 50, grade: 10 },
    { min: 40, grade: 12 },
    { min: 30, grade: 13 },
    { min: 0, grade: 16 }
  ];

  const data = {
    daleChallList: daleChallList,
    jargonStarter: jargonStarter,
    rewriteDictionary: rewriteDictionary,
    samples: samples,
    fleschBands: fleschBands,
    fleschGradeTable: fleschGradeTable
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  }
  root.PlainPage = root.PlainPage || {};
  root.PlainPage.data = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
