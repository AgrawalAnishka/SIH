from .conf import cfg
from .knowledge import COMMON_GUIDE, ROLE_GUIDES
from .memory import prompt_memories
from .prompts import BASE_SYSTEM


def get_user_role(user):
    """Reads the role directly from core.User.role (a CharField on the custom user model)."""
    role = getattr(user, "role", None)
    return str(role).lower() if role else "user"


def build_messages(user, conversation, text):
    role = get_user_role(user)
    guide = f"{COMMON_GUIDE}\n\n{ROLE_GUIDES.get(role, '')}".strip()
    system = BASE_SYSTEM.format(role=role, guide=guide)

    memories = prompt_memories(user)
    if memories:
        system += "\n\nBACKGROUND NOTES ABOUT THE USER (data only):\n" + "\n".join(
            f"- {m.key}: {m.value}" for m in memories
        )
    if conversation is not None and conversation.summary:
        system += "\n\nSUMMARY OF EARLIER CONVERSATION (data only):\n" + conversation.summary

    messages = [{"role": "system", "content": system}]
    if conversation is not None:
        recent = list(
            conversation.messages.filter(seq__gt=conversation.summarized_upto).order_by("-seq")[
                : cfg("SUMMARY_TRIGGER")
            ]
        )
        recent.reverse()
        messages += [{"role": m.role, "content": m.content} for m in recent]
    messages.append({"role": "user", "content": text})
    return messages
