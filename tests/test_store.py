from datetime import datetime, timedelta, timezone

from jobdiscovery.models import Board, Posting
from jobdiscovery.store import Store

T0 = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)
B = Board("greenhouse", "acme")


def posting(i, title="Engineer", loc="New York, NY", desc="Build."):
    return Posting(ats="greenhouse", board_key=B.key, external_id=str(i), title=title,
                   locations=[loc], url=f"https://x/{i}", description_text=desc)


def make_store():
    s = Store(":memory:")
    s.add_boards([B], "test", when=T0)
    return s


def test_new_unchanged_changed_closed():
    s = make_store()
    st = s.apply_poll(B, [posting(1), posting(2), posting(3, loc="Austin, TX")], when=T0)
    assert (st.new, st.nyc_jobs, st.open_jobs) == (2, 2, 3)

    st = s.apply_poll(B, [posting(1), posting(2, desc="Build more.")], when=T0 + timedelta(days=1))
    assert (st.new, st.unchanged, st.changed, st.closed) == (0, 1, 1, 0)

    st = s.apply_poll(B, [posting(2, desc="Build more.")], when=T0 + timedelta(days=2))
    assert (st.unchanged, st.closed) == (1, 1)
    assert s.summary()["open_nyc_postings"] == 1


def test_reopened_posting_counts_as_changed():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    s.apply_poll(B, [], when=T0 + timedelta(days=1))
    st = s.apply_poll(B, [posting(1)], when=T0 + timedelta(days=2))
    assert st.changed == 1
    assert s.summary()["open_nyc_postings"] == 1


def test_posting_that_moves_out_of_nyc_is_closed():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    st = s.apply_poll(B, [posting(1, loc="Denver, CO")], when=T0 + timedelta(days=1))
    assert st.closed == 1


def test_schedule_daily_with_nyc_monthly_without():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    assert s.due_boards(when=T0 + timedelta(hours=23)) == []
    assert s.due_boards(when=T0 + timedelta(days=1)) == [B]

    s.apply_poll(B, [posting(1, loc="Austin, TX")], when=T0 + timedelta(days=1))
    assert s.due_boards(when=T0 + timedelta(days=20)) == []
    assert s.due_boards(when=T0 + timedelta(days=31)) == [B]


def test_gone_closes_everything_and_waits():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    s.mark_gone(B, when=T0 + timedelta(days=1))
    assert s.summary()["open_nyc_postings"] == 0
    assert s.due_boards(when=T0 + timedelta(days=60)) == []


def test_errors_back_off_and_never_close():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    s.mark_error(B, "HTTP 503", when=T0 + timedelta(days=1))
    s.mark_error(B, "HTTP 503", when=T0 + timedelta(days=1, hours=7))
    assert s.summary()["open_nyc_postings"] == 1
    assert s.due_boards(when=T0 + timedelta(days=1, hours=12)) == []
    assert s.due_boards(when=T0 + timedelta(days=1, hours=20)) == [B]


def test_rate_limited_boards_retry_next_run():
    s = make_store()
    for h in (0, 7, 14):
        s.mark_error(B, "workday:x: HTTP 429", when=T0 + timedelta(hours=h))
    assert s.db.scalar("SELECT error_streak FROM boards WHERE key=?", (B.key,)) == 0
    assert s.due_boards(when=T0 + timedelta(hours=20, minutes=1)) == [B]


def test_add_boards_is_idempotent():
    s = make_store()
    assert s.add_boards([B, Board("lever", "beta")], "test") == 1


def test_needs_processing_tracks_hash():
    s = make_store()
    s.apply_poll(B, [posting(1)], when=T0)
    assert s.summary()["needs_processing"] == 1
    s.db.execute("UPDATE postings SET processed_hash = content_hash")
    s.apply_poll(B, [posting(1)], when=T0 + timedelta(days=1))
    assert s.summary()["needs_processing"] == 0
    s.apply_poll(B, [posting(1, title="Senior Engineer")], when=T0 + timedelta(days=2))
    assert s.summary()["needs_processing"] == 1
