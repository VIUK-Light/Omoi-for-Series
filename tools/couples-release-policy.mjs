// Couples公開データの選別方針。移行・検証スクリプトで同じルールを使う。
export const RELEASE_EXCLUDED_IDS = new Set([
  "love-1-3", "ethics-max-4-14", "ethics-max-4-15",
  "other-2-2", "predictions-2-1", "predictions-2-4", "predictions-2-5", "predictions-2-8", "predictions-4-7",
  "ethics-max-4-12", "ethics-max-4-13", "love-4-25", "daily-2-7",
  "date-2-4", "love-3-1", "love-3-10", "friendship-1-4", "friendship-3-4", "contact-distance-4-2",
  "predictions-3-8", "values-2-7", "future-values-3-4", "date-4-2", "future-values-2-3", "love-1-9",
  "date-3-1", "date-3-2", "friendship-3-2", "bullying-4-1", "bullying-4-2", "ethics-3-3", "ethics-3-5",
  "love-4-2", "love-4-3", "jealousy-1-5", "jealousy-3-1", "jealousy-3-2", "jealousy-3-6",
  "affection-2-4", "affection-2-5", "memories-2-1", "memories-2-4", "memories-4-5",
  "love-4-24", "love-4-6", "jealousy-1-2", "jealousy-1-4", "jealousy-4-5", "conflict-support-3-5",
]);

export const RELEASE_EXCLUDED_CATEGORIES = new Set([
  "schoolLife", "schoolSelf", "studyFuture", "schoolPredictions", "teacherReport", "elementaryPredictions",
]);

const fixedReplacements = new Map([
  ["love-1-3", {
    id: "editorial-couples-1-1",
    audience: "couples",
    level: 1,
    text: "好きな人には、言葉で気持ちを伝えたい？態度で伝われば十分？",
    category: "romance",
    source: "editorial",
  }],
  ["ethics-max-4-14", {
    id: "editorial-couples-4-2",
    audience: "couples",
    level: 4,
    text: "自分にしつこく関わってきたり、事実ではない噂を流したりする人がいる。\n相手にも事情があると分かっていても、自分が傷つけられていいわけではない。\nあなたなら、相手の背景を考えて我慢する？\nはっきりやめてと伝える？\n信頼できる人に相談する？",
    category: "ethicsMax",
    source: "editorial",
  }],
  ["ethics-max-4-15", {
    id: "editorial-couples-4-3",
    audience: "couples",
    level: 4,
    text: "仲のいい友達が、別の人を傷つけるような冗談や悪口を言っていた。\n注意すれば関係が悪くなるかもしれない。\n黙っていれば、傷ついている人を見捨てるかもしれない。\nあなたなら、まず何をする？",
    category: "ethicsMax",
    source: "editorial",
  }],
]);

const reviewRewrites = [
  ["date-3-1", "editorial-couples-review-001", "一緒に出かける途中で寄り道するなら、どこに行きたい？"],
  ["date-3-2", "editorial-couples-review-002", "デートの帰りに、二人でどんな時間を過ごしたい？"],
  ["friendship-3-2", "editorial-couples-review-003", "その場のノリについていけないと感じる時はある？"],
  ["bullying-4-1", "editorial-couples-review-004", "友達が誰かを傷つけていると気づいたら、どんな対応ができると思う？"],
  ["bullying-4-2", "editorial-couples-review-005", "本人の気持ちを尊重しながら安全を守るために、誰に相談できると思う？"],
  ["ethics-3-3", "editorial-couples-review-006", "周りが間違いを黙認している時、自分は声を上げられると思う？"],
  ["ethics-3-5", "editorial-couples-review-007", "親しい人が誰かを傷つけていたら、どう向き合う？"],
  ["love-4-2", "editorial-couples-review-008", "恋人が自分以外の友人と親しくしている時、どんな場合に気になる？"],
  ["love-4-3", "editorial-couples-review-009", "恋人が自分以外の人と二人で出かけることをどう感じる？"],
  ["jealousy-1-5", "editorial-couples-review-010", "恋人が自分以外の人と親しく話している時、どんな気持ちになる？"],
  ["jealousy-3-1", "editorial-couples-review-011", "友人との距離感について、恋人と話しておきたいことはある？"],
  ["jealousy-3-2", "editorial-couples-review-012", "恋人が友人と二人で出かけることをどう考える？"],
  ["jealousy-3-6", "editorial-couples-review-013", "恋人の交友関係について、二人で決めておきたいことはある？"],
  ["affection-2-4", "editorial-couples-review-014", "恋人に言われてうれしい言葉は？"],
  ["affection-2-5", "editorial-couples-review-015", "恋人として伝えたい、相手がうれしくなる言葉は？"],
  ["memories-2-1", "editorial-couples-review-016", "お互いを意識し始めたきっかけは何？"],
  ["memories-2-4", "editorial-couples-review-017", "付き合う前、相手が気づいていなさそうだったことは？"],
  ["memories-4-5", "editorial-couples-review-018", "付き合う前の自分に一言伝えるなら？"],
  ["love-4-24", "editorial-couples-review-019", "過去の恋愛について、どのくらい共有したい？"],
  ["love-4-6", "editorial-couples-review-020", "スマホや個人アカウントのプライバシーで、大切にしたいことは？"],
  ["jealousy-1-2", "editorial-couples-review-021", "恋人が嫉妬や不安を感じている時、どう伝えてもらえるとうれしい？"],
  ["jealousy-1-4", "editorial-couples-review-022", "気にかけてもらう時、どんな関わり方が心地よい？"],
  ["jealousy-4-5", "editorial-couples-review-023", "二人が安心できる距離感と、それぞれの自由をどう両立したい？"],
  ["conflict-support-3-5", "editorial-couples-review-024", "恋人に、言葉にしにくくても共有したいことはある？"],
  ["values-2-4", "editorial-couples-review-025", "メッセージの返信は早い方が安心する？"],
  ["love-1-10", "editorial-couples-review-026", "会えない日に、どんなメッセージをもらうとうれしい？"],
  ["love-2-4", "editorial-couples-review-027", "毎日メッセージしたい？それとも、できる時で十分？"],
  ["contact-distance-1-1", "editorial-couples-review-028", "電話とメッセージ、どちらで話すのが好き？"],
  ["contact-distance-1-5", "editorial-couples-review-029", "メッセージで話すなら、どんな話題がいい？"],
  ["predictions-3-6", "editorial-couples-review-030", "相手は、連絡にすぐ返事をするタイプだと思う？"],
  ["contact-distance-4-1", "editorial-couples-review-031", "連絡の頻度や方法に違いがある時、どうすり合わせたい？"],
];

