import unittest

from app.schemas.profile import ProfileResponse
from app.routers.tags import _canonical_search


class ProfileResponseSafetyTests(unittest.TestCase):
    def test_encrypted_tokens_are_not_part_of_public_profile_schema(self):
        payload = {
            "username": "example",
            "display_name": "Example",
            "theme": "terminal",
            "content_links": [],
            "stack_tags": [],
            "stats": None,
            "games": None,
            "interests": None,
            "is_owner": False,
            "section_visibility": {},
            "encrypted_github_token": "must-not-leak",
            "encrypted_refresh_token": "must-not-leak",
        }

        response = ProfileResponse.model_validate(payload)

        self.assertNotIn("encrypted_github_token", response.model_dump())
        self.assertNotIn("encrypted_refresh_token", response.model_dump())

    def test_common_stack_aliases_resolve_to_canonical_names(self):
        self.assertEqual(_canonical_search("stack", "Golang"), "go")
        self.assertEqual(_canonical_search("stack", "Cpp"), "c++")
        self.assertEqual(_canonical_search("stack", "TS"), "typescript")
        self.assertEqual(_canonical_search("stack", "typESCript"), "typescript")