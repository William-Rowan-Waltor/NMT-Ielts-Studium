// Curated strategy data from the user's local IELTS Reading eBook reference.
// Keep this file UI-agnostic: Reading UI/AI prompts should consume these globals.
const READING_STRATEGY_SOURCE = Object.freeze({
  title: "The Complete A to Z Guide to IELTS Reading",
  publisher: "IELTS Writing Academy",
  year: 2016,
  note: "Faithful structured strategy notes from the user's local reference PDF; not official IELTS material."
});

const READING_STRATEGY_SUBSKILLS = Object.freeze([
  {
    id: "skimming",
    label: "Skimming",
    definition: "Read a whole text or a large part of it quickly to understand the general meaning before working in detail.",
    steps: [
      "Read the questions first so you know what kind of information matters.",
      "Use the title and sub-headings to predict the overall subject.",
      "Give extra attention to the first and last paragraphs because they often frame the whole text.",
      "Move faster than normal reading speed and aim for topic and purpose, not every word.",
      "Use the overall meaning to decide where detailed answers are likely to sit."
    ],
    demoMetaphor: "Like scanning a newspaper front page: you decide what each story is about before choosing one to read closely."
  },
  {
    id: "scanning",
    label: "Scanning",
    definition: "Look quickly through the text for a particular word, phrase, name, number, date, or paraphrased clue.",
    steps: [
      "Read the question first and choose the clue you need to locate.",
      "Look for visible anchors such as names, dates, places, numbers, technical terms, or clear noun phrases.",
      "Search for synonyms and paraphrases when the exact wording is not repeated.",
      "Find the relevant paragraph or sentence rather than reading line by line.",
      "After locating the likely place, switch to close reading before choosing an answer."
    ],
    demoMetaphor: "Like checking cinema listings: you search for the film title first, then read the times beside it."
  },
  {
    id: "close_reading",
    label: "Close Reading",
    definition: "Read the relevant sentence or paragraph carefully enough to understand the exact meaning and choose the answer.",
    steps: [
      "Use skimming or scanning first to locate the likely evidence.",
      "Reread the question or statement so the target meaning is clear.",
      "Read the full sentence and nearby context, not only the matching keyword.",
      "Check qualifiers, contrast words, cause-effect language, and attitude markers.",
      "Choose the answer only when the evidence matches the question meaning exactly."
    ],
    demoMetaphor: "Like reading an important email: one missed qualifier can change the whole reply."
  },
  {
    id: "dealing_with_new_words",
    label: "Dealing With New Words",
    definition: "Handle unknown vocabulary without panic by deciding whether it is necessary and using context when it is necessary.",
    steps: [
      "Decide whether the unknown word is actually needed for the answer.",
      "Ignore it and continue if the answer can be found without it.",
      "If it matters, infer meaning from the title, heading, sentence, and surrounding ideas.",
      "Use the word form or function to narrow the meaning: noun, verb, adjective, or phrase.",
      "Mark useful unknown words for later review instead of stopping the test flow."
    ],
    demoMetaphor: "Like meeting an unfamiliar road sign: first decide whether it affects your route, then use the surrounding signs to infer it."
  },
  {
    id: "context",
    label: "Context",
    definition: "Use nearby words, paragraph meaning, and grammar to infer meaning or decide whether a clue is relevant.",
    steps: [
      "Read the sentence around the unknown word or answer clue.",
      "Use the paragraph's general meaning and topic sentence as a guide.",
      "Identify the grammar role of the word or phrase.",
      "Try replacing it with a known word that would make sense in the same position.",
      "Move on if the meaning is not essential or is taking too much time."
    ],
    demoMetaphor: "Like solving one missing puzzle piece by looking at the colors and shapes around the gap."
  },
  {
    id: "topic_sentences",
    label: "Topic Sentences",
    definition: "Use the sentence that introduces a paragraph's topic and controlling idea to understand its main direction.",
    steps: [
      "Read the first sentence of a paragraph before reading details.",
      "Separate the broad topic from the narrower idea the writer will discuss.",
      "Use that controlling idea to predict the paragraph's development.",
      "Compare the topic sentence with the final sentence when matching headings.",
      "Do not let one interesting detail replace the paragraph's main idea."
    ],
    demoMetaphor: "Like a signpost: it tells you the direction before you walk through the details."
  },
  {
    id: "vocabulary_building",
    label: "Vocabulary Building",
    definition: "Improve Reading performance by repeatedly reading/listening to real English, recording useful vocabulary, and reviewing it.",
    steps: [
      "Read and listen to genuine English sources regularly.",
      "Record new words, phrases, collocations, and useful paraphrases.",
      "Add short context notes so the word is tied to real usage.",
      "Review the items regularly so they remain available during timed reading.",
      "Use the same cycle for IELTS topics that appear often: science, society, education, work, environment, and technology."
    ],
    demoMetaphor: "Like a three-step loop: read or listen, record what matters, then review until it stays."
  }
]);

