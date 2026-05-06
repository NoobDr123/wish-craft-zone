// Journey-aware copy + dynamic placeholders/tips for the PawPrint Song quiz.
// Ported from the spec's HTML prototype (getProfile, buildJourneyOptions,
// buildThemeOptions, buildDynamicPlaceholders, buildTipsChips).

import type {
  CoreMessage,
  JourneyStage,
  RelationshipKey,
  StageKey,
} from "@/stores/quizStore";

export type RelKey =
  | "husband"
  | "wife"
  | "mother"
  | "father"
  | "son"
  | "daughter"
  | "sibling"
  | "grandparent"
  | "friend"
  | "other"
  | "default";

export interface Profile {
  name: string;
  pronoun: "he" | "she" | "they";
  pronoun_obj: "him" | "her" | "them";
  pronoun_poss: "his" | "her" | "their";
  relation: string;
  isPeer: boolean;
  isElder: boolean;
  isChild: boolean;
  stage: JourneyStage;
  rel: RelKey;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function getProfile(
  relationship: RelationshipKey | undefined,
  relationshipOther: string,
  recipientName: string,
  stage: StageKey | undefined,
): Profile {
  const name = recipientName.trim() || "them";
  const p: Profile = {
    name,
    pronoun: "they",
    pronoun_obj: "them",
    pronoun_poss: "their",
    relation: relationship ?? "loved one",
    isPeer: false,
    isElder: false,
    isChild: false,
    stage: "active",
    rel: "default",
  };

  switch (relationship) {
    case "Husband":
      p.pronoun = "he"; p.pronoun_obj = "him"; p.pronoun_poss = "his"; p.isPeer = true; p.rel = "husband"; break;
    case "Wife":
      p.pronoun = "she"; p.pronoun_obj = "her"; p.pronoun_poss = "her"; p.isPeer = true; p.rel = "wife"; break;
    case "Mother":
      p.pronoun = "she"; p.pronoun_obj = "her"; p.pronoun_poss = "her"; p.isElder = true; p.rel = "mother"; break;
    case "Father":
      p.pronoun = "he"; p.pronoun_obj = "him"; p.pronoun_poss = "his"; p.isElder = true; p.rel = "father"; break;
    case "Son":
      p.pronoun = "he"; p.pronoun_obj = "him"; p.pronoun_poss = "his"; p.isChild = true; p.rel = "son"; break;
    case "Daughter":
      p.pronoun = "she"; p.pronoun_obj = "her"; p.pronoun_poss = "her"; p.isChild = true; p.rel = "daughter"; break;
    case "Sibling":
      p.isPeer = true; p.rel = "sibling"; break;
    case "Grandparent":
      p.isElder = true; p.rel = "grandparent"; break;
    case "Friend":
      p.isPeer = true; p.rel = "friend"; break;
    case "Other":
      p.relation = relationshipOther || "loved one"; p.rel = "other"; break;
  }

  if (stage === "In loving memory") p.stage = "memory";
  else if (stage === "In hospice / final chapter") p.stage = "hospice";
  else p.stage = "active";

  return p;
}

function pickRegister<T>(p: Profile, buckets: { elder?: T; peer?: T; child?: T; default?: T }): T {
  if (p.isElder && buckets.elder) return buckets.elder;
  if (p.isPeer && buckets.peer) return buckets.peer;
  if (p.isChild && buckets.child) return buckets.child;
  return (buckets.default ?? buckets.peer ?? buckets.elder ?? buckets.child)!;
}

// ============================================================
// Q3 — Journey stage radio sub-copy
// ============================================================
export function journeyOptions(p: Profile): { value: StageKey; title: string; sub: string }[] {
  const n = p.name;

  const subs = {
    just_diagnosed: {
      elder: `The world just changed for ${n}. The right words don't exist yet.`,
      peer: `Everything just shifted. You're looking for what to say next to ${n}.`,
      child: `${cap(p.pronoun_poss)} world just changed. You want ${p.pronoun_obj} to feel held.`,
      default: `The world just changed. The right words don't exist yet.`,
    },
    in_treatment: {
      elder: `${n} is in the middle of it. Chemo, scans, hard days.`,
      peer: `You're walking through treatment with ${p.pronoun_obj}. This is for the hard days.`,
      child: `${n} is in treatment. You want ${p.pronoun_obj} to hear ${p.pronoun_poss} strength.`,
      default: `In the middle of it. Chemo, radiation, surgery, infusions.`,
    },
    between: {
      elder: `The waiting rooms. The scan days. ${n} is holding breath.`,
      peer: `The waiting. The scan days. Holding breath together.`,
      child: `Waiting with ${p.pronoun_obj} between rounds. Scan days. Holding breath.`,
      default: `The waiting rooms. The scan days. Holding breath.`,
    },
    remission: {
      elder: `${n} made it through. Scars as badges. The future returned.`,
      peer: `${cap(p.pronoun)} made it. Milestones, celebration, the future returned.`,
      child: `${n} made it through. Every clear scan is a milestone worth a song.`,
      default: `Celebrating. Scars as badges. The milestones, the future returned.`,
    },
    hospice: {
      elder: `${n} is near the end. Love without conditions. Everything you never got to say.`,
      peer: `Final chapter. Love without conditions. Everything you never got to say to ${p.pronoun_obj}.`,
      child: `${cap(p.pronoun_poss)} final chapter. The song they'll carry home with ${p.pronoun_obj}.`,
      default: `Love without conditions. Peace. Release. Everything we couldn't say.`,
    },
    memory: {
      elder: `${n} is gone. A keepsake that keeps ${p.pronoun_obj}.`,
      peer: `You've already said goodbye. A keepsake that keeps ${p.pronoun_obj}.`,
      child: `${n} is gone. A song that carries ${p.pronoun_poss} spirit forward.`,
      default: `For someone we've already said goodbye to. A keepsake that keeps them.`,
    },
  } as const;

  return [
    { value: "Just diagnosed", title: "Just diagnosed", sub: pickRegister(p, subs.just_diagnosed) },
    { value: "In treatment", title: "In treatment", sub: pickRegister(p, subs.in_treatment) },
    { value: "Between treatments", title: "Between treatments", sub: pickRegister(p, subs.between) },
    { value: "In remission / survivor", title: "In remission, or a survivor", sub: pickRegister(p, subs.remission) },
    { value: "In hospice / final chapter", title: "In hospice, the final chapter", sub: pickRegister(p, subs.hospice) },
    { value: "In loving memory", title: "In loving memory", sub: pickRegister(p, subs.memory) },
  ];
}

// ============================================================
// Q7 — Theme list, filtered by journey stage
// ============================================================
type ThemeShow = "always" | "active_only" | "hospice_only" | "memory_only" | "active_or_hospice" | "end_only";
const ALL_THEMES: { value: CoreMessage; title: string; show: ThemeShow }[] = [
  { value: "You are not alone", title: `"You are not alone."`, show: "active_or_hospice" },
  { value: "I'm so proud of your strength", title: `"I'm so proud of your strength."`, show: "active_or_hospice" },
  { value: "Keep fighting, we're with you", title: `"Keep fighting. We're with you."`, show: "active_only" },
  { value: "Thank you for everything", title: `"Thank you for everything."`, show: "always" },
  { value: "It's okay to rest now", title: `"It's okay to rest now."`, show: "hospice_only" },
  { value: "Your love lives on in us", title: `"Your love lives on in us."`, show: "end_only" },
  { value: "We will carry you through this", title: `"We will carry you through this."`, show: "active_or_hospice" },
  { value: "You shaped who I am", title: `"You shaped who I am."`, show: "end_only" },
  { value: "I will remember you every day", title: `"I will remember you, every day."`, show: "memory_only" },
];

export function themeOptions(stage: JourneyStage): { value: CoreMessage; title: string }[] {
  return ALL_THEMES.filter((t) => {
    if (t.show === "always") return true;
    if (t.show === "active_only") return stage === "active";
    if (t.show === "hospice_only") return stage === "hospice";
    if (t.show === "memory_only") return stage === "memory";
    if (t.show === "active_or_hospice") return stage !== "memory";
    if (t.show === "end_only") return stage !== "active";
    return true;
  });
}

// ============================================================
// Q4 — Fighting for / holding onto / lived for
// ============================================================
export function q4Copy(p: Profile) {
  const n = p.name;
  const questions: Record<JourneyStage, string> = {
    active: `Who or what is ${n} fighting for?`,
    hospice: `What is ${n} holding onto? What feels most precious to ${p.pronoun_obj} right now?`,
    memory: `Who and what did ${n} live for?`,
  };
  const helpers: Record<JourneyStage, string> = {
    active: p.isElder
      ? `A few lines. The people, places, and things that matter most to ${p.pronoun_obj}.`
      : p.isChild
      ? `A few lines. What ${p.pronoun} love most. What keeps ${p.pronoun_obj} going.`
      : `A few lines. Names, places, things that pull ${p.pronoun_obj} forward.`,
    hospice: `A few lines. The people, moments, and small things ${p.pronoun} still reach for.`,
    memory: `A few lines. The people, the dreams, the everyday things that made up ${p.pronoun_poss} world.`,
  };
  const sublabels: Record<JourneyStage, string> = {
    active: "They are fighting for…",
    hospice: "What they are holding onto…",
    memory: "What they lived for…",
  };

  const placeholders: Record<JourneyStage, Partial<Record<RelKey, string>>> = {
    active: {
      mother: `${n}'s grandchildren. The garden she planted last spring. The wedding she wants to see.`,
      father: `${n}'s three kids. The workshop he built by hand. Watching his grandkids grow up.`,
      wife: `Our two little girls. The life we've built. The anniversaries still ahead.`,
      husband: `Our kids. The house we built together. Forty more years with his family.`,
      daughter: `Her friends. The books still on her shelf. Every dream she hasn't started yet.`,
      son: `His friends. The music he plays. The future he hasn't had yet.`,
      sibling: `Their family. The memories we share. The years still ahead.`,
      grandparent: `${n}'s grandchildren and great grandchildren. The family ${p.pronoun} built.`,
      friend: `Their family. The people who love them. Every tomorrow.`,
    },
    hospice: {
      mother: `Her grandchildren's voices. Our Sunday calls. The small things she still asks about.`,
      father: `His hand in mine. The old songs. The people coming to sit with him.`,
      wife: `Our daughter's laugh. My hand in hers. The sunlight in the window.`,
      husband: `Our kids. My voice reading to him. The quiet afternoons.`,
      daughter: `Her stuffed animal. Her favorite song. My voice telling her it's okay.`,
      son: `His favorite books. My voice close to his ear. The people he loves most.`,
      sibling: `The old stories. My voice. The family that keeps showing up.`,
      grandparent: `Her grandchildren's faces. The old hymns. The quiet in the room.`,
      friend: `Old memories. The people who love them. The quiet at the end.`,
    },
    memory: {
      mother: `Her kids. Her garden. Sunday dinners. The life she poured herself into.`,
      father: `His family. His work. The quiet way he loved people.`,
      wife: `Our daughters. Our life together. The dreams we built.`,
      husband: `Our kids. The home he made. The love he gave without words.`,
      daughter: `Her friends. Her dreams. Every kind thing she did.`,
      son: `His people. His music. The way he made everyone feel seen.`,
      sibling: `Our childhood. Our family. The plans we'll never finish.`,
      grandparent: `Her grandchildren. The stories she told. The love that never stopped.`,
      friend: `Their family. The friendships they built. The way they showed up.`,
    },
  };

  const fallback: Record<JourneyStage, string> = {
    active: `The people ${p.pronoun} love. The dreams ${p.pronoun} still want. The mornings still ahead.`,
    hospice: `The small things still reaching them. The voices. The light in the room.`,
    memory: `The people ${p.pronoun} loved. The work ${p.pronoun} cared about. The small everyday things.`,
  };

  return {
    question: questions[p.stage],
    helper: helpers[p.stage],
    sublabel: sublabels[p.stage],
    placeholder: placeholders[p.stage][p.rel] ?? fallback[p.stage],
  };
}

// ============================================================
// Q5 — Qualities (gentle tense shift for memory)
// ============================================================
export function q5Copy(p: Profile) {
  const n = p.name;
  const questions: Record<JourneyStage, string> = {
    active: `What do you love most about ${n}?`,
    hospice: `What do you love most about ${n}?`,
    memory: `What do you love most about who ${n} was?`,
  };
  const helpers: Record<JourneyStage, string> = {
    active: p.isPeer
      ? `What makes them them. Your favorite things. The stuff only you would notice.`
      : p.isChild
      ? `The light in them. What you love most about who they are.`
      : `Their quirks, their energy, the things that make them themselves.`,
    hospice: `The parts of them that shine through, even now. The things you want the song to hold.`,
    memory: `Their quirks, their energy, the things that made them themselves.`,
  };
  const sublabels: Record<JourneyStage, string> = {
    active: "The qualities you love most",
    hospice: "The qualities you love most",
    memory: "The qualities you still carry",
  };

  const active: Partial<Record<RelKey, string>> = {
    mother: `Warm, fierce, the one who remembers everyone's birthday. Never lets a grandkid leave without a sandwich.`,
    father: `Steady, funny in that quiet way, the kind of man who fixes things without being asked.`,
    wife: `The loudest laugh in any room. Fierce about the people she loves. Never says no to a dance.`,
    husband: `Calm in a storm. The one everyone calls when something breaks. Always has something dry to say.`,
    daughter: `Fierce, funny, soft where it matters. The kind of kid who stops to notice everything.`,
    son: `Kind. Curious. The sort of boy who makes friends on a first day.`,
    sibling: `Stubborn. Hilarious. The reason family holidays were bearable.`,
    grandparent: `Patient. Storyteller. The one who made every child feel like the favorite.`,
    friend: `The friend who shows up. The one you call first. The laugh you'd know in any room.`,
  };
  const memory: Partial<Record<RelKey, string>> = {
    mother: `Warm. Fierce. She remembered everyone's birthday. She never let a grandkid leave without a sandwich.`,
    father: `Steady. Funny in that quiet way. The kind of man who fixed things without being asked.`,
    wife: `She had the loudest laugh in any room. She was fierce about the people she loved. She never said no to a dance.`,
    husband: `Calm in a storm. The one everyone called when something broke. Always had something dry to say.`,
    daughter: `Fierce, funny, soft where it mattered. She stopped to notice everything.`,
    son: `Kind. Curious. He made friends on a first day.`,
    sibling: `Stubborn. Hilarious. The reason family holidays were bearable.`,
    grandparent: `Patient. A storyteller. She made every child feel like the favorite.`,
    friend: `The friend who showed up. The one you called first. A laugh you'd know in any room.`,
  };

  const source = p.stage === "memory" ? memory : active;
  const fallback = p.stage === "memory"
    ? `The things that made them them. Their quirks, their energy, their laugh.`
    : `The little things that make them them. Their quirks, their energy, their laugh.`;

  return {
    question: questions[p.stage],
    helper: helpers[p.stage],
    sublabel: sublabels[p.stage],
    placeholder: source[p.rel] ?? fallback,
  };
}

// ============================================================
// Q6 — One memory
// ============================================================
export function q6Copy(p: Profile) {
  const helpers: Record<JourneyStage, string> = {
    active: `Something small. Something specific. This is often where the song finds its heart.`,
    hospice: `Something small. Something specific. A moment you want the song to hold for both of you.`,
    memory: `Something small. Something specific. A moment with them that always stays with you.`,
  };

  const placeholders: Partial<Record<RelKey, string>> = {
    mother: `The way she used to sing to us in the car. Always the same three songs, always a little off key, always loud.`,
    father: `Teaching me to fish at the lake the summer I was eight. He didn't catch anything. I didn't either. Best day.`,
    wife: `The night we got engaged. It rained. She laughed the whole way home soaking wet.`,
    husband: `The morning he made pancakes shaped like hearts for our daughter's birthday. He was so proud.`,
    daughter: `The day she learned to ride a bike. She fell six times and got back on every time.`,
    son: `The way he used to fall asleep on my chest as a baby. His whole hand only covered one of my fingers.`,
    sibling: `Our childhood summers at the lake. The way she'd always push me in first.`,
    grandparent: `Sitting on her porch in August, drinking sweet tea, listening to her tell the same story for the hundredth time.`,
    friend: `The time we drove fourteen hours to see a band. We missed the show but it didn't matter.`,
  };

  return {
    question: `Share a memory you'll never forget.`,
    helper: helpers[p.stage],
    sublabel: "A memory you'll never forget",
    placeholder: placeholders[p.rel] ?? `One moment, one detail. Something only you would remember.`,
  };
}

// ============================================================
// Q8 — Letter
// ============================================================
export function q8Copy(p: Profile) {
  const n = p.name;
  const questions: Record<JourneyStage, string> = {
    active: `In your own words, what do you want to say to ${n}?`,
    hospice: `What do you want ${n} to hear, before you can't say it again?`,
    memory: `What do you want ${n} to know, even now?`,
  };
  const helpers: Record<JourneyStage, string> = {
    active: `Write like you're writing to them, not to us. Specifics matter more than anything.`,
    hospice: `Write it like you're sitting beside them. Every detail counts. There's no wrong way.`,
    memory: `Write to them, like they're listening. Past tense or present, whatever feels true.`,
  };

  const active: Partial<Record<RelKey, string>> = {
    mother: `Mom, I don't know how to say this in a way that's big enough. You taught me that love isn't a feeling, it's a thousand small things you do over and over. I'm scared. But I'm more in awe of you. I love you forever.`,
    father: `Dad, you never had to tell me you loved me. I always knew. From the way you showed up. I just need you to know I see it. All of it. I love you.`,
    wife: `My love, I married you because you made the hard parts feel smaller. You still do. I'm right here. Every scan, every night, every morning after. I'm right here.`,
    husband: `My love, you're the steadiest man I've ever known. Whatever this is, we meet it the way we meet everything. Together. I love you more than I know how to say.`,
    daughter: `My girl, you are the bravest person I know. Braver than me. Whatever happens, you are my favorite thing in the whole world.`,
    son: `My boy, you have your whole life in you. All of it. I see it. Whatever this is, we are walking through it together.`,
    sibling: `You have been my person since we were kids. I'm not going anywhere. I love you.`,
    grandparent: `You taught me what it means to love someone for a lifetime. I hope you hear that in every note of this.`,
    friend: `You've been there for everything. The wins, the worst, the weird middle. Let me be there for this.`,
  };
  const hospice: Partial<Record<RelKey, string>> = {
    mother: `Mom, you taught me that love isn't a feeling, it's a thousand small things done over and over. Thank you for all of it. For the lunches, the calls, the way you always answered. I will carry you forever. It's okay. I've got it from here.`,
    father: `Dad, you never had to say it. I always knew. Thank you for showing up, every single time. I will love you forever. Rest now.`,
    wife: `My love. Thank you for the life. For our girls. For every morning. I will love you every day that's left for me. You can rest.`,
    husband: `My love. You have been my home. Thank you for everything you built with me. I'm here. It's okay to let go.`,
    daughter: `My girl. I will hold you with me every day I live. You are everything that was ever good. I love you forever.`,
    son: `My boy. You made us more than we ever were before you. Thank you for being ours. I love you forever.`,
    sibling: `Thank you for being my person. I will carry you with me every single day. I love you.`,
    grandparent: `You taught us how to love. Thank you for every story, every meal, every Sunday. You can rest now.`,
    friend: `You were my person. Thank you for every year of it. I love you. Rest easy.`,
  };
  const memory: Partial<Record<RelKey, string>> = {
    mother: `Mom. I want you to know I hear you in my head every day. The way you sang in the car. The way you always called twice. I became who I am because you made me. I love you. Still. Always.`,
    father: `Dad. You were the steadiest man I knew. I catch myself doing things the way you did them, and I smile. Thank you for every quiet lesson. I carry you with me.`,
    wife: `My love. I still set the table for two sometimes. I still hear your laugh in the morning. Thank you for the life you gave me. I am still yours.`,
    husband: `My love. You built this home with me, and it still holds your handprints everywhere. Thank you for all of it. I love you still.`,
    daughter: `My girl. I miss you in the small things. The songs that were yours. The way you made everything brighter. I carry you forever.`,
    son: `My boy. You left a shape in the world that no one else will fill. I see you in every good thing I do. I love you forever.`,
    sibling: `You were the keeper of our childhood. I still talk to you in my head. I hope you can hear me.`,
    grandparent: `I still smell your kitchen when I bake. I still hear your voice when I tell the old stories. You never really left.`,
    friend: `I still text you sometimes. I hope you know. You made my life better. You still do.`,
  };

  const source = p.stage === "memory" ? memory : p.stage === "hospice" ? hospice : active;
  const fallback = p.stage === "memory"
    ? `Write to them like they're listening. Past tense or present, whatever feels true.`
    : p.stage === "hospice"
    ? `Write like you're sitting beside them. Every detail counts.`
    : `Write like you're writing directly to them. Specific, honest, as long or short as you want.`;

  return {
    question: questions[p.stage],
    helper: helpers[p.stage],
    sublabel: "Your letter",
    placeholder: source[p.rel] ?? fallback,
  };
}

// ============================================================
// Tips chips
// ============================================================
export function q4Tips(p: Profile): string[] {
  const n = p.name;
  const sets = {
    active: {
      mother: ["her kids and grandkids", "her garden or home", "a wedding or milestone coming", "Sunday dinners", "something she keeps saying"],
      father: ["his kids and grandkids", "his work or craft", "the people he protects", "fishing or the outdoors", "a phrase he always says"],
      wife: ["your kids", "the life you built", "the anniversaries ahead", "mornings together", "a shared dream"],
      husband: ["your kids", "the home you built", "the years ahead", "quiet Sundays", "a trip still to take"],
      daughter: ["her friends", "her dreams", "books or music she loves", "places she wants to see", "a milestone coming up"],
      son: ["his friends", "his music or sports", "his dreams", "first jobs and milestones", "the people who love him"],
      sibling: ["their kids", "shared memories", "the years ahead", "inside jokes that keep going"],
      grandparent: ["grandchildren and great grandchildren", "the family she built", "old traditions", "a specific recipe or ritual"],
      friend: ["their family", "the people who love them", "their work or passion", "every tomorrow"],
      default: ["the people they love", "a place that matters to them", "a dream they still want", "a phrase they say often"],
    },
    hospice: {
      mother: [`${p.pronoun_poss} grandchildren's voices`, "Sunday calls or visits", "the small things she still asks about", `${p.pronoun_poss} hand in yours`, "favorite songs or hymns"],
      father: [`${p.pronoun_poss} hand in yours`, "old songs or stories", "the people sitting with him", "a favorite chair or place", `${p.pronoun_poss} family around him`],
      wife: ["your daughter or son", "your hand in hers", "sunlight in the window", "her favorite music", "a shared memory you keep returning to"],
      husband: ["your kids", "your voice near him", "quiet afternoons together", "a phrase he loved", "the life you built"],
      daughter: ["her stuffed animal or comfort object", "her favorite song", "your voice telling her it is okay", "family around her"],
      son: ["his favorite book", "your voice close to his ear", "the people who love him most", "a song he loved"],
      sibling: ["the old stories", "your voice", "family that keeps showing up", "a memory that stayed"],
      grandparent: ["grandchildren by the bed", "old hymns", "the quiet in the room", "the stories she told"],
      friend: ["old memories together", "the people who love them", "a song or place that mattered"],
      default: ["a hand still reaching", "a voice still speaking", "light in the room", "someone who loves them"],
    },
    memory: {
      mother: ["her kids", "her garden or kitchen", "Sunday dinners", "the life she poured into people", "a phrase she always said"],
      father: ["his family", "his work or workshop", "the quiet ways he showed love", "something he always said", "the people he raised"],
      wife: ["your daughters or sons", "your life together", "the dreams you built", "her favorite things", "her laugh"],
      husband: ["your kids", "the home he made", "his quiet love", "his favorite songs", "how he showed up"],
      daughter: ["her friends", "her dreams", "every kind thing she did", "the way she laughed", "her favorite things"],
      son: ["his people", "his music", "the way he made everyone feel seen", "his dreams", "his laugh"],
      sibling: ["your childhood", "family traditions", "inside jokes", "plans that never happened", "how they made you better"],
      grandparent: ["grandchildren", "the stories she told", "the food she made", "old hymns or prayers", "love that never stopped"],
      friend: ["their family", "the friendships they built", "how they showed up", "the way they laughed"],
      default: ["the people they loved", "the work they cared about", "the small everyday things", "a phrase or habit of theirs"],
    },
  } as const;
  const bucket = sets[p.stage] as Record<string, readonly string[]>;
  return [...(bucket[p.rel] ?? bucket.default)];
}

export function q5Tips(p: Profile): string[] {
  const sets: Record<string, readonly string[]> = {
    mother: ["her laugh", "how she loves", "something everyone knows about her", "a quirk you love", "her voice"],
    father: ["his quiet strength", "something he always says", "the way he shows up", "his sense of humor", "a habit of his"],
    wife: ["her laugh", "the way she loves", "how she enters a room", "her favorite things", "something only you know"],
    husband: ["his steadiness", "how he shows love without words", "a saying of his", "the way he laughs", "what he does when no one is looking"],
    daughter: ["the way she notices things", "her bravery", "her softness", "how she makes people feel", "her favorite things"],
    son: ["how he makes friends", "his curiosity", "his kindness", "the way he laughs", "a passion of his"],
    sibling: ["shared history", "how they make you laugh", "a quirk", "something only siblings know", "a habit of theirs"],
    grandparent: ["how she makes people feel like the favorite", "her storytelling", "her patience", "the food or smell of her home"],
    friend: ["how they show up", "the way they laugh", "what they would drop everything for", "a catchphrase", "how they love"],
    default: ["their laugh", "how they love people", "a specific quirk", "something everyone knows about them", "a phrase they say"],
  };
  return [...(sets[p.rel] ?? sets.default)];
}

export function q6Tips(p: Profile): string[] {
  const stageKey = p.stage === "memory" ? "memory" : "active_or_hospice";
  const sets = {
    active_or_hospice: {
      mother: ["a moment in the car together", "something she taught you", "a meal she made", "a trip you took", "a day that still makes you laugh"],
      father: ["something he taught you", "a trip together", "a lesson he gave without trying", "a specific morning or night", "a laugh you shared"],
      wife: ["how you met", "the day you got engaged", "a trip or adventure", "an ordinary morning", "a moment that felt forever"],
      husband: ["how you met", "your wedding day", "an ordinary moment that felt like home", "a trip or adventure", "a small daily ritual"],
      daughter: ["a first (steps, bike, word)", "a song she loved", "a trip together", "something she said that stayed with you"],
      son: ["a first (steps, bike, word)", "a song you shared", "a trip together", "a thing he said at age 5 that you still think about"],
      sibling: ["childhood summers", "a fight you both laughed about later", "a road trip", "an inside joke"],
      grandparent: ["summers at her house", "a story she told over and over", "a specific meal", "a holiday tradition"],
      friend: ["how you met", "a wild night", "something they did when you needed it", "a trip together", "a phrase of theirs"],
      default: ["a first", "a trip or day out", "a meal or ritual", "something they said that stayed with you"],
    },
    memory: {
      mother: ["a Sunday at her kitchen table", "something she taught you", "the way she sang or hummed", "her laugh", "a phrase she always said"],
      father: ["something he taught you", "a fishing or travel day", "a specific lesson", "the smell of his aftershave or workshop", "a laugh of his"],
      wife: ["the day you met", "your wedding", "an ordinary morning that felt eternal", "a trip together", "a small habit you miss"],
      husband: ["the day you met", "your wedding", "a shared morning routine", "a trip you took", "a habit of his you still feel"],
      daughter: ["a first", "her favorite song", "something she said that floored you", "a laugh of hers", "a trip together"],
      son: ["a first", "his favorite song", "something he said that stayed with you", "his laugh", "a trip together"],
      sibling: ["childhood summers", "an inside joke", "a fight you laughed about later", "a trip or holiday"],
      grandparent: ["summers at her house", "a recipe or dish", "a specific story", "a holiday with her"],
      friend: ["how you met", "a trip or adventure", "a night you still talk about", "how they showed up for you once"],
      default: ["a first together", "a trip or day", "a meal or ritual", "something they said that stays with you"],
    },
  } as const;
  const bucket = sets[stageKey] as Record<string, readonly string[]>;
  return [...(bucket[p.rel] ?? bucket.default)];
}

export function q8Tips(p: Profile): string[] {
  const sets: Record<JourneyStage, readonly string[]> = {
    active: [
      "what you usually can't say out loud",
      "a specific memory you come back to",
      "why you love who they are",
      "something you want them to hear today",
      "a promise or a small truth",
    ],
    hospice: [
      "thank you, for the specific things",
      "what they taught you",
      "permission to rest",
      "a memory you want to carry",
      "something you never quite said",
    ],
    memory: [
      "what you would say if they could hear",
      "how you carry them",
      "a specific memory that keeps returning",
      "something you wish you had said",
      "what they gave you that stayed",
    ],
  };
  return [...sets[p.stage]];
}
