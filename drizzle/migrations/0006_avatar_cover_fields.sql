-- Add avatar_url and headline fields to hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS headline text;

-- Add cover_url field to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_url text;