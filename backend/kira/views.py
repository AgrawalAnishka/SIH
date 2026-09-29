from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .conf import cfg
from .context import build_messages
from .llm import LLMError, complete
from .models import Conversation, Message, UserMemory
from .serializers import (
    ChatInputSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
    MemorySerializer,
    MessageSerializer,
    RenameSerializer,
)
from .summary import maintain_async
from .throttles import KiraBurstThrottle, KiraDailyThrottle

MAX_CONVERSATIONS_LISTED = 100


def make_title(text):
    words = text.split()
    title = " ".join(words[:7])
    if len(title) > 60:
        title = title[:57].rstrip() + "\u2026"
    elif len(words) > 7:
        title += "\u2026"
    return title or "New chat"


def _own_conversation(request, pk):
    # Filtering by user makes other users' conversations indistinguishable from missing (404).
    return get_object_or_404(Conversation, pk=pk, user=request.user)


class ChatView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [KiraBurstThrottle, KiraDailyThrottle]

    def post(self, request):
        serializer = ChatInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data["message"]
        conversation_id = serializer.validated_data.get("conversation_id")

        conv = _own_conversation(request, conversation_id) if conversation_id else None

        try:
            reply = complete(build_messages(request.user, conv, text), cfg("MAX_REPLY_TOKENS"))
        except LLMError:
            return Response(
                {"detail": "KIRA is unavailable right now. Please try again in a moment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Persist only after a successful reply so failed calls leave no orphan messages.
        with transaction.atomic():
            if conv is None:
                conv = Conversation.objects.create(user=request.user, title=make_title(text))
            last = conv.messages.aggregate(m=Max("seq"))["m"] or 0
            msgs = Message.objects.bulk_create(
                [
                    Message(conversation=conv, seq=last + 1, role="user", content=text),
                    Message(conversation=conv, seq=last + 2, role="assistant", content=reply),
                ]
            )
            bot_msg = msgs[1]
            conv.save(update_fields=["updated_at"])

        maintain_async(conv.pk, text)
        return Response(
            {
                "conversation": ConversationListSerializer(conv).data,
                "message": MessageSerializer(bot_msg).data,
            }
        )


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Conversation.objects.filter(user=request.user)[:MAX_CONVERSATIONS_LISTED]
        return Response(ConversationListSerializer(qs, many=True).data)

    def post(self, request):
        conv = Conversation.objects.create(user=request.user)
        return Response(ConversationListSerializer(conv).data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return Response(ConversationDetailSerializer(_own_conversation(request, pk)).data)

    def patch(self, request, pk):
        conv = _own_conversation(request, pk)
        serializer = RenameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conv.title = serializer.validated_data["title"]
        conv.save(update_fields=["title"])
        return Response(ConversationListSerializer(conv).data)

    def delete(self, request, pk):
        _own_conversation(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = UserMemory.objects.filter(user=request.user).order_by("-importance", "-updated_at")
        return Response(MemorySerializer(qs, many=True).data)

    def delete(self, request):
        UserMemory.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, key):
        get_object_or_404(UserMemory, user=request.user, key=key).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
