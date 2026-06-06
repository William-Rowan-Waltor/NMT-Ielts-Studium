function writingAidCleanText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function writingAidCountWords(text) {
  return writingAidCleanText(text).split(/\s+/).filter(Boolean).length;
}

function writingAidSplitSentences(text) {
  const clean = writingAidCleanText(text).replace(/\n+/g, " ");
  return clean.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [];
}

function writingAidJoinParagraphs(parts) {
  return parts
    .map(part => Array.isArray(part) ? part.join(" ") : String(part || ""))
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function enforceWritingEssayParagraphs(text, taskType) {
  const clean = writingAidCleanText(text);
  if (!clean) return "";

  const expectedMin = taskType === "task2" ? 4 : 3;
  const existingParagraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (existingParagraphs.length >= 2) return existingParagraphs.join("\n\n");

  const existingLines = clean.split(/\n+/).map(p => p.trim()).filter(Boolean);
  if (existingLines.length >= expectedMin) return existingLines.join("\n\n");

  const sentences = writingAidSplitSentences(clean);
  if (sentences.length < expectedMin) return clean;

  if (taskType === "task2") {
    const conclusionIndex = sentences.findIndex((sentence, index) =>
      index >= Math.max(2, sentences.length - 3) &&
      /^(in conclusion|to conclude|overall|in summary)\b/i.test(sentence)
    );
    const introCount = sentences.length >= 7 ? 2 : 1;
    const finalStart = conclusionIndex > introCount ? conclusionIndex : sentences.length - 1;
    const intro = sentences.slice(0, introCount);
    const body = sentences.slice(introCount, finalStart);
    const bodySplit = Math.max(1, Math.ceil(body.length / 2));
    return writingAidJoinParagraphs([
      intro,
      body.slice(0, bodySplit),
      body.slice(bodySplit),
      sentences.slice(finalStart)
    ]);
  }

  const overviewIndex = sentences.findIndex((sentence, index) =>
    index > 0 && /^(overall|in general|generally|the most noticeable|the main feature)\b/i.test(sentence)
  );
  const overviewAt = overviewIndex > 0 ? overviewIndex : 1;
  const bodySentences = sentences.filter((_, index) => index !== 0 && index !== overviewAt);
  const bodySplit = Math.max(1, Math.ceil(bodySentences.length / 2));
  return writingAidJoinParagraphs([
    [sentences[0]],
    [sentences[overviewAt]],
    bodySentences.slice(0, bodySplit),
    bodySentences.slice(bodySplit)
  ]);
}

function writingAidSplitListText(value) {
  return writingAidCleanText(value)
    .replace(/\s+(?=(?:\d+\.|[-*])\s+)/g, "\n")
    .split(/\n+/)
    .map(item => item.replace(/^(?:\d+\.|[-*])\s+/, "").trim())
    .filter(Boolean);
}

function writingAidNormalizeList(value) {
  const items = Array.isArray(value)
    ? value
    : (typeof value === "string" ? writingAidSplitListText(value) : []);
  return items.flatMap(item => {
    if (typeof item === "string") return writingAidSplitListText(item);
    return item ? [item] : [];
  }).filter(Boolean);
}

function writingAidInline(value) {
  return writingAidCleanText(value).replace(/\s*\n+\s*/g, " ");
}

function writingAidStructureFromLine(line, index, fallbackLabels) {
  const labelPattern = /^(introduction|overview|body\s*\d+|conclusion|paragraph\s*\d+)\s*[:\-]\s*(.+)$/i;
  const match = String(line || "").trim().match(labelPattern);
  if (match) {
    return {
      paragraph: match[1].replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      focus: match[2].trim()
    };
  }
  return {
    paragraph: fallbackLabels[index] || `Paragraph ${index + 1}`,
    focus: String(line || "").trim()
  };
}

function writingAidNormalizeStructure(value, taskType) {
  const fallbackLabels = taskType === "task2"
    ? ["Introduction", "Body 1", "Body 2", "Conclusion"]
    : ["Introduction", "Overview", "Body 1", "Body 2"];
  const rawItems = Array.isArray(value)
    ? value
    : (typeof value === "string" ? writingAidSplitListText(value) : []);

  return rawItems.flatMap((item, index) => {
    if (typeof item === "string") {
      return writingAidSplitListText(item).map((line, lineIndex) =>
        writingAidStructureFromLine(line, index + lineIndex, fallbackLabels)
      );
    }
    if (!item || typeof item !== "object") return [];
    return [{
      ...item,
      paragraph: writingAidInline(item.paragraph || item.name || fallbackLabels[index] || `Paragraph ${index + 1}`),
      focus: writingAidInline(item.focus || item.keyPoint || item.content || item.idea || "")
    }];
  }).filter(item => item.paragraph || item.focus);
}

function prepareWritingAidForDisplay(data, kind, taskType) {
  if (!data || typeof data !== "object") return data;
  if (kind === "example") {
    const essay = enforceWritingEssayParagraphs(data.essay || data.answer || "", taskType);
    return {
      ...data,
      essay,
      wordCount: Number(data.wordCount) || writingAidCountWords(essay)
    };
  }
  return {
    ...data,
    possibleOpinions: writingAidNormalizeList(data.possibleOpinions),
    overviewOptions: writingAidNormalizeList(data.overviewOptions),
    mainIdeas: writingAidNormalizeList(data.mainIdeas),
    recommendedStructure: writingAidNormalizeStructure(data.recommendedStructure, taskType),
    mustMention: writingAidNormalizeList(data.mustMention),
    avoid: writingAidNormalizeList(data.avoid),
    languageMoves: writingAidNormalizeList(data.languageMoves)
  };
}

if (typeof window !== "undefined") {
  window.enforceWritingEssayParagraphs = enforceWritingEssayParagraphs;
  window.prepareWritingAidForDisplay = prepareWritingAidForDisplay;
}
