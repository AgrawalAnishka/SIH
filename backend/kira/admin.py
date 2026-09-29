from django.contrib import admin

from .models import Conversation, Message, UserMemory

admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(UserMemory)
