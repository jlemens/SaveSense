-- Add title field to survey_sessions
ALTER TABLE survey_sessions
ADD COLUMN title TEXT;

-- Set default title for existing sessions
UPDATE survey_sessions
SET title = 'Survey ' || TO_CHAR(started_at, 'MM/DD/YYYY')
WHERE title IS NULL;

-- Set default for new sessions
ALTER TABLE survey_sessions
ALTER COLUMN title SET DEFAULT 'My Survey';

-- Make title NOT NULL (after ensuring all existing rows have values)
ALTER TABLE survey_sessions
ALTER COLUMN title SET NOT NULL;

-- Add constraint to ensure title is not empty
ALTER TABLE survey_sessions
ADD CONSTRAINT survey_sessions_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);