// 2026-10-16: Couples は恋人同士の関係を扱う。下記IDは公開477件を全文確認して選別。
// カテゴリ名や語句の一致による実行時の自動選別は行わず、明示したIDだけに適用する。
export const COUPLES_FIT_REMOVAL_GROUPS = [
  {
    "reason": "正義・責任・犠牲・許しなどの是非を選ばせる倫理ジレンマ。恋人の語が出る設問も含め、二人の具体的な希望や接し方を話すCouplesの設問としては残さない。",
    "ids": [
      "ethics-1-1",
      "ethics-1-2",
      "ethics-1-3",
      "ethics-1-4",
      "ethics-1-5",
      "ethics-1-6",
      "ethics-1-7",
      "ethics-1-8",
      "ethics-2-1",
      "ethics-2-2",
      "ethics-2-3",
      "ethics-2-4",
      "ethics-2-5",
      "ethics-2-6",
      "ethics-2-7",
      "ethics-2-8",
      "ethics-3-1",
      "ethics-3-2",
      "editorial-couples-review-006",
      "ethics-3-4",
      "editorial-couples-review-007",
      "ethics-3-6",
      "ethics-3-7",
      "ethics-3-8",
      "ethics-4-1",
      "ethics-4-2",
      "ethics-4-3",
      "ethics-4-4",
      "ethics-4-5",
      "ethics-4-6",
      "ethics-4-7",
      "ethics-4-8",
      "ethics-4-9",
      "ethics-4-10",
      "ethics-4-11",
      "ethics-4-12",
      "ethics-4-13",
      "ethics-4-14",
      "ethics-4-15",
      "ethics-4-16",
      "ethics-4-17",
      "ethics-4-18",
      "ethics-4-19",
      "ethics-4-20",
      "ethics-max-1-1",
      "ethics-max-1-2",
      "ethics-max-1-3",
      "ethics-max-1-4",
      "ethics-max-1-5",
      "ethics-max-1-6",
      "ethics-max-1-7",
      "ethics-max-1-8",
      "ethics-max-2-1",
      "ethics-max-2-2",
      "ethics-max-2-3",
      "ethics-max-2-4",
      "ethics-max-2-5",
      "ethics-max-2-6",
      "ethics-max-2-7",
      "ethics-max-2-8",
      "ethics-max-3-1",
      "ethics-max-3-2",
      "ethics-max-3-3",
      "ethics-max-3-4",
      "ethics-max-3-5",
      "ethics-max-3-6",
      "ethics-max-3-7",
      "ethics-max-3-8",
      "ethics-max-4-1",
      "ethics-max-4-2",
      "ethics-max-4-3",
      "ethics-max-4-4",
      "ethics-max-4-5",
      "ethics-max-4-6",
      "ethics-max-4-7",
      "ethics-max-4-8",
      "ethics-max-4-9",
      "ethics-max-4-10",
      "ethics-max-4-11",
      "editorial-couples-4-2",
      "editorial-couples-4-3"
    ]
  },
  {
    "reason": "恋人との関係ではなく、友人の人数・付き合い方・信義など単独の友情を問う設問のため削除。",
    "ids": [
      "friendship-1-1",
      "friendship-1-2",
      "friendship-1-3",
      "friendship-1-5",
      "friendship-1-6",
      "friendship-2-1",
      "friendship-2-2",
      "friendship-2-3",
      "friendship-2-4",
      "friendship-2-5",
      "friendship-2-6",
      "friendship-2-7",
      "friendship-3-1",
      "editorial-couples-review-003",
      "friendship-3-3",
      "friendship-3-5",
      "friendship-3-6",
      "friendship-4-1",
      "friendship-4-2",
      "friendship-4-3",
      "friendship-4-4",
      "friendship-4-5",
      "friendship-4-6"
    ]
  },
  {
    "reason": "恋人同士の関係ではなく、学校や集団のいじめ・悪口・傍観への対応を問う設問のため削除。",
    "ids": [
      "bullying-1-1",
      "bullying-1-2",
      "bullying-1-3",
      "bullying-1-4",
      "bullying-1-5",
      "bullying-1-6",
      "bullying-2-1",
      "bullying-2-2",
      "bullying-2-3",
      "bullying-2-4",
      "bullying-2-5",
      "bullying-2-6",
      "bullying-3-1",
      "bullying-3-2",
      "bullying-3-3",
      "bullying-3-4",
      "bullying-3-5",
      "bullying-3-6",
      "editorial-couples-review-004",
      "editorial-couples-review-005",
      "bullying-4-3",
      "bullying-4-4",
      "bullying-4-5",
      "bullying-4-6"
    ]
  },
  {
    "reason": "現在の二人の関わり方を問わず、日常の好み・体験の有無・相手の性格を当てる内容にとどまるため削除。",
    "ids": [
      "values-1-6",
      "love-1-1",
      "love-2-5",
      "other-1-1",
      "other-1-2",
      "other-1-3",
      "other-1-4",
      "other-1-5",
      "other-1-6",
      "other-2-1",
      "other-2-3",
      "other-2-4",
      "other-2-6",
      "other-3-2",
      "other-3-4",
      "other-3-6",
      "other-4-1",
      "other-4-3",
      "other-4-4",
      "daily-1-1",
      "daily-1-2",
      "daily-1-3",
      "daily-1-4",
      "daily-1-5",
      "daily-1-6",
      "daily-2-1",
      "daily-2-2",
      "daily-2-3",
      "daily-2-4",
      "daily-2-5",
      "daily-2-6",
      "daily-3-1",
      "daily-3-2",
      "daily-3-3",
      "daily-3-4",
      "daily-3-5",
      "daily-3-6",
      "daily-4-1",
      "daily-4-2",
      "daily-4-3",
      "daily-4-4",
      "daily-4-5",
      "daily-4-6",
      "future-values-1-5",
      "predictions-1-1",
      "predictions-1-2",
      "predictions-1-3",
      "predictions-1-4",
      "predictions-1-5",
      "predictions-1-6",
      "predictions-1-7",
      "predictions-2-3",
      "predictions-2-7",
      "editorial-couples-review-030"
    ]
  },
  {
    "reason": "相手の秘密・無理・傷つき方を当てる形になっており、本人が話す範囲を選ぶ関係の問いに置き換えるより削除が適切。",
    "ids": [
      "predictions-4-1",
      "predictions-4-2",
      "predictions-4-4",
      "predictions-4-5"
    ]
  },
  {
    "reason": "下ネタの許容度や「そういう話」「大人っぽい話」など、話題が曖昧な性的雑談の設問。恋人同士の境界は残した具体的設問で扱う。",
    "ids": [
      "boundaries-1-1",
      "boundaries-1-2",
      "boundaries-1-3",
      "boundaries-1-5",
      "boundaries-2-3",
      "boundaries-2-4"
    ]
  },
  {
    "reason": "同じ恋人との会話・愛情・距離感・思い出を扱う、より具体的な設問が残るため重複を整理。",
    "ids": [
      "values-2-2",
      "editorial-couples-review-025",
      "values-3-1",
      "values-3-2",
      "values-3-5",
      "values-4-1",
      "values-4-3",
      "values-4-6",
      "love-2-9",
      "editorial-couples-review-027",
      "love-2-11",
      "love-4-7",
      "love-4-12",
      "love-4-16",
      "love-4-17",
      "other-3-3",
      "other-4-2",
      "date-1-1",
      "date-1-2",
      "date-2-5",
      "date-4-5",
      "memories-4-1",
      "memories-4-4",
      "editorial-couples-review-018",
      "memories-4-6",
      "affection-1-3",
      "affection-1-6",
      "affection-2-1",
      "affection-2-2",
      "editorial-couples-review-014",
      "affection-3-4",
      "affection-3-5",
      "affection-4-5",
      "contact-distance-2-3",
      "contact-distance-3-2",
      "contact-distance-3-4",
      "contact-distance-4-6",
      "jealousy-1-3",
      "editorial-couples-review-010",
      "jealousy-1-6",
      "jealousy-2-2",
      "jealousy-2-3",
      "editorial-couples-review-012",
      "jealousy-3-5",
      "jealousy-4-1",
      "jealousy-4-3",
      "jealousy-4-4",
      "conflict-support-1-4",
      "conflict-support-2-4",
      "conflict-support-2-5",
      "conflict-support-3-1",
      "conflict-support-3-2",
      "conflict-support-3-4",
      "conflict-support-4-1",
      "conflict-support-4-4",
      "future-values-1-4",
      "future-values-1-6",
      "future-values-2-6",
      "boundaries-1-6",
      "boundaries-3-2",
      "boundaries-3-3",
      "boundaries-4-1"
    ]
  },
  {
    "reason": "付き合う前に相手が気づいていなかったことを推測させる曖昧な設問。過去の恋心を話す具体的な設問は別に残す。",
    "ids": [
      "editorial-couples-review-017"
    ]
  }
];

