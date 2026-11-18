"""Poll each board in a seed file once and print how many jobs (and NYC jobs) it has.

Usage: python scripts/check_seeds.py seeds/big_employers.txt
Touches no database; prints counts only.
"""
import asyncio
import sys

from jobdiscovery.boards import board_from_url
from jobdiscovery.cli import API_HOST_LIMITS, API_MIN_INTERVAL
from jobdiscovery.http import PoliteClient
from jobdiscovery.nyc import any_nyc
from jobdiscovery.pollers import BoardGone, PollError, poll_board


async def main(path):
    seeds = []
    for line in open(path):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        url, _, name = line.partition(" | ")
        seeds.append((board_from_url(url.strip()), name.strip() or url.strip()))
    sem = asyncio.Semaphore(8)
    async with PoliteClient(per_host=2, host_limits=API_HOST_LIMITS, min_interval=API_MIN_INTERVAL) as client:
        async def one(board, name):
            if board is None:
                return name, "not a supported link", 0, 0
            async with sem:
                try:
                    posts = await asyncio.wait_for(poll_board(client, board), 900)
                except BoardGone:
                    return name, "gone (404)", 0, 0
                except (PollError, asyncio.TimeoutError) as e:
                    return name, f"error: {str(e)[-60:]}", 0, 0
            return name, "ok", len(posts), sum(any_nyc(p.locations) for p in posts)
        rows = await asyncio.gather(*(one(b, n) for b, n in seeds))
    ok = 0
    for name, status, total, nyc in sorted(rows, key=lambda r: -r[3]):
        ok += status == "ok" and total > 0
        print(f"{name[:40]:40} {status[:70]:70} {total:6} jobs {nyc:6} NYC")
    print(f"{ok} of {len(rows)} seeds answered with jobs; {sum(r[3] for r in rows)} NYC jobs in all")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