const READING_STRATEGY_QUESTION_TYPES = Object.freeze([
  {
    id: "short_answer",
    label: "Short Answer",
    aliases: ["short_answer_questions"],
    sourcePages: [6, 7, 8, 9],
    skillsTested: [
      "Scan for specific information.",
      "Skim the passage to understand overall meaning.",
      "Understand exactly what the question asks.",
      "Think of synonyms and paraphrases for question keywords."
    ],
    commonProblems: [
      "Writing more words than the limit allows.",
      "Missing synonyms or paraphrases of the question keywords.",
      "Reading every word instead of using skimming and scanning.",
      "Panicking when an unfamiliar word or phrase appears."
    ],
    tips: [
      "Answers usually follow the same order as the text.",
      "Read and understand the questions before reading the passage in detail.",
      "Check the word limit before writing the answer.",
      "Do not give your opinion; answer only from the text.",
      "Treat nouns and noun phrases in the question as likely keywords."
    ],
    strategySteps: [
      "Read the instructions and note the word limit.",
      "Read the questions and decide what information each one needs.",
      "Mark the key nouns, noun phrases, names, numbers, or dates.",
      "Predict synonyms or paraphrases that could appear in the passage.",
      "Locate the relevant part of the text.",
      "Reread the question, then read the located section carefully.",
      "Copy the short answer from the evidence and check the word limit.",
      "Continue in order unless a question is taking too long."
    ]
  },
  {
    id: "multiple_choice",
    label: "Multiple Choice",
    aliases: ["mcq", "multiple_choice_multiple"],
    sourcePages: [10, 11, 12, 13],
    skillsTested: [
      "Scan for the part of the text containing the answer.",
      "Understand the main ideas in the text.",
      "Read the relevant part in detail.",
      "Differentiate between close answer options."
    ],
    commonProblems: [
      "Leaving a question blank instead of making a best choice.",
      "Reading the passage before checking what the questions ask.",
      "Being trapped by distractors or qualifying words.",
      "Choosing before reading the question, options, and evidence carefully."
    ],
    tips: [
      "Read the question before the passage.",
      "Always choose an answer, even if you must make an educated guess.",
      "Narrow four options down to two or three before deciding.",
      "Rephrase unclear options in your own words.",
      "Watch for distractors and qualifiers.",
      "Predict the answer before reading the relevant part when possible.",
      "Read all options before the final decision."
    ],
    strategySteps: [
      "Read the question carefully.",
      "Skim the text to understand the general meaning.",
      "Mark question keywords and predict synonyms in the passage.",
      "Read the answer choices and identify how their meanings differ.",
      "Predict the likely answer before close reading.",
      "Use keywords and synonyms to locate the answer area.",
      "Read that area carefully and compare meanings.",
      "Check why the wrong options are wrong, not only why one option is right.",
      "Reread the question and mark the final choice."
    ]
  },
  {
    id: "summary_completion",
    label: "Summary Completion",
    aliases: ["summary"],
    sourcePages: [14, 15, 16, 17],
    skillsTested: [
      "Scan for the correct information in the text.",
      "Recognise synonyms and paraphrases.",
      "Understand the overall meaning of the summary.",
      "Use grammar and collocation to test possible answers."
    ],
    commonProblems: [
      "Missing paraphrases between the summary and the passage.",
      "Trying to understand every part of the passage before answering.",
      "Ignoring the grammar required by the gap.",
      "Relying on surface word matches instead of meaning."
    ],
    tips: [
      "Predict the answer before looking at options or the passage.",
      "Decide whether the gap needs a noun, verb, adjective, or adverb.",
      "If the sentence becomes ungrammatical, the answer is probably wrong.",
      "Look for synonyms and paraphrases rather than exact repeats.",
      "Eliminate word-list options that cannot fit by meaning, grammar, or collocation.",
      "Move on if one gap is consuming too much time."
    ],
    strategySteps: [
      "Read the instructions and note the word limit or word-list rule.",
      "Skim the summary to understand its overall meaning.",
      "Predict each missing word type and possible meaning.",
      "If a word list is given, shortlist options that fit grammar and collocation.",
      "Identify the passage section related to the summary by scanning for paraphrases.",
      "Read the relevant section carefully and choose the answer.",
      "Check that the completed sentence is grammatical and keeps the passage meaning."
    ]
  },
  {
    id: "matching_sentence_endings",
    label: "Matching Sentence Endings",
    aliases: ["matching_sentences", "matching_endings"],
    sourcePages: [18, 19, 20, 21],
    skillsTested: [
      "Predict likely sentence endings.",
      "Recognise synonyms and paraphrases.",
      "Understand how sentence ideas connect to the main ideas in the text.",
      "Check grammar, collocation, and meaning together."
    ],
    commonProblems: [
      "Looking for exact words instead of paraphrases.",
      "Not reading the correct part of the passage closely enough.",
      "Using logic or grammar alone instead of passage evidence.",
      "Spending too long on the list of unused endings."
    ],
    tips: [
      "Answers usually appear in the same order as the questions.",
      "Read incomplete sentence stems before looking at endings.",
      "Predict how a stem could end before checking options.",
      "Spend extra care on the first item because it sets the starting point.",
      "Highlight names, places, and dates because they are easy to locate.",
      "Match meaning, not just words."
    ],
    strategySteps: [
      "Read the instructions carefully.",
      "Read the incomplete sentences first and mark useful keywords.",
      "Predict the kind of ending and word form that would complete each sentence.",
      "Scan the ending list briefly for obvious matches.",
      "Eliminate endings that fail grammar, collocation, or meaning.",
      "Write two or three candidate endings if necessary.",
      "Locate the relevant passage section for each stem using keywords and paraphrases.",
      "Read the evidence closely and choose the ending that matches the passage meaning."
    ]
  },
  {
    id: "sentence_completion",
    label: "Sentence Completion",
    aliases: ["sentence_gap_completion"],
    sourcePages: [22, 23, 24, 25],
    skillsTested: [
      "Understand synonyms and paraphrasing.",
      "Identify paraphrased information in the passage.",
      "Scan for the correct answer location.",
      "Fit the answer grammatically into the sentence."
    ],
    commonProblems: [
      "Trying to match the exact same wording from the question.",
      "Ignoring the instruction or word limit.",
      "Reading the passage before the questions.",
      "Changing word forms when the instruction requires words from the text."
    ],
    tips: [
      "Check exactly how many words are allowed.",
      "Use words from the text unchanged when the instruction says so.",
      "Make sure the completed sentence is grammatical.",
      "Think about paraphrasing and synonyms while scanning.",
      "Find where the answer is before deciding what the answer is.",
      "Answers usually appear in question order."
    ],
    strategySteps: [
      "Read the instructions and word limit carefully.",
      "Read the incomplete sentences before the passage.",
      "Predict the word form and possible meaning of each gap.",
      "Mark keywords and likely paraphrases.",
      "Scan quickly to locate the relevant information.",
      "Reread the incomplete sentence.",
      "Read the evidence carefully and select the exact answer.",
      "Check spelling, grammar, and word limit before moving on."
    ]
  },
  {
    id: "true_false_not_given",
    label: "True/False/Not Given",
    aliases: ["tfng", "true_false_ng"],
    sourcePages: [26, 27, 28, 29, 30],
    skillsTested: [
      "Decide whether the passage confirms, contradicts, or does not state a factual claim.",
      "Understand the whole statement, not only its keywords.",
      "Identify qualifying words such as some, all, always, often, and mainly.",
      "Use close reading after locating the matching evidence."
    ],
    commonProblems: [
      "Spending too long trying to prove a Not Given answer.",
      "Misunderstanding what Not Given means.",
      "Failing to understand the exact meaning of the statement.",
      "Focusing on keywords instead of the whole claim."
    ],
    tips: [
      "Ignore outside knowledge and use only the text.",
      "Watch qualifiers because they can change the truth value.",
      "Be careful with verbs such as suggest, claim, believe, and know.",
      "Expect at least one True, one False, and one Not Given in a set.",
      "Match meaning, not exact wording.",
      "If the information cannot be found, it is probably Not Given."
    ],
    strategySteps: [
      "Check whether the task is True/False/Not Given or Yes/No/Not Given.",
      "Read each statement carefully and understand the whole claim.",
      "Mark qualifiers and meaning-changing words.",
      "Predict synonyms that may lead to the matching passage section.",
      "Match the statement to the relevant part of the text.",
      "Close read the evidence and decide if it confirms or contradicts the claim.",
      "Underline the exact words that justify the answer.",
      "Choose Not Given when the text lacks enough information, then move on."
    ]
  },
  {
    id: "yes_no_not_given",
    label: "Yes/No/Not Given",
    aliases: ["ynng", "yes_no_ng"],
    sourcePages: [31, 32, 33, 34],
    skillsTested: [
      "Decide whether a statement agrees with, contradicts, or is not stated about the writer's opinion.",
      "Recognise opinion language and attitude.",
      "Separate the writer's view from other people's views.",
      "Use close reading to test the statement against the text."
    ],
    commonProblems: [
      "Spending too long trying to prove a Not Given answer.",
      "Misunderstanding lack of information.",
      "Misreading whether the statement agrees with the writer's opinion.",
      "Missing the writer's actual attitude."
    ],
    tips: [
      "Read the statements carefully and fully.",
      "Questions usually follow the order of the text.",
      "Choose Not Given if there is not enough detail to decide.",
      "Choose No only when the statement clearly contradicts the writer's opinion.",
      "Judge only the writer's opinion, not other opinions mentioned in the passage.",
      "Look for opinion markers, comparative language, and superlatives."
    ],
    strategySteps: [
      "Check whether the task asks for Yes/No/Not Given or True/False/Not Given.",
      "Read the whole statement and mark qualifiers.",
      "Predict synonyms that may identify the matching passage section.",
      "Match the statement with the relevant part of the text.",
      "Close read the evidence to decide whether it agrees with or contradicts the writer's opinion.",
      "Underline the words that justify the decision.",
      "Choose Not Given when the opinion is not stated clearly enough.",
      "Move on if you remain unsure after a reasonable check."
    ]
  },
  {
    id: "matching_headings",
    label: "Matching Headings",
    aliases: ["headings"],
    sourcePages: [35, 36, 37, 38],
    skillsTested: [
      "Understand the main idea of each paragraph.",
      "Skim a paragraph quickly without reading every word.",
      "Differentiate between similar headings.",
      "Avoid confusing a detail with the paragraph's central idea."
    ],
    commonProblems: [
      "Not understanding each heading as a whole.",
      "Trying to process too much detail under time pressure.",
      "Treating similar headings as identical.",
      "Missing the main idea of the paragraph."
    ],
    tips: [
      "Do this question type first when it appears.",
      "Read the paragraph before looking at headings.",
      "Use the first one or two sentences and the final sentence to find the main idea.",
      "Do not worry about every unknown word.",
      "If two headings seem close, write both beside the paragraph and compare the difference.",
      "Move on and return later if the answer is not clear."
    ],
    strategySteps: [
      "Do the heading task first if it is included.",
      "Ignore the heading list at the beginning.",
      "Read the first one or two sentences and the last sentence of each paragraph.",
      "Summarise the paragraph's general meaning in one or two words.",
      "Read the headings and identify their keywords.",
      "Match any obvious heading first.",
      "For uncertain paragraphs, compare two or three candidate headings and look for synonyms in the paragraph.",
      "Move on if still uncertain and return when later matches narrow the options."
    ]
  },
  {
    id: "diagram_label_completion",
    label: "Labelling a Diagram",
    aliases: ["diagram_completion", "diagram_label", "labelling_a_diagram"],
    sourcePages: [39, 40, 41, 42],
    skillsTested: [
      "Cope with unfamiliar concepts, processes, machines, natural objects, or plans.",
      "Understand the relationship between the text and the diagram.",
      "Locate the passage section containing the relevant information.",
      "Choose exact words that fit the labels and word limit."
    ],
    commonProblems: [
      "Failing to locate the relevant paragraph quickly.",
      "Spending too long trying to understand every part of the diagram.",
      "Writing the wrong number of words.",
      "Misspelling the answer.",
      "Getting stuck on one difficult label."
    ],
    tips: [
      "Check the word limit before writing any label.",
      "Use the diagram to predict whether the answer needs a noun, verb, or adjective.",
      "Remember that answers may not follow passage order.",
      "Answer easy labels first and return to harder ones.",
      "Predict possible answers before reading the text."
    ],
    strategySteps: [
      "Check how many words are allowed.",
      "Study the diagram briefly to understand the general process or object.",
      "Highlight labels, arrows, captions, and other useful diagram keywords.",
      "Predict the type of word needed for each gap.",
      "Scan the passage to locate the relevant information.",
      "Read the relevant part closely and choose the exact answer.",
      "Check spelling and word limit."
    ]
  },
  {
    id: "matching_features",
    label: "Matching Names",
    aliases: ["matching_names", "matching_people", "matching_features"],
    sourcePages: [43, 44, 45, 46],
    skillsTested: [
      "Scan for names in the text.",
      "Read around each name in detail.",
      "Recognise synonyms or paraphrases of the statements.",
      "Link each person to what they said, did, found, or believed."
    ],
    commonProblems: [
      "Reading the whole text instead of scanning for names.",
      "Assuming repeated names are easier than one-off names.",
      "Writing an answer as soon as a name is found without close reading.",
      "Looking only for exact wording from the statements."
    ],
    tips: [
      "Focus on easy matches first and return to harder ones.",
      "Scan for names quickly and underline every occurrence.",
      "Remember names may be shortened to a surname or first name.",
      "Check whether names may be used more than once.",
      "Expect synonyms and paraphrases between statements and the passage.",
      "Use different colours for names if that helps you track them."
    ],
    strategySteps: [
      "Read the instructions carefully.",
      "Read the list of names before the statements.",
      "Scan the text and underline every occurrence of each name.",
      "Start with names that appear only once.",
      "Read before and after each name to find the related research, claim, or action.",
      "Compare that evidence with the statements and watch for synonyms.",
      "Remove a matched statement when the task allows each statement once.",
      "Repeat until all names or statements are handled."
    ]
  },
  {
    id: "matching_information",
    label: "Matching Information",
    aliases: ["matching_info", "matching_information_to_paragraphs"],
    sourcePages: [47, 48, 49, 50],
    skillsTested: [
      "Skim paragraphs for general meaning.",
      "Find specific information inside a paragraph.",
      "Read carefully to confirm whether the paragraph contains the statement.",
      "Separate specific details from paragraph main ideas."
    ],
    commonProblems: [
      "Expecting the answer to be the paragraph's main idea.",
      "Needing to search across the whole text.",
      "Being distracted by irrelevant information.",
      "Forgetting that some paragraphs may have no answer and some may have more than one."
    ],
    tips: [
      "Do this question type later if other questions can make you familiar with the passage first.",
      "Look for names, places, and numbers in the statements because they are easier to locate.",
      "Expect numerical and wording paraphrases, such as a percentage expressed as a fraction.",
      "Search for the specific detail, not the general topic."
    ],
    strategySteps: [
      "Read the instructions carefully.",
      "Read the statements and paraphrase them in your own words.",
      "Skim the passage to understand each paragraph's general meaning.",
      "Predict which paragraph might contain each statement.",
      "Scan likely paragraphs for synonyms, numbers, names, or other anchors.",
      "Underline possible evidence when you find it.",
      "Check the statement against the evidence and mark the paragraph if it matches.",
      "If it does not match, continue to other paragraphs."
    ]
  },
  {
    id: "table_completion",
    label: "Table Completion",
    aliases: ["note_completion", "flow_chart_completion", "table", "flow_chart"],
    sourcePages: [51, 52, 53, 54],
    skillsTested: [
      "Read instructions and word limits accurately.",
      "Scan the text for relevant paragraph(s).",
      "Transfer information into gaps correctly.",
      "Use headings and surrounding table information to predict answer type."
    ],
    commonProblems: [
      "Writing more words than allowed.",
      "Missing the word limit in the instructions.",
      "Changing the form of words taken from the text.",
      "Making spelling errors."
    ],
    tips: [
      "Read the table and understand what it is about before searching.",
      "Use table headings to identify the type of information needed.",
      "Use other cells in the row or column as clues.",
      "Predict the word type required by each gap.",
      "Copy words exactly when the task requires words from the text.",
      "Check spelling."
    ],
    strategySteps: [
      "Read the instructions carefully.",
      "Check the word limit.",
      "Use headings and completed cells to predict what each gap needs.",
      "Scan the text to locate the relevant paragraph or paragraphs.",
      "Read the appropriate section carefully.",
      "Transfer the exact word or words into the gap.",
      "Check spelling and word limit."
    ]
  }
]);