export const COUPLES_FIT_EXCLUDED_REASONS = new Map(
  COUPLES_FIT_REMOVAL_GROUPS.flatMap(({ reason, ids }) => ids.map(id => [id, reason])),
);
export const COUPLES_FIT_EXCLUDED_IDS = new Set(COUPLES_FIT_EXCLUDED_REASONS.keys());

// serial は採番済みの安定ID。並べ替えや追加で既存IDを振り直さない。
// [旧公開ID, serial, 新しい主質問, 新しい深掘り質問, 必要な場合のみ新カテゴリ]
const relationshipRewrites = [
  ["values-1-1", "001", "二人の休日に、外出したい気持ちと家で休みたい気持ちが違ったらどう決めたい？", "一緒の予定と別々の予定を、どんなふうに組み合わせたい？"],
  ["values-1-3", "002", "恋人と食事をするなら、一緒に作るのと外食ではどちらが好き？", "二人で食事を決める時、大切にしたい条件は？"],
  ["values-1-4", "003", "二人で出かける予定は、前もって決めたい？当日の気分で決めたい？", "相手の希望と違う時、先に相談しておきたいことは？"],
  ["values-1-5", "004", "恋人と過ごす時間を、写真にどのくらい残したい？", "写真を撮る時間と、その場を楽しむ時間はどう分けたい？"],
  ["values-1-8", "005", "二人の記念日は、どんなふうに過ごしたい？", "お祝いの希望が違ったら、何から相談したい？"],
  ["values-2-5", "006", "恋人と一緒にいて、落ち着いて過ごせるのはどんな時？", "その落ち着く感じを、忙しい日にも作るには？"],
  ["values-2-8", "007", "恋人が自分を理解してくれていると感じるのは、どんな時？", "自分のことを知ってもらうために、伝えておきたい小さなことは？"],
  ["values-3-4", "008", "デートの予定で、相手に合わせることが負担になるのはどんな時？", "自分の希望も伝えるなら、どんな言い方がよさそう？"],
  ["values-4-2", "009", "恋人に気をつかいすぎて、疲れることはある？", "二人でいる時、気を張らずに休めるように変えたいことは？"],
  ["values-4-4", "010", "恋人とのやりとりで、寂しく感じることはある？", "その寂しさを、相手へのお願いにするなら何を伝えたい？"],
  ["love-1-7", "011", "恋人には、どんな呼び方をしてもらいたい？", "ふたりきりの時と人前で、呼び方の希望は変わる？"],
  ["love-1-12", "012", "恋人と過ごす日常で、幸せを感じる瞬間は？", "その瞬間を増やすなら、二人で何ができそう？"],
  ["love-2-2", "013", "恋人に甘える時と甘えられる時、どちらが自分には心地いい？", "甘えたい気分と余裕のない気分を、どう伝え合いたい？"],
  ["love-2-3", "014", "恋人とは、どのくらいの頻度で会いたい？", "会いたい回数が違う時、お互いに無理のない予定をどう探したい？"],
  ["love-3-3", "015", "恋人とのことで不安になった時、どんなふうに気持ちを伝えたい？", "その話を聞く相手に、最初にしてもらいたいことは？"],
  ["love-3-4", "016", "恋人とけんかをしたら、どんなふうに仲直りしたい？", "仲直りを急ぐ前に、確かめておきたい気持ちは？"],
  ["love-3-6", "017", "恋人と過ごしやすくするために、自分から変えてみたい習慣はある？", "その変化を、自分も納得して続けるために必要なことは？"],
  ["love-3-7", "018", "恋人と付き合う中でも、変えずに大切にしたい自分らしさは？", "その自分らしさを、相手にどう知ってもらいたい？"],
  ["love-3-8", "019", "恋人への愛情表現が、お互いの負担にならないために大切なことは？", "受け取り方が違う時、どんなふうに確かめ合いたい？"],
  ["love-4-1", "020", "恋人に嫉妬した時、その気持ちを伝えられる？", "相手の行動を制限せず、自分の気持ちを伝えるなら？"],
  ["love-4-5", "021", "恋人に話すことと、自分だけにしておくことの境目は？", "相手が話さないと選んだ時、どんな受け止め方をしたい？"],
  ["editorial-couples-review-020", "022", "恋人同士でも、スマホや個人アカウントで守りたいプライバシーは？", "二人の写真を投稿する時、どんな確認をしておきたい？"],
  ["love-4-8", "023", "恋人と会えない日が続く時、どんなやりとりがあると安心する？", "そのやりとりを、お互いに無理なく続ける工夫は？"],
  ["love-4-9", "024", "恋人からの愛情表現が物足りない時、どんなふうに希望を伝えたい？", "相手ができることを一緒に考えるなら、何を聞いてみたい？"],
  ["love-4-14", "025", "恋人との触れ合いを断りたい時、言いやすくするには何が必要？", "断られた側は、どんな返事をすると安心につながりそう？"],
  ["love-4-15", "026", "恋人の誘いを断る時、関係への不安を感じることはある？", "断る理由を詳しく話さなくても、受け止めてもらえると思える？"],
  ["love-4-19", "027", "恋人への気持ちが変わった時、どんなふうに話し合いたい？", "すぐに答えを出せない気持ちには、どんな時間が必要？"],
  ["love-4-20", "028", "恋人とすれ違いが増えたら、何から話し合いたい？", "二人が落ち着いて話せるきっかけを作るなら？"],
  ["other-2-5", "029", "恋人の魅力で、今いちばん伝えたいことは？", "その魅力に気づいた場面も添えるなら、何を話したい？", "affection"],
  ["other-3-5", "030", "恋人に応援してほしい自分の目標はある？", "応援の中で、手伝ってほしいことと任せてほしいことの境目は？", "conflictSupport"],
  ["other-4-5", "031", "恋人が一人で抱えているように感じた時、どんな声をかけたい？", "今は話したくないと言われたら、どんなふうに見守りたい？", "conflictSupport"],
  ["date-1-4", "032", "恋人と映画を見る時、作品はどう選びたい？", "見たい作品が違ったら、どんな決め方が楽しそう？"],
  ["date-1-5", "033", "デート中に写真を撮る時、相手にどんな配慮をしてほしい？", "撮ってほしくない時は、どんな合図で伝えたい？"],
  ["date-1-6", "034", "デートの行き先で二人の好みが違ったら、どう決めたい？", "一度試した後、次の行き先はどう相談したい？"],
  ["memories-1-1", "035", "恋人と初めて話した時、どんな印象を持った？", "今あらためて気づく、その人らしさはある？"],
  ["memories-1-2", "036", "恋人への印象は、出会った頃からどう変わった？", "印象が変わるきっかけになった、相手の言葉や行動は？"],
  ["memories-1-6", "037", "二人でしたことの中で、もう一度やってみたいことはある？", "次にやるなら、前と変えてみたいところは？"],
  ["memories-3-5", "038", "付き合い始めた頃より、二人の距離が縮まったと感じるのはどんな時？", "その近さを心地よく保つために、大切にしたいことは？"],
  ["memories-4-2", "039", "恋人との間で、これから少しずつ知っていきたいことは？", "相手が話す範囲を選べるよう、どんな聞き方をしたい？"],
  ["memories-4-3", "040", "恋人がかけてくれた言葉で、印象に残っているものは？", "その言葉を今の相手に返すなら、どんな気持ちを伝えたい？"],
  ["affection-1-2", "041", "恋人とハグする時、先に確かめてほしいことは？", "今日はハグをしたくない時、どう伝えられると楽？"],
  ["affection-1-4", "042", "恋人に頭をなでられることを、どう感じる？", "触れられる場所やタイミングの希望を、どう共有したい？"],
  ["affection-1-5", "043", "恋人に甘えたい時、自分から伝えるのは得意？苦手？", "言葉で伝えにくければ、使ってみたい小さな合図は？"],
  ["affection-2-3", "044", "恋人に褒められるなら、どんな伝え方がうれしい？", "ふたりきりで伝えられる時と人前では、感じ方が変わる？"],
  ["affection-2-6", "045", "寂しい時、恋人にどんなふうに接してほしい？", "自分の寂しさを、相手が気づきやすい言葉にするなら？"],
  ["affection-3-1", "046", "人前で恋人と仲良くする時、どんな距離感が心地いい？", "人前では控えたいことを、いつ相談しておきたい？"],
  ["affection-3-3", "047", "恋人と並んで歩く時、どのくらいの距離が心地いい？", "近づきたい時と少し離れたい時を、どう伝え合いたい？"],
  ["affection-3-6", "048", "泣きたい時、恋人にはそばにいてほしい？一人で過ごしたい？", "その日の希望を、無理なく伝えられる方法は？"],
  ["affection-4-1", "049", "恋人からの愛情表現で、少し困るものはある？", "その気持ちを伝えるなら、どんな反応で聞いてもらいたい？"],
  ["affection-4-6", "050", "恋人との距離が近すぎると感じることはある？", "離れて過ごしたい時間を、どんなふうに伝えたい？"],
  ["editorial-couples-review-028", "051", "恋人と話すなら、電話とメッセージのどちらが好き？", "大事な話をする時には、連絡の方法を変えたい？"],
  ["contact-distance-1-2", "052", "恋人とは毎日連絡したい？必要な時に連絡したい？", "連絡を休みたい日も、気軽に伝えられる約束は？"],
  ["contact-distance-1-3", "053", "恋人と電話をするなら、どのくらいの長さが心地いい？", "電話を終えたい時、どんな言葉なら切り出しやすい？"],
  ["contact-distance-1-4", "054", "恋人との電話は、眠る前に区切りをつけたい？つないでおきたい？", "眠くなった日にも、お互いの休みを大切にするには？"],
  ["editorial-couples-review-029", "055", "恋人にメッセージを送るなら、どんな日常を伝えたい？", "何気ない報告には、どんな返事があるとうれしい？"],
  ["contact-distance-1-6", "056", "恋人と電話で話すなら、どんな話題が楽しい？", "長く話したい日は、相手の都合をどう確かめたい？"],
  ["contact-distance-2-1", "057", "恋人からの返信が遅い時、不安になることはある？", "返信を待つ間、自分のペースを保つために何があると助かる？"],
  ["contact-distance-2-2", "058", "恋人がすぐに返信できない時、どんな伝え方だと安心する？", "その伝え方を、忙しい側にも負担の少ない形にするなら？"],
  ["contact-distance-2-4", "059", "恋人と毎日話すなら、どんな時間に話したい？", "話す時間が合わない日は、どう調整したい？"],
  ["contact-distance-2-5", "060", "忙しくて連絡を減らしたい時、恋人にどう伝えたい？", "連絡のペースを戻す時期は、どのくらい共有しておきたい？"],
  ["contact-distance-3-1", "061", "恋人と付き合う中で、一人の時間はどのくらい必要？", "一人の時間が足りないと気づいたら、何を相談したい？"],
  ["contact-distance-3-3", "062", "恋人との距離が遠く感じる時、どう気持ちを確かめ合いたい？", "会う回数以外に、つながりを感じられることは？"],
  ["contact-distance-3-6", "063", "恋人との連絡が減ると、気持ちも離れたように感じる？", "連絡が減った理由を、どんなふうに聞いてみたい？"],
  ["editorial-couples-review-031", "064", "恋人と連絡の頻度や方法が違う時、どうすり合わせたい？", "試してみた方法が合わなかったら、どう話し直したい？"],
  ["contact-distance-4-3", "065", "恋人に寂しさを伝える時、どんな言葉なら話しやすい？", "聞いた相手に、まずどんな返事をしてもらいたい？"],
  ["contact-distance-4-4", "066", "自分からの連絡が減る時、恋人にどう受け止めてほしい？", "相手に誤解してほしくないことを、先に伝えるなら？"],
  ["contact-distance-4-5", "067", "すぐに返信できない日のために、恋人とどんな約束をしておきたい？", "その約束を見直したくなった時、どう切り出したい？"],
  ["jealousy-1-1", "068", "恋人に嫉妬することはある？", "その気持ちに気づいた時、まず自分の何を確かめたい？"],
  ["editorial-couples-review-022", "069", "恋人に気にかけてもらう時、どんな関わり方が心地よい？", "心地よさが変わった時、相手にどう知らせたい？"],
  ["jealousy-2-1", "070", "恋人とのどんなやりとりで、嫉妬を感じることがある？", "その場面で、自分が安心するために聞きたいことは？"],
  ["jealousy-2-4", "071", "恋人が自分のことに集中している時、自分はどう過ごしたい？", "一緒の時間がほしくなったら、どんな誘い方をしたい？"],
  ["jealousy-2-5", "072", "恋人に心配してもらうことが、負担に感じることはある？", "自分に任せてほしい範囲を、どんな言葉で伝えたい？"],
  ["jealousy-2-6", "073", "恋人への不安を、責めずに伝えるなら何と言いたい？", "話を聞いてもらう場として、どんな時間がよさそう？"],
  ["jealousy-3-4", "074", "恋人の嘘に気づいた時、話し合う前に確かめたいことは？", "すぐに許すか決めずに、考える時間を取れそう？"],
  ["jealousy-4-2", "075", "恋人からのどんな関わり方を、束縛だと感じる？", "自由を大切にしながら、安心のために相談できることは？"],
  ["conflict-support-1-1", "076", "恋人とけんかをした時、すぐ話したい？少し時間がほしい？", "話を再開する目安を、どう伝えておきたい？"],
  ["conflict-support-1-2", "077", "恋人との話し合いで怒りが強い時、落ち着くために何をしたい？", "一度話を止めるなら、どんな合図が使いやすい？"],
  ["conflict-support-1-3", "078", "恋人に謝る時、自分の気持ちをどう言葉にしたい？", "相手がすぐに返事をできない時、どんなふうに待ちたい？"],
  ["conflict-support-1-5", "079", "恋人に悲しい気持ちを知ってほしい時、どんな合図を出せそう？", "理由をまだ話せない時にも、受け止めてほしいことは？"],
  ["conflict-support-1-6", "080", "恋人から相談された時、どんな役割で聞きたい？", "相手がほしい聞き方を、最初にどう確かめたい？"],
  ["conflict-support-2-1", "081", "恋人との会話で、避けてもらいたい言い方はある？", "その言い方がつらいと伝えた時、どう受け止めてもらいたい？"],
  ["conflict-support-2-2", "082", "恋人との冗談で、触れてほしくない話題はある？", "話題の中身を説明せず、やめてほしいと伝える合図は？"],
  ["conflict-support-2-3", "083", "落ち込んでいる時、恋人にどんな言葉をかけてほしい？", "励ましより静かに一緒にいてほしい時は、どう伝えたい？"],
  ["conflict-support-2-6", "084", "恋人に相談した時、最初にどんな反応があると話しやすい？", "助言がほしい時と聞いてほしい時を、どう伝え分けたい？"],
  ["conflict-support-3-3", "085", "恋人に本音を言えない時、どんなふうに時間をもらいたい？", "まだ言葉にできない気持ちを、何と言って伝えておきたい？"],
  ["conflict-support-3-6", "086", "恋人に推測で決めつけず、直接聞いてほしいことはある？", "聞いてほしい時、どんな問いかけだと答えやすい？"],
  ["conflict-support-4-2", "087", "恋人に変えてほしいことを言われた時、どんな話し方だと受け止めやすい？", "すぐには変えられないことを、どう説明したい？"],
  ["conflict-support-4-3", "088", "恋人とけんかをした時のために、二人で決めておきたいルールは？", "ルールが守れなかった後、落ち着いて見直すには？"],
  ["conflict-support-4-6", "089", "恋人と違う本音があっても、安心して話せる関係はどんな関係？", "相手の本音に賛成できない時も、伝えたい受け止め方は？"],
  ["future-values-1-3", "090", "恋人との間に、どんな安心できる時間を作りたい？", "その時間は、日常のどんな場面に取り入れられそう？"],
  ["future-values-2-4", "091", "恋人との信頼を育てるために、自分から続けたいことは？", "相手にも大切にしてもらいたいことを、どう共有したい？"],
  ["future-values-3-6", "092", "恋人と支え合えていると感じるのは、どんな時？", "支える余裕がない時も、気軽に伝え合えるとよさそう？"],
  ["future-values-4-1", "093", "恋人に頼る時も、自分で決めることを大切にするには？", "相談した後、自分の答えを考える時間はどのくらいほしい？"],
  ["future-values-4-2", "094", "二人の将来について、大切にしていきたい約束はある？", "将来の希望が変わった時、その約束をどう話し直したい？"],
  ["future-values-4-3", "095", "恋人とこれからもっと知り合うために、どんな時間を持ちたい？", "まだ話したことがない、気軽に聞いてみたいテーマは？"],
  ["boundaries-2-1", "096", "恋人と体について話す時、どんな配慮があると安心する？", "その話を今日はしたくない時、どう伝えたい？"],
  ["boundaries-2-2", "097", "恋人に外見のことを話される時、触れてほしくない話題はある？", "外見以外に、気づいてもらえるとうれしい自分の良さは？"],
  ["boundaries-2-5", "098", "恋人との会話で苦手な話題になった時、どう切り替えたい？", "話を切り替えたいと言われた側は、どんな返事をしたい？"],
  ["boundaries-3-1", "099", "恋人とハグや手つなぎをする時、大事にしてほしいことは？", "前は平気だったことを今は断りたい時、どう確かめ合いたい？"],
  ["boundaries-3-6", "100", "恋人との触れ合いで、大切にされていると感じるのはどんな時？", "触れ合いたくない時にも、受け取れる愛情表現は？"],
  ["boundaries-4-2", "101", "恋人に「嫌だ」と言われた時、どんな返事をしたい？", "相手が理由を話したくない時も、気持ちを尊重できる伝え方は？"],
  ["boundaries-4-5", "102", "恋人とペースが違う時、お互いの希望をどう確かめたい？", "すぐに一致しない希望は、どんなふうに扱っていきたい？"],
  ["boundaries-4-6", "103", "二人が無理せず付き合えているか、どんなふうに確かめ合いたい？", "今の付き合い方を変えたくなった時、話しやすいきっかけは？"],
  ["predictions-2-2", "104", "恋人が疲れた時、そばにいてほしいかをどう確かめたい？", "一人で休みたいと言われたら、どんな声をかけたい？", "conflictSupport"],
  ["predictions-2-6", "105", "恋人が本音を話しやすいのは、どんな聞き方だと思う？", "本人にも聞いて、話しやすさの希望をどう共有したい？", "conflictSupport"],
  ["predictions-3-1", "106", "恋人がうれしいと感じる愛情表現は、どんなものだと思う？", "その表現が今もうれしいか、どう確かめてから伝えたい？"],
  ["predictions-3-2", "107", "恋人が寂しい時、どんな支え方を望んでいそう？", "支え方の希望が日によって違う時、どう聞き直したい？"],
  ["predictions-3-3", "108", "恋人が不安な時、聞くことと励ますことのどちらを望んでいそう？", "予想と本人の希望が違ったら、どんなふうに合わせたい？"],
  ["predictions-3-4", "109", "恋人が嫉妬や不安を感じた時、話しやすくするには？", "話したくない時にも選べるよう、どんな声をかけたい？", "jealousy"],
  ["predictions-3-5", "110", "恋人は、会えない日が続く時にどんな連絡を望んでいそう？", "連絡の希望を本人に聞くなら、どんな聞き方が自然？"],
  ["predictions-4-3", "111", "恋人が二人の時間に安心できるのは、どんな時だと思う？", "予想を本人に確かめて、新しく気づいたことはある？"],
  ["predictions-4-8", "112", "恋人が自分に大切にされていると感じるのは、どんな時だと思う？", "本人の答えを聞いて、これからも続けたい行動は？"],
  ["love-4-23", "113", "私たちの気持ちが育つ速さが違う時、どんな付き合い方をしたい？", "気持ちを急がせないために、どんな確かめ方がよさそう？"],
];

