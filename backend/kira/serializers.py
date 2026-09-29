from rest_framework import serializers

from .models import Conversation, Message, UserMemory

MAX_INPUT_CHARS = 2000


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=MAX_INPUT_CHARS, trim_whitespace=True)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


class RenameSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=80, trim_whitespace=True)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("role", "content", "created_at")


class ConversationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ("id", "title", "updated_at")


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id", "title", "updated_at", "messages")

    def get_messages(self, obj):
        latest = list(obj.messages.order_by("-seq")[:200])
        latest.reverse()
        return MessageSerializer(latest, many=True).data


class MemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMemory
        fields = ("key", "value", "importance", "updated_at")