const READING_STRATEGY_ALIAS_MAP = Object.freeze(
  READING_STRATEGY_QUESTION_TYPES.reduce((map, item) => {
    map[item.id] = item;
    (item.aliases || []).forEach(alias => { map[alias] = item; });
    return map;
  }, {})
);

const READING_STRATEGY_QUESTION_TYPE_MAP = READING_STRATEGY_ALIAS_MAP;

const READING_STRATEGY_SUBSKILL_MAP = Object.freeze(
  READING_STRATEGY_SUBSKILLS.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {})
);

function getReadingStrategyProfile(typeId) {
  return READING_STRATEGY_QUESTION_TYPE_MAP[typeId] || null;
}

function getReadingSubSkillProfile(skillId) {
  return READING_STRATEGY_SUBSKILL_MAP[skillId] || null;
}

if (typeof window !== "undefined") {
  window.READING_STRATEGY_SOURCE = READING_STRATEGY_SOURCE;
  window.READING_STRATEGY_SUBSKILLS = READING_STRATEGY_SUBSKILLS;
  window.READING_STRATEGY_QUESTION_TYPES = READING_STRATEGY_QUESTION_TYPES;
  window.READING_STRATEGY_QUESTION_TYPE_MAP = READING_STRATEGY_QUESTION_TYPE_MAP;
  window.READING_STRATEGY_SUBSKILL_MAP = READING_STRATEGY_SUBSKILL_MAP;
  window.getReadingStrategyProfile = getReadingStrategyProfile;
  window.getReadingSubSkillProfile = getReadingSubSkillProfile;
}
