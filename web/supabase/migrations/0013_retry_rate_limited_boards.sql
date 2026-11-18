-- Workday boards that failed with HTTP 429 were being polled too fast, not
-- broken. The poller now paces all Workday sites together; clear their error
-- backoff so the next poll tries them again.
update boards
set error_streak = 0,
    next_poll_at = to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"')
where last_status = 'error' and last_error like '%HTTP 429%';
