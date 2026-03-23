
import { DayContent } from "@/utils/whatsapp-parser";

export const generateMockData = (): DayContent[] => {
  const days: DayContent[] = [];
  const topics = [
    "Parts of Speech", "Present Tense", "Past Tense", "Future Tense", 
    "Passive Voice", "Conditionals", "Prepositions", "Direct & Indirect Speech",
    "Relative Clauses", "Modal Verbs", "Articles", "Pronouns", 
    "Gerunds and Infinitives", "Adjectives and Adverbs", "Sentence Structure",
    "Common Phrasal Verbs", "Idiomatic Expressions", "Reporting Verbs",
    "Collocations", "Question Tags", "Reported Speech: Questions",
    "Wishes and Regrets", "Causative Verbs", "Quantifiers",
    "Determiners", "Transitive and Intransitive Verbs", "Finite and Non-finite Verbs",
    "Compound Sentences", "Complex Sentences", "Punctuation Rules",
    "Capitalization", "Numerical Expressions", "Narrative Writing",
    "Formal Letter Writing", "Informal Email Writing", "Essay Writing: Argumentative",
    "Public Speaking: Persuasive", "Active Listening", "Debate Skills",
    "Vocabulary: Technology", "Vocabulary: Environment", "Vocabulary: Health",
    "Vocabulary: Business", "Review: Day 1-10", "Review: Day 11-20",
    "Review: Day 21-30", "Review: Day 31-40", "Advanced Idioms", 
    "Final Speaking Test Prep", "Conclusion and Course Wrap-up"
  ];

  for (let i = 1; i <= 50; i++) {
    const topic = topics[(i - 1) % topics.length];
    const dateOfLesson = new Date(2025, 11, 18 + i); // From Dec 18 onwards
    const formattedDate = `${dateOfLesson.getDate()}/${dateOfLesson.getMonth() + 1}/${dateOfLesson.getFullYear()}`;
    
    days.push({
      day: i,
      date: formattedDate,
      items: [
        {
          id: `msg-${i}-1`,
          date: formattedDate,
          time: "09:00 am",
          sender: "JD Teacher",
          content: `*Day ${i}*\n\n🚀 Topic: ${topic}\n\nGood morning students! Today we are discussing "${topic}". It is one of the most important concepts for intermediate learners.\nCheck this resource: https://www.oxfordlearnersdictionaries.com/definition/english/${topic.toLowerCase().replace(' ', '-')}`,
          type: "text"
        },
        {
          id: `msg-${i}-2`,
          date: formattedDate,
          time: "09:05 am",
          sender: "JD Teacher",
          content: `<attached: class_audio_${i}.opus>`,
          type: "audio",
          fileName: `class_audio_${i}.opus`
        },
        {
          id: `msg-${i}-3`,
          date: formattedDate,
          time: "09:15 am",
          sender: "JD Teacher",
          content: `✅ Key Points for ${topic}:\n1. Always watch for context.\n2. Practice using this in three sentences today.\n3. Note: The pronunciation is tricky here.`,
          type: "text"
        },
        {
          id: `msg-${i}-4`,
          date: formattedDate,
          time: "09:20 am",
          sender: "JD Teacher",
          content: `<attached: grammar_chart_${i}.jpg>`,
          type: "image",
          fileName: `grammar_chart_${i}.jpg`
        },
        {
          id: `msg-${i}-5`,
          date: formattedDate,
          time: "10:30 am",
          sender: "JD Teacher",
          content: `<attached: homework_day_${i}.pdf>`,
          type: "document",
          fileName: `homework_day_${i}.pdf`
        },
        {
          id: `msg-${i}-6`,
          date: formattedDate,
          time: "10:45 am",
          sender: "JD Teacher",
          content: `Hope you all understood Day ${i}! Please complete the exercise by evening.`,
          type: "text"
        }
      ]
    });
  }
  return days;
};

export const MOCK_DAYS = generateMockData();
