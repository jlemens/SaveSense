# Survey Flow Modification Guide

## Overview

This guide explains how to safely add, update, or modify questions in the survey flow without breaking the editing system or existing user data.

## How the System Works

1. **Question IDs are stored in the database** - When users answer questions, the `question_id` (e.g., `'housing.start'`, `'profile.household'`) is saved in the `survey_responses` table.

2. **The flow is a JavaScript object** - Questions are defined in `src/lib/expenseFlow.ts` as an object where keys are question IDs.

3. **Editing system** - When users click "Edit" on a review page, the system navigates to that question using its `question_id` and looks it up in the flow object.

## Safe Modifications ✅

### 1. **Adding New Questions**
**Status: SAFE** ✅

- Use new, unique question IDs (e.g., `'new_section.new_question'`)
- Properly link them in the flow using `next`, `if_yes`, `if_no`, or conditional keys
- Existing responses won't be affected

**Example:**
```typescript
'new_section.start': {
  id: 'new_section.start',
  question: 'New question text?',
  type: 'yes_no',
  if_yes: 'new_section.yes_path',
  if_no: 'new_section.no_path',
  maps_to_category: 'New Category',
},
```

### 2. **Updating Question Text**
**Status: SAFE** ✅

- You can change the `question` text without issues
- Existing answers will still work
- Users will see the updated text when editing

**Example:**
```typescript
// Before
question: 'Do you pay rent?',

// After
question: 'Do you currently pay monthly rent?',
```

### 3. **Updating Question Options**
**Status: MOSTLY SAFE** ⚠️

- Adding new options: **SAFE**
- Removing options: **RISKY** - Users who selected removed options will have invalid data
- Reordering options: **SAFE**

**Best Practice:** Instead of removing options, mark them as deprecated or add a migration to update old responses.

### 4. **Reordering Questions**
**Status: SAFE** ✅

- You can change the order questions appear in the flow
- Just update the `next`, `if_yes`, `if_no` references properly
- Existing responses remain valid

### 5. **Adding New Question Types**
**Status: SAFE** ✅

- As long as you implement the rendering logic in `SurveyEngine.tsx`
- Existing question types won't be affected

## Risky Modifications ⚠️

### 1. **Removing Questions**
**Status: RISKY** ⚠️

**What breaks:**
- Users who answered the removed question will have responses in the database
- Review page will show the question ID instead of the question text
- Edit button will fail (now handled gracefully with error message)

**How to handle safely:**
1. **Option A: Deprecate instead of remove**
   - Keep the question in the flow but mark it as deprecated
   - Add a note in the question text: `"[DEPRECATED] Old question text"`
   - Don't link to it from other questions

2. **Option B: Migration script**
   - Before removing, create a migration to delete or update responses
   - Run: `DELETE FROM survey_responses WHERE question_id = 'old.question.id';`

3. **Option C: Accept the risk**
   - The system now handles missing questions gracefully
   - Users will see an error message if they try to edit a removed question
   - Review page will show the question ID as fallback

### 2. **Renaming Question IDs**
**Status: VERY RISKY** ❌

**What breaks:**
- All existing responses with the old ID become orphaned
- Edit functionality completely fails
- Review page can't find the question

**How to handle safely:**
1. **Keep the old question ID** - Don't rename, create a new one
2. **Migration script** - If you must rename:
   ```sql
   UPDATE survey_responses 
   SET question_id = 'new.question.id' 
   WHERE question_id = 'old.question.id';
   ```
3. **Then update the flow** to use the new ID

### 3. **Changing Question Type**
**Status: RISKY** ⚠️

**What breaks:**
- Existing answers may be incompatible with the new type
- Example: Changing `yes_no` to `number` - boolean values won't work

**How to handle safely:**
1. **Create a new question** instead of changing the type
2. **Migration script** to convert old answers:
   ```sql
   -- Example: Convert yes_no to number
   UPDATE survey_responses 
   SET raw_value = CASE 
     WHEN raw_value::boolean = true THEN '1'::jsonb
     ELSE '0'::jsonb
   END
   WHERE question_id = 'question.id';
   ```

### 4. **Changing Branching Logic**
**Status: MODERATELY RISKY** ⚠️

**What breaks:**
- Users who already answered may be in an inconsistent state
- Flow navigation might skip questions they should have seen

**How to handle safely:**
- Test thoroughly with existing sessions
- Consider resetting affected sessions if the logic change is significant

## Best Practices

### 1. **Use Semantic Question IDs**
```typescript
// Good ✅
'housing.rent_amount'
'profile.dependents'
'transport.vehicle_type'

// Bad ❌
'q1', 'q2', 'question_3'
```

### 2. **Version Your Flow**
Consider adding a version field to track flow changes:
```typescript
export const expenseFlowVersion = '1.2.0';
export const expenseFlow: SurveyFlow = {
  // ...
};
```

### 3. **Test with Existing Data**
Before deploying flow changes:
1. Test with a session that has existing responses
2. Try editing old questions
3. Verify the review page displays correctly
4. Check that navigation still works

### 4. **Document Changes**
Keep a changelog of flow modifications:
```markdown
## Flow Changelog

### 2024-01-15
- Added: `new_section.start` question
- Updated: `housing.rent_amount` question text
- Deprecated: `old.question.id` (no longer linked, kept for backward compatibility)
```

### 5. **Handle Missing Questions Gracefully**
The system now includes:
- Error handling in `SurveyEngine` for missing questions
- Fallback display in `ReviewSession` (shows question ID if question not found)
- Validation before navigating to edit (checks if question exists)

## Migration Examples

### Example 1: Removing a Question
```sql
-- Step 1: Delete responses for the removed question
DELETE FROM survey_responses 
WHERE question_id = 'old.question.id';

-- Step 2: Remove from flow definition
-- (Edit src/lib/expenseFlow.ts)
```

### Example 2: Renaming a Question ID
```sql
-- Step 1: Update all existing responses
UPDATE survey_responses 
SET question_id = 'new.question.id' 
WHERE question_id = 'old.question.id';

-- Step 2: Update flow definition
-- (Edit src/lib/expenseFlow.ts)
```

### Example 3: Changing Question Type
```sql
-- Step 1: Convert existing answers
UPDATE survey_responses 
SET raw_value = /* conversion logic */
WHERE question_id = 'question.id';

-- Step 2: Update flow definition
```

## Current Safeguards

The system now includes these protections:

1. **SurveyEngine** - Shows error page instead of crashing if question not found
2. **ReviewSession** - Validates question exists before allowing edit navigation
3. **Fallback display** - Shows question ID if question text not found

## Need Help?

If you're unsure about a modification:
1. Check this guide first
2. Test in a development environment with sample data
3. Consider creating a migration script for database changes
4. When in doubt, deprecate instead of removing

