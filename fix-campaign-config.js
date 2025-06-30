// Script to analyze and provide fix for campaign configuration issue

console.log(`
🔍 CAMPAIGN VALIDATION ERROR ANALYSIS
=====================================

PROBLEM IDENTIFIED:
The campaign with ID 2 has a config that is missing the required "title" field.
The validation schema (QuizConfigSchema) requires:
- type: 'quiz' (literal)
- title: string (REQUIRED - min 1 character)
- questions: array (can be empty)

CAUSE:
The campaign config was likely created or updated without the title field,
possibly through the admin panel or an API call that didn't include it.

SOLUTION:
The campaign config needs to be updated to include a title field.

FIX OPTIONS:

1. TEMPORARY WORKAROUND (Already implemented):
   - Lines 84-87 in lifecycles.js skip validation for admin panel updates
   - This allows saving but doesn't fix the root cause

2. PERMANENT FIX - Update the campaign config:
   You need to update the campaign directly in the database or via API to add the missing title.
   
   Example valid config structure:
   {
     "type": "quiz",
     "title": "Your Quiz Title Here",  // <-- THIS IS MISSING
     "questions": [...],
     "scoring": {...},
     "styling": {...},
     "behavior": {...}
   }

3. BETTER VALIDATION LOGIC:
   The validation should be more lenient for partial updates from the admin panel.
   Currently, it's trying to validate the entire config even for partial updates.

RECOMMENDATION:
1. First, fix the immediate issue by updating campaign 2's config to include a title
2. Then, improve the validation logic to better handle admin panel updates
3. Consider making the campaign title a separate field rather than nested in config

The temporary workaround is already in place (lines 84-87 of lifecycles.js),
so the admin panel should work for now, but the proper fix is to ensure
all campaigns have valid config structures.
`);