export const COUPLES_FIT_REWRITES = new Map(relationshipRewrites.map(
  ([sourceId, serial, text, followUp, category]) => [sourceId, {
    id: `editorial-couples-fit-${serial}`,
    text,
    followUp,
    ...(category ? { category } : {}),
    reason: "主質問を、恋人同士の予定・会話・愛情・距離感・支え方を具体的に話せる内容へ編集し、対応する深掘りも更新。",
  }],
));

// 主質問は逐語保持し、深掘りのみピアレビューで中立な表現へ変更する。
export const COUPLES_FIT_FOLLOWUP_ONLY_REWRITES = new Map([
  ["date-2-1", {
    followUp: "そのデートで、一番楽しみにしたい時間は？",
    reason: "主質問にない豪華さとの比較を持ち込まず、本人が楽しみにしたいデートの時間を聞く。",
  }],
  ["memories-2-6", {
    followUp: "その頃の自分に、今の二人のどんなことを知らせたい？",
    reason: "急がなくてよいという結論へ誘導せず、当時の自分に伝えたい現在の関係を本人に選んでもらう。",
  }],
]);

export function curateCouplesQuestions(canonical) {
  const canonicalById = new Map(canonical.map((card) => [card.id, card]));
  const replacements = new Map(fixedReplacements);

  for (const [sourceId, replacementId, text] of reviewRewrites) {
    const original = canonicalById.get(sourceId);
    if (!original) throw new Error(`編集対象が正本ソースにありません: ${sourceId}`);
    replacements.set(sourceId, {
      ...original,
      id: replacementId,
      text,
      source: "editorial",
    });
  }

  for (const id of RELEASE_EXCLUDED_IDS) {
    if (!canonicalById.has(id)) throw new Error(`除外対象が正本ソースにありません: ${id}`);
  }
  for (const id of fixedReplacements.keys()) {
    if (!canonicalById.has(id)) throw new Error(`置換対象が正本ソースにありません: ${id}`);
  }

  const initialRelease = canonical.flatMap((card) => {
    const replacement = replacements.get(card.id);
    if (replacement) return [replacement];
    if (RELEASE_EXCLUDED_CATEGORIES.has(card.category) || RELEASE_EXCLUDED_IDS.has(card.id)) return [];
    return [card];
  });

  const initialIds = new Set(initialRelease.map(card => card.id));
  for (const id of [...COUPLES_FIT_EXCLUDED_IDS, ...COUPLES_FIT_REWRITES.keys()]) {
    if (!initialIds.has(id)) throw new Error(`Couples適合性レビューの対象が旧公開デッキにありません: ${id}`);
  }
  for (const id of COUPLES_FIT_REWRITES.keys()) {
    if (COUPLES_FIT_EXCLUDED_IDS.has(id)) throw new Error(`Couples適合性レビューの除外と編集が重複: ${id}`);
  }

  return initialRelease.flatMap((card) => {
    if (COUPLES_FIT_EXCLUDED_IDS.has(card.id)) return [];
    const rewrite = COUPLES_FIT_REWRITES.get(card.id);
    if (!rewrite) return [card];
    return [{
      ...card,
      id: rewrite.id,
      text: rewrite.text,
      ...(rewrite.category ? { category: rewrite.category } : {}),
      source: "editorial",
    }];
  });
}
