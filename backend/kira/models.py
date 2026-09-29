import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kira_conversations"
    )
    title = models.CharField(max_length=120, default="New chat")
    summary = models.TextField(blank=True, default="")
    # seq of the last message already folded into `summary`
    summarized_upto = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "-updated_at"])]

    def __str__(self):
        return f"{self.title} ({self.user_id})"


class Message(models.Model):
    ROLE_CHOICES = [("user", "user"), ("assistant", "assistant")]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    seq = models.PositiveIntegerField()
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["seq"]
        constraints = [
            models.UniqueConstraint(fields=["conversation", "seq"], name="kira_unique_msg_seq")
        ]


class UserMemory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="kira_memories"
    )
    key = models.CharField(max_length=40)
    value = models.CharField(max_length=300)
    importance = models.PositiveSmallIntegerField(default=3)  # 1 (low) .. 5 (high)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="kira_unique_user_key")]
