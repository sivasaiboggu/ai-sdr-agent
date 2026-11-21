"""One-off hygiene cleanup for the real sdr.db (round 8, 21 Nov 2026).

The test suite used to write into the production database, and repeated
dry-runs / re-runs piled up identical rows. This script removes ONLY
rows that are provably test pollution — nothing real:

- companies: 'Some Company That Does Not Exist Xyz' — the junk company
  the approve-404 test used to write on every suite run (before tests
  were isolated). No people or mails reference it.
- people: company = 'iion and draft mails' — four rows the chat parser
  bug filed under the literal chat command instead of 'iion'. They are
  exact duplicates (same names/emails) of the four real 'iion' rows.
- mails: everything except the earliest 'ready-to-send' draft per
  recipient (4 rows kept: the live draft state for the iion campaign).
  Deleted: 64 'draft (dry-run)', 28 minus 4 kept 'ready-to-send', 47
  'blocked', 28 'failed', 6 'already sent (duplicate blocked)', and all
  32 'sent' rows. The 'sent' rows are test artifacts, not real sends:
  all 32 are to Sanjaya Molligoda — who was never emailed (the verified
  send log has Wout / Giuseppe / Ullas only; Sanjaya was only ever
  approached on LinkedIn) — they arrived in pairs ~1 second apart,
  which the sender's 5-minute gap makes impossible for real sends, and
  they kept POST /approve for iion blocked with 409.

Usage: python scripts/cleanup_test_pollution.py [--apply]
Default is a dry-run that prints what would be deleted. --apply backs
the DB up first (backups/sdr-<date>-round8.db, git-ignored via *.db)
and then deletes. Prints before/after counts either way.
"""
import shutil
import sqlite3
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "sdr.db"
BACKUP_DIR = ROOT / "backups"

JUNK_COMPANY = "Some Company That Does Not Exist Xyz"
DIRTY_COMPANY = "iion and draft mails"


def counts(conn):
    return {
        "companies": conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0],
        "people": conn.execute("SELECT COUNT(*) FROM people").fetchone()[0],
        "mails": conn.execute("SELECT COUNT(*) FROM mails").fetchone()[0],
    }


def plan(conn):
    """Row ids to delete, grouped by reason."""
    junk_companies = [r[0] for r in conn.execute(
        "SELECT id FROM companies WHERE name = ?", (JUNK_COMPANY,)).fetchall()]
    dirty_people = [r[0] for r in conn.execute(
        "SELECT id FROM people WHERE company = ?", (DIRTY_COMPANY,)).fetchall()]
    keep = {r[0] for r in conn.execute(
        "SELECT MIN(id) FROM mails WHERE status = 'ready-to-send' "
        "GROUP BY recipient").fetchall()}
    drop_mails = [r[0] for r in conn.execute("SELECT id FROM mails").fetchall()
                  if r[0] not in keep]
    return {"junk_companies": junk_companies,
            "dirty_people": dirty_people,
            "drop_mails": drop_mails,
            "keep_mails": sorted(keep)}


def main(apply: bool):
    conn = sqlite3.connect(str(DB))
    try:
        before = counts(conn)
        p = plan(conn)
        print(f"BEFORE  companies={before['companies']} people={before['people']} mails={before['mails']}")
        print(f"DELETE  companies {p['junk_companies']} (junk test company)")
        print(f"DELETE  people {p['dirty_people']} (filed under 'iion and draft mails')")
        print(f"DELETE  {len(p['drop_mails'])} mails (all except earliest ready-to-send per recipient)")
        print(f"KEEP    mails {p['keep_mails']} (live iion drafts)")
        if not apply:
            print("DRY RUN — nothing changed. Re-run with --apply to delete.")
            return
        BACKUP_DIR.mkdir(exist_ok=True)
        backup = BACKUP_DIR / f"sdr-{date.today().isoformat()}-round8.db"
        shutil.copy2(DB, backup)
        print(f"BACKUP  {backup}")
        conn.execute("DELETE FROM companies WHERE id IN (%s)" % ",".join("?" * len(p["junk_companies"])), p["junk_companies"])
        conn.execute("DELETE FROM people WHERE id IN (%s)" % ",".join("?" * len(p["dirty_people"])), p["dirty_people"])
        conn.execute("DELETE FROM mails WHERE id IN (%s)" % ",".join("?" * len(p["drop_mails"])), p["drop_mails"])
        conn.commit()
        after = counts(conn)
        print(f"AFTER   companies={after['companies']} people={after['people']} mails={after['mails']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main("--apply" in sys.argv[1:])
