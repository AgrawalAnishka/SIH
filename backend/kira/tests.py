from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .llm import LLMError
from .memory import looks_memorable, save_memories
from .models import Conversation, Message, UserMemory
from .summary import fold_and_extract

User = get_user_model()


def make_user(name):
    # core.User requires a role field
    return User.objects.create_user(username=name, password="pass12345", role="startup")


class KiraTests(APITestCase):
    def setUp(self):
        self.a = make_user("kira_a")
        self.b = make_user("kira_b")

    def test_requires_auth(self):
        self.assertIn(
            self.client.post("/api/kira/chat/", {"message": "hi"}, format="json").status_code,
            (401, 403),
        )

    @patch("kira.views.maintain_async")
    @patch("kira.views.complete", return_value="Hello!")
    def test_chat_persists_both_messages(self, _complete, _maintain):
        self.client.force_authenticate(self.a)
        r = self.client.post("/api/kira/chat/", {"message": "hi there"}, format="json")
        self.assertEqual(r.status_code, 200)
        conv = Conversation.objects.get(pk=r.data["conversation"]["id"])
        self.assertEqual(conv.user, self.a)
        self.assertEqual(
            list(conv.messages.values_list("role", "seq")),
            [("user", 1), ("assistant", 2)],
        )

    @patch("kira.views.maintain_async")
    @patch("kira.views.complete", side_effect=LLMError("boom"))
    def test_llm_failure_saves_nothing(self, _complete, _maintain):
        self.client.force_authenticate(self.a)
        r = self.client.post("/api/kira/chat/", {"message": "hi"}, format="json")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(Conversation.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)

    def test_user_cannot_touch_other_users_conversation(self):
        conv = Conversation.objects.create(user=self.a, title="private")
        self.client.force_authenticate(self.b)
        self.assertEqual(
            self.client.get(f"/api/kira/conversations/{conv.pk}/").status_code, 404
        )
        self.assertEqual(
            self.client.patch(
                f"/api/kira/conversations/{conv.pk}/", {"title": "x"}, format="json"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(f"/api/kira/conversations/{conv.pk}/").status_code, 404
        )
        self.assertEqual(
            self.client.post(
                "/api/kira/chat/",
                {"message": "hi", "conversation_id": str(conv.pk)},
                format="json",
            ).status_code,
            404,
        )
        self.assertEqual(self.client.get("/api/kira/conversations/").data, [])

    def test_sensitive_values_never_become_memories(self):
        save_memories(
            self.a,
            [
                {"key": "contact", "value": "call 9876543210", "importance": 3},
                {"key": "preferred_name", "value": "Rahul", "importance": 4},
            ],
        )
        self.assertEqual(
            list(UserMemory.objects.filter(user=self.a).values_list("key", flat=True)),
            ["preferred_name"],
        )

    def test_memory_gate(self):
        self.assertTrue(looks_memorable("Please call me Priya"))
        self.assertFalse(looks_memorable("How do I submit a proposal?"))

    def test_memories_are_per_user_and_deletable(self):
        UserMemory.objects.create(user=self.a, key="preferred_name", value="A")
        UserMemory.objects.create(user=self.b, key="preferred_name", value="B")
        self.client.force_authenticate(self.a)
        self.assertEqual(len(self.client.get("/api/kira/memories/").data), 1)
        self.assertEqual(self.client.delete("/api/kira/memories/").status_code, 204)
        self.assertEqual(UserMemory.objects.filter(user=self.a).count(), 0)
        self.assertEqual(UserMemory.objects.filter(user=self.b).count(), 1)

    @patch("kira.summary.complete")
    def test_summary_fold(self, mock_complete):
        mock_complete.return_value = (
            '{"summary": "S", "memories": '
            '[{"key": "preferred_name", "value": "Rahul", "importance": 4}]}'
        )
        conv = Conversation.objects.create(user=self.a)
        Message.objects.bulk_create(
            [
                Message(
                    conversation=conv,
                    seq=i,
                    role="user" if i % 2 else "assistant",
                    content=f"m{i}",
                )
                for i in range(1, 31)
            ]
        )
        self.assertTrue(fold_and_extract(conv))
        conv.refresh_from_db()
        self.assertEqual(conv.summary, "S")
        self.assertEqual(conv.summarized_upto, 20)  # 30 pending, keep newest 10
        self.assertEqual(UserMemory.objects.get(user=self.a).key, "preferred_name")
