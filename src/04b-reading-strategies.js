/*
 * READING_STRATEGIES - verified dataset for the Reading "Strategies" animations.
 *
 * Source: "The Complete A-to-Z Guide to IELTS Reading" (IELTS Writing Academy, 2016),
 * checked against the source Reading strategy PDF with the in-project
 * markitdown venv. Shape is frozen because 11-reading.jsx reads these fields.
 *
 * demo.type drives the animation archetype in 11-reading.jsx:
 *   skim | scan | close | context | topic | vocab          (sub-skills)
 *   keyword-link | eliminate | tfng | headings | match | label | table   (question types)
 */
var READING_STRATEGIES = {
  version: 1,
  source: "The Complete A-to-Z Guide to IELTS Reading (IELTS Writing Academy, 2016) - verified PDF-aligned paraphrase.",

  // Reading sub-skills
  subSkills: [
    {
      id: "skimming",
      name: "Skimming",
      definition: "Reading a text, or a large part of it, quickly to understand the general meaning rather than every word.",
      why: "The overall context helps you scan for the right area and decide whether an answer really fits.",
      steps: [
        "Read the questions first so you know what information to look for.",
        "Use the title and any sub-headings to predict the general meaning.",
        "Read the first and last paragraphs because they usually frame the whole text.",
        "Move much faster than normal and ignore details that are not needed for the gist."
      ],
      practice: "Read 2-3 short news stories quickly for gist, then re-read to check whether your first impression was right.",
      demo: { type: "skim", caption: "First and last sentences light up in sequence - gist without reading every word." }
    },
    {
      id: "scanning",
      name: "Scanning",
      definition: "Looking for a particular word, phrase, name, number or idea to locate where the answer is likely to be.",
      why: "Scanning saves time: it points you to the relevant paragraph, but close reading still gives the answer.",
      steps: [
        "Read the question first so you know the target word or idea.",
        "Focus on finding the relevant paragraph or section, not on reading the whole text.",
        "Let your eye jump across the page instead of reading word by word or line by line.",
        "Use names, places, dates, numbers and distinctive nouns as easy visual targets."
      ],
      practice: "Read article titles and sub-titles, predict 2-3 names or facts, then scan quickly to find them.",
      demo: { type: "scan", caption: "A cursor sweeps the passage and locks onto the target keyword." }
    },
    {
      id: "close-reading",
      name: "Close Reading",
      definition: "Reading a sentence or paragraph in detail so you understand exactly what it means.",
      why: "Skimming gives the gist and scanning gives the location; only close reading confirms the answer.",
      steps: [
        "After scanning locates the likely area, slow down.",
        "Understand the whole sentence or paragraph, not only matching words.",
        "Compare the meaning with the question and watch for synonyms or paraphrase.",
        "Check qualifiers such as some, all, mainly, always or occasionally because they can change the answer."
      ],
      practice: "Use email-length texts: read closely enough that you could reply without misunderstanding the writer.",
      demo: { type: "close", caption: "The located sentence is read word by word; the answer phrase is confirmed." }
    },
    {
      id: "new-words",
      name: "Dealing with New Words",
      definition: "Handling unknown words calmly by deciding whether they matter and, if needed, guessing from context.",
      steps: [
        "Do not panic; accept that you will not know every word in the passage.",
        "Decide whether the new word is needed for the answer. If it is not needed, ignore it and move on.",
        "If it is needed, use the surrounding words, title, headings, form and function to guess the meaning.",
        "Make a mental note, continue reading, and only check useful new words after the task."
      ],
      practice: "When reading daily, underline useful unknown words, guess their meanings first, then check them at the end.",
      demo: { type: "context", caption: "An unknown word dims; the surrounding context lights up to infer its meaning." }
    },
    {
      id: "context",
      name: "Context",
      definition: "The words, phrases and sentences around a word; this is the main clue for guessing unknown vocabulary.",
      steps: [
        "Use the general meaning of the paragraph and its topic sentence to frame your guess.",
        "Identify the word's form: noun, verb, adjective or another role.",
        "Try replacing it with a word you already know; the replacement is often a synonym.",
        "Ask whether the meaning is essential for the answer. If not, move on."
      ],
      demo: { type: "context", caption: "Context clues around the gap converge on a likely meaning." }
    },
    {
      id: "topic-sentences",
      name: "Topic Sentences",
      definition: "The first line of a paragraph usually signals the paragraph's main idea.",
      steps: [
        "Read the first sentence of each paragraph to predict what the paragraph will discuss.",
        "Separate the topic, usually a noun or noun phrase, from the idea, the angle taken on that topic.",
        "Use this topic-plus-idea signal to navigate the text and support matching-headings answers.",
        "Confirm your prediction with a quick look at the rest of the paragraph."
      ],
      example: "\"Child poverty was amongst the highest in Europe in 20th-Century Ireland.\" -> topic: 20th-Century Ireland; idea: child poverty.",
      demo: { type: "topic", caption: "Each paragraph's first line is split into TOPIC + IDEA." }
    },
    {
      id: "vocabulary-building",
      name: "Vocabulary Building",
      definition: "Reading and listening are vocabulary tests as well as skills tests; a wider vocabulary makes high scores easier.",
      steps: [
        "Read and listen to genuine English sources every day.",
        "Record new words and phrases in a system you will revisit.",
        "Review the recorded vocabulary regularly so it stays in memory.",
        "Use free sources such as news, magazines, books and topic-based reading to cover common IELTS themes."
      ],
      demo: { type: "vocab", caption: "Read -> Record -> Review cycle animates as a loop." }
    }
  ],

  // Question types
  questionTypes: [
    {
      id: "short-answer",
      name: "Short Answer",
      blurb: "Comprehension questions answered with short words from the text, inside a strict word limit.",
      skillsTested: ["Scanning and skimming to locate the right area", "Recognising synonyms and paraphrases of question keywords", "Close reading to identify the answer"],
      commonProblems: ["Missing synonyms or paraphrases", "Going over the word limit", "Reading every word instead of skimming and scanning", "Panicking over unknown words that are not needed"],
      tips: ["Answers normally follow the text order", "Read and understand the questions before reading the passage", "Obey the word limit exactly", "Do not give your opinion; use the answer in the text", "Question keywords are often nouns or noun phrases", "Think of synonyms and paraphrases before scanning"],
      strategySteps: [
        "Read the instructions carefully and note the word limit.",
        "Read and understand each question; decide what information you need to find.",
        "Underline the keywords in the question.",
        "Think of possible synonyms or paraphrases for those keywords.",
        "Find the part of the text the question relates to.",
        "Read the question again.",
        "Read the answer section closely and identify the exact answer.",
        "Move to the next question and repeat until finished."
      ],
      demo: { type: "keyword-link", caption: "Question keyword -> synonym in text -> exact answer phrase." }
    },
    {
      id: "multiple-choice",
      name: "Multiple Choice",
      blurb: "Choose the correct option from several plausible choices; distractors often differ by a small meaning shift.",
      skillsTested: ["Understanding main ideas", "Scanning for the answer area", "Reading options and text in detail", "Spotting synonyms, paraphrases and qualifying words"],
      commonProblems: ["Reading the text before the questions", "Leaving a question blank", "Being tricked by distractors or qualifiers", "Not reading the question, options or text carefully enough"],
      tips: ["Read the questions before the passage", "Always write an answer; a guess is better than a blank", "Narrow the options to two or three when possible", "Rephrase difficult options in your own words", "Predict the answer before close reading", "Read all options before the final choice", "Answers usually follow the order of the text"],
      strategySteps: [
        "Read the question carefully.",
        "Skim the text to get the general meaning.",
        "Underline question keywords and think of synonyms that might appear in the text.",
        "Read the choices, underline their keywords, and notice the meaning differences between choices.",
        "Predict the correct answer.",
        "Use keywords and synonyms to locate the answer area in the text.",
        "Read that part very carefully, focusing on the differences in meaning.",
        "Decide not only why one option is correct, but why the others are wrong.",
        "Read the question again, then mark the final choice."
      ],
      demo: { type: "eliminate", caption: "Wrong options are struck out one by one until the best meaning remains." }
    },
    {
      id: "summary-completion",
      name: "Summary Completion",
      blurb: "Fill gaps in a summary using words from a list or from the text; the summary is paraphrased from the passage.",
      skillsTested: ["Scanning for the correct information", "Identifying synonyms and paraphrases", "Understanding the summary's general meaning", "Using grammar to predict the word type"],
      commonProblems: ["Trying to understand every part of the text before answering", "Missing synonyms and paraphrases", "Ignoring grammar", "Copying text words when the task requires a list word or paraphrase"],
      tips: ["Predict the answer before looking at options or the text", "Decide whether the gap needs a noun, verb, adjective or adverb", "Look for synonyms and paraphrases rather than direct word matches", "Do not spend too long on one gap", "If a word list is given, eliminate words that cannot fit by meaning or grammar"],
      strategySteps: [
        "Read the question carefully: note the word limit and whether answers come from the text or a list.",
        "Skim the summary and understand its overall meaning.",
        "Predict each answer before looking at the passage; decide the word type needed.",
        "If there is a word list, choose the two or three most likely candidates and note collocations.",
        "Identify which part of the reading text the summary relates to by scanning for synonyms.",
        "Read that section carefully and choose the answer, being careful with paraphrase.",
        "Check that the completed sentence is grammatically correct."
      ],
      demo: { type: "keyword-link", caption: "Predict word type -> scan for synonym -> drop the answer into the gap." }
    },
    {
      id: "matching-sentences",
      name: "Matching Sentences",
      blurb: "Match incomplete sentence beginnings with the correct endings from a longer list, using the text as proof.",
      skillsTested: ["Prediction", "Identifying synonyms and paraphrases", "Connecting sentence ideas to the main ideas in the reading text"],
      commonProblems: ["Not reading or fully understanding the relevant text area", "Missing synonyms and paraphrases", "Looking for exact words instead of matching meaning", "Using logic or grammar alone instead of the reading text"],
      tips: ["Answers follow the same order as the text", "Locate question one first so you know where to begin", "Predict endings before looking at the ending list", "Start with the incomplete sentences before reading all endings in detail", "Spend extra care on the first question", "Highlight names, places and dates because they are easy to find"],
      strategySteps: [
        "Read the question carefully.",
        "Read the incomplete sentences first; understand them and highlight keywords such as names, places and dates.",
        "Predict possible endings and the word type needed for a grammatical sentence.",
        "Look at the endings briefly and note any obvious matches.",
        "Eliminate endings that cannot match because of grammar, collocation or meaning.",
        "Write two or three candidate endings if necessary.",
        "Find the relevant text area for each sentence beginning, watching for synonyms and paraphrases.",
        "Understand that text area and choose the correct ending."
      ],
      demo: { type: "match", caption: "Sentence beginnings link to endings via meaning found in the text." }
    },
    {
      id: "sentence-completion",
      name: "Sentence Completion",
      blurb: "Complete gapped sentences with words from the text, using word limits, grammar and paraphrase clues.",
      skillsTested: ["Understanding synonyms and paraphrases", "Scanning for the answer location", "Predicting the required word form", "Checking grammar and spelling"],
      commonProblems: ["Trying to match exact words from the question to the text", "Missing synonyms and paraphrases", "Not reading the instructions properly", "Reading the passage before the questions"],
      tips: ["Check exactly how many words you may write", "If the task says from the text, do not change the words or word forms", "The answer should make the sentence grammatically correct", "Think about synonyms and paraphrases while scanning", "Find where the answer is before deciding what the answer is", "Answers follow the same order as the questions"],
      strategySteps: [
        "Read the instructions carefully, noting the word limit and whether exact text words are required.",
        "Read the incomplete sentences first; predict the word form and possible meaning.",
        "Think about keywords and how they may appear as synonyms or paraphrases.",
        "Locate the information quickly by scanning; if you cannot find it quickly, move on.",
        "Read the incomplete sentence again.",
        "Study the relevant text area carefully to establish the answer.",
        "Check spelling and grammar fit.",
        "Repeat with the remaining sentences."
      ],
      demo: { type: "keyword-link", caption: "Predict the gap's word type, then locate the exact word in the text." }
    },
    {
      id: "tfng",
      name: "True / False / Not Given",
      blurb: "Decide whether each factual statement is confirmed by the text, contradicted by it, or not stated clearly enough.",
      skillsTested: ["Understanding each whole statement", "Recognising synonyms and paraphrases", "Distinguishing contradiction from missing information", "Reading qualifying words carefully"],
      commonProblems: ["Not understanding what NOT GIVEN means", "Spending too long trying to prove NOT GIVEN", "Failing to understand the exact meaning of the statement", "Focusing on keywords instead of the whole statement"],
      tips: ["Base answers only on the text, not background knowledge", "Watch qualifiers such as some, all, mainly, often, always and occasionally", "Watch verbs such as suggest, claim, believe and know", "There is normally at least one TRUE, one FALSE and one NOT GIVEN", "Read the relevant text closely; do not skim and scan for the final answer", "Match meaning, not words", "If the information cannot be found, it is probably NOT GIVEN", "Answers follow the order of the text"],
      strategySteps: [
        "Read the instructions carefully and confirm this is TRUE/FALSE/NOT GIVEN, not YES/NO/NOT GIVEN.",
        "Read each statement carefully and understand the whole sentence; watch qualifying words.",
        "Think of synonyms that may appear in the text.",
        "Match the statement to the correct part of the text.",
        "Focus on the statement again, then read the matching text closely to decide whether it is confirmed or contradicted.",
        "Underline the words that give the answer, checking again for qualifying words.",
        "If you cannot find enough information, mark NOT GIVEN and move on.",
        "If you are still unsure after a reasonable check, mark NOT GIVEN rather than wasting time."
      ],
      demo: { type: "tfng", caption: "Statement vs text -> decision flows to TRUE, FALSE or NOT GIVEN." }
    },
    {
      id: "ynng",
      name: "Yes / No / Not Given",
      blurb: "Assess the writer's opinion: YES if the text agrees, NO if it contradicts, and NOT GIVEN if there is not enough information.",
      skillsTested: ["Identifying the writer's opinion", "Understanding each whole statement", "Recognising synonyms and paraphrases", "Separating opinion from factual detail"],
      commonProblems: ["Treating factual information as the writer's opinion", "Not understanding NOT GIVEN", "Spending too long on missing information", "Being distracted by other people's opinions in the passage"],
      tips: ["Read the statements carefully and fully", "Answers follow the same order as the text", "Judge only the writer's opinion, not your own knowledge", "Watch qualifiers such as some, all, mainly, always and occasionally", "Look for opinion signals and evaluative language", "If there is not enough information to decide, mark NOT GIVEN"],
      strategySteps: [
        "Read the instructions carefully and confirm this is YES/NO/NOT GIVEN, not TRUE/FALSE/NOT GIVEN.",
        "Read each statement carefully and understand the whole sentence; watch qualifying words.",
        "Think of synonyms that may appear in the text.",
        "Match the statement to the correct part of the text.",
        "Focus on the statement again, then read the matching text closely to decide whether it agrees with or contradicts the writer's opinion.",
        "Underline the words that give the answer, checking again for qualifiers.",
        "If you cannot find enough information to decide, mark NOT GIVEN and move on.",
        "If you are still unsure after a reasonable check, mark NOT GIVEN rather than wasting time."
      ],
      demo: { type: "tfng", caption: "Find the writer's opinion -> statement agrees (YES), contradicts (NO) or is absent (NG)." }
    },
    {
      id: "matching-headings",
      name: "Matching Headings",
      blurb: "Match each paragraph to the heading that best summarises its main idea; there are more headings than paragraphs.",
      skillsTested: ["Understanding the main idea of each paragraph", "Getting the general meaning quickly without reading every word", "Differentiating similar headings"],
      commonProblems: ["Too much information and too little time", "Not understanding the paragraph as a whole", "Being misled by headings that look similar", "Worrying about individual unknown words instead of gist"],
      tips: ["Do this question first if it appears", "Do not look at the headings before reading the paragraphs for gist", "Read the first one or two sentences and the last sentence of each paragraph", "Use one or two words to summarise each paragraph before matching", "For similar headings, write candidates beside the paragraph and find the difference", "If still stuck, move on and return later"],
      strategySteps: [
        "If this type is on the test, do it first.",
        "Do not look at the headings yet.",
        "Read the first one or two sentences and the last sentence of each paragraph; sum up its general meaning in one or two words.",
        "Read the headings and identify keywords in each.",
        "Match headings that are obvious and certain first.",
        "For the remaining headings, write two or three candidate headings beside the paragraph.",
        "Identify differences between candidate headings and check for synonyms in the paragraph.",
        "If still stuck, move on; the answer often becomes clearer later. Repeat until finished."
      ],
      demo: { type: "headings", caption: "Each paragraph's gist from first and last lines snaps to its best heading." }
    },
    {
      id: "labelling-diagram",
      name: "Labelling a Diagram",
      blurb: "Label a diagram or plan, such as a machine, natural object or design, using words from the text.",
      skillsTested: ["Coping with unfamiliar concepts or processes", "Relating a text to a diagram or plan", "Locating the paragraph that contains the relevant information"],
      commonProblems: ["Focusing too much on understanding every part of the diagram", "Failing to locate the relevant paragraph quickly", "Writing the wrong number of words", "Spelling the answer incorrectly", "Getting stuck on one label and wasting time"],
      tips: ["Check the word limit before answering", "Identify the type of word each label needs", "Answers do not always follow paragraph order", "Do the easiest labels first", "Predict the answer before reading the text when possible", "Transfer words exactly and check spelling"],
      strategySteps: [
        "Check how many words you can write.",
        "Study the diagram briefly to understand what is happening generally; do not spend too long.",
        "Identify the type of word needed and try to predict the answer.",
        "Highlight keywords or labels on the diagram.",
        "Scan the text and identify where the information is located.",
        "Read in more detail to find the answer.",
        "Check spelling and word count."
      ],
      demo: { type: "label", caption: "Scan to the describing paragraph, then transfer the exact word onto the diagram." }
    },
    {
      id: "matching-names",
      name: "Matching Names",
      blurb: "Match a person's name, usually an expert, researcher or scientist, to a statement about what they said or found.",
      skillsTested: ["Scanning for names in the text", "Reading around the name in detail", "Recognising synonyms or paraphrases of the statement"],
      commonProblems: ["Names that appear several times are harder to match than names that appear once", "Reading the whole text to find names instead of scanning", "Writing an answer immediately after finding a name", "Trying to match exact words rather than meaning"],
      tips: ["Start with easier names or statements and return to hard ones later", "Scan for each name and underline every mention", "Remember that a full name may later appear as only a first or last name", "Think of synonyms that may replace the statement wording", "These questions do not follow text order; you may need to move backwards and forwards", "Use different markings for different names if that helps you track them"],
      strategySteps: [
        "Read the question carefully.",
        "Focus on the names first; scan the text for each name and underline every mention.",
        "Begin with names that appear only once because they are usually easiest.",
        "Read around each name to see whether the research, finding or claim comes before or after it.",
        "Read the relevant finding, then match it to the statements, watching for synonyms.",
        "When a statement matches a name, remove that statement from consideration.",
        "Repeat for the rest of the names."
      ],
      demo: { type: "match", caption: "Each idea links to the named source whose meaning matches." }
    },
    {
      id: "matching-information",
      name: "Matching Information",
      blurb: "Match statements to the paragraphs that contain specific information such as a reason, description, fact, definition or explanation.",
      skillsTested: ["Skimming paragraphs for general meaning", "Finding specific information in a paragraph", "Reading carefully to confirm that the statement's meaning matches"],
      commonProblems: ["Needing to search the whole text", "The required information may not be the paragraph's main idea", "There is irrelevant information to ignore", "Some paragraphs contain no answer while others contain more than one"],
      tips: ["Do this question last if possible because other questions make you familiar with the passage", "Look for names, place names and numbers in the statements", "Expect synonyms and numerical paraphrases", "Identify what kind of information is needed before scanning", "A paragraph may contain more than one answer"],
      strategySteps: [
        "Read the instructions carefully.",
        "Read the statements first and paraphrase them in your own words.",
        "Quickly skim the reading text to understand the general meaning.",
        "Read the statements again and predict which paragraph might contain each answer.",
        "Scan likely paragraphs for synonyms; underline any possible answer.",
        "Check back with the statement and mark the paragraph if the meaning matches; if not, move on."
      ],
      demo: { type: "scan", caption: "Scan paragraph by paragraph until the target information is located." }
    },
    {
      id: "table-completion",
      name: "Table Completion",
      blurb: "Complete gaps in a table or flow chart using words or phrases from the text, within the word limit.",
      skillsTested: ["Reading the instructions correctly", "Scanning the text to locate relevant paragraphs", "Transferring information to the gaps accurately"],
      commonProblems: ["Not reading the instructions carefully, especially the word limit", "Going over the word limit", "Changing the form of words from the text", "Spelling errors"],
      tips: ["Read the table and understand what it is about", "Use the table heading to identify the type of information needed", "Use existing table cells as clues", "Predict the type of word each gap needs", "Read the instructions very carefully", "Do not go over the word limit", "Check spelling"],
      strategySteps: [
        "Read the instructions carefully.",
        "Check the word limit.",
        "Scan the text to locate the relevant paragraph or paragraphs.",
        "Read the appropriate section carefully to find the answer.",
        "Transfer the word or words exactly as they are to the gap.",
        "Check your spelling."
      ],
      demo: { type: "table", caption: "Scan to the section, then transfer the exact word into the right cell." }
    }
  ]
};

if (typeof window !== "undefined") window.READING_STRATEGIES = READING_STRATEGIES;
