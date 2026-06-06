"""Seed the SQLite question library with starter Part 1/2/3 prompts.

Run once after install:
    python -m src.seed_questions

Re-running is safe — INSERT OR REPLACE keys on stable IDs so the library
stays in sync with this file.
"""
from __future__ import annotations

from . import db

QUESTIONS: list[dict] = [
    # ─── PART 1 — short personal questions (4-5s each) ───────────────────
    {"id": "p1-hometown-01", "part": "part1", "topic": "Hometown",
     "topic_category": "Personal",
     "question_text": "Where is your hometown and what is it like?",
     "difficulty": "band5_6"},
    {"id": "p1-hometown-02", "part": "part1", "topic": "Hometown",
     "topic_category": "Personal",
     "question_text": "Has your hometown changed much since you were a child?",
     "difficulty": "band6_7"},
    {"id": "p1-work-01", "part": "part1", "topic": "Work / Study",
     "topic_category": "Personal",
     "question_text": "Do you work, or are you a student? Tell me about it.",
     "difficulty": "band5_6"},
    {"id": "p1-work-02", "part": "part1", "topic": "Work / Study",
     "topic_category": "Personal",
     "question_text": "What is the most challenging part of your work or studies?",
     "difficulty": "band6_7"},
    {"id": "p1-hobby-01", "part": "part1", "topic": "Hobbies",
     "topic_category": "Personal",
     "question_text": "What do you usually do in your free time?",
     "difficulty": "band5_6"},
    {"id": "p1-hobby-02", "part": "part1", "topic": "Hobbies",
     "topic_category": "Personal",
     "question_text": "Is there a hobby you would like to try in the future? Why?",
     "difficulty": "band6_7"},
    {"id": "p1-tech-01", "part": "part1", "topic": "Technology",
     "topic_category": "Everyday",
     "question_text": "How much time do you spend on your phone every day?",
     "difficulty": "band5_6"},
    {"id": "p1-food-01", "part": "part1", "topic": "Food",
     "topic_category": "Everyday",
     "question_text": "What kind of food do you enjoy eating the most?",
     "difficulty": "band5_6"},
    {"id": "p1-weather-01", "part": "part1", "topic": "Weather",
     "topic_category": "Everyday",
     "question_text": "What is your favourite kind of weather, and why?",
     "difficulty": "band5_6"},
    {"id": "p1-sleep-01", "part": "part1", "topic": "Sleep",
     "topic_category": "Everyday",
     "question_text": "Do you usually get enough sleep? How does sleep affect your mood?",
     "difficulty": "band6_7"},
    {"id": "p1-music-01", "part": "part1", "topic": "Music",
     "topic_category": "Everyday",
     "question_text": "What types of music do you listen to when you want to relax?",
     "difficulty": "band5_6"},
    {"id": "p1-travel-01", "part": "part1", "topic": "Travel",
     "topic_category": "Everyday",
     "question_text": "Do you enjoy travelling? Where would you like to go next?",
     "difficulty": "band6_7"},

    # ─── PART 2 — cue cards (1 min prep, 1-2 min speech) ─────────────────
    {"id": "p2-influencer-01", "part": "part2", "topic": "People",
     "topic_category": "Person",
     "question_text": "Describe a person who has had a strong influence on your life.",
     "cue_card": {"bullets": [
         "who this person is",
         "how you know them",
         "what kind of influence they have had on you",
         "and explain why this influence has been important.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-trip-01", "part": "part2", "topic": "Travel",
     "topic_category": "Event",
     "question_text": "Describe a memorable trip you have taken.",
     "cue_card": {"bullets": [
         "where you went and when",
         "who you went with",
         "what you did there",
         "and explain why the trip was memorable for you.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-website-01", "part": "part2", "topic": "Technology",
     "topic_category": "Object",
     "question_text": "Describe a website or app you find useful.",
     "cue_card": {"bullets": [
         "what it is",
         "how you discovered it",
         "what you use it for",
         "and explain why you find it useful.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-skill-01", "part": "part2", "topic": "Learning",
     "topic_category": "Plan",
     "question_text": "Describe a skill you would like to learn in the future.",
     "cue_card": {"bullets": [
         "what the skill is",
         "why you want to learn it",
         "how you would learn it",
         "and explain how the skill would change your life.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-advice-01", "part": "part2", "topic": "Advice",
     "topic_category": "Event",
     "question_text": "Describe a piece of advice you received that was helpful.",
     "cue_card": {"bullets": [
         "who gave you the advice",
         "what the advice was",
         "when you received it",
         "and explain why it was helpful to you.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-book-01", "part": "part2", "topic": "Books",
     "topic_category": "Object",
     "question_text": "Describe a book that made an impression on you.",
     "cue_card": {"bullets": [
         "what the book is about",
         "when you read it",
         "what you learned from it",
         "and explain why it made an impression on you.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-decision-01", "part": "part2", "topic": "Life events",
     "topic_category": "Event",
     "question_text": "Describe an important decision you have made.",
     "cue_card": {"bullets": [
         "what the decision was",
         "when you made it",
         "how you came to that decision",
         "and explain the outcome.",
     ]},
     "difficulty": "band7_8"},
    {"id": "p2-place-01", "part": "part2", "topic": "Places",
     "topic_category": "Place",
     "question_text": "Describe a place where you like to spend time.",
     "cue_card": {"bullets": [
         "where this place is",
         "how often you go there",
         "what you do there",
         "and explain why you enjoy being there.",
     ]},
     "difficulty": "band6_7"},
    {"id": "p2-meal-01", "part": "part2", "topic": "Food",
     "topic_category": "Event",
     "question_text": "Describe a meal that you enjoyed.",
     "cue_card": {"bullets": [
         "what the meal was",
         "who you ate it with",
         "where you had it",
         "and explain why you enjoyed it.",
     ]},
     "difficulty": "band5_6"},
    {"id": "p2-gadget-01", "part": "part2", "topic": "Technology",
     "topic_category": "Object",
     "question_text": "Describe a piece of technology you cannot live without.",
     "cue_card": {"bullets": [
         "what the technology is",
         "how often you use it",
         "what you use it for",
         "and explain why it is so important to you.",
     ]},
     "difficulty": "band6_7"},

    # ─── PART 3 — abstract follow-up sets, linked to Part 2 topics ───────
    {"id": "p3-people-01", "part": "part3", "topic": "People",
     "topic_category": "Society",
     "question_text": "Who do you think has more influence on a child — parents, teachers, or friends? Why?",
     "follow_up": [
         "Do role models today differ from those of the past?",
         "Is celebrity culture good or bad for young people?",
         "How important is it for adults to set a good example?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-travel-01", "part": "part3", "topic": "Travel",
     "topic_category": "Society",
     "question_text": "How has international travel changed in the last twenty years?",
     "follow_up": [
         "What are the environmental impacts of tourism?",
         "Should governments limit the number of tourists at popular sites?",
         "Do people learn more from travelling than from books?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-tech-01", "part": "part3", "topic": "Technology",
     "topic_category": "Society",
     "question_text": "In what ways has smartphone use changed how people interact?",
     "follow_up": [
         "Do you think people rely too much on technology today?",
         "Should schools restrict phone use in classrooms?",
         "What technology do you think will change daily life most in the next decade?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-learning-01", "part": "part3", "topic": "Learning",
     "topic_category": "Education",
     "question_text": "What is the best age to start learning a foreign language? Why?",
     "follow_up": [
         "Should governments make second-language study compulsory?",
         "Is online learning as effective as classroom learning?",
         "What skills will be most valuable in the workplace of the future?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-decisions-01", "part": "part3", "topic": "Life events",
     "topic_category": "Society",
     "question_text": "Why do some people find it hard to make important decisions?",
     "follow_up": [
         "Should young people make their own career choices, or follow their parents' advice?",
         "Is it better to take time to decide, or to act quickly?",
         "How do cultural values shape the decisions people make?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-places-01", "part": "part3", "topic": "Places",
     "topic_category": "Society",
     "question_text": "Why do people in cities seem busier than people in the countryside?",
     "follow_up": [
         "Are public spaces in your country well designed?",
         "Should governments invest more in rural areas to reduce migration to cities?",
         "How does the design of a city affect the wellbeing of its residents?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-food-01", "part": "part3", "topic": "Food",
     "topic_category": "Society",
     "question_text": "How have eating habits in your country changed in recent decades?",
     "follow_up": [
         "Why are fast-food restaurants so popular?",
         "Should schools teach children about nutrition?",
         "Is traditional cuisine at risk of disappearing?",
     ],
     "difficulty": "band7_8"},
    {"id": "p3-books-01", "part": "part3", "topic": "Books",
     "topic_category": "Society",
     "question_text": "Are people reading fewer books today than in the past?",
     "follow_up": [
         "What benefits does reading offer that screens do not?",
         "Should libraries change to attract more young readers?",
         "Do books or films tell stories better?",
     ],
     "difficulty": "band7_8"},
]


def seed() -> None:
    db.init_db()
    n = 0
    for q in QUESTIONS:
        db.insert_question(q)
        n += 1
    print(f"Seeded {n} questions into {db.DB_PATH}")


if __name__ == "__main__":
    seed()
