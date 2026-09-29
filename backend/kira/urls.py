from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.ChatView.as_view()),
    path("conversations/", views.ConversationListCreateView.as_view()),
    path("conversations/<uuid:pk>/", views.ConversationDetailView.as_view()),
    path("memories/", views.MemoryListView.as_view()),
    path("memories/<slug:key>/", views.MemoryDetailView.as_view()),
]
