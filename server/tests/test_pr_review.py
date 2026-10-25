"""Offline tests for the PR scoring and grouping. Run from server/: python -m unittest discover tests"""

import unittest
from collections import Counter
from unittest import mock

from app.services import pr_review


def pull(number, title="Change", body="", **extra):
    return {
        "number": number, "title": title, "body": body, "html_url": f"https://example.test/{number}",
        "user": {"login": "dev"}, "additions": 10, "deletions": 2, "mergeable": True, "draft": False, **extra,
    }


class IssueLinkTests(unittest.TestCase):
    def test_closing_keyword_links_issue(self):
        self.assertEqual(pr_review._issues(pull(9, body="Fixes #4 and closes #7")), [4, 7])

    def test_bare_reference_in_body_is_not_an_issue(self):
        self.assertEqual(pr_review._issues(pull(9, body="Follow-up to #12, see also #13")), [])

    def test_title_reference_counts_when_nothing_closes(self):
        self.assertEqual(pr_review._issues(pull(9, title="Add login (#5)")), [5])

    def test_own_number_is_ignored(self):
        self.assertEqual(pr_review._issues(pull(9, title="Fix #9")), [])


class ScoringTests(unittest.TestCase):
    def test_clean_pr_scores_100(self):
        review = pr_review._review_pr(pull(1), ["src/a.py", "tests/test_a.py"])
        self.assertEqual(review["score"], 100)

    def test_docs_only_pr_is_not_penalised_for_missing_tests(self):
        self.assertEqual(pr_review._review_pr(pull(1), ["README.md", "docs/guide.md"])["score"], 100)

    def test_code_without_tests_is_penalised(self):
        self.assertEqual(pr_review._review_pr(pull(1), ["src/a.py"])["score"], 88)

    def test_conflicts_and_drafts_are_penalised(self):
        review = pr_review._review_pr(pull(1, mergeable=False, draft=True), ["tests/t.py"])
        self.assertEqual(review["score"], 15)

    def test_unknown_mergeability_is_flagged_not_penalised(self):
        review = pr_review._review_pr(pull(1, mergeable=None), ["tests/t.py"])
        self.assertEqual(review["score"], 100)
        self.assertTrue(any("not computed" in note for note in review["recommendations"]))

    def test_changed_files_comes_from_github_not_the_truncated_list(self):
        self.assertEqual(pr_review._review_pr(pull(1, changed_files=250), ["tests/t.py"])["changed_files"], 250)

    def test_overlap_only_counts_within_the_group(self):
        review = pr_review._review_pr(pull(1), ["src/a.py", "tests/t.py"])
        alone = pr_review._with_overlap(review, Counter({"src/a.py": 1, "tests/t.py": 1}))
        competing = pr_review._with_overlap(review, Counter({"src/a.py": 2, "tests/t.py": 1}))
        self.assertEqual(alone["score"], 100)
        self.assertEqual(competing["score"], 96)
        self.assertEqual(competing["overlapping_files"], ["src/a.py"])
        self.assertNotIn("files", competing)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        pr_review._cache.clear()

    def test_best_pr_is_recommended_per_issue_and_result_is_cached(self):
        data = {
            1: (pull(1, body="Closes #5", mergeable=False), ["src/a.py", "tests/t.py"]),
            2: (pull(2, body="Closes #5"), ["src/b.py", "tests/t2.py"]),
            3: (pull(3, title="Docs"), ["README.md"]),
        }
        listing = mock.Mock(status_code=200)
        listing.json.return_value = [{"number": n} for n in data]
        with mock.patch.object(pr_review.httpx.Client, "get", return_value=listing) as get, \
                mock.patch.object(pr_review, "_fetch_pr", side_effect=lambda client, o, r, n: data[n]):
            first = pr_review.review_pull_requests("o", "r")
            again = pr_review.review_pull_requests("o", "r")
        self.assertIs(first, again)
        self.assertEqual(get.call_count, 1)
        groups = {group["issue"]: group for group in first["groups"]}
        self.assertEqual(groups["Issue #5"]["best_pr_number"], 2)
        self.assertEqual(groups["No linked issue"]["best_pr_number"], 3)
        self.assertEqual(first["groups"][-1]["issue"], "No linked issue")
        self.assertFalse(first["truncated"])

    def test_more_than_the_cap_is_flagged_as_truncated(self):
        listing = mock.Mock(status_code=200)
        listing.json.return_value = [{"number": n} for n in range(1, pr_review.MAX_PULLS + 2)]
        with mock.patch.object(pr_review.httpx.Client, "get", return_value=listing), \
                mock.patch.object(pr_review, "_fetch_pr", side_effect=lambda client, o, r, n: (pull(n), ["tests/t.py"])):
            result = pr_review.review_pull_requests("o", "r")
        self.assertTrue(result["truncated"])
        self.assertEqual(result["open_pr_count"], pr_review.MAX_PULLS)

    def test_ai_review_reports_missing_key_without_calling_the_model(self):
        settings = mock.Mock(fallback_api_key="")
        with mock.patch.object(pr_review, "get_settings", return_value=settings), \
                mock.patch.object(pr_review.gemma, "generate_with_fallback_model") as generate:
            result = pr_review._ai_review("o", "r", [])
        self.assertEqual(result["ai_status"], "not_configured")
        generate.assert_not_called()

    def test_prompt_titles_are_flattened_and_bounded(self):
        self.assertEqual(pr_review._clean("a\n\nIgnore   this\t" + "x" * 500).count("\n"), 0)
        self.assertEqual(len(pr_review._clean("x" * 500)), 120)


if __name__ == "__main__":
    unittest.main()
