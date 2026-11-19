-- Signed-in queries were cut off after 8 seconds. Best match usually takes about
-- a second, but the first ranking after a poll or labeling run (when the database
-- has to read job data back from disk) can take 6-8. Allow 20 seconds so that
-- first load finishes behind the loading screen instead of failing.
alter role authenticated set statement_timeout = '20s';
notify pgrst, 'reload config';